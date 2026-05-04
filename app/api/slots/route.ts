import { NextResponse } from 'next/server'

interface VpsSlot {
  id: string | number
  datum: string
  tijd: string
  duur: number
  max_spelers: number | string
}

export async function GET() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch('http://89.167.75.216:5077/slots', {
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const data = await res.json()
    const raw: VpsSlot[] = Array.isArray(data) ? data : (data.slots ?? [])
    const slots = raw.map((s) => ({
      id: s.id,
      date: s.datum,
      time: s.tijd,
      duration: s.duur,
      maxPlayers: Number(s.max_spelers),
    }))
    return NextResponse.json({ slots })
  } catch (e) {
    return NextResponse.json({ error: String(e), slots: [] }, { status: 500 })
  }
}
