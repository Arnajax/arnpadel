import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatDateNl, isValidCode, prettyTime, publicView } from "@/app/_lib/toernooi/core.js";
import { getStore } from "@/app/_lib/toernooi/store";
import type { View } from "../_lib/client";
import ToernooiClient from "./ToernooiClient";

// Altijd vers: aanmeldingen veranderen per minuut.
export const dynamic = "force-dynamic";
// Opslag altijd vers lezen: Next mag de Blob-verzoeken nooit onthouden (anders botsen herhaalpogingen eindeloos).
export const fetchCache = "force-no-store";

type Props = { params: Promise<{ code: string }> };

async function load(code: string) {
  const upper = code.toUpperCase();
  if (!isValidCode(upper)) return null;
  const current = await getStore().readDoc(upper);
  return current ? (publicView(current.doc) as View) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const v = await load(code);
  if (!v) return { title: "Toernooi niet gevonden · Padel Hub Hoorn" };
  const when = `${formatDateNl(v.date)}, ${prettyTime(v.start)}-${prettyTime(v.end)}`;
  const image =
    v.header.kind === "upload" ? `/api/toernooi/${v.code}/foto/sfeer-${v.header.v}` : `/toernooi/${v.header.id}-og.jpg`;
  const title = `${v.title} · ${when}`;
  const description = `Bij ${v.location}, georganiseerd door ${v.organizer_name}. Meld je aan via Padel Hub Hoorn.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Padel Hub Hoorn",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: v.title }],
    },
    robots: { index: false, follow: false },
  };
}

export default async function ToernooiPage({ params }: Props) {
  const { code } = await params;
  const v = await load(code);
  if (!v) notFound();
  return <ToernooiClient initial={v} />;
}
