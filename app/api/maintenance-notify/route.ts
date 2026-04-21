import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const NOTIFY_EMAIL = process.env.MAINTENANCE_NOTIFY_EMAIL ?? 'maintenance@terraceafrica.com'

export async function POST(req: NextRequest) {
  try {
    const { type, job, assignee, centre, supplierName } = await req.json()

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }

    let subject = ''
    let html = ''
    let to = [NOTIFY_EMAIL]

    const centreName = centre?.name ?? 'Unknown centre'
    const jobTitle = job?.title ?? 'Maintenance job'
    const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://terrace-billing.vercel.app'}/dashboard/maintenance/${job?.id}`

    const baseStyle = `font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;`
    const headerStyle = `background: #1a472a; padding: 24px; border-radius: 12px 12px 0 0;`
    const bodyStyle = `background: #fff; padding: 24px; border: 1px solid #ece9e3; border-top: none; border-radius: 0 0 12px 12px;`
    const btnStyle = `display: inline-block; background: #1a472a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;`

    if (type === 'job_assigned') {
      subject = `Maintenance job assigned: ${jobTitle} — ${centreName}`
      to = assignee?.email ? [assignee.email] : [NOTIFY_EMAIL]
      html = `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <p style="margin:0; color:#fff; font-size:18px; font-weight:600;">Maintenance job assigned</p>
            <p style="margin:4px 0 0; color:rgba(255,255,255,0.6); font-size:13px;">${centreName}</p>
          </div>
          <div style="${bodyStyle}">
            <p style="font-size:15px; font-weight:600; color:#1a1a18;">${jobTitle}</p>
            <p style="color:#888; font-size:13px;">You have been assigned this maintenance job. Please obtain quotes from suppliers and upload them to the dashboard for approval.</p>
            ${job?.description ? `<p style="background:#f7f6f3; padding:12px; border-radius:8px; font-size:13px; color:#555;">${job.description}</p>` : ''}
            <a href="${jobUrl}" style="${btnStyle}">View job →</a>
          </div>
        </div>`
    }

    if (type === 'quote_uploaded') {
      subject = `Quote uploaded for approval: ${jobTitle} — ${centreName}`
      html = `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <p style="margin:0; color:#fff; font-size:18px; font-weight:600;">Quote ready for approval</p>
            <p style="margin:4px 0 0; color:rgba(255,255,255,0.6); font-size:13px;">${centreName}</p>
          </div>
          <div style="${bodyStyle}">
            <p style="font-size:15px; font-weight:600; color:#1a1a18;">${jobTitle}</p>
            <p style="color:#888; font-size:13px;">A quote from <strong>${supplierName}</strong> has been uploaded and is awaiting your approval.</p>
            <a href="${jobUrl}" style="${btnStyle}">Review quote →</a>
          </div>
        </div>`
    }

    if (type === 'job_approved') {
      subject = `Job approved — go ahead: ${jobTitle} — ${centreName}`
      to = assignee?.email ? [assignee.email] : [NOTIFY_EMAIL]
      html = `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <p style="margin:0; color:#fff; font-size:18px; font-weight:600;">Job approved ✓</p>
            <p style="margin:4px 0 0; color:rgba(255,255,255,0.6); font-size:13px;">${centreName}</p>
          </div>
          <div style="${bodyStyle}">
            <p style="font-size:15px; font-weight:600; color:#1a1a18;">${jobTitle}</p>
            <p style="color:#888; font-size:13px;">The quote has been approved. You can now proceed with the work. Please mark the job as complete once done.</p>
            <a href="${jobUrl}" style="${btnStyle}">View job →</a>
          </div>
        </div>`
    }

    if (type === 'job_rejected') {
      subject = `Quote rejected: ${jobTitle} — ${centreName}`
      to = assignee?.email ? [assignee.email] : [NOTIFY_EMAIL]
      html = `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <p style="margin:0; color:#fff; font-size:18px; font-weight:600;">Quote not approved</p>
            <p style="margin:4px 0 0; color:rgba(255,255,255,0.6); font-size:13px;">${centreName}</p>
          </div>
          <div style="${bodyStyle}">
            <p style="font-size:15px; font-weight:600; color:#1a1a18;">${jobTitle}</p>
            <p style="color:#888; font-size:13px;">The submitted quote was not approved. Please obtain alternative quotes and resubmit for approval.</p>
            <a href="${jobUrl}" style="${btnStyle}">View job →</a>
          </div>
        </div>`
    }

    if (!subject || !html) {
      return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 })
    }

    await resend.emails.send({
      from: `Terrace Maintenance <${NOTIFY_EMAIL}>`,
      to,
      subject,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}