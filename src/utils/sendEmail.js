const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send email
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"E-Commerce Platform" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${options.subject}</h2>
          <div style="padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
            ${options.message}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated message, please do not reply.
          </p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.email}`);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, name, role) => {
  const subject = 'Welcome to Our Platform!';
  const message = `
    Hello ${name},<br/><br/>
    Thank you for registering as a ${role} on our platform.<br/>
    We're excited to have you on board!<br/><br/>
    Best regards,<br/>
    E-Commerce Team
  `;
  return sendEmail({ email, subject, message, html: message });
};

// Send order confirmation email
const sendOrderConfirmation = async (email, name, orderNumber, total, items) => {
  const subject = `Order Confirmation - ${orderNumber}`;
  const message = `
    <h3>Hello ${name},</h3>
    <p>Thank you for your order! Your order has been confirmed.</p>
    <p><strong>Order Number:</strong> ${orderNumber}</p>
    <p><strong>Total Amount:</strong> $${total.toFixed(2)}</p>
    <p><strong>Items Ordered:</strong> ${items.length}</p>
    <p>We'll notify you once your order ships.</p>
    <br/>
    <p>Track your order status in your account dashboard.</p>
  `;
  return sendEmail({ email, subject, message, html: message });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, name) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const subject = 'Password Reset Request';
  const message = `
    <h3>Hello ${name},</h3>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p>This link will expire in 10 minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;
  return sendEmail({ email, subject, message, html: message });
};

// Send vendor approval email
const sendVendorApprovalEmail = async (email, storeName, name) => {
  const subject = 'Your Store Has Been Approved!';
  const message = `
    <h3>Congratulations ${name}!</h3>
    <p>Your store "${storeName}" has been approved by our admin team.</p>
    <p>You can now start adding products and managing your store.</p>
    <p>Log in to your vendor dashboard to get started.</p>
  `;
  return sendEmail({ email, subject, message, html: message });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendPasswordResetEmail,
  sendVendorApprovalEmail
};