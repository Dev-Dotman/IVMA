// Email utility functions for sending verification emails
// You can integrate with services like SendGrid, Nodemailer, AWS SES, etc.

export async function sendVerificationEmail(email, verificationCode, firstName) {
  // For development, just log the code
  if (process.env.NODE_ENV === 'development') {
    console.log(`
      📧 EMAIL VERIFICATION
      To: ${email}
      Code: ${verificationCode}
      
      Hi ${firstName},
      
      Your verification code is: ${verificationCode}
      
      This code will expire in 15 minutes.
    `);
    return { success: true, message: 'Verification email sent (logged to console)' };
  }

  try {
    // TODO: Implement actual email sending
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: 'IVMA - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to IVMA!</h2>
          <p>Hi ${firstName},</p>
          <p>Thank you for signing up for IVMA. To complete your registration, please verify your email address by entering the code below:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #0f766e; margin: 0; font-size: 32px; letter-spacing: 5px;">${verificationCode}</h1>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't create an account with IVMA, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from IVMA. If you have any questions, please contact our support team.
          </p>
        </div>
      `
    };
    
    await sgMail.send(msg);
    */
    
    return { success: true, message: 'Verification email sent successfully' };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, message: 'Failed to send verification email' };
  }
}

export async function sendWelcomeEmail(email, firstName) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`
      📧 WELCOME EMAIL
      To: ${email}
      
      Welcome to IVMA, ${firstName}!
      
      Your account has been successfully created and verified.
    `);
    return { success: true };
  }

  try {
    // TODO: Implement welcome email
    return { success: true };
  } catch (error) {
    console.error('Welcome email failed:', error);
    return { success: false };
  }
}
