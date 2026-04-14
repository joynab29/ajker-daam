import nodemailer from 'nodemailer'

let transporter = null
let transporterMode = null

async function createEtherealTransport() {
  const account = await nodemailer.createTestAccount()
  console.log('[mailer] Ethereal test account created:')
  console.log(`[mailer]   user: ${account.user}`)
  console.log(`[mailer]   pass: ${account.pass}`)
  console.log('[mailer]   inbox: https://ethereal.email/login (use creds above)')
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: account.user, pass: account.pass },
  })
}

async function getTransporter() {
  if (transporter) return { tx: transporter, mode: transporterMode }
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env

  if (SMTP_HOST) {
    const port = Number(SMTP_PORT) || 587
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
    transporterMode = 'smtp'
    console.log(`[mailer] using SMTP host ${SMTP_HOST}:${port}`)
    return { tx: transporter, mode: transporterMode }
  }

  transporter = await createEtherealTransport()
  transporterMode = 'ethereal'
  return { tx: transporter, mode: transporterMode }
}

export async function sendCodeEmail({ to, code, purpose }) {
  const subject =
    purpose === 'signup'
      ? 'Your Ajker Daam signup code'
      : 'Your Ajker Daam login code'
  const text = `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;padding:24px;color:#0e2a1f">
      <h2 style="color:#0e3d2f;margin:0 0 16px">Ajker Daam</h2>
      <p>Your ${purpose === 'signup' ? 'signup' : 'login'} verification code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;background:#f4f6f5;padding:12px 16px;border-radius:8px;display:inline-block">
        ${code}
      </p>
      <p style="color:#5c6b63;font-size:13px">This code expires in 10 minutes.</p>
    </div>
  `
  try {
    const { tx, mode } = await getTransporter()
    const info = await tx.sendMail({
      from: process.env.MAIL_FROM || 'Ajker Daam <no-reply@ajkerdaam.local>',
      to,
      subject,
      text,
      html,
    })
    if (mode === 'ethereal') {
      const url = nodemailer.getTestMessageUrl(info)
      console.log(`[mailer:ethereal] preview ${to}: ${url}`)
    }
    return { ok: true, mode }
  } catch (err) {
    console.error(`[mailer] send failed for ${to}: ${err.message}`)
    console.log(`[mailer:fallback] ${purpose} code for ${to}: ${code}`)
    return { ok: false, error: err.message }
  }
}
