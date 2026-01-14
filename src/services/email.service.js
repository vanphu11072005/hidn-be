/**
 * Email Service
 * Sends emails using nodemailer with Gmail SMTP
 */

const nodemailer = require('nodemailer');

// Create transporter with Gmail SMTP configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
};

const sendVerificationEmail = async (email, code) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Xác thực email - Hidn',
      html: `
        <div style="font-family: Arial, sans-serif; 
          max-width: 600px; margin: 0 auto; 
          padding: 20px;">
          <h2 style="color: #2563eb; 
            text-align: center;">
            Xác thực tài khoản Hidn
          </h2>
          <p style="font-size: 16px; color: #374151;">
            Xin chào,
          </p>
          <p style="font-size: 16px; color: #374151;">
            Mã xác thực của bạn là:
          </p>
          <div style="background-color: #eff6ff; 
            padding: 20px; text-align: center; 
            border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; 
              font-weight: bold; color: #2563eb; 
              letter-spacing: 8px;">
              ${code}
            </span>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            Mã này có hiệu lực trong <strong>10 phút</strong>.
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            Nếu bạn không yêu cầu mã này, 
            vui lòng bỏ qua email này.
          </p>
          <hr style="border: none; 
            border-top: 1px solid #e5e7eb; 
            margin: 30px 0;">
          <p style="font-size: 12px; 
            color: #9ca3af; text-align: center;">
            © 2025 Hidn. All rights reserved.
          </p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    console.log('✅ Verification email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    throw error;
  }
};

const sendPasswordResetEmail = async (email, resetLink) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Đặt lại mật khẩu - Hidn',
      html: `
        <div style="font-family: Arial, sans-serif; 
          max-width: 600px; margin: 0 auto; 
          padding: 20px;">
          <h2 style="color: #2563eb; 
            text-align: center;">
            Đặt lại mật khẩu
          </h2>
          <p style="font-size: 16px; color: #374151;">
            Xin chào,
          </p>
          <p style="font-size: 16px; color: #374151;">
            Bạn đã yêu cầu đặt lại mật khẩu. 
            Nhấn vào nút bên dưới để tiếp tục:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
              style="background-color: #2563eb; 
              color: white; padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 6px; 
              display: inline-block; 
              font-weight: bold;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            Hoặc copy link sau vào trình duyệt:
          </p>
          <p style="font-size: 12px; 
            color: #6b7280; 
            word-break: break-all; 
            background-color: #f9fafb; 
            padding: 10px; 
            border-radius: 4px;">
            ${resetLink}
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            Link này có hiệu lực trong 
            <strong>1 giờ</strong>.
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            Nếu bạn không yêu cầu đặt lại mật khẩu, 
            vui lòng bỏ qua email này.
          </p>
          <hr style="border: none; 
            border-top: 1px solid #e5e7eb; 
            margin: 30px 0;">
          <p style="font-size: 12px; 
            color: #9ca3af; text-align: center;">
            © 2025 Hidn. All rights reserved.
          </p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    console.log('✅ Password reset email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', 
      error);
    throw new Error('Failed to send password reset email');
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
