export function orgRegistrationTemplate(otp: string, oguid: string, orgName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #2c3e50; font-size: 24px; }
    .otp-box { background: #f0f4ff; border: 2px dashed #3498db; border-radius: 8px; text-align: center; padding: 20px; margin: 30px 0; }
    .otp-code { font-size: 40px; font-weight: bold; letter-spacing: 8px; color: #2c3e50; }
    .footer { color: #888; font-size: 12px; text-align: center; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Organization Registration</h1>
    </div>
    <p>Hello,</p>
    <p>Thank you for registering <strong>${orgName}</strong>. Use the verification code below to verify your email address.</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <p style="color:#666;margin-top:10px;">This code expires in <strong>10 minutes</strong></p>
    </div>
    <p>If you did not register this organization, please ignore this email.</p>
    <div class="footer">
      <p>This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`;
}
