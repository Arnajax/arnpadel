import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()
  const res = await fetch('http://89.167.75.216:5077/booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
