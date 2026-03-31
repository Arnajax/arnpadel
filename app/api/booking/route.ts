import { NextResponse } from 'next/server'

const MONTH_NL = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec']
const DAY_NL   = ['zo','ma','di','wo','do','vr','za']

function formatSlotLabel(slot: { date: string; time: string; duration: number }): string {
  const d   = new Date(slot.date)
  const day = DAY_NL[d.getDay()]
  const num = d.getDate()
  const mon = MONTH_NL[d.getMonth()]
  return `${day} ${num} ${mon} · ${slot.time} (${slot.duration} min)`
}

export async function POST(req: Request) {
  const { name, phone, players, slotIds } = await req.json()

  // ── Forward to VPS ───────────────────────────────────────────────
  const vpsRes = await fetch('http://89.167.75.216:5077/booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, players, slotIds }),
  })
  const data = await vpsRes.json()

  // ── Resolve slot labels ──────────────────────────────────────────
  let slotLabels: string[] = slotIds.map((id: string | number) => `slot #${id}`)
  try {
    const slotsRes = await fetch('http://89.167.75.216:5077/slots')
    const raw = await slotsRes.json()
    const allSlots: Array<{ id: string | number; datum: string; tijd: string; duur: number }> =
      Array.isArray(raw) ? raw : (raw.slots ?? [])
    const idSet   = new Set(slotIds.map(String))
    const matched = allSlots.filter((s) => idSet.has(String(s.id)))
    if (matched.length > 0) {
      slotLabels = matched.map((s) =>
        formatSlotLabel({ date: s.datum, time: s.tijd, duration: s.duur })
      )
    }
  } catch {
    // non-fatal — fallback labels already set
  }

  // ── Build WhatsApp URL for Arn ───────────────────────────────────
  const price       = players <= 2 ? 80 : 90
  const total       = price * slotIds.length
  const slotSummary = slotLabels.join(', ')
  const waText      = encodeURIComponent(
    `🎾 Nieuwe boeking!\nNaam: ${name}\nTelefoon: ${phone}\nSpelers: ${players}\nSlots: ${slotSummary}\nTotaal: €${total}`
  )
  const waUrl = `https://wa.me/31629896879?text=${waText}`

  return NextResponse.json({ ...data, waUrl })
}
