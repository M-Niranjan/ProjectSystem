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

  public static async sendInvitationEmail(
    recipientEmail: string,
    organizationName: string,
    organizationCode: string,
    inviteLink: string
  ): Promise<void> {
    const transporter = this.getTransporter();

    if (!transporter) {
      console.log(`\n======================================================================`);
      console.log(` 📧 TASKFLOW INVITATION DISPATCH`);
      console.log(` RECIPIENT      : ${recipientEmail}`);
      console.log(` ORGANIZATION   : ${organizationName}`);
      console.log(` WORKSPACE CODE : ${organizationCode}`);
      console.log(` INVITATION LINK: ${inviteLink}`);
      console.log(`----------------------------------------------------------------------`);
      console.log(` TaskFlow Invitation: You have been invited to ${organizationName}.`);
      console.log(` To activate your account, open the invitation link in your browser:`);
      console.log(` ${inviteLink}`);
      console.log(`======================================================================\n`);
      return;
    }

    try {
      const mailOptions = {
        from: `"TaskFlow Workspaces" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `TaskFlow: You have been invited to ${organizationName}`,
        text: `TaskFlow\n\nYou have been invited to ${organizationName}.\n\nOrganization: ${organizationName}\nWorkspace Code: ${organizationCode}\nEmail: ${recipientEmail}\n\nAccept your invitation and set your password here:\n${inviteLink}\n\nThis invitation link is unique to you.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 28px;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #38bdf8;">
                TASK<span style="color: #6366f1;">FLOW</span>
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; font-weight: 700;">
                Project Management System
              </p>
            </div>

            <div style="background-color: #1e293b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #ffffff;">
                You have been invited to ${organizationName}
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #cbd5e1;">
                An administrator has invited you to join the <strong>${organizationName}</strong> workspace on TaskFlow. Please accept your invitation to set your account password and begin collaborating.
              </p>

              <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #38bdf8;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">
                  <strong>Organization:</strong> <span style="color: #f8fafc;">${organizationName}</span>
                </p>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">
                  <strong>Workspace Code:</strong> <span style="font-family: monospace; font-size: 14px; color: #38bdf8; font-weight: 700;">${organizationCode}</span>
                </p>
                <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                  <strong>Email:</strong> <span style="color: #f8fafc;">${recipientEmail}</span>
                </p>
              </div>

              <div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.4);">
                  Accept Invitation &rarr;
                </a>
              </div>
            </div>

            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0; text-align: center;">
              This invitation link is secure and unique to your email address. Do not share this email with anyone.
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`\n[GMAIL INVITATION SUCCESS] Sent invite to ${recipientEmail} | Message ID: ${info.messageId}\n`);
    } catch (error: any) {
      console.error(`\n[GMAIL INVITATION ERROR] Could not send invite email to ${recipientEmail}:`, error.message || error, '\n');
    }
  }
}
