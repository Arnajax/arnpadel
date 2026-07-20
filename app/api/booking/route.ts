import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { name, phone, players, slotIds, trainerId } = await req.json()
  const trainer_id = trainerId ?? 'arn'

  if (!Array.isArray(slotIds) || slotIds.length === 0) {
    return NextResponse.json({ error: 'slotIds ontbreekt of leeg' }, { status: 400 })
  }

  try {
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
      signal: AbortSignal.timeout(20000),
    })

    const data = await vpsRes.json()
    return NextResponse.json(data, { status: vpsRes.ok ? 200 : vpsRes.status })
  } catch (err) {
    // Time-out kan optreden nádat de VPS de boeking al wegschreef → niet
    // aansporen tot blind opnieuw indienen (dat geeft dubbele boekingen).
    const timedOut = err instanceof Error && err.name === 'TimeoutError'
    return NextResponse.json(
      {
        error: timedOut
          ? 'Het duurde langer dan verwacht. Je aanvraag is mogelijk wél ontvangen — check WhatsApp of wacht even, dien niet meteen opnieuw in.'
          : 'Kon de boeking niet verwerken. Probeer het zo opnieuw.',
      },
      { status: timedOut ? 504 : 502 },
    )
  }
}
