import RebookClient, { type RebookInfo } from "./RebookClient";

export const dynamic = "force-dynamic";

async function fetchInfo(token: string): Promise<RebookInfo | null> {
  try {
    const res = await fetch(
      `http://89.167.75.216:5077/rebook-info/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    return (await res.json()) as RebookInfo;
  } catch {
    return null;
  }
}

export default async function RebookPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const info = await fetchInfo(token);
  return <RebookClient token={token} info={info} />;
}
