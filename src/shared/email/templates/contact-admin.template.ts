export const contactAdminTemplate = (data: {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    subject: string;
    message: string;
  }) => `
  <!DOCTYPE html>
  <html>
  <body>
    <h2>New Contact Form Submission</h2>
    <p>A new contact form has been submitted with the following details:</p>
    <ul>
      <li><strong>Name:</strong> ${data.firstName}</li>
      <li><strong>Email:</strong> ${data.email}</li>
      <li><strong>Mobile:</strong> ${data.mobile}</li>
    </ul>
    <h3>Subject: ${data.subject}</h3>
    <h3>Message:</h3>
    <p>${data.message}</p>
  </body>
  </html>
  `;