import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch('http://89.167.75.216:5077/slots', { cache: 'no-store' })
  const data = await res.json()
  return NextResponse.json(data)
}
