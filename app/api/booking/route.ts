import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const MONTH_NL = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec']
const DAY_NL   = ['zo','ma','di','wo','do','vr','za']

function formatSlotLabel(slot: { date: string; time: string; duration: number }): string {
  const d = new Date(slot.date)
  const day  = DAY_NL[d.getDay()]
  const num  = d.getDate()
  const mon  = MONTH_NL[d.getMonth()]
  return `${day} ${num} ${mon} · ${slot.time} (${slot.duration} min)`
}

export async function POST(req: Request) {
  const { name, phone, players, slotIds } = await req.json()

  // ── Forward to VPS ──────────────────────────────────────────────
  const vpsRes = await fetch('http://89.167.75.216:5077/booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, players, slotIds }),
  })
  const data = await vpsRes.json()

  // ── Fetch slot details for the email ────────────────────────────
  let slotLabels: string[] = slotIds.map((id: string | number) => `slot #${id}`)
  try {
    const slotsRes = await fetch('http://89.167.75.216:5077/slots')
    const raw = await slotsRes.json()
    const allSlots: Array<{ id: string | number; datum: string; tijd: string; duur: number }> =
      Array.isArray(raw) ? raw : (raw.slots ?? [])
    const idSet = new Set(slotIds.map(String))
    const matched = allSlots.filter((s) => idSet.has(String(s.id)))
    if (matched.length > 0) {
      slotLabels = matched.map((s) =>
        formatSlotLabel({ date: s.datum, time: s.tijd, duration: s.duur })
      )
    }
  } catch {
    // non-fatal — fallback labels already set
  }

  // ── Build email ──────────────────────────────────────────────────
  const price      = players <= 2 ? 80 : 90
  const total      = price * slotIds.length
  const slotSummary = slotLabels.join(', ')
  const waText     = encodeURIComponent(
    `Hey ${name}, je padelles is bevestigd! Tot dan 🎾`
  )
  const waUrl      = `https://wa.me/31${phone.replace(/^0/, '').replace(/\D/g, '')}?text=${waText}`

  const slotsHtml = slotLabels
    .map((l) => `<li style="margin:4px 0;color:#374151;">${l}</li>`)
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <tr>
      <td style="background:#0f0f1a;padding:28px 32px;">
        <p style="margin:0;color:#00c27c;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Arnpadel · Nieuwe boeking</p>
        <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:800;">🎾 ${name} heeft geboekt</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:0 0 20px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Naam</p>
              <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">${name}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 20px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Telefoon</p>
              <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">${phone}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 20px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Aantal spelers</p>
              <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">${players}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 20px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Geboekte slots</p>
              <ul style="margin:0;padding-left:18px;">${slotsHtml}</ul>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 28px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Totaalprijs</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#00c27c;">€${total}</p>
              <p style="margin:2px 0 0;font-size:12px;color:#9ca3af;">€${price} × ${slotIds.length} slot${slotIds.length > 1 ? 's' : ''}</p>
            </td>
          </tr>
          <tr>
            <td>
              <a href="${waUrl}"
                 style="display:inline-block;background:#00c27c;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;">
                ✅ Goedkeuren via WhatsApp
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Arnpadel · Sportcentrum Hoorn · arnpadel.nl</p>
      </td>
    </tr>
  </table>
</body>
</html>`

  // ── Send email (non-blocking) ────────────────────────────────────
  try {
    await resend.emails.send({
      from: 'Arnpadel <onboarding@resend.dev>',
      to: 'arn@quicknet.nl',
      subject: `🎾 Nieuwe boeking — ${name} · ${slotSummary}`,
      html,
    })
  } catch (err) {
    console.error('[Resend] Failed to send notification email:', err)
    // non-fatal — booking already confirmed with VPS
  }

  return NextResponse.json(data)
}
