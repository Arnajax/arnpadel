import { NextResponse } from 'next/server'
import { VPS_BASE_URL } from '../../../_lib/vps'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slot_id: string }> }
) {
  const { slot_id } = await params
  const vpsRes = await fetch(`${VPS_BASE_URL}/ical/${slot_id}`)

  if (!vpsRes.ok) {
    return NextResponse.json({ error: 'Slot niet gevonden' }, { status: 404 })
  }

  const icsText = await vpsRes.text()
  return new Response(icsText, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="padelles-${slot_id}.ics"`,
    },
  })
}
