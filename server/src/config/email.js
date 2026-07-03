import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns';
 
dotenv.config();

// Force DNS resolution to prioritize IPv4 over IPv6, resolving network unreachable (ENETUNREACH) issues
dns.setDefaultResultOrder('ipv4first');
 
let transporter;
 
const useSMTP = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
 
if (useSMTP) {
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  transporter = nodemailer.createTransport({
    pool: true,
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465, // secure is true ONLY for port 465. Port 587 uses STARTTLS.
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  });
 
  // Verify connection configuration on startup
  transporter.verify((error, success) => {
    if (error) {
      console.error('SMTP Connection Error:', error);
    } else {
      console.log('SMTP Server is ready to send messages');
    }
  });
} else {
  console.log('SMTP configuration not fully set in .env. Email notifications will be logged to console.');
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('\n==================================================');
      console.log('MOCK EMAIL NOTIFICATION SENDING:');
      console.log(`From: ${mailOptions.from}`);
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log('Content (HTML):');
      console.log(mailOptions.html);
      console.log('==================================================\n');
      return { messageId: 'mock-email-id-' + Date.now() };
    }
  };
}
 
export const sendMail = async ({ to, bcc, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Change Management System" <noreply@cms.com>',
      to,
      ...(bcc ? { bcc } : {}),
      subject,
      text: text || '',
      html,
    });
    console.log(`Email successfully sent to ${to}${bcc ? ` (+ BCC: ${bcc})` : ''}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    // Silent catch so SMTP failure does not crash requests/transactions
  }
};
 