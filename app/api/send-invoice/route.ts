import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const UTILITY_LABELS: Record<string, string> = {
  internet: 'Internet', generator: 'Generator', gas: 'Gas',
  water: 'Water', management: 'Rent / Ops'
}

function generateInvoiceHTML(tenant: any, centre: any, month: number, year: number, invoiceNumber: string) {
  const taxRate = (centre?.tax_rate ?? 15) / 100
  const subtotal = tenant.line_items.reduce((sum: number, i: any) => sum + (i.sell_price * (i.quantity || 1)), 0)
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount

  const lineItemsHTML = tenant.line_items.map((item: any) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #f0ede7;">
        <p style="margin:0; font-size:14px; color:#1a1a18;">${item.description}</p>
        <p style="margin:2px 0 0; font-size:12px; color:#888;">${UTILITY_LABELS[item.utility_type] ?? item.utility_type}</p>
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f0ede7; text-align:right; font-size:14px; font-weight:500; color:#1a1a18;">
        $${(item.sell_price * (item.quantity || 1)).toFixed(2)}
      </td>
    </tr>
  `).join('')

  const bankDetailsHTML = centre?.bank_name ? `
    <div style="background:#f7f6f3; padding:16px; border-radius:8px; margin-bottom:24px;">
      <p style="margin:0 0 8px; font-size:11px; font-weight:600; color:#888; letter-spacing:0.05em;">PAYMENT DETAILS</p>
      <table style="width:100%; font-size:13px;">
        <tr>
          <td style="color:#888; padding:2px 0;">Bank</td>
          <td style="color:#1a1a18; padding:2px 0;">${centre.bank_name}</td>
          <td style="color:#888; padding:2px 0;">Account</td>
          <td style="color:#1a1a18; padding:2px 0;">${centre.bank_account ?? ''}</td>
          <td style="color:#888; padding:2px 0;">Branch</td>
          <td style="color:#1a1a18; padding:2px 0;">${centre.bank_branch ?? ''}</td>
        </tr>
      </table>
    </div>
  ` : ''

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0; padding:0; background:#f7f6f3; font-family: Arial, sans-serif;">
  <div style="max-width:680px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 2px 20px rgba(0,0,0,0.08);">
    
    <!-- Green header bar -->
    <div style="background:#1a472a; padding:32px;">
      <table style="width:100%;">
        <tr>
          <td>
            <p style="margin:0; font-size:20px; font-weight:600; color:#fff;">${centre?.company_name ?? 'Terrace'}</p>
            <p style="margin:4px 0 0; font-size:13px; color:rgba(255,255,255,0.6);">${centre?.company_address ?? ''}</p>
            <p style="margin:2px 0 0; font-size:13px; color:rgba(255,255,255,0.6);">${centre?.company_email ?? ''}</p>
            ${centre?.vat_number ? `<p style="margin:2px 0 0; font-size:13px; color:rgba(255,255,255,0.6);">VAT: ${centre.vat_number}</p>` : ''}
          </td>
          <td style="text-align:right;">
            <p style="margin:0; font-size:28px; font-weight:700; color:#f4a227;">INVOICE</p>
            <p style="margin:4px 0 0; font-size:13px; color:rgba(255,255,255,0.7);">${invoiceNumber}</p>
            <p style="margin:2px 0 0; font-size:13px; color:rgba(255,255,255,0.7);">${MONTHS[month]} ${year}</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Body -->
    <div style="padding:32px;">

      <!-- Bill to -->
      <div style="background:#f7f6f3; padding:16px; border-radius:8px; margin-bottom:28px;">
        <p style="margin:0 0 6px; font-size:11px; font-weight:600; color:#888; letter-spacing:0.05em;">BILL TO</p>
        <p style="margin:0; font-size:16px; font-weight:600; color:#1a1a18;">${tenant.company_name}</p>
        ${tenant.contact_name ? `<p style="margin:2px 0 0; font-size:13px; color:#888;">Attn: ${tenant.contact_name}</p>` : ''}
        ${tenant.email ? `<p style="margin:2px 0 0; font-size:13px; color:#888;">${tenant.email}</p>` : ''}
      </div>

      <!-- Line items -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <thead>
          <tr style="border-bottom:2px solid #1a1a18;">
            <th style="text-align:left; padding-bottom:8px; font-size:12px; color:#888; font-weight:500;">Description</th>
            <th style="text-align:right; padding-bottom:8px; font-size:12px; color:#888; font-weight:500;">Amount</th>
          </tr>
        </thead>
        <tbody>${lineItemsHTML}</tbody>
        <tfoot>
          <tr>
            <td style="padding:10px 0 4px; font-size:13px; color:#888;">Subtotal</td>
            <td style="padding:10px 0 4px; text-align:right; font-size:13px; color:#1a1a18;">$${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0; font-size:13px; color:#888;">VAT (${centre?.tax_rate ?? 15}%)</td>
            <td style="padding:4px 0; text-align:right; font-size:13px; color:#1a1a18;">$${taxAmount.toFixed(2)}</td>
          </tr>
          <tr style="border-top:2px solid #1a1a18;">
            <td style="padding:12px 0 0; font-size:16px; font-weight:700; color:#1a1a18;">TOTAL DUE</td>
            <td style="padding:12px 0 0; text-align:right; font-size:20px; font-weight:700; color:#1a472a;">$${total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      ${bankDetailsHTML}

      <!-- Footer note -->
      <p style="font-size:12px; color:#aaa; text-align:center; margin:0;">
        Thank you for being a valued tenant. Please contact us if you have any queries regarding this invoice.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

export async function POST(req: NextRequest) {
  try {
    const { tenant, centre, month, year } = await req.json()

    if (!tenant.email) {
      return NextResponse.json({ error: 'Tenant has no email address' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    // Generate invoice number
    const invoiceNumber = `${centre?.invoice_prefix ?? 'INV'}-${year}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`

    const html = generateInvoiceHTML(tenant, centre, month, year, invoiceNumber)

    const { data, error } = await resend.emails.send({
      from: centre?.company_email ? `${centre.company_name} <${centre.company_email}>` : 'billing@terraceafrica.com',
      to: [tenant.email],
      subject: `Invoice ${invoiceNumber} — ${MONTHS[month]} ${year}`,
      html,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, invoiceNumber, emailId: data?.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}