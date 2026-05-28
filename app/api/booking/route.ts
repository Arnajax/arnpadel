import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { name, phone, players, slotIds, trainerId } = await req.json()
  const trainer_id = trainerId ?? 'arn'

  if (!Array.isArray(slotIds) || slotIds.length === 0) {
    return NextResponse.json({ error: 'slotIds ontbreekt of leeg' }, { status: 400 })
  }

  const vpsRes = await fetch('http://89.167.75.216:5077/booking-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slot_ids: slotIds,
      naam: name,
      telefoon: phone,
      aantal_spelers: players,
      trainer_id,
    }),
  })

  const data = await vpsRes.json()
  return NextResponse.json(data, { status: vpsRes.ok ? 200 : vpsRes.status })
}
