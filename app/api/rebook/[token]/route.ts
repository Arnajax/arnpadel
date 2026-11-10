import { NextResponse } from 'next/server'
import { VPS_BASE_URL } from '../../../_lib/vps'

// Proxy naar de VPS-API: de browser roept de VPS niet zelf aan.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const vpsRes = await fetch(
      `${VPS_BASE_URL}/rebook-confirm/${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(20000),
      },
    )
    const data = await vpsRes.json().catch(() => null)
    return NextResponse.json(
      data ?? { ok: false, error: 'Onverwachte serverfout.' },
      { status: vpsRes.ok ? 200 : vpsRes.status },
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Het duurde langer dan verwacht. Probeer het zo opnieuw.' },
      { status: 504 },
    )
  }
}
