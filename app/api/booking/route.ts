import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { name, phone, players, slotIds } = await req.json()
  const res = await fetch('http://89.167.75.216:5077/booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, players, slotIds }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
