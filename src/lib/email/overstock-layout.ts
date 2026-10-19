function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderOverstockEmail(baseUrl: string, contentHtml: string, fullWidthHtml?: string) {
  const termsUrl = escapeHtml(new URL("/legal/terms", baseUrl).toString());
  const privacyUrl = escapeHtml(new URL("/legal/privacy", baseUrl).toString());
  const shippingUrl = escapeHtml(new URL("/legal/shipping", baseUrl).toString());
  const instagramUrl = escapeHtml(process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/overstock.bd/");
  const facebookUrl = escapeHtml(process.env.NEXT_PUBLIC_FACEBOOK_URL || "#");
  const compactBottom = contentHtml.includes("<!--OVERSTOCK_COMPACT_BOTTOM-->");
  const cleanContentHtml = contentHtml.replace("<!--OVERSTOCK_COMPACT_BOTTOM-->", "");

  let contentRows: string;
  if (fullWidthHtml) {
    const parts = cleanContentHtml.split("<!--OVERSTOCK_FULL_WIDTH_SECTION-->");
    if (parts.length !== 2) throw new Error("Email full-width section marker is missing.");
    const before = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;"><tr><td class="os-content-inner" style="padding:0 42px;">${parts[0]}</td></tr></table>`;
    const after = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;"><tr><td class="os-content-inner" style="padding:0 42px;">${parts[1]}</td></tr></table>`;
    contentRows = `${before}${fullWidthHtml}${after}`;
  } else {
    contentRows = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;"><tr><td class="os-content-inner" style="padding:0 42px;">${cleanContentHtml}</td></tr></table>`;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>OVERSTOCK</title>
  <style type="text/css">
    .os-button { transition: background-color .2s ease, color .2s ease, box-shadow .2s ease !important; }
    .os-button:hover, .os-button:focus { background-color: #f1f1ef !important; color: #111111 !important; box-shadow: inset 0 0 0 1px #111111 !important; }
    @media only screen and (max-width: 520px) {
      .os-content { padding-top: 26px !important; padding-bottom: 24px !important; }
      .os-content-compact { padding-bottom: 14px !important; }
      .os-content-inner { padding-left: 20px !important; padding-right: 20px !important; }
      .os-legal { font-size: 10px !important; }
      .os-social-link { font-size: 9px !important; }
      .os-invite-detail-cell { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f1ef;color:#111111;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f1f1ef" style="width:100%;border-collapse:collapse;background-color:#f1f1ef;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="650" border="0" cellpadding="0" cellspacing="0" bgcolor="#f1f1ef" style="width:100%;max-width:650px;border:1px solid #111111;border-collapse:separate;border-spacing:0;background-color:#f1f1ef;">
          <tr>
            <td align="center" bgcolor="#111111" style="padding:19px 14px;background-color:#111111;color:#f1f1ef;font-size:23px;line-height:1.2;font-weight:800;letter-spacing:.18em;">OVERSTOCK</td>
          </tr>
          <tr>
            <td class="os-content${compactBottom ? " os-content-compact" : ""}" align="center" style="padding:32px 0 ${compactBottom ? "14px" : "28px"};text-align:center;color:#111111;font-size:14px;line-height:1.55;">
              ${contentRows}
            </td>
          </tr>
          <tr>
            <td align="center" bgcolor="#e4e4e0" style="padding:13px 8px;background-color:#e4e4e0;border-top:1px solid #111111;border-bottom:1px solid #111111;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:0 10px;"><a class="os-social-link" href="${instagramUrl}" style="color:#111111;text-decoration:none;font-size:10px;line-height:1.4;font-weight:700;white-space:nowrap;"><span style="font-size:16px;vertical-align:-1px;">◎</span>&nbsp; INSTAGRAM</a></td>
                  <td align="center" style="padding:0 10px;"><a class="os-social-link" href="${facebookUrl}" style="color:#111111;text-decoration:none;font-size:10px;line-height:1.4;font-weight:700;white-space:nowrap;"><span style="font-size:16px;vertical-align:-1px;">f</span>&nbsp; FACEBOOK</a></td>
                  <td align="center" style="padding:0 10px;"><a class="os-social-link" href="mailto:operations.overstock@gmail.com" style="color:#111111;text-decoration:none;font-size:10px;line-height:1.4;font-weight:700;white-space:nowrap;"><span style="font-size:15px;vertical-align:-1px;">✉</span>&nbsp; EMAIL</a></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 8px;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td width="50%" align="left" class="os-legal" style="width:50%;padding:12px 8px;color:#111111;font-size:11px;line-height:1.4;white-space:nowrap;"><strong>© 2026 OVERSTOCK</strong></td>
                  <td width="50%" align="right" class="os-legal" style="width:50%;padding:12px 8px;color:#111111;font-size:11px;line-height:1.4;white-space:nowrap;"><a href="${termsUrl}" style="color:#111111;text-decoration:none;">Terms</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${privacyUrl}" style="color:#111111;text-decoration:none;">Privacy</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${shippingUrl}" style="color:#111111;text-decoration:none;">Shipping</a></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
