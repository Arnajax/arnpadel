import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { name, phone, players, slotIds } = await req.json()

  const results = []
  for (const slotId of slotIds) {
    const vpsRes = await fetch('http://89.167.75.216:5077/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: slotId,
        naam: name,
        telefoon: phone,
        aantal_spelers: players,
      }),
    })
    const data = await vpsRes.json()
    results.push(data)
  }

  const waText = encodeURIComponent(
    `🎾 Nieuwe boeking!\nNaam: ${name}\nTelefoon: ${phone}\nSpelers: ${players}\nSlots: ${slotIds.join(', ')}`
  )
  const waUrl = `https://wa.me/31629896879?text=${waText}`

  return NextResponse.json({ success: true, results, waUrl })
}
