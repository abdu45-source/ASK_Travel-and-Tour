import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  provider: 'brevo' | 'smtp' | 'simulated';
  error?: string;
  ipBlocked?: boolean;
  blockedIp?: string;
  authUrl?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private brevo: BrevoClient | null = null;
  private transporter: nodemailer.Transporter | null = null;
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly ownerEmail: string;

  constructor(private configService: ConfigService) {
    this.senderEmail =
      this.configService.get<string>('BREVO_SENDER_EMAIL') || 'npath254@gmail.com';
    this.senderName =
      this.configService.get<string>('BREVO_SENDER_NAME') || 'Ask Tour and Travel';
    this.ownerEmail =
      this.configService.get<string>('OWNER_EMAIL') || 'owner@askdigital.et';

    this.initializeBrevo();
    this.initializeTransporter();
  }

  getOwnerEmail(): string {
    return this.ownerEmail;
  }

  getSenderEmail(): string {
    return this.senderEmail;
  }

  private initializeBrevo() {
    const apiKey =
      this.configService.get<string>('BREVO_API_KEY') ||
      process.env.BREVO_API_KEY;

    if (apiKey && apiKey.trim().length > 0 && !apiKey.includes('your_')) {
      try {
        this.brevo = new BrevoClient({ apiKey: apiKey.trim() });
        this.logger.log(`[Brevo API] Brevo transactional email client initialized successfully with sender: "${this.senderName}" <${this.senderEmail}>.`);
      } catch (err: any) {
        this.logger.warn(`[Brevo API] Failed to initialize BrevoClient: ${err.message}`);
        this.brevo = null;
      }
    } else {
      this.logger.warn('[Brevo API] BREVO_API_KEY not configured or placeholder used.');
    }
  }

  private initializeTransporter() {
    const host =
      this.configService.get<string>('SMTP_HOST') ||
      this.configService.get<string>('MAIL_HOST') ||
      'smtp.gmail.com';
    const port = parseInt(
      this.configService.get<string>('SMTP_PORT') ||
        this.configService.get<string>('MAIL_PORT') ||
        '465',
      10,
    );
    const user =
      this.configService.get<string>('SMTP_USER') ||
      this.configService.get<string>('GMAIL_USER') ||
      this.configService.get<string>('MAIL_USER');
    const pass =
      this.configService.get<string>('SMTP_PASS') ||
      this.configService.get<string>('GMAIL_APP_PASS') ||
      this.configService.get<string>('MAIL_PASS');

    if (user && pass && !user.includes('your_') && !pass.includes('your_')) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass,
          },
        });
        this.logger.log(`[SMTP Live Transport] Configured for ${host}:${port} (${user})`);
      } catch (err) {
        this.logger.warn(`Failed to initialize SMTP transport: ${(err as any).message}`);
        this.transporter = null;
      }
    }
  }

  async sendMail(options: EmailOptions): Promise<EmailDispatchResult> {
    const sender = { name: this.senderName, email: this.senderEmail };
    let isIpBlocked = false;
    let blockedIp: string | undefined;
    let lastError: string | undefined;

    // 1. Primary: Deliver via Brevo Transactional Email API SDK
    if (this.brevo) {
      try {
        const result = await this.brevo.transactionalEmails.sendTransacEmail({
          sender,
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text || options.html.replace(/<[^>]+>/g, ' ').trim(),
        });

        this.logger.log(
          `[Brevo API] REAL email successfully delivered to ${options.to}. MsgID: ${result.messageId}`,
        );
        return { success: true, messageId: result.messageId, provider: 'brevo' };
      } catch (error: any) {
        const errMsg = error?.body?.message || error?.message || 'Brevo dispatch error';
        lastError = errMsg;
        this.logger.warn(`[Brevo API Warning] ${errMsg}`);
        if (errMsg.includes('unrecognised IP address') || errMsg.includes('authorised_ips')) {
          isIpBlocked = true;
          const ipMatch = errMsg.match(/IP address\s+([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/i);
          blockedIp = ipMatch ? ipMatch[1] : '196.188.252.99';
          this.logger.warn(
            `[Brevo Security Notice] Brevo blocked live email because IP ${blockedIp} is not authorized. Authorize at: https://app.brevo.com/security/authorised_ips or disable IP blocking.`,
          );
        }
      }
    }

    // 2. Secondary: Live SMTP Relay (e.g., Gmail SSL 465 or custom SMTP)
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: `"${this.senderName}" <${this.senderEmail}>`,
          to: options.to,
          subject: options.subject,
          text: options.text || options.html.replace(/<[^>]+>/g, ' '),
          html: options.html,
        });
        this.logger.log(`[SMTP Live Transport] REAL email sent successfully to ${options.to}. MsgID: ${info.messageId}`);
        return { success: true, messageId: info.messageId, provider: 'smtp' };
      } catch (error: any) {
        this.logger.warn(`[SMTP Live Error] ${error.message}`);
        lastError = error.message;
      }
    }

    // 3. Fallback: Log and report precise status
    const simulatedMsgId = `brevo-sim-${Date.now().toString(36)}-${Math.floor(1000 + Math.random() * 9000)}`;
    this.logger.log(
      `[Email Dispatch (Fallback Mode)]\nTo: ${options.to}\nSubject: ${options.subject}\nSender: ${this.senderName} <${this.senderEmail}>\nSimulatedMsgID: ${simulatedMsgId}\nReason: ${lastError}`,
    );

    return {
      success: true,
      messageId: simulatedMsgId,
      provider: 'simulated',
      ipBlocked: isIpBlocked,
      blockedIp: blockedIp || '196.188.252.99',
      authUrl: 'https://app.brevo.com/security/authorised_ips',
      error: lastError,
    };
  }

  /**
   * Send Referral & Access Verification Code Email to Client or Agent on Registration
   */
  async sendReferralVerificationEmail(
    toEmail: string,
    name: string,
    referralCode: string,
    role: string = 'CLIENT',
  ): Promise<EmailDispatchResult> {
    const roleTitle = role === 'AGENT' ? 'Authorized Partner Agent' : 'Valued Traveler';
    const subject = `Your ASK Tour & Travel Referral & Access Code: ${referralCode}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f3; margin: 0; padding: 24px; color: #292524; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; }
    .header { background: #1c1917; padding: 28px; text-align: center; }
    .header h1 { color: #f59e0b; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { color: #d6d3d1; margin: 6px 0 0; font-size: 12px; }
    .content { padding: 32px; }
    .content h2 { font-size: 18px; color: #1c1917; margin-top: 0; }
    .content p { font-size: 14px; line-height: 1.6; color: #44403c; margin: 12px 0; }
    .code-box { background: #fdfbf7; border: 2px dashed #d97706; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
    .code-box .label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #b45309; letter-spacing: 1.5px; }
    .code-box .code { font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 800; color: #1c1917; letter-spacing: 4px; margin: 12px 0; }
    .instruction-card { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #065f46; line-height: 1.5; }
    .footer { background: #fafaf9; border-top: 1px solid #f5f5f4; padding: 20px 32px; text-align: center; font-size: 11px; color: #a8a29e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ASK ETHIOPIA TOURS</h1>
      <p>Secure Account Onboarding & Referral Activation</p>
    </div>
    <div class="content">
      <h2>Hello, ${name}!</h2>
      <p>You have initiated registration as an <strong>${roleTitle}</strong> at ASK Ethiopian Tour & Travel.</p>
      <p>Here is your exclusive <strong>Referral & Account Access Code</strong>:</p>
      
      <div class="code-box">
        <div class="label">Your Official Referral Code</div>
        <div class="code">${referralCode}</div>
        <p style="font-size: 12px; color: #78716c; margin: 8px 0 0;">Valid for 30 minutes from issuance</p>
      </div>

      <div class="instruction-card">
        <strong>Next Step to Access Your Account:</strong><br/>
        Please return to the registration window and enter this referral code in <strong>Step 2</strong> of the registration form. Once verified, your account will be activated and you will directly access your portal.
      </div>

      <p style="font-size: 12px; color: #78716c; margin-top: 24px;">
        If you did not initiate this request, you can safely disregard this email. For inquiries, reach Abduselam Ibrahim at <a href="mailto:abduselamibrahim85@gmail.com" style="color: #059669;">abduselamibrahim85@gmail.com</a> / 0900572995.
      </p>
    </div>
    <div class="footer">
      <p>© 2026 ASK Digital Technologies & Tour Operator. Kebele 04, Bahir Dar, Ethiopia.</p>
    </div>
  </div>
</body>
</html>
`;
    return this.sendMail({ to: toEmail, subject, html });
  }

  /**
   * 1. Send Welcome Email to Client on Sign Up
   */
  async sendClientWelcomeEmail(toEmail: string, clientName: string): Promise<EmailDispatchResult> {
    const subject = 'Welcome to ASK Ethiopian Tour & Travel — Your Journey Begins';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f3; margin: 0; padding: 24px; color: #292524; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; }
    .header { background: #1c1917; padding: 32px; text-align: center; }
    .header h1 { color: #f59e0b; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { color: #d6d3d1; margin: 6px 0 0; font-size: 13px; }
    .content { padding: 32px; }
    .content h2 { font-size: 18px; color: #1c1917; margin-top: 0; }
    .content p { font-size: 14px; line-height: 1.6; color: #44403c; margin: 12px 0; }
    .card { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .card h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #78716c; margin: 0 0 8px; }
    .card ul { margin: 0; padding-left: 20px; font-size: 13px; color: #44403c; }
    .card li { margin-bottom: 6px; }
    .btn { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 13px; margin: 16px 0; }
    .footer { background: #fafaf9; border-top: 1px solid #f5f5f4; padding: 20px 32px; text-align: center; font-size: 11px; color: #a8a29e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ASK ETHIOPIA TOURS</h1>
      <p>Premier Expedition & Heritage Management</p>
    </div>
    <div class="content">
      <h2>Welcome, ${clientName}!</h2>
      <p>Thank you for creating an account with ASK Ethiopian Tour & Travel. We are thrilled to welcome you to the cradle of humanity.</p>
      <p>Your account is fully activated. You can now explore curated expeditions, access live seasonal pricing in ETB, and manage all your booking reservations seamlessly.</p>
      
      <div class="card">
        <h3>Your Traveler Privileges</h3>
        <ul>
          <li><strong>Direct Expedition Booking:</strong> Reserve journeys across Lalibela, Simien Mountains, Danakil Depression, and Lake Tana.</li>
          <li><strong>Fast 1-Page Travel Vouchers:</strong> Download verified PDF confirmation documents instantly upon booking approval.</li>
          <li><strong>Fair Tiered Cancellation Protection:</strong> Enjoy full cancellation rights up until travel day with clear 2%, 4%, and 8% administrative tiers.</li>
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="http://localhost:5173/destinations" class="btn">Explore Destinations</a>
      </div>

      <p style="font-size: 12px; color: #78716c; margin-top: 24px;">
        Need personalized expedition arrangements? Contact our operations team in Bahir Dar or reach our lead full-stack developer and support desk at <a href="mailto:abduselamibrahim85@gmail.com" style="color: #059669;">abduselamibrahim85@gmail.com</a> / 0900572995.
      </p>
    </div>
    <div class="footer">
      <p>© 2026 ASK Digital Technologies & Tour Operator. Kebele 04, Bahir Dar, Ethiopia.</p>
    </div>
  </div>
</body>
</html>
`;
    return this.sendMail({ to: toEmail, subject, html });
  }

  /**
   * 2. Send Referral Code Email to Agent on Registration
   */
  async sendAgentReferralCodeEmail(
    toEmail: string,
    agentName: string,
    referralCode: string,
    initialPassword?: string,
  ): Promise<EmailDispatchResult> {
    const subject = `Official ASK Travel Partner Activation — Exclusive Referral Code: ${referralCode}`;
    const referralLink = `http://localhost:5173/register?ref=${referralCode}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f3; margin: 0; padding: 24px; color: #292524; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; }
    .header { background: #0f172a; padding: 32px; text-align: center; }
    .header h1 { color: #f59e0b; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { color: #94a3b8; margin: 6px 0 0; font-size: 13px; }
    .content { padding: 32px; }
    .code-box { background: #f8fafc; border: 2px dashed #059669; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0; }
    .code-box .label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #059669; letter-spacing: 1px; }
    .code-box .code { font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: 3px; margin: 8px 0; }
    .code-box .url { font-size: 12px; color: #64748b; word-break: break-all; }
    .card { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .card h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #78716c; margin: 0 0 8px; }
    .card ul { margin: 0; padding-left: 20px; font-size: 13px; color: #44403c; }
    .card li { margin-bottom: 6px; }
    .btn { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 13px; margin: 16px 0; }
    .footer { background: #fafaf9; border-top: 1px solid #f5f5f4; padding: 20px 32px; text-align: center; font-size: 11px; color: #a8a29e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ASK TRAVEL PARTNER PROGRAM</h1>
      <p>Official Agency Referral Activation</p>
    </div>
    <div class="content">
      <h2 style="font-size: 18px; margin-top: 0;">Congratulations, ${agentName}!</h2>
      <p>You have been onboarded as an authorized ASK Ethiopian Tour & Travel Partner. Your dedicated agent ledger has been created in our Bahir Dar system.</p>
      
      <div class="code-box">
        <div class="label">Your Exclusive Referral Code</div>
        <div class="code">${referralCode}</div>
        <div class="url">Shareable Link: <a href="${referralLink}" style="color: #059669;">${referralLink}</a></div>
      </div>

      <div class="card">
        <h3>Commission Ledger Structure</h3>
        <ul>
          <li><strong>10% Standard Commission:</strong> Automatically credited to your agent wallet immediately upon manager approval of any client booking registered under your code.</li>
          <li><strong>Tiered Penalty Commission:</strong> Even when a client cancels, you receive a direct percentage commission of the cancellation penalty fee (2% / 4% / 8% based on elapsed tier).</li>
          <li><strong>Fast Bank Payouts:</strong> Withdraw your wallet balance directly to Commercial Bank of Ethiopia (CBE) or Telebirr Birr accounts.</li>
        </ul>
      </div>

      ${
        initialPassword
          ? `<p style="font-size: 13px; background: #fef3c7; border: 1px solid #fde68a; padding: 10px 14px; border-radius: 8px; color: #92400e;">
               <strong>Initial Login Password:</strong> <code>${initialPassword}</code><br/>
               <span style="font-size: 11px;">Please log in and update your security credentials in your partner dashboard.</span>
             </p>`
          : ''
      }

      <div style="text-align: center;">
        <a href="http://localhost:5173/login" class="btn">Access Agent Dashboard</a>
      </div>
    </div>
    <div class="footer">
      <p>Technical Architect & Support: Abduselam Ibrahim (abduselamibrahim85@gmail.com / 0900572995)</p>
      <p>© 2026 ASK Digital Technologies. Kebele 04, Bahir Dar, Ethiopia.</p>
    </div>
  </div>
</body>
</html>
`;
    return this.sendMail({ to: toEmail, subject, html });
  }

  /**
   * 3. Send Executive Notification Email to the Owner
   */
  async sendOwnerExecutiveAlert(
    subject: string,
    eventTitle: string,
    details: Record<string, any>,
    ctaUrl?: string,
  ): Promise<EmailDispatchResult> {
    const fullSubject = `[Executive Alert] ${subject}`;
    const tableRows = Object.entries(details)
      .map(
        ([key, val]) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e7e5e4; font-weight: 600; color: #57534e; width: 38%; font-size: 12px; text-transform: capitalize;">
          ${key.replace(/_/g, ' ')}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e7e5e4; color: #1c1917; font-size: 12px; font-family: ui-monospace, monospace;">
          ${typeof val === 'number' ? val.toLocaleString() : String(val)}
        </td>
      </tr>`,
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f3; margin: 0; padding: 24px; color: #292524; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; }
    .header { background: #7c2d12; padding: 24px 32px; text-align: left; }
    .header h1 { color: #fef08a; margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { color: #fed7aa; margin: 4px 0 0; font-size: 12px; }
    .content { padding: 32px; }
    .event-badge { display: inline-block; background: #ffedd5; color: #9a3412; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #fafaf9; border-radius: 10px; overflow: hidden; border: 1px solid #e7e5e4; }
    .btn { display: inline-block; background: #1c1917; color: #ffffff !important; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 12px; }
    .footer { background: #fafaf9; border-top: 1px solid #f5f5f4; padding: 16px 32px; text-align: center; font-size: 11px; color: #a8a29e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ASK AGENCY EXECUTIVE CONTROL</h1>
      <p>Owner Operational & Financial Intelligence</p>
    </div>
    <div class="content">
      <div class="event-badge">System Event Log</div>
      <h2 style="font-size: 17px; margin-top: 0; color: #1c1917;">${eventTitle}</h2>
      
      <table>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      ${
        ctaUrl
          ? `<div style="margin-top: 24px;">
               <a href="${ctaUrl}" class="btn">View in Owner Executive Dashboard</a>
             </div>`
          : ''
      }
    </div>
    <div class="footer">
      <p>Delivered to Agency Owner: ${this.ownerEmail} • Developer: Abduselam Ibrahim (0900572995)</p>
    </div>
  </div>
</body>
</html>
`;

    return this.sendMail({ to: this.ownerEmail, subject: fullSubject, html });
  }

  /**
   * 4. Send Booking Confirmation Email to Registered Client
   */
  async sendBookingConfirmationToClient(
    toEmail: string,
    clientName: string,
    data: {
      bookingRef: string;
      destinationTitle: string;
      travelDate: string;
      travelers: number;
      totalPrice: number;
      status: string;
    },
  ): Promise<EmailDispatchResult> {
    const subject = `Booking Confirmed: ${data.destinationTitle} (Ref #${data.bookingRef})`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f3; margin: 0; padding: 24px; color: #292524; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; }
    .header { background: #064e3b; padding: 28px 32px; text-align: left; }
    .header h1 { color: #fde68a; margin: 0; font-size: 20px; font-weight: 700; }
    .header p { color: #a7f3d0; margin: 4px 0 0; font-size: 12px; }
    .content { padding: 32px; }
    .table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #fafaf9; border-radius: 10px; overflow: hidden; border: 1px solid #e7e5e4; }
    .table td { padding: 10px 14px; font-size: 12px; border-bottom: 1px solid #e7e5e4; }
    .table td.label { font-weight: 600; color: #57534e; width: 40%; }
    .table td.val { font-weight: 700; color: #1c1917; }
    .btn { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; padding: 11px 22px; border-radius: 10px; font-weight: 600; font-size: 13px; margin: 16px 0; }
    .footer { background: #fafaf9; border-top: 1px solid #f5f5f4; padding: 18px 32px; text-align: center; font-size: 11px; color: #a8a29e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>EXPEDITION RESERVATION CONFIRMED</h1>
      <p>ASK Ethiopian Tour & Travel Operations</p>
    </div>
    <div class="content">
      <h2 style="font-size: 17px; margin-top: 0;">Dear ${clientName},</h2>
      <p style="font-size: 13px; line-height: 1.6; color: #44403c;">
        Your expedition reservation for <strong>${data.destinationTitle}</strong> has been confirmed and logged in our Bahir Dar central operations system.
      </p>

      <table class="table">
        <tbody>
          <tr>
            <td class="label">Booking Reference</td>
            <td class="val font-mono">#${data.bookingRef}</td>
          </tr>
          <tr>
            <td class="label">Destination</td>
            <td class="val">${data.destinationTitle}</td>
          </tr>
          <tr>
            <td class="label">Scheduled Travel Date</td>
            <td class="val">${data.travelDate}</td>
          </tr>
          <tr>
            <td class="label">Total Travelers</td>
            <td class="val">${data.travelers} Pax</td>
          </tr>
          <tr>
            <td class="label">Total Price (ETB)</td>
            <td class="val" style="color: #065f46;">${data.totalPrice.toLocaleString()} ETB</td>
          </tr>
          <tr>
            <td class="label">Reservation Status</td>
            <td class="val" style="color: #059669;">${data.status}</td>
          </tr>
        </tbody>
      </table>

      <div style="text-align: center;">
        <a href="http://localhost:5173/dashboard/client" class="btn">View Reservation & Download PDF Voucher</a>
      </div>

      <p style="font-size: 12px; color: #78716c; margin-top: 20px;">
        Need to adjust travel dates or special dietary arrangements? Contact our operations office at <strong>0900572995</strong> or email <a href="mailto:abduselamibrahim85@gmail.com" style="color: #059669;">abduselamibrahim85@gmail.com</a>.
      </p>
    </div>
    <div class="footer">
      <p>© 2026 ASK Digital Technologies & Tour Operator. Kebele 04, Bahir Dar, Ethiopia.</p>
    </div>
  </div>
</body>
</html>
`;
    return this.sendMail({ to: toEmail, subject, html });
  }

  /**
   * 5. Send Cancellation Notice & Refund Settlement to Registered Client
   */
  async sendCancellationNoticeToClient(
    toEmail: string,
    clientName: string,
    data: {
      bookingRef: string;
      destinationTitle: string;
      originalPrice: number;
      penaltyFee: number;
      penaltyPercentage: number;
      refundAmount: number;
      refundDestination?: string;
      reason?: string;
    },
  ): Promise<EmailDispatchResult> {
    const subject = `Reservation Cancellation & Refund Statement: #${data.bookingRef}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f3; margin: 0; padding: 24px; color: #292524; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; }
    .header { background: #881337; padding: 28px 32px; text-align: left; }
    .header h1 { color: #fecdd3; margin: 0; font-size: 20px; font-weight: 700; }
    .header p { color: #fda4af; margin: 4px 0 0; font-size: 12px; }
    .content { padding: 32px; }
    .table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #fafaf9; border-radius: 10px; overflow: hidden; border: 1px solid #e7e5e4; }
    .table td { padding: 10px 14px; font-size: 12px; border-bottom: 1px solid #e7e5e4; }
    .table td.label { font-weight: 600; color: #57534e; width: 44%; }
    .table td.val { font-weight: 700; color: #1c1917; }
    .btn { display: inline-block; background: #9f1239; color: #ffffff !important; text-decoration: none; padding: 11px 22px; border-radius: 10px; font-weight: 600; font-size: 13px; margin: 16px 0; }
    .footer { background: #fafaf9; border-top: 1px solid #f5f5f4; padding: 18px 32px; text-align: center; font-size: 11px; color: #a8a29e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CANCELLATION & SETTLEMENT ADVICE</h1>
      <p>ASK Tour & Travel Agency Financial Ledger</p>
    </div>
    <div class="content">
      <h2 style="font-size: 17px; margin-top: 0;">Dear ${clientName},</h2>
      <p style="font-size: 13px; line-height: 1.6; color: #44403c;">
        Per your request, booking <strong>#${data.bookingRef}</strong> for <strong>${data.destinationTitle}</strong> has been cancelled under our fair tiered policy.
      </p>

      <table class="table">
        <tbody>
          <tr>
            <td class="label">Original Booking Value</td>
            <td class="val">${data.originalPrice.toLocaleString()} ETB</td>
          </tr>
          <tr>
            <td class="label">Cancellation Penalty (${data.penaltyPercentage}%)</td>
            <td class="val" style="color: #be123c;">-${data.penaltyFee.toFixed(2)} ETB</td>
          </tr>
          <tr>
            <td class="label">Net Refund Disbursed</td>
            <td class="val" style="color: #047857; font-size: 14px;">+${data.refundAmount.toFixed(2)} ETB</td>
          </tr>
          <tr>
            <td class="label">Refund Remittance Destination</td>
            <td class="val">${data.refundDestination || 'Original payment method (Telebirr / CBE)'}</td>
          </tr>
          ${
            data.reason
              ? `<tr>
                  <td class="label">Reason on Record</td>
                  <td class="val" style="font-weight: normal; color: #44403c;">${data.reason}</td>
                </tr>`
              : ''
          }
        </tbody>
      </table>

      <div style="text-align: center;">
        <a href="http://localhost:5173/dashboard/client" class="btn">Download Official 1-Page Statement (PDF)</a>
      </div>

      <p style="font-size: 12px; color: #78716c; margin-top: 20px;">
        If you have any questions regarding your refund remittance, please contact our support desk: <strong>0900572995</strong> or <a href="mailto:abduselamibrahim85@gmail.com" style="color: #9f1239;">abduselamibrahim85@gmail.com</a>.
      </p>
    </div>
    <div class="footer">
      <p>© 2026 ASK Digital Technologies & Tour Operator. Kebele 04, Bahir Dar, Ethiopia.</p>
    </div>
  </div>
</body>
</html>
`;
    return this.sendMail({ to: toEmail, subject, html });
  }

  /**
   * 6. Send Operational Notification Email to Agency Manager
   */
  async sendManagerNotification(
    managerEmail: string,
    managerName: string,
    eventType: string,
    title: string,
    details: Record<string, any>,
    ctaUrl?: string,
  ): Promise<EmailDispatchResult> {
    const subject = `[Manager Alert] ${eventType}: ${title}`;
    const tableRows = Object.entries(details)
      .map(
        ([key, val]) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e7e5e4; font-weight: 600; color: #57534e; width: 40%; font-size: 12px; text-transform: capitalize;">
          ${key.replace(/_/g, ' ')}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e7e5e4; color: #1c1917; font-size: 12px; font-family: ui-monospace, monospace;">
          ${typeof val === 'number' ? val.toLocaleString() : String(val)}
        </td>
      </tr>`,
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f3; margin: 0; padding: 24px; color: #292524; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; }
    .header { background: #1e3a8a; padding: 24px 32px; text-align: left; }
    .header h1 { color: #bfdbfe; margin: 0; font-size: 18px; font-weight: 700; }
    .header p { color: #93c5fd; margin: 4px 0 0; font-size: 12px; }
    .content { padding: 32px; }
    .event-badge { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #fafaf9; border-radius: 10px; overflow: hidden; border: 1px solid #e7e5e4; }
    .btn { display: inline-block; background: #1d4ed8; color: #ffffff !important; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 12px; }
    .footer { background: #fafaf9; border-top: 1px solid #f5f5f4; padding: 16px 32px; text-align: center; font-size: 11px; color: #a8a29e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AGENCY MANAGER NOTIFICATION</h1>
      <p>ASK Operations Management Hub — Bahir Dar</p>
    </div>
    <div class="content">
      <div class="event-badge">${eventType}</div>
      <h2 style="font-size: 17px; margin-top: 0; color: #1c1917;">Dear Manager ${managerName},</h2>
      <p style="font-size: 13px; color: #44403c;">${title}</p>
      
      <table>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      ${
        ctaUrl
          ? `<div style="margin-top: 20px;">
               <a href="${ctaUrl}" class="btn">Open Manager Moderation Queue</a>
             </div>`
          : ''
      }
    </div>
    <div class="footer">
      <p>Delivered to Manager: ${managerEmail} • Support: Abduselam Ibrahim (0900572995)</p>
    </div>
  </div>
</body>
</html>
`;
    return this.sendMail({ to: managerEmail, subject, html });
  }

  /**
   * 7. Send Automated 10% Commission Notification Email to Partner Agent
   */
  async sendAgentCommissionEmail(
    toEmail: string,
    agentName: string,
    data: {
      commissionAmount: number;
      bookingRef: string;
      destinationTitle: string;
      clientName: string;
      totalPrice: number;
      newBalance: number;
    },
  ): Promise<EmailDispatchResult> {
    const subject = `💰 Commission Credited: +${data.commissionAmount.toFixed(2)} ETB for ${data.destinationTitle}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f3; margin: 0; padding: 24px; color: #292524; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; }
    .header { background: #78350f; padding: 28px 32px; text-align: left; }
    .header h1 { color: #fde68a; margin: 0; font-size: 20px; font-weight: 700; }
    .header p { color: #fed7aa; margin: 4px 0 0; font-size: 12px; }
    .content { padding: 32px; }
    .highlight-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: center; }
    .amount { font-size: 26px; font-weight: 800; color: #92400e; margin: 4px 0; }
    .table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #fafaf9; border-radius: 10px; overflow: hidden; border: 1px solid #e7e5e4; }
    .table td { padding: 10px 14px; font-size: 12px; border-bottom: 1px solid #e7e5e4; }
    .table td.label { font-weight: 600; color: #57534e; width: 45%; }
    .table td.val { font-weight: 700; color: #1c1917; }
    .btn { display: inline-block; background: #d97706; color: #ffffff !important; text-decoration: none; padding: 11px 22px; border-radius: 10px; font-weight: 600; font-size: 13px; margin: 16px 0; }
    .footer { background: #fafaf9; border-top: 1px solid #f5f5f4; padding: 18px 32px; text-align: center; font-size: 11px; color: #a8a29e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AUTOMATED COMMISSION DISPATCH</h1>
      <p>ASK Sales & Referral Partner Network</p>
    </div>
    <div class="content">
      <h2 style="font-size: 17px; margin-top: 0; color: #1c1917;">Dear Partner Agent ${agentName},</h2>
      <p style="font-size: 13px; line-height: 1.6; color: #44403c;">
        Congratulations! An expedition booking made through your exclusive referral network has been successfully approved by agency operations.
      </p>

      <div class="highlight-box">
        <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #b45309; letter-spacing: 0.5px;">10% Commission Credited to Your Wallet</span>
        <div class="amount">+${data.commissionAmount.toFixed(2)} ETB</div>
        <span style="font-size: 11px; color: #78350f;">New Available Balance: <strong>${data.newBalance.toFixed(2)} ETB</strong></span>
      </div>

      <table class="table">
        <tbody>
          <tr>
            <td class="label">Booking Reference</td>
            <td class="val font-mono">#${data.bookingRef}</td>
          </tr>
          <tr>
            <td class="label">Destination Package</td>
            <td class="val">${data.destinationTitle}</td>
          </tr>
          <tr>
            <td class="label">Referred Client</td>
            <td class="val">${data.clientName}</td>
          </tr>
          <tr>
            <td class="label">Total Booking Price</td>
            <td class="val">${data.totalPrice.toFixed(2)} ETB</td>
          </tr>
          <tr>
            <td class="label">Partner Commission Rate</td>
            <td class="val">10% Automated</td>
          </tr>
        </tbody>
      </table>

      <div style="text-align: center;">
        <a href="http://localhost:5173/dashboard/agent" class="btn">View Agent Pipeline & Wallet</a>
      </div>
    </div>
    <div class="footer">
      <p>Delivered to Registered Agent: ${toEmail} • Developer: Abduselam Ibrahim (0900572995)</p>
    </div>
  </div>
</body>
</html>
`;
    return this.sendMail({ to: toEmail, subject, html });
  }

  /**
   * 8. Send Dynamic One-Time Referral Invite Email to Client
   */
  async sendClientReferralInviteEmail(
    toEmail: string,
    clientName: string,
    agentName: string,
    referralCode: string,
    personalNote?: string,
  ): Promise<EmailDispatchResult> {
    const subject = `✨ Personal Travel Invitation: Your Exclusive Referral Code from ${agentName} (${referralCode})`;
    const registrationLink = `http://localhost:5173/register?ref=${referralCode}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f3; margin: 0; padding: 24px; color: #292524; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; }
    .header { background: #064e3b; padding: 28px 32px; text-align: left; }
    .header h1 { color: #fde68a; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { color: #a7f3d0; margin: 4px 0 0; font-size: 12px; }
    .content { padding: 32px; }
    .code-box { background: #f0fdf4; border: 2px dashed #059669; border-radius: 14px; padding: 20px; text-align: center; margin: 20px 0; }
    .code-box .label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #059669; letter-spacing: 1px; }
    .code-box .code { font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 28px; font-weight: 800; color: #064e3b; letter-spacing: 3px; margin: 8px 0; }
    .code-box .note { font-size: 11px; color: #047857; margin-top: 4px; font-weight: 600; }
    .note-card { background: #fefce8; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 8px; margin: 18px 0; font-size: 13px; color: #78350f; font-style: italic; }
    .features { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px 20px; margin: 20px 0; }
    .features h4 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #57534e; }
    .features ul { margin: 0; padding-left: 18px; font-size: 12px; color: #44403c; line-height: 1.6; }
    .btn { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; padding: 12px 26px; border-radius: 10px; font-weight: 600; font-size: 13px; margin: 16px 0; text-align: center; }
    .footer { background: #fafaf9; border-top: 1px solid #f5f5f4; padding: 18px 32px; text-align: center; font-size: 11px; color: #a8a29e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ETHIOPIAN EXPEDITION INVITATION</h1>
      <p>ASK Tour & Travel Authorized Partner Network</p>
    </div>
    <div class="content">
      <h2 style="font-size: 18px; margin-top: 0; color: #1c1917;">Hello ${clientName || 'Valued Traveler'},</h2>
      <p style="font-size: 13px; line-height: 1.6; color: #44403c;">
        <strong>${agentName}</strong>, an authorized travel agent partner with ASK Ethiopian Tour & Travel, has generated an exclusive, one-time referral code for you to explore Ethiopia's historic circuits and sacred wonders.
      </p>

      ${
        personalNote
          ? `<div class="note-card">
              <strong style="display:block; font-style:normal; margin-bottom:4px; font-size:11px; text-transform:uppercase; color:#b45309;">Message from ${agentName}:</strong>
              "${personalNote}"
            </div>`
          : ''
      }

      <div class="code-box">
        <div class="label">Your Exclusive One-Time Referral Code</div>
        <div class="code">${referralCode}</div>
        <div class="note">Dynamic 1-Time Activation Code Tied Directly to Your Partner Agent</div>
      </div>

      <div style="text-align: center;">
        <a href="${registrationLink}" class="btn">Complete Registration with Referral Code &rarr;</a>
      </div>

      <div class="features">
        <h4>Privileges of Your Partner Invitation:</h4>
        <ul>
          <li><strong>Direct Dedicated Concierge:</strong> Chat directly with ${agentName} inside your traveler dashboard for itinerary curation and guide assignments.</li>
          <li><strong>Escrow Guarantee:</strong> 100% secured payments for all bookings across Lalibela, Simien Mountains, Harar, Danakil, and Gheralta.</li>
          <li><strong>Fast One-Page Travel Vouchers:</strong> Download instant official travel documents upon reservation approval.</li>
        </ul>
      </div>

      <p style="font-size: 12px; color: #78716c; text-align: center;">
        Or manually copy the code <strong>${referralCode}</strong> and enter it on the <a href="http://localhost:5173/register" style="color: #059669;">registration page</a> under "Agent Referral Code".
      </p>
    </div>
    <div class="footer">
      <p>Issued by Partner Agent: ${agentName} • Support: Abduselam Ibrahim (0900572995)</p>
    </div>
  </div>
</body>
</html>
`;
    return this.sendMail({ to: toEmail, subject, html });
  }
}

