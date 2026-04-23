/**
 * CargoBit Email Service
 * 
 * SendGrid Integration for:
 * - Welcome emails
 * - Password reset
 * - Transport notifications
 * - Insurance policy emails
 * - Offer notifications
 */

import client from '@sendgrid/mail';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@cargobit.eu';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'CargoBit';

if (SENDGRID_API_KEY) {
  client.setApiKey(SENDGRID_API_KEY);
}

// ===========================================
// TYPES
// ===========================================
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  attachments?: Array<{
    content: string;  // Base64 encoded
    filename: string;
    type: string;
    disposition?: 'attachment' | 'inline';
  }>;
}

export interface WelcomeEmailData {
  firstName: string;
  lastName: string;
  verificationUrl: string;
}

export interface PasswordResetData {
  firstName: string;
  resetUrl: string;
  expiresIn: string;
}

export interface TransportNotificationData {
  transportId: string;
  status: string;
  origin: string;
  destination: string;
  pickupDate: string;
  trackingUrl: string;
}

export interface InsurancePolicyData {
  policyNumber: string;
  premium: string;
  coverage: string;
  validFrom: string;
  validUntil: string;
  pdfUrl: string;
}

export interface OfferNotificationData {
  transportId: string;
  origin: string;
  destination: string;
  price: string;
  validUntil: string;
  acceptUrl: string;
}

// ===========================================
// EMAIL SERVICE CLASS
// ===========================================
class EmailService {
  private enabled: boolean;

  constructor() {
    this.enabled = !!SENDGRID_API_KEY;
    if (!this.enabled) {
      console.warn('⚠️ SendGrid API key not configured. Emails will be logged only.');
    }
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.enabled) {
      console.log('📧 [DEV] Email would be sent:', {
        to: options.to,
        subject: options.subject,
        html: options.html.substring(0, 200) + '...',
      });
      return { success: true, messageId: `dev-${Date.now()}` };
    }

