import crypto from 'crypto';
import nodemailer from 'nodemailer';

export const reSendPasswordSetupEmail = async (email, link) => {
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Reset Your Password',
      // text: `Please Reset your password by clicking the following link: ${link}`,

      html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; box-shadow: 2px 2px 10px rgba(0,0,0,0.1); text-align: center;">
        <!-- Logo Section -->
        <div style="margin-bottom: 20px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Emblem_of_India.svg/200px-Emblem_of_India.svg.png" alt="Government Logo" width="80" style="display: block; margin: auto;">
        </div>

        <h2 style="color: #0056b3; margin-bottom: 10px;">EchoSecure Chat</h2> <!-- Corrected "EchoSeucre" to "EchoSecure" -->
        
        <p style="font-size: 16px; color: #333;">Dear User,</p>
        <p style="font-size: 16px; color: #333;">Please reset your password by clicking the following link:</p> <!-- "Reset" should be lowercase -->
        
        <!-- OTP Box -->
        <div style="margin: 20px 0;">
            <span style="display: inline-block; overflow-hidden; font-size: 13px; font-weight: bold; background: #f5f5f5; padding: 10px 20px; border-radius: 5px; border: 1px solid #ccc;">
                <a href=${link} style="text-decoration: none; color: #007bff;">Reset Password Link</a>
            </span>
        </div>
        
        <p style="font-size: 16px; color: #333;">This link is valid for <strong>24 Hrs</strong>. Do not share it with anyone.</p>

        <p style="font-size: 14px; color: #777; text-align: center; border-top: 1px solid #ddd; padding-top: 10px;">
            If you didn’t request this, please ignore this email or contact support.
        </p>
      </div>
    `,
    };
  
    await transporter.sendMail(mailOptions);
};

export const sendOTPEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Secure OTP Code - EchoSecure',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; box-shadow: 2px 2px 10px rgba(0,0,0,0.1); text-align: center;">
        <!-- Logo Section -->
        <div style="margin-bottom: 20px;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Emblem_of_India.svg/200px-Emblem_of_India.svg.png" alt="Government Logo" width="80" style="display: block; margin: auto;">
        </div>
        <h2 style="color: #0056b3; margin-bottom: 10px;">EchoSeucre Chat</h2>
        <p style="font-size: 16px; color: #333;">Dear User,</p>
        <p style="font-size: 16px; color: #333;">Your One-Time Password (OTP) for secure login is:</p>
        <!-- OTP Box -->
        <div style="margin: 20px 0;">
          <span style="display: inline-block; font-size: 24px; font-weight: bold; background: #f5f5f5; padding: 10px 20px; border-radius: 5px; border: 1px solid #ccc;">
            <code style="user-select: all;">${otp}</code>
          </span>
        </div>
        <p style="font-size: 16px; color: #333;">This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
        <p style="font-size: 14px; color: #777; text-align: center; border-top: 1px solid #ddd; padding-top: 10px;">
          If you didn't request this OTP, please ignore this email or contact support.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
