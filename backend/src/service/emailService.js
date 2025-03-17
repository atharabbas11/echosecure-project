import crypto from 'crypto';
import nodemailer from 'nodemailer';

export const reSendPasswordSetupEmail = async (email, fullName, link) => {
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
                <table role="presentation" style="margin: 0 auto;">
                  <tr>
                    <td style="width: 64px; height: 64px; border-radius: 8px; background-color: rgba(0, 0, 255, 0.1); display: flex; justify-content: center; align-items: center; overflow: hidden;">
                      <img src="https://raw.githubusercontent.com/atharabbas11/EchoSecure-Admin/refs/heads/main/frontend/src/images/eslogo.png" alt="Government Logo" width="75" style="display: block; margin: auto;">
                    </td>
                  </tr>
                </table>
              </div>
            
              <h2 style="color: #0056b3; margin-bottom: 10px;">EchoSecure</h2>
              <p style="font-size: 16px; color: #333;">Dear ${fullName},</p>
              <p style="font-size: 16px; color: #333;">Please click the link below to reset your password:</p>
              <div style="margin: 20px 0; text-align: center;">
                <a href="${link}" style="display: inline-block; text-decoration: none; color: #007bff; font-size: 13px; font-weight: bold; background: #f5f5f5; padding: 10px 20px; border-radius: 5px; border: 1px solid #ccc;">Reset Password Link</a>
              </div>      
              <p style="font-size: 16px; color: #333;">This link is valid for <strong>24 Hrs</strong>. Do not share it with anyone.</p>
              <p style="font-size: 16px; color: #333;">If you did not request this, please ignore this email or contact support.</p>
    
              <p style="font-size: 14px; color: #777; text-align: center; border-top: 1px solid #ddd; padding-top: 10px;">
                EchoSecure Chat | All rights reserved
              </p>
            </div>
        `,
    };
  
    await transporter.sendMail(mailOptions);
};

export const sendOTPEmail = async (email, fullName, otp) => {
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
                  <table role="presentation" style="margin: 0 auto;">
                    <tr>
                      <td style="width: 64px; height: 64px; border-radius: 8px; background-color: rgba(0, 0, 255, 0.1); display: flex; justify-content: center; align-items: center; overflow: hidden;">
                        <img src="https://raw.githubusercontent.com/atharabbas11/EchoSecure-Admin/refs/heads/main/frontend/src/images/eslogo.png" alt="Government Logo" width="65" style="display: block; margin: auto;">
                      </td>
                    </tr>
                  </table>
                </div>
          <h2 style="color: #0056b3; margin-bottom: 10px;">EchoSeucre</h2>
          <p style="font-size: 16px; color: #333;">Dear ${fullName},</p>
          <p style="font-size: 16px; color: #333;">Your One-Time Password (OTP) for secure login is:</p>
          <!-- OTP Box -->
          <div style="margin: 20px 0;">
            <span style="display: inline-block; font-size: 24px; font-weight: bold; background: #f5f5f5; padding: 10px 20px; border-radius: 5px; border: 1px solid #ccc;">
              <code style="user-select: all;">${otp}</code>
            </span>
          </div>
          <p style="font-size: 16px; color: #333;">This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
          <p style="font-size: 16px; color: #333;">If you did not request this, please ignore this email or contact support.</p>
          <p style="font-size: 14px; color: #777; text-align: center; border-top: 1px solid #ddd; padding-top: 10px;">
            EchoSecure Chat | All rights reserved
          </p>
        </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