    try {
      const msg: any = {
        to: options.to,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      // Use template if provided
      if (options.templateId && options.dynamicTemplateData) {
        msg.templateId = options.templateId;
        msg.dynamicTemplateData = options.dynamicTemplateData;
      }

      // Add attachments if provided
      if (options.attachments) {
        msg.attachments = options.attachments;
      }

      const [response] = await client.send(msg);
      
      return {
        success: true,
        messageId: response.headers['x-message-id'],
      };
    } catch (error: any) {
      console.error('❌ Email send error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ===========================================
  // SPECIFIC EMAIL TEMPLATES
  // ===========================================

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<{ success: boolean }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Willkommen bei CargoBit</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1B2A4A 0%, #2A9D8F 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Willkommen bei CargoBit!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">
              Hallo ${data.firstName} ${data.lastName},
            </p>
            <p style="font-size: 16px; color: #374151;">
              willkommen auf der führenden europäischen Logistik-Plattform. 
              Bitte bestätigen Sie Ihre E-Mail-Adresse, um loszulegen:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.verificationUrl}" 
                 style="background: #2A9D8F; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                E-Mail bestätigen
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">
              Dieser Link ist 24 Stunden gültig.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #9ca3af;">
              CargoBit - Europas führende Transport-Plattform<br>
              Berlin, Deutschland | support@cargobit.eu
            </p>
          </div>
        </body>
      </html>
    `;

    const result = await this.send({
      to: email,
      subject: 'Willkommen bei CargoBit - Bitte bestätigen Sie Ihre E-Mail',
      html,
      text: `Hallo ${data.firstName} ${data.lastName}, willkommen bei CargoBit! Bitte bestätigen Sie Ihre E-Mail: ${data.verificationUrl}`,
    });

    return { success: result.success };
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, data: PasswordResetData): Promise<{ success: boolean }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Passwort zurücksetzen - CargoBit</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1B2A4A; padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Passwort zurücksetzen</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">
              Hallo ${data.firstName},
            </p>
            <p style="font-size: 16px; color: #374151;">
              wir haben eine Anfrage erhalten, Ihr Passwort zurückzusetzen.
              Klicken Sie auf den Button unten, um ein neues Passwort zu erstellen:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetUrl}" 
                 style="background: #2A9D8F; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                Passwort zurücksetzen
              </a>
            </div>
            <p style="font-size: 14px; color: #ef4444;">
              ⚠️ Dieser Link läuft in ${data.expiresIn} ab.
            </p>
            <p style="font-size: 14px; color: #6b7280;">
              Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.
            </p>
          </div>
        </body>
      </html>
    `;

    const result = await this.send({
      to: email,
      subject: 'Passwort zurücksetzen - CargoBit',
      html,
      text: `Hallo ${data.firstName}, klicken Sie hier um Ihr Passwort zurückzusetzen: ${data.resetUrl}`,
    });

    return { success: result.success };
  }

  /**
   * Send transport status notification
   */
  async sendTransportNotification(email: string, data: TransportNotificationData): Promise<{ success: boolean }> {
    const statusLabels: Record<string, string> = {
      'CREATED': 'Erstellt',
      'PUBLISHED': 'Veröffentlicht',
      'ASSIGNED': 'Zugewiesen',
      'IN_TRANSIT': 'Unterwegs',
      'PICKUP_DONE': 'Abgeholt',
      'DELIVERY_DONE': 'Geliefert',
      'COMPLETED': 'Abgeschlossen',
      'CANCELLED': 'Storniert',
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Transport-Update - CargoBit</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1B2A4A; padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Transport-Update</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
              <p style="font-size: 18px; color: #1B2A4A; margin: 0;">
                Status: <strong>${statusLabels[data.status] || data.status}</strong>
              </p>
            </div>
            <div style="background: white; padding: 20px; border-radius: 5px;">
              <p style="margin: 0 0 10px;"><strong>Route:</strong></p>
              <p style="margin: 0; color: #374151;">📍 ${data.origin}</p>
              <p style="margin: 0; color: #374151;">📍 ${data.destination}</p>
              <p style="margin: 10px 0 0; color: #6b7280;">Abholung: ${data.pickupDate}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.trackingUrl}" 
                 style="background: #2A9D8F; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                Transport verfolgen
              </a>
            </div>
            <p style="font-size: 12px; color: #6b7280;">
              Transport-ID: ${data.transportId}
            </p>
          </div>
        </body>
      </html>
    `;

    const result = await this.send({
      to: email,
      subject: `Transport-Update: ${statusLabels[data.status] || data.status} - CargoBit`,
      html,
    });

    return { success: result.success };
  }

  /**
   * Send insurance policy email with PDF attachment
   */
  async sendInsurancePolicy(email: string, data: InsurancePolicyData, pdfBuffer?: Buffer): Promise<{ success: boolean }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Versicherungspolice - CargoBit</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1B2A4A 0%, #2A9D8F 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Ihre Versicherungspolice</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">
              Ihre Transportversicherung wurde erfolgreich abgeschlossen.
            </p>
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #6b7280;">Policennummer:</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: bold;">${data.policyNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280;">Prämie:</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: bold;">${data.premium}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280;">Deckungssumme:</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: bold;">${data.coverage}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280;">Gültig von:</td>
                  <td style="padding: 10px 0; text-align: right;">${data.validFrom}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280;">Gültig bis:</td>
                  <td style="padding: 10px 0; text-align: right;">${data.validUntil}</td>
                </tr>
              </table>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.pdfUrl}" 
                 style="background: #1B2A4A; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                📄 Police herunterladen
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">
              Die Police finden Sie auch im Anhang dieser E-Mail.
            </p>
          </div>
        </body>
      </html>
    `;

    const attachments = pdfBuffer ? [{
      content: pdfBuffer.toString('base64'),
      filename: `Police_${data.policyNumber}.pdf`,
      type: 'application/pdf',
      disposition: 'attachment' as const,
    }] : undefined;

    const result = await this.send({
      to: email,
      subject: `Ihre Versicherungspolice ${data.policyNumber} - CargoBit`,
      html,
      attachments,
    });

    return { success: result.success };
  }

  /**
   * Send offer notification to shipper
   */
  async sendOfferNotification(email: string, data: OfferNotificationData): Promise<{ success: boolean }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Neues Angebot - CargoBit</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2A9D8F; padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">💰 Neues Angebot erhalten!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">
              Sie haben ein neues Angebot für Ihren Transport erhalten.
            </p>
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0 0 10px;"><strong>Route:</strong></p>
              <p style="margin: 0; color: #374151;">📍 ${data.origin} → ${data.destination}</p>
              <p style="margin: 20px 0 10px;"><strong>Angebotspreis:</strong></p>
              <p style="margin: 0; font-size: 24px; color: #2A9D8F; font-weight: bold;">${data.price}</p>
            </div>
            <p style="font-size: 14px; color: #ef4444;">
              ⏰ Angebot gültig bis: ${data.validUntil}
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.acceptUrl}" 
                 style="background: #2A9D8F; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                Angebot ansehen
              </a>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await this.send({
      to: email,
      subject: `Neues Angebot: ${data.price} - CargoBit`,
      html,
    });

    return { success: result.success };
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
