import { NextResponse } from 'next/server'
import { fetchSlots } from '../../_lib/slots'

export async function GET() {
  try {
    const slots = await fetchSlots()
    return NextResponse.json(
      { slots },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30',
        },
      }
    )
  } catch (e) {
    return NextResponse.json({ error: String(e), slots: [] }, { status: 500 })
  }
}
