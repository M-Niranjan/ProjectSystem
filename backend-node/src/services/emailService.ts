import nodemailer from 'nodemailer';

export class EmailService {
  private static getTransporter() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass || user.includes('yourgmail@gmail.com') || pass.includes('your_16_digit')) {
      return null;
    }

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user.trim(),
        pass: pass.trim(),
      },
    });
  }

  public static async sendEmailAlert(recipientEmail: string, subject: string, message: string): Promise<void> {
    const transporter = this.getTransporter();

    if (!transporter) {
      console.log(`\n======================================================================`);
      console.log(` 📧 EMAIL DISPATCH NOTIFICATION`);
      console.log(` RECIPIENT : ${recipientEmail}`);
      console.log(` SUBJECT   : ${subject}`);
      console.log(` MESSAGE   :\n ${message}`);
      console.log(`----------------------------------------------------------------------`);
      console.log(` ⚠️ TO RECEIVE REAL GMAIL EMAILS IN YOUR INBOX:`);
      console.log(` Open backend-node/.env and set your Gmail address & 16-digit App Password:`);
      console.log(` EMAIL_USER=your_actual_email@gmail.com`);
      console.log(` EMAIL_PASS=your_16_digit_app_password`);
      console.log(`======================================================================\n`);
      return;
    }

    try {
      const mailOptions = {
        from: `"Project Workspace Alert" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 25px; color: #333; background-color: #f4f6f9; border-radius: 12px;">
            <h2 style="color: #4f46e5; margin-top: 0;">Project Management System Notification</h2>
            <hr style="border: 0; border-top: 1px solid #e5e7eb;" />
            <p style="font-size: 16px; font-weight: bold; margin-top: 15px; color: #1e293b;">${subject}</p>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 10px; border-left: 5px solid #4f46e5; margin: 15px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
              <p style="font-size: 15px; margin: 0; white-space: pre-wrap; line-height: 1.6;">${message}</p>
            </div>
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
              This is an automated security notification from your Project Management System workspace.
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`\n[GMAIL DISPATCH SUCCESS] Sent email to ${recipientEmail} | Message ID: ${info.messageId}\n`);
    } catch (error: any) {
      console.error(`\n[GMAIL DISPATCH ERROR] Could not send email to ${recipientEmail}:`, error.message || error, '\n');
    }
  }
}
