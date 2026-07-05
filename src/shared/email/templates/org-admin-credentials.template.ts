export function orgAdminCredentialsTemplate(orgName: string, email: string, tempPassword: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header h1 { color: #2c3e50; font-size: 24px; }
    .credentials { background: #f8f9fa; border-left: 4px solid #27ae60; padding: 20px; border-radius: 4px; margin: 20px 0; }
    .label { font-weight: bold; color: #555; }
    .value { color: #2c3e50; font-size: 16px; margin: 5px 0 15px; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 15px; margin-top: 20px; color: #856404; }
    .footer { color: #888; font-size: 12px; text-align: center; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Welcome to the Platform</h1></div>
    <p>Congratulations! <strong>${orgName}</strong> has been successfully verified and activated.</p>
    <p>An Organization Admin account has been created for you:</p>
    <div class="credentials">
      <div class="label">Email</div>
      <div class="value">${email}</div>
      <div class="label">Temporary Password</div>
      <div class="value">${tempPassword}</div>
    </div>
    <div class="warning">
      <strong>Important:</strong> Please log in and change your password immediately. This temporary password will expire in 24 hours.
    </div>
    <div class="footer"><p>This is an automated message. Please do not reply.</p></div>
  </div>
</body>
</html>`;
}
