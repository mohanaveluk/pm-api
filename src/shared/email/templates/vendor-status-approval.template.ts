// Approval request sent to managers when a vendor blacklist / un-blacklist is
// raised. The link lands on the application, where the manager signs in and
// confirms — the email never carries a one-click state change, so a mail
// scanner pre-fetching the URL cannot approve anything on the manager's behalf.

export interface VendorStatusApprovalMailData {
  approvalLink: string;
  vendorCode: string;
  vendorName: string;
  action: 'BLACKLIST' | 'UNBLACKLIST';
  reason: string;
  requestedBy: string;
  requestedAt: Date;
  expiresAt: Date;
}

const escapeHtml = (value: string): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const vendorStatusApprovalTemplate = (data: VendorStatusApprovalMailData) => {
  const isBlacklist = data.action === 'BLACKLIST';
  const heading  = isBlacklist ? 'Vendor Blacklist Approval Required' : 'Vendor Un-blacklist Approval Required';
  const summary  = isBlacklist
    ? 'A request has been raised to <strong>blacklist</strong> the following vendor. Once approved, the vendor will be excluded from vendor selection, RFQs, the Approved Vendor List, and new purchase orders. Existing transactional history is retained.'
    : 'A request has been raised to <strong>lift the blacklisting</strong> of the following vendor. Once approved, the vendor returns to <strong>Under Evaluation</strong> for re-qualification — it is not made active automatically.';
  const accent = isBlacklist ? '#C62828' : '#2E7D32';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    .container {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      color: #212121;
    }
    .button {
      background-color: ${accent};
      border: none;
      color: white;
      padding: 15px 32px;
      text-align: center;
      text-decoration: none;
      display: inline-block;
      font-size: 16px;
      margin: 4px 2px;
      cursor: pointer;
      border-radius: 4px;
    }
    table.details {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    table.details td {
      padding: 8px 10px;
      border-bottom: 1px solid #E0E0E0;
      font-size: 14px;
      vertical-align: top;
    }
    table.details td.label {
      color: #616161;
      width: 40%;
    }
    .note {
      font-size: 13px;
      color: #616161;
      border-left: 3px solid ${accent};
      padding-left: 12px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>${heading}</h2>
    <p>${summary}</p>

    <table class="details">
      <tr><td class="label">Vendor Code</td><td><strong>${escapeHtml(data.vendorCode)}</strong></td></tr>
      <tr><td class="label">Vendor Name</td><td>${escapeHtml(data.vendorName)}</td></tr>
      <tr><td class="label">Requested Action</td><td>${isBlacklist ? 'Blacklist' : 'Remove Blacklist'}</td></tr>
      <tr><td class="label">Reason</td><td>${escapeHtml(data.reason)}</td></tr>
      <tr><td class="label">Requested By</td><td>${escapeHtml(data.requestedBy)}</td></tr>
      <tr><td class="label">Requested On</td><td>${data.requestedAt.toISOString()}</td></tr>
    </table>

    <p>
      <a href="${data.approvalLink}" class="button">Review &amp; Approve</a>
    </p>

    <p class="note">
      You will be asked to sign in before the decision is recorded. Opening this link
      does not approve anything on its own — you can also reject the request from the
      same screen. This link expires on ${data.expiresAt.toISOString()}.
      If you did not expect this request, do not action it and contact your
      procurement administrator.
    </p>

    <p>Best regards,<br>Your Application Team</p>
  </div>
</body>
</html>`;
};
