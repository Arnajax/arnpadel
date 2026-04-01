import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slot_id: string }> }
) {
  const { slot_id } = await params
  const vpsRes = await fetch(`http://89.167.75.216:5077/ical/${slot_id}`)

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
