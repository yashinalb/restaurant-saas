import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpSecure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === 'True';

    console.log('📧 Email Service Configuration:', {
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpSecure,
      user: process.env.SMTP_USER,
    });

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: smtpPort,
      secure: smtpSecure, // ✅ true for 465 (SSL), false for 587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      // ✅ Add these for better compatibility
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production', // Don't reject in dev
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // ✅ Verify connection on startup
    this.transporter.verify((error, _success) => {
      if (error) {
        console.error('❌ SMTP Connection Error:', error);
      } else {
        console.log('✅ SMTP Server ready to send emails');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const fromName = process.env.SMTP_FROM_NAME || 'Admin SaaS';
      const fromEmail = process.env.SMTP_FROM || 'noreply@admin-saas.com';

      console.log('📤 Sending email to:', options.to);

      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log('✅ Email sent successfully:', info.messageId);
    } catch (error) {
      console.error('❌ Email send error:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:5178';
    const resetUrl = `${adminPanelUrl}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #2563eb; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Şifre Sıfırlama Talebi</h1>
          </div>
          <div class="content">
            <p>Merhaba,</p>
            <p>Admin SaaS admin hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
            <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Şifreyi Sıfırla</a>
            </p>
            <p>Veya bu linki tarayıcınıza kopyalayıp yapıştırın:</p>
            <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Güvenlik Uyarısı:</strong><br>
              Bu link 1 saat içinde geçerliliğini yitirecektir. Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Admin SaaS. Tüm hakları saklıdır.</p>
            <p>Bu otomatik bir e-postadır. Lütfen yanıtlamayın.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
    Şifre Sıfırlama Talebi

    Admin SaaS admin hesabınız için şifre sıfırlama talebinde bulundunuz.

    Şifrenizi sıfırlamak için bu linke tıklayın: ${resetUrl}

    Bu link 1 saat içinde geçerliliğini yitirecektir.

    Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.

    © ${new Date().getFullYear()} Admin SaaS
    `;

    await this.sendEmail({
      to: email,
      subject: 'Şifre Sıfırlama Talebi - Admin SaaS',
      html,
      text,
    });
  }
  async sendUserInvitation(
    email: string,
    tenantName: string,
    inviterName: string,
    roleName: string,
    invitationToken: string
  ): Promise<void> {
    const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:';
    const acceptUrl = `${adminPanelUrl}/accept-invitation?token=${invitationToken}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #2563eb; 
          color: white; 
          text-decoration: none; 
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        .info-box { background: #e0f2fe; border-left: 4px solid #0284c7; padding: 12px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You're Invited!</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p><strong>${inviterName}</strong> has invited you to join <strong>${tenantName}</strong> on Admin SaaS.</p>
          
          <div class="info-box">
            <strong>Your Role:</strong> ${roleName}
          </div>

          <p>Click the button below to accept the invitation and create your account:</p>
          <p style="text-align: center;">
            <a href="${acceptUrl}" class="button">Accept Invitation</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${acceptUrl}</p>
          
          <p><strong>⚠️ This invitation expires in 7 days.</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Admin SaaS. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const text = `
    You're Invited to ${tenantName}!

    ${inviterName} has invited you to join ${tenantName} on Admin SaaS.

    Your Role: ${roleName}

    Accept the invitation: ${acceptUrl}

    This invitation expires in 7 days.

    © ${new Date().getFullYear()} Admin SaaS
      `;

    await this.sendEmail({
      to: email,
      subject: `You're invited to join ${tenantName} - Admin SaaS`,
      html,
      text,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string, tenantName: string): Promise<void> {
    const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:5178';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #10b981; 
          color: white; 
          text-decoration: none; 
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${tenantName}! 🎉</h1>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>
          <p>Your account has been successfully created!</p>
          <p>You can now log in to the admin panel and start working with your team.</p>
          <p style="text-align: center;">
            <a href="${adminPanelUrl}/login" class="button">Go to Admin Panel</a>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Admin SaaS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    await this.sendEmail({
      to: email,
      subject: `Welcome to ${tenantName}!`,
      html,
      text: `Welcome to ${tenantName}! Your account is ready. Login at: ${adminPanelUrl}/login`,
    });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerification(
    email: string,
    firstName: string,
    verificationToken: string
  ): Promise<void> {
    const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:5178';
    const verifyUrl = `${adminPanelUrl}/verify-email?token=${verificationToken}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #2563eb;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        .info-box { background: #e0f2fe; border-left: 4px solid #0284c7; padding: 12px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email Address</h1>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>
          <p>Thank you for creating your account! Before you can access the system, please verify your email address.</p>

          <div class="info-box">
            <strong>Why verify?</strong><br>
            Email verification ensures account security and helps us communicate important updates to you.
          </div>

          <p>Click the button below to verify your email address:</p>
          <p style="text-align: center;">
            <a href="${verifyUrl}" class="button">Verify Email Address</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${verifyUrl}</p>

          <p><strong>⚠️ This verification link expires in 24 hours.</strong></p>
          <p>If you didn't create this account, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Admin SaaS. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const text = `
    Verify Your Email Address

    Hi ${firstName},

    Thank you for creating your account! Please verify your email address by clicking the link below:

    ${verifyUrl}

    This verification link expires in 24 hours.

    If you didn't create this account, please ignore this email.

    © ${new Date().getFullYear()} Admin SaaS
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address - Admin SaaS',
      html,
      text,
    });
  }

  /**
   * Send verification success confirmation email
   */
  async sendVerificationSuccessEmail(
    email: string,
    firstName: string
  ): Promise<void> {
    const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:5178';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #10b981;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Verified Successfully! ✓</h1>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>
          <p>Your email address has been verified successfully! You can now access all features of the platform.</p>
          <p style="text-align: center;">
            <a href="${adminPanelUrl}/login" class="button">Go to Admin Panel</a>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Admin SaaS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Email Verified Successfully - Admin SaaS',
      html,
      text: `Email Verified Successfully! You can now log in at: ${adminPanelUrl}/login`,
    });
  }

  /**
   * 🔒 SECURITY: Send IP change notification email
   */
  async sendIPChangeNotification(
    email: string,
    firstName: string,
    oldIP: string,
    newIP: string,
    timestamp: Date,
    userAgent?: string
  ): Promise<void> {
    const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:';
    const securityUrl = `${adminPanelUrl}/security/sessions`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .alert-box {
          background: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 16px;
          margin: 20px 0;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .info-table td {
          padding: 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-table td:first-child {
          font-weight: bold;
          width: 40%;
          color: #6b7280;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #2563eb;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Security Alert: New Login Location</h1>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>

          <div class="alert-box">
            <strong>We detected a login to your account from a new IP address.</strong>
          </div>

          <p>If this was you, you can safely ignore this email. If this wasn't you, please secure your account immediately.</p>

          <table class="info-table">
            <tr>
              <td>Previous IP Address:</td>
              <td>${oldIP}</td>
            </tr>
            <tr>
              <td>New IP Address:</td>
              <td>${newIP}</td>
            </tr>
            <tr>
              <td>Date & Time:</td>
              <td>${timestamp.toLocaleString('en-US', {
                timeZone: 'UTC',
                dateStyle: 'full',
                timeStyle: 'long'
              })} UTC</td>
            </tr>
            ${userAgent ? `
            <tr>
              <td>Device/Browser:</td>
              <td>${userAgent}</td>
            </tr>
            ` : ''}
          </table>

          <h3>What should I do?</h3>
          <ul>
            <li><strong>If this was you:</strong> No action needed. You're all set!</li>
            <li><strong>If this wasn't you:</strong>
              <ol>
                <li>Change your password immediately</li>
                <li>Review your active sessions and revoke suspicious ones</li>
                <li>Enable two-factor authentication (if available)</li>
              </ol>
            </li>
          </ul>

          <p style="text-align: center;">
            <a href="${securityUrl}" class="button">View Active Sessions</a>
          </p>

          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <strong>Security Tip:</strong> Never share your password with anyone. We will never ask for your password via email.
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Admin SaaS. All rights reserved.</p>
          <p>This is an automated security notification.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const text = `
⚠️ Security Alert: New Login Location

Hi ${firstName},

We detected a login to your account from a new IP address.

Previous IP Address: ${oldIP}
New IP Address: ${newIP}
Date & Time: ${timestamp.toISOString()}
${userAgent ? `Device/Browser: ${userAgent}` : ''}

If this was you, you can safely ignore this email.

If this wasn't you:
1. Change your password immediately: ${adminPanelUrl}/reset-password
2. Review active sessions: ${securityUrl}
3. Enable two-factor authentication

Security Tip: Never share your password with anyone.

© ${new Date().getFullYear()} Admin SaaS
    `;

    await this.sendEmail({
      to: email,
      subject: '⚠️ Security Alert: New Login Location Detected',
      html,
      text,
    });
  }
}

export const emailService = new EmailService();