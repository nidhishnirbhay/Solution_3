import nodemailer from 'nodemailer';
import { db } from './db.js';
import { emailSettings } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private settings: any = null;

  async getEmailSettings() {
    if (!this.settings) {
      const result = await db.select().from(emailSettings).limit(1);
      this.settings = result[0] || null;
    }
    return this.settings;
  }

  async createTransporter() {
    const settings = await this.getEmailSettings();
    
    if (!settings || !settings.isEnabled) {
      throw new Error('Email service is not configured or disabled');
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpPort === 465,
        auth: {
          user: settings.smtpUsername,
          pass: settings.smtpPassword,
        },
      });
    }

    return this.transporter;
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const settings = await this.getEmailSettings();
      if (!settings || !settings.isEnabled) {
        console.log('Email service disabled, skipping email send');
        return false;
      }

      const transporter = await this.createTransporter();
      
      const mailOptions = {
        from: `${settings.fromName} <${settings.fromEmail}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || emailData.html.replace(/<[^>]*>/g, ''),
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${emailData.to}`);
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  // Email Templates
  getUserRegistrationEmail(userName: string, userEmail: string): EmailData {
    return {
      to: userEmail,
      subject: 'Welcome to OyeGaadi - Registration Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to OyeGaadi!</h2>
          <p>Hello ${userName},</p>
          <p>Thank you for registering with OyeGaadi. Your account has been created successfully.</p>
          <p>You can now:</p>
          <ul>
            <li>Search and book rides</li>
            <li>Publish your own rides (if you're a driver)</li>
            <li>Connect with other travelers</li>
          </ul>
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>Happy traveling!</p>
          <p><strong>OyeGaadi Team</strong></p>
        </div>
      `,
    };
  }

  getRidePublishedEmail(driverName: string, driverEmail: string, rideDetails: any): EmailData {
    return {
      to: driverEmail,
      subject: 'Ride Published Successfully - OyeGaadi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Ride Published Successfully!</h2>
          <p>Hello ${driverName},</p>
          <p>Your ride has been published successfully on OyeGaadi.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Ride Details:</h3>
            <p><strong>From:</strong> ${rideDetails.fromLocation}</p>
            <p><strong>To:</strong> ${rideDetails.toLocation}</p>
            <p><strong>Date:</strong> ${new Date(rideDetails.departureDate).toLocaleDateString()}</p>
            <p><strong>Available Seats:</strong> ${rideDetails.availableSeats}</p>
            <p><strong>Price per Seat:</strong> ₹${rideDetails.pricePerSeat}</p>
          </div>
          
          <p>Passengers can now search and book your ride. You'll receive notifications when bookings are made.</p>
          <p><strong>OyeGaadi Team</strong></p>
        </div>
      `,
    };
  }

  getRideBookingEmail(driverName: string, driverEmail: string, customerName: string, bookingDetails: any): EmailData {
    return {
      to: driverEmail,
      subject: 'New Ride Booking - OyeGaadi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Ride Booking!</h2>
          <p>Hello ${driverName},</p>
          <p>You have received a new booking for your ride.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Booking Details:</h3>
            <p><strong>Passenger:</strong> ${customerName}</p>
            <p><strong>Contact:</strong> ${bookingDetails.customerMobile}</p>
            <p><strong>From:</strong> ${bookingDetails.fromLocation}</p>
            <p><strong>To:</strong> ${bookingDetails.toLocation}</p>
            <p><strong>Date:</strong> ${new Date(bookingDetails.departureDate).toLocaleDateString()}</p>
            <p><strong>Seats Booked:</strong> ${bookingDetails.numberOfSeats}</p>
            <p><strong>Ride Price:</strong> ₹${bookingDetails.ridePrice || bookingDetails.price}</p>
            <p><strong>Booking Fee:</strong> ₹${bookingDetails.bookingFee || 0}</p>
          </div>
          
          <p>Please coordinate with the passenger for pickup details.</p>
          <p><strong>OyeGaadi Team</strong></p>
        </div>
      `,
    };
  }

  getBookingRequestEmail(customerName: string, customerEmail: string, driverName: string, bookingDetails: any): EmailData {
    return {
      to: customerEmail,
      subject: 'Booking Request Submitted - OyeGaadi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Booking Request Submitted!</h2>
          <p>Hello ${customerName},</p>
          <p>Your ride booking request has been submitted and is pending driver approval.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Booking Details:</h3>
            <p><strong>Driver:</strong> ${driverName}</p>
            <p><strong>From:</strong> ${bookingDetails.fromLocation}</p>
            <p><strong>To:</strong> ${bookingDetails.toLocation}</p>
            <p><strong>Date:</strong> ${new Date(bookingDetails.departureDate).toLocaleDateString()}</p>
            <p><strong>Seats Requested:</strong> ${bookingDetails.numberOfSeats}</p>
            <p><strong>Ride Price:</strong> ₹${bookingDetails.ridePrice || bookingDetails.price}</p>
            <p><strong>Booking Fee:</strong> ₹${bookingDetails.bookingFee || 0}</p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Status:</strong> Pending Driver Approval</p>
            <p>The driver will review your request and confirm or decline the booking. You will receive an email notification once the driver responds.</p>
          </div>
          
          <p>Please coordinate with your driver for pickup details.</p>
          <p><strong>OyeGaadi Team</strong></p>
        </div>
      `,
    };
  }

  getBookingConfirmationEmail(customerName: string, customerEmail: string, driverName: string, bookingDetails: any): EmailData {
    return {
      to: customerEmail,
      subject: 'Booking Confirmed - OyeGaadi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Booking Confirmed!</h2>
          <p>Hello ${customerName},</p>
          <p>Great news! Your ride booking has been confirmed by the driver.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Confirmed Booking Details:</h3>
            <p><strong>Driver:</strong> ${driverName}</p>
            <p><strong>From:</strong> ${bookingDetails.fromLocation}</p>
            <p><strong>To:</strong> ${bookingDetails.toLocation}</p>
            <p><strong>Date:</strong> ${new Date(bookingDetails.departureDate).toLocaleDateString()}</p>
            <p><strong>Seats Confirmed:</strong> ${bookingDetails.numberOfSeats}</p>
            <p><strong>Ride Price:</strong> ₹${bookingDetails.ridePrice}</p>
            <p><strong>Booking Fee:</strong> ₹${bookingDetails.bookingFee || 0}</p>
            <p><strong>Vehicle:</strong> ${bookingDetails.vehicleType} - ${bookingDetails.vehicleNumber}</p>
          </div>
          
          <div style="background: #dcfce7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Status:</strong> Confirmed ✅</p>
            <p>Your booking is now confirmed. Please be ready at the pickup location on time.</p>
          </div>
          
          <p>Have a safe journey!</p>
          <p><strong>OyeGaadi Team</strong></p>
        </div>
      `,
    };
  }

  getRideCancelledEmail(recipientName: string, recipientEmail: string, isDriver: boolean, rideDetails: any): EmailData {
    const subject = 'Booking Cancelled - OyeGaadi';
    const cancelledByText = rideDetails.cancelledBy === 'customer' ? 'the passenger' : 'the driver';
    const message = isDriver 
      ? `A booking for your ride has been cancelled by ${cancelledByText}.`
      : `Your ride booking has been cancelled by ${cancelledByText}.`;

    return {
      to: recipientEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Booking Cancelled</h2>
          <p>Hello ${recipientName},</p>
          <p>${message}</p>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3>Cancelled Booking Details:</h3>
            ${isDriver ? `<p><strong>Passenger:</strong> ${rideDetails.customerName}</p>` : `<p><strong>Driver:</strong> ${rideDetails.driverName}</p>`}
            <p><strong>From:</strong> ${rideDetails.fromLocation}</p>
            <p><strong>To:</strong> ${rideDetails.toLocation}</p>
            <p><strong>Date:</strong> ${new Date(rideDetails.departureDate).toLocaleDateString()}</p>
            <p><strong>Reason:</strong> ${rideDetails.cancellationReason}</p>
            <p><strong>Cancelled by:</strong> ${cancelledByText}</p>
          </div>
          
          <p>If you have any questions, please contact our support team.</p>
          <p><strong>OyeGaadi Team</strong></p>
        </div>
      `,
    };
  }

  getKycSubmissionEmail(userName: string, userEmail: string): EmailData {
    return {
      to: userEmail,
      subject: 'KYC Documents Submitted Successfully - OyeGaadi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">KYC Documents Submitted</h2>
          <p>Hello ${userName},</p>
          <p>Your KYC (Know Your Customer) documents have been submitted successfully and are now under review.</p>
          
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <h3>What happens next?</h3>
            <ul>
              <li>Our verification team will review your documents</li>
              <li>The review process typically takes 1-3 business days</li>
              <li>You'll receive an email notification once the review is complete</li>
              <li>Once approved, you'll have full access to all OyeGaadi features</li>
            </ul>
          </div>
          
          <p>Thank you for helping us maintain a safe and trusted community.</p>
          <p><strong>OyeGaadi Team</strong></p>
        </div>
      `,
    };
  }

  getKycApprovedEmail(userName: string, userEmail: string): EmailData {
    return {
      to: userEmail,
      subject: 'KYC Verification Approved - Welcome to OyeGaadi!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">KYC Verification Approved!</h2>
          <p>Hello ${userName},</p>
          <p>Congratulations! Your KYC documents have been successfully verified and approved.</p>
          
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <h3>You now have full access to:</h3>
            <ul>
              <li>Publish and manage rides</li>
              <li>Book rides from verified drivers</li>
              <li>Access to premium features</li>
              <li>Enhanced profile visibility</li>
              <li>Priority customer support</li>
            </ul>
          </div>
          
          <p>Start exploring OyeGaadi with your verified account and enjoy safe, reliable travel!</p>
          <p><strong>OyeGaadi Team</strong></p>
        </div>
      `,
    };
  }

  getKycRejectedEmail(userName: string, userEmail: string, rejectionReason: string): EmailData {
    return {
      to: userEmail,
      subject: 'KYC Verification - Additional Information Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">KYC Verification Update</h2>
          <p>Hello ${userName},</p>
          <p>We've reviewed your KYC documents and need some additional information to complete the verification process.</p>
          
          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3>Reason for Review:</h3>
            <p>${rejectionReason}</p>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Next Steps:</h3>
            <ol>
              <li>Log in to your OyeGaadi account</li>
              <li>Go to the KYC verification section</li>
              <li>Upload the corrected or additional documents</li>
              <li>Resubmit for review</li>
            </ol>
          </div>
          
          <p>If you have any questions about the verification process, please contact our support team.</p>
          <p><strong>OyeGaadi Team</strong></p>
        </div>
      `,
    };
  }

  // Reset settings cache when configuration changes
  resetSettings() {
    this.settings = null;
    this.transporter = null;
  }
}

export const emailService = new EmailService();