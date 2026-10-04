// Opslag voor de toernooitool. Productie: Upstash Redis (sinds 4 okt; de gratis Blob-limiet van
// 2.000 schrijfacties per maand bleek te krap). Vercel Blob blijft als terugval. Lokaal en in tests:
// een map op schijf met dezelfde spelregels (etag + "alleen schrijven als niemand ertussen kwam"),
// zodat de gelijktijdigheidstest ook lokaal iets bewijst.

import crypto from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { BlobPreconditionFailedError, del, get, list, put } from "@vercel/blob";
import { Redis } from "@upstash/redis";

import { ToernooiError } from "./core.js";

export class ConflictError extends Error {}

export interface Store {
  readDoc(code: string): Promise<{ doc: Tournament; etag: string } | null>;
  /** etag null = nieuw document (mag nog niet bestaan). */
  writeDoc(code: string, doc: Tournament, etag: string | null): Promise<void>;
  putFile(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  getFile(path: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  deletePrefix(prefix: string): Promise<number>;
}

// Het toernooi-object komt uit core.js (JS); hier alleen de vorm die de API-laag gebruikt.
export type Tournament = {
  code: string;
  admin_key_hash: string;
  players: { id: string; name: string; photo: number; token_hash: string | null; status: "in" | "reserve" }[];
  header: { kind: "preset"; id: string } | { kind: "upload"; v: number };
  [key: string]: unknown;
};

const docPath = (code: string) => `toernooien/${code}.json`;

// ── Vercel Blob ───────────────────────────────────────────────────────────────

async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

class BlobStore implements Store {
  async readDoc(code: string) {
    // Niet laten inpakken: een gecomprimeerd antwoord krijgt een "zwakke" etag (W/"...") en daarmee
    // faalt elke voorwaardelijke schrijfactie. Gemeten 3 okt: vanaf ~1 KB document gebeurde dat.
    const res = await get(docPath(code), { access: "private", useCache: false, headers: { "Accept-Encoding": "identity" } });
    if (!res || res.statusCode !== 200) return null;
    const text = new TextDecoder().decode(await streamToBytes(res.stream));
    return { doc: JSON.parse(text) as Tournament, etag: res.blob.etag.replace(/^W\//, "") };
  }

  async writeDoc(code: string, doc: Tournament, etag: string | null) {
    const body = JSON.stringify(doc);
    try {
      await put(docPath(code), body, {
        access: "private",
        addRandomSuffix: false,
        contentType: "application/json",
        cacheControlMaxAge: 60,
        ...(etag ? { allowOverwrite: true, ifMatch: etag } : { allowOverwrite: false }),
      });
    } catch (err) {
      if (err instanceof BlobPreconditionFailedError) throw new ConflictError("etag");
      // Blob meldt een gelijktijdige schrijfactie soms als algemene fout: ook gewoon opnieuw proberen.
      if (err instanceof Error && /conflicting operation|precondition/i.test(err.message)) throw new ConflictError("busy");
      // Bij aanmaken zonder overwrite: bestaat al = botsing op de code.
      if (!etag && err instanceof Error && /already exists/i.test(err.message)) throw new ConflictError("exists");
      throw err;
    }
  }

  async putFile(path: string, bytes: Uint8Array, contentType: string) {
    await put(path, Buffer.from(bytes), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
  }

  async getFile(path: string) {
    const res = await get(path, { access: "private" });
    if (!res || res.statusCode !== 200) return null;
    return { bytes: await streamToBytes(res.stream), contentType: res.blob.contentType };
  }

  async deletePrefix(prefix: string) {
    let cursor: string | undefined;
    let count = 0;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      if (page.blobs.length) {
        await del(page.blobs.map((b) => b.url));
        count += page.blobs.length;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return count;
  }
}

// ── Upstash Redis ─────────────────────────────────────────────────────────────

// Toernooi = hash { doc, rev }. `rev` wisselt bij elke schrijfactie en is de etag. Controleren en
// schrijven in één script, dus atomair: wie ertussen kwam, krijgt 0 terug.
const WRITE_DOC = `
local rev = redis.call('HGET', KEYS[1], 'rev')
if ARGV[1] == '' then
  if rev then return 0 end
elseif rev ~= ARGV[1] then
  return 0
end
redis.call('HSET', KEYS[1], 'doc', ARGV[2], 'rev', ARGV[3])
return 1
`;

// Paden zijn sleutels; tekens die SCAN als patroon leest moeten letterlijk blijven.
const globEscape = (s: string) => s.replace(/[\\*?[\]]/g, "\\$&");

class RedisStore implements Store {
  private redis: Redis;

  constructor(url: string, token: string) {
    // Zelf (de)serialiseren: het document moet als exacte tekst heen en terug.
    this.redis = new Redis({ url, token, automaticDeserialization: false });
  }

  // Met automaticDeserialization uit geeft HMGET het ruwe antwoord: waarden in dezelfde volgorde.
  private async fields(key: string, names: string[]) {
    return ((await this.redis.hmget(key, ...names)) ?? []) as unknown as (string | null)[];
  }

  async readDoc(code: string) {
    const [doc, rev] = await this.fields(docPath(code), ["doc", "rev"]);
    if (!doc || !rev) return null;
    return { doc: JSON.parse(doc) as Tournament, etag: rev };
  }

  async writeDoc(code: string, doc: Tournament, etag: string | null) {
    const ok = await this.redis.eval(WRITE_DOC, [docPath(code)], [etag ?? "", JSON.stringify(doc), crypto.randomUUID()]);
    if (Number(ok) !== 1) throw new ConflictError(etag ? "etag" : "exists");
  }

  async putFile(path: string, bytes: Uint8Array, contentType: string) {
    await this.redis.hset(path, { b: Buffer.from(bytes).toString("base64"), t: contentType });
  }

  async getFile(path: string) {
    const [b, type] = await this.fields(path, ["b", "t"]);
    if (!b) return null;
    return { bytes: new Uint8Array(Buffer.from(b, "base64")), contentType: type || "application/octet-stream" };
  }

  // Zelfde gedrag als Blob: alles waarvan het pad met `prefix` begint.
  async deletePrefix(prefix: string) {
    let cursor = "0";
    let count = 0;
    do {
      const [next, keys] = await this.redis.scan(cursor, { match: `${globEscape(prefix)}*`, count: 1000 });
      if (keys.length) count += await this.redis.del(...keys);
      cursor = String(next);
    } while (cursor !== "0");
    return count;
  }
}

// ── Bestandssysteem (alleen lokaal) ───────────────────────────────────────────

const sha = (data: string | Uint8Array) => crypto.createHash("sha256").update(data).digest("hex");

class FsStore implements Store {
  private root: string;
  private chain = new Map<string, Promise<unknown>>();

  constructor(root: string) {
    this.root = root;
  }

  // Eén schrijver tegelijk per bestand: controleren en schrijven gebeuren samen.
  private locked<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.chain.get(key) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    this.chain.set(key, next.catch(() => undefined));
    return next;
  }

  private abs(path: string) {
    return join(this.root, path);
  }

  private async readRaw(path: string): Promise<Buffer | null> {
    try {
      return await readFile(this.abs(path));
    } catch {
      return null;
    }
  }

  private async atomicWrite(path: string, data: string | Uint8Array) {
    const target = this.abs(path);
    await mkdir(dirname(target), { recursive: true });
    const tmp = `${target}.${crypto.randomUUID()}.tmp`;
    await writeFile(tmp, data);
    await rename(tmp, target);
  }

  async readDoc(code: string) {
    const raw = await this.readRaw(docPath(code));
    if (!raw) return null;
    return { doc: JSON.parse(raw.toString("utf8")) as Tournament, etag: sha(raw) };
  }

  writeDoc(code: string, doc: Tournament, etag: string | null) {
    const path = docPath(code);
    return this.locked(path, async () => {
      const current = await this.readRaw(path);
      if (etag === null && current) throw new ConflictError("exists");
      if (etag !== null && (!current || sha(current) !== etag)) throw new ConflictError("etag");
      await this.atomicWrite(path, JSON.stringify(doc));
    });
  }

  async putFile(path: string, bytes: Uint8Array, contentType: string) {
    await this.atomicWrite(path, bytes);
    await this.atomicWrite(`${path}.type`, contentType);
  }

  async getFile(path: string) {
    const bytes = await this.readRaw(path);
    if (!bytes) return null;
    const type = (await this.readRaw(`${path}.type`))?.toString("utf8") ?? "application/octet-stream";
    return { bytes: new Uint8Array(bytes), contentType: type };
  }

  // Zelfde gedrag als Blob: alles waarvan het pad met `prefix` begint.
  async deletePrefix(prefix: string) {
    const dir = prefix.endsWith("/") ? this.abs(prefix) : dirname(this.abs(prefix));
    const start = prefix.endsWith("/") ? "" : prefix.slice(prefix.lastIndexOf("/") + 1);
    let names: string[];
    try {
      names = await readdir(dir);
    } catch {
      return 0;
    }
    const hits = names.filter((n) => n.startsWith(start) && !n.endsWith(".type"));
    await Promise.all(
      names.filter((n) => n.startsWith(start)).map((n) => rm(join(dir, n), { recursive: true, force: true })),
    );
    return hits.length;
  }
}

// ── Keuze van de opslag ───────────────────────────────────────────────────────

let cached: Store | null = null;

export function getStore(): Store {
  if (cached) return cached;
  const forceFs = process.env.TOERNOOI_STORE === "fs";
  const { KV_REST_API_URL: kvUrl, KV_REST_API_TOKEN: kvToken } = process.env;
  if (!forceFs && kvUrl && kvToken) {
    cached = new RedisStore(kvUrl, kvToken);
  } else if (!forceFs && process.env.BLOB_READ_WRITE_TOKEN) {
    cached = new BlobStore();
  } else {
    // Op Vercel nooit naar schijf: dat zou stilletjes data kwijtraken.
    if (process.env.VERCEL) throw new Error("Toernooi-opslag niet ingesteld (KV_REST_API_URL/TOKEN ontbreken).");
    cached = new FsStore(process.env.TOERNOOI_FS_ROOT ?? join(process.cwd(), ".toernooi-data"));
  }
  return cached;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Lees-pas-aan-schrijf met optimistische vergrendeling. `fn` moet zonder bijwerkingen zijn
 * (id's en tokens maak je vóór de aanroep), want bij een botsing draait hij opnieuw.
 */
export async function mutate<R>(
  code: string,
  fn: (t: Tournament) => { t: Tournament; result: R },
): Promise<{ t: Tournament; result: R }> {
  const store = getStore();
  for (let attempt = 0; attempt < 20; attempt++) {
    const current = await store.readDoc(code);
    if (!current) throw new ToernooiError(404, "Dit toernooi bestaat niet (meer).");
    const out = fn(current.doc);
    // Versie telt op binnen dezelfde lees-schrijfronde: altijd strikt oplopend, ook bij botsingen.
    const t = { ...out.t, version: (Number(current.doc.version) || 0) + 1 };
    try {
      await store.writeDoc(code, t, current.etag);
      return { t, result: out.result };
    } catch (err) {
      if (!(err instanceof ConflictError)) throw err;
      const base = Math.min(600, 20 * 2 ** attempt);
      await sleep(base * (0.5 + Math.random()));
    }
  }
  throw new ToernooiError(503, "Het is even druk. Probeer het zo nog eens.");
}
