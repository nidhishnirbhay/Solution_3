import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { db, pool } from "./db";
import { eq } from "drizzle-orm";
import { users } from "../shared/schema";
import { emailService } from "./email-service";
import * as bcrypt from "bcrypt";

// Function to check and update past rides
export async function checkAndUpdatePastRides() {
  try {
    // Get current date for SQL comparison
    const currentDate = new Date();
    const now = currentDate.toISOString();
    
    // Find active rides with departure dates in the past
    const pastRidesQuery = `
      SELECT id, driver_id, from_location, to_location, departure_date 
      FROM rides 
      WHERE status = 'active' 
      AND departure_date < $1
    `;
    
    const pastRidesResult = await pool.query(pastRidesQuery, [now]);
    
    if (pastRidesResult.rows && pastRidesResult.rows.length > 0) {
      console.log(`Found ${pastRidesResult.rows.length} active rides with past departure dates`);
      let cancelledCount = 0;
      let completedCount = 0;
      
      // Process each past ride
      for (const ride of pastRidesResult.rows) {
        if (!ride.id) continue; // Skip if no valid ID
        
        // Check if the ride has any bookings
        const bookingsQuery = `
          SELECT COUNT(*) as booking_count 
          FROM bookings 
          WHERE ride_id = $1 AND status = 'confirmed'
        `;
        
        const bookingsResult = await pool.query(bookingsQuery, [ride.id]);
        const bookingCount = parseInt(bookingsResult.rows[0].booking_count || '0');
        
        // If no bookings, automatically cancel the ride
        if (bookingCount === 0) {
          const updateQuery = `
            UPDATE rides 
            SET status = 'cancelled', 
                cancellation_reason = 'Automatically cancelled due to expired departure date'
            WHERE id = $1
          `;
          
          await pool.query(updateQuery, [ride.id]);
          console.log(`🔄 Auto-cancelled past ride #${ride.id} (${ride.from_location} to ${ride.to_location})`);
          cancelledCount++;
        } else {
          // If ride has bookings but is in the past, mark it as completed
          const updateQuery = `
            UPDATE rides 
            SET status = 'completed'
            WHERE id = $1 AND status = 'active'
          `;
          
          await pool.query(updateQuery, [ride.id]);
          console.log(`✅ Auto-completed past ride #${ride.id} with ${bookingCount} booking(s)`);
          completedCount++;
        }
      }
      
      return { processed: pastRidesResult.rows.length, cancelled: cancelledCount, completed: completedCount };
    } else {
      console.log("No past active rides found that need status updating");
      return { processed: 0, cancelled: 0, completed: 0 };
    }
  } catch (error) {
    console.error("Error while checking and updating past rides:", error);
    return { error: "Failed to process past rides" };
  }
}
import {
  insertUserSchema,
  insertKycSchema,
  insertRideSchema,
  insertBookingSchema,
  insertRatingSchema,
  insertPageContentSchema,
  users,
  rides,
  bookings,
  kycVerifications,
  pageContents
} from "@shared/schema";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";

// Helper function to handle validation and response
function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: Function) => {
    try {
      // Special case for ride data to handle date fields properly
      if (req.path === '/rides' && req.method === 'POST') {
        // Pre-process date fields to convert ISO strings to Date objects
        if (req.body.departureDate && typeof req.body.departureDate === 'string') {
          req.body.departureDate = new Date(req.body.departureDate);
        }
        
        if (req.body.estimatedArrivalDate && typeof req.body.estimatedArrivalDate === 'string') {
          req.body.estimatedArrivalDate = new Date(req.body.estimatedArrivalDate);
        }
      }
      
      // Now parse with schema
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Validation error:", error.errors);
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      next(error);
    }
  };
}

// Helper to check user roles
function authorize(roles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const user = req.user as any;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    next();
  };
}

async function seedAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByUsername('oyegaadicabs@gmail.com');
    if (!existingAdmin) {
      console.log('Creating admin user...');
      // Hash admin password before storing
      const hashedAdminPassword = await bcrypt.hash('OGC.2000', 10);
      
      // Create admin user
      await storage.createUser({
        username: 'oyegaadicabs@gmail.com',
        password: hashedAdminPassword,
        email: 'oyegaadicabs@gmail.com',
        fullName: 'OyeGaadi Admin',
        role: 'admin',
        mobile: '9999999999'
      });
      
      // Try to update the user to set isKycVerified
      try {
        const createdAdmin = await storage.getUserByUsername('oyegaadicabs@gmail.com');
        if (createdAdmin) {
          await storage.updateUser(createdAdmin.id, { isKycVerified: true });
        }
      } catch (updateError) {
        console.error('Error updating admin user KYC status:', updateError);
      }
      
      console.log('Admin user created successfully.');
    } else {
      console.log('Admin user already exists.');
      
      // Ensure admin has KYC verified
      if (!existingAdmin.isKycVerified) {
        try {
          await storage.updateUser(existingAdmin.id, { isKycVerified: true });
          console.log('Updated admin KYC verification status.');
        } catch (updateError) {
          console.error('Error updating admin user KYC status:', updateError);
        }
      }
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up a scheduled task to check for past rides every hour
  const MAINTENANCE_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  setInterval(async () => {
    console.log("🔄 Running scheduled maintenance: Checking for past rides...");
    await checkAndUpdatePastRides();
  }, MAINTENANCE_INTERVAL);
  
  // Also run once at server startup (after a short delay to allow database connection)
  setTimeout(async () => {
    console.log("🔄 Running initial maintenance check for past rides...");
    await checkAndUpdatePastRides();
  }, 5000);
  // Seed the admin user
  await seedAdminUser();
  
  const MemorySessionStore = MemoryStore(session);
  
  // Configure session and passport
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      // Set secure to false for now to ensure cookies work in all environments
      // In production with proper HTTPS, you can set this to true
      secure: false, 
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for longer sessions
      httpOnly: true,
      sameSite: 'lax',
      path: '/' // Ensure cookies are available across the entire site
    },
    store: new MemorySessionStore({ 
      checkPeriod: 86400000, // 1 day cleanup period
      stale: false // Don't delete stale sessions
    })
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure passport local strategy
  passport.use(new LocalStrategy(
    { usernameField: 'mobile' }, // Use mobile field instead of username
    async (mobile, password, done) => {
      try {
        const user = await storage.getUserByMobile(mobile);
        if (!user) {
          return done(null, false, { message: 'Invalid mobile number or password' });
        }
        
        // Use bcrypt to compare the password with the stored hash
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid mobile number or password' });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));
  
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  
  // Auth routes
  const authRouter = express.Router();
  
  authRouter.post('/login', (req, res, next) => {
    passport.authenticate('local', (err: Error | null, user: any, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });
      
      // Check if the user is suspended
      if (user.isSuspended) {
        return res.status(403).json({ 
          error: "Account suspended", 
          message: "Your account has been suspended by the administrator. Please contact support for more information." 
        });
      }
      
      req.logIn(user, (loginErr: Error | null) => {
        if (loginErr) return next(loginErr);
        return res.json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          isKycVerified: user.isKycVerified,
          isSuspended: user.isSuspended
        });
      });
    })(req, res, next);
  });
  
  // Forgot Password endpoint
  authRouter.post('/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account with this email exists, you will receive a password reset link." });
      }

      // Generate secure token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save reset token to database
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt
      });

      // Send password reset email
      const emailData = emailService.getPasswordResetEmail(user.fullName, user.email, resetToken);
      const emailSent = await emailService.sendEmail(emailData);
      
      if (emailSent) {
        console.log(`Password reset email sent to: ${user.email}`);
      } else {
        console.error(`Failed to send password reset email to: ${user.email}`);
      }

      res.json({ message: "If an account with this email exists, you will receive a password reset link." });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Reset Password endpoint
  authRouter.post('/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      // Find valid reset token
      const resetTokenRecord = await storage.getValidPasswordResetToken(token);
      if (!resetTokenRecord) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Get user details for email notification
      const user = await storage.getUser(resetTokenRecord.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update user password
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await storage.updateUser(resetTokenRecord.userId, { password: hashedPassword });
      
      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(resetTokenRecord.id);

      // Send success notification email
      try {
        const successEmail = emailService.getPasswordResetSuccessEmail(user.fullName, user.email);
        await emailService.sendEmail(successEmail);
        console.log(`Password reset success email sent to: ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send password reset success email:', emailError);
        // Don't fail the password reset if email fails
      }

      console.log(`Password reset successful for user ID: ${resetTokenRecord.userId}`);
      res.json({ message: "Password reset successful. You can now login with your new password." });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: "Server error" });
    }
  });

  authRouter.post('/register', async (req, res) => {
    try {
      console.log("Registration request received:", req.body);
      
      // Validate required fields
      const requiredFields = [
        { field: 'username', message: 'Username is required' },
        { field: 'password', message: 'Password is required' },
        { field: 'email', message: 'Email is required' },
        { field: 'mobile', message: 'Mobile number is required' },
        { field: 'fullName', message: 'Full name is required' },
        { field: 'role', message: 'Role is required' }
      ];
      
      for (const { field, message } of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({ error: message });
        }
      }
      
      const { username, email, mobile, role } = req.body;
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      // Validate role
      if (!['driver', 'customer'].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'driver' or 'customer'" });
      }
      
      // Check if username, email, or mobile already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Check for existing email in database
      try {
        const existingEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingEmail.length > 0) {
          return res.status(400).json({ error: "Email address already registered" });
        }
      } catch (emailCheckError) {
        console.error('Error checking email:', emailCheckError);
      }
      
      const existingMobile = await storage.getUserByMobile(mobile);
      if (existingMobile) {
        return res.status(400).json({ error: "Mobile number already registered" });
      }
      
      // Hash password before storing
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      
      console.log("Creating new user with role:", role);
      const userData = { ...req.body, password: hashedPassword };
      const newUser = await storage.createUser(userData);
      console.log("User created successfully with ID:", newUser.id);
      
      // Send welcome email
      try {
        const emailData = emailService.getUserRegistrationEmail(newUser.fullName, newUser.email);
        const emailSent = await emailService.sendEmail(emailData);
        if (emailSent) {
          console.log("Welcome email sent successfully to:", newUser.email);
        } else {
          console.log("Welcome email could not be sent to:", newUser.email);
        }
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // Don't fail registration if email fails
      }
      
      // Auto-login after registration
      req.logIn(newUser, (err) => {
        if (err) {
          console.error("Auto-login after registration failed:", err);
          return res.status(500).json({ error: "Login after registration failed" });
        }
        
        console.log("User auto-logged in after registration");
        return res.status(201).json({
          id: newUser.id,
          username: newUser.username,
          fullName: newUser.fullName,
          role: newUser.role,
          isKycVerified: newUser.isKycVerified
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed", details: error instanceof Error ? error.message : undefined });
    }
  });
  
  authRouter.get('/logout', (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });
  
  authRouter.get('/current-user', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.user as any;
    
    // Check if user is suspended
    if (user.isSuspended) {
      req.logout(() => {
        return res.status(403).json({ 
          error: "Account suspended", 
          message: "Your account has been suspended by the administrator. Please contact support for more information."
        });
      });
      return;
    }
    
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      isKycVerified: user.isKycVerified,
      mobile: user.mobile,
      averageRating: user.averageRating,
      isSuspended: user.isSuspended
    });
  });
  
  // KYC routes
  const kycRouter = express.Router();
  
  kycRouter.post('/', authorize(['customer', 'driver']), async (req, res) => {
    try {
      const user = req.user as any;
      const userId = Number(user.id);
      
      console.log("KYC submission received:", req.body);
      
      // Ensure all required fields are present
      if (!req.body.documentType) {
        return res.status(400).json({ error: "Document type is required" });
      }
      
      if (!req.body.documentId) {
        return res.status(400).json({ error: "Document number is required" });
      }
      
      if (!req.body.documentUrl) {
        return res.status(400).json({ error: "Document image is required" });
      }
      
      // Prepare the data ensuring userId is a number
      const kycData = { 
        ...req.body, 
        userId: userId
      };
      
      console.log("Processed KYC data:", kycData);
      
      const kyc = await storage.createKycVerification(kycData);
      console.log("KYC verification created successfully:", kyc.id);
      
      // Send KYC submission confirmation email
      try {
        const emailData = emailService.getKycSubmissionEmail(user.fullName, user.email);
        const emailSent = await emailService.sendEmail(emailData);
        if (emailSent) {
          console.log("KYC submission confirmation email sent to:", user.email);
        } else {
          console.log("KYC submission confirmation email could not be sent to:", user.email);
        }
      } catch (emailError) {
        console.error("Error sending KYC submission email:", emailError);
        // Don't fail KYC submission if email fails
      }
      
      res.status(201).json(kyc);
    } catch (error) {
      console.error("KYC submission error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      
      res.status(500).json({ error: "KYC submission failed" });
    }
  });
  
  kycRouter.get('/my-kyc', authorize(['customer', 'driver']), async (req, res) => {
    try {
      const user = req.user as any;
      const kycDocuments = await storage.getKycVerificationsByUserId(user.id);
      res.json(kycDocuments);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve KYC documents" });
    }
  });
  
  kycRouter.get('/pending', authorize(['admin']), async (req, res) => {
    try {
      const pendingKyc = await storage.getPendingKycVerifications();
      
      // Get user details for each KYC
      const pendingKycWithUsers = await Promise.all(
        pendingKyc.map(async (kyc) => {
          const user = await storage.getUser(kyc.userId);
          return { ...kyc, user };
        })
      );
      
      res.json(pendingKycWithUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve pending KYC verifications" });
    }
  });
  
  kycRouter.put('/:id', authorize(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body;
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const updated = await storage.updateKycVerification(Number(id), { status, remarks });
      
      if (!updated) {
        return res.status(404).json({ error: "KYC verification not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update KYC verification" });
    }
  });
  
  // Ride routes
  const rideRouter = express.Router();
  
  rideRouter.post('/', authorize(['driver']), async (req, res) => {
    try {
      const user = req.user as any;
      
      console.log("Ride publish request received:", req.body);
      
      // Check if driver is KYC verified
      if (!user.isKycVerified) {
        return res.status(403).json({ error: "KYC verification required to publish rides" });
      }
      
      // Validate required fields with clear error messages
      const requiredFields = [
        { field: 'fromLocation', message: 'From location is required' },
        { field: 'toLocation', message: 'To location is required' },
        { field: 'departureDate', message: 'Departure date is required' },
        { field: 'rideType', message: 'Ride type is required' },
        { field: 'price', message: 'Price is required' },
        { field: 'totalSeats', message: 'Total seats is required' },
        { field: 'availableSeats', message: 'Available seats is required' },
        { field: 'vehicleType', message: 'Vehicle type is required' },
        { field: 'vehicleNumber', message: 'Vehicle number is required' }
      ];
      
      for (const { field, message } of requiredFields) {
        if (!req.body[field] && req.body[field] !== 0) {
          return res.status(400).json({ error: message });
        }
      }
      
      // Ensure dates are properly handled
      let rideData = { ...req.body, driverId: user.id };
      
      // Additional date conversion assurance
      if (rideData.departureDate && !(rideData.departureDate instanceof Date)) {
        console.log("Converting departureDate from", rideData.departureDate, "to Date object");
        rideData.departureDate = new Date(rideData.departureDate);
      }
      
      if (rideData.estimatedArrivalDate && !(rideData.estimatedArrivalDate instanceof Date)) {
        console.log("Converting estimatedArrivalDate from", rideData.estimatedArrivalDate, "to Date object");
        rideData.estimatedArrivalDate = new Date(rideData.estimatedArrivalDate);
      }
      
      // Convert numerical fields to ensure they're actually numbers
      rideData.price = Number(rideData.price);
      rideData.totalSeats = Number(rideData.totalSeats);
      rideData.availableSeats = Number(rideData.availableSeats);
      
      console.log("Processed ride data:", rideData);
      
      const ride = await storage.createRide(rideData);
      console.log("Ride created successfully:", ride.id);
      
      // Send ride published confirmation email to driver
      try {
        const emailData = emailService.getRidePublishedEmail(user.fullName, user.email, {
          fromLocation: ride.fromLocation,
          toLocation: ride.toLocation,
          departureDate: ride.departureDate,
          availableSeats: ride.availableSeats,
          pricePerSeat: ride.price
        });
        const emailSent = await emailService.sendEmail(emailData);
        if (emailSent) {
          console.log("Ride published email sent to:", user.email);
        } else {
          console.log("Ride published email could not be sent to:", user.email);
        }
      } catch (emailError) {
        console.error("Error sending ride published email:", emailError);
        // Don't fail ride creation if email fails
      }
      
      res.status(201).json(ride);
    } catch (error) {
      console.error("Ride creation error:", error);
      res.status(500).json({ error: "Failed to create ride", details: error instanceof Error ? error.message : undefined });
    }
  });
  
  rideRouter.get('/search', async (req, res) => {
    try {
      const { from, to, date, type } = req.query;
      
      if (!from || !to) {
        return res.status(400).json({ error: "From and To locations are required" });
      }
      
      const rides = await storage.searchRides(
        from as string, 
        to as string, 
        date as string | undefined, 
        type as string | undefined
      );
      
      // Get driver details for each ride
      const ridesWithDrivers = await Promise.all(
        rides.map(async (ride) => {
          const driver = await storage.getUser(ride.driverId);
          return { ...ride, driver };
        })
      );
      
      res.json(ridesWithDrivers);
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });
  
  // Get popular routes (latest published rides)
  rideRouter.get('/popular', async (req, res) => {
    try {
      console.log("📊 Fetching popular routes (latest published rides)");
      
      // Get current date and format for SQL comparison
      const currentDate = new Date();
      // Format date with timezone in ISO format, ensuring proper comparison
      const now = currentDate.toISOString();
      console.log("Current date for filtering:", now);
      
      // First, automatically update status of past rides that haven't been booked
      await checkAndUpdatePastRides();
      
      // Now fetch active future rides for display
      const query = `
        SELECT * FROM rides 
        WHERE status = 'active' 
        AND available_seats > 0
        AND departure_date > $1
        ORDER BY departure_date ASC
        LIMIT 6
      `;
      
      const result = await pool.query(query, [now]);
      console.log(`Found ${result.rowCount || 0} active future rides`);
      
      if (!result.rows || result.rows.length === 0) {
        // Return empty array if no active future rides found
        return res.json([]);
      }
      
      // Transform the result to match the expected camelCase format and add driver info
      const rides = await Promise.all(result.rows.map(async (row) => {
        // Get driver details for each ride
        const driver = await storage.getUser(row.driver_id);
        
        return {
          id: row.id,
          driverId: row.driver_id,
          fromLocation: row.from_location,
          toLocation: row.to_location,
          departureDate: row.departure_date,
          estimatedArrivalDate: row.estimated_arrival_date,
          price: row.price,
          rideType: row.ride_type,
          totalSeats: row.total_seats,
          availableSeats: row.available_seats,
          vehicleType: row.vehicle_type,
          vehicleNumber: row.vehicle_number,
          description: row.description,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          driver: driver ? {
            id: driver.id,
            fullName: driver.fullName,
            averageRating: driver.averageRating || 0,
            isKycVerified: driver.isKycVerified
          } : undefined
        };
      }));
      
      res.json(rides);
    } catch (error) {
      console.error("Error fetching popular routes:", error);
      res.status(500).json({ error: "Failed to fetch popular routes" });
    }
  });
  
  rideRouter.get('/my-rides', authorize(['driver']), async (req, res) => {
    try {
      const user = req.user as any;
      
      console.log("🚨 EMERGENCY MY-RIDES ENDPOINT FIX");
      console.log("Fetching rides for driver ID:", user.id);
      
      // IMPROVED SORTING: Sort active rides by most recently created first
      // Completed rides will be grouped after active rides
      const result = await pool.query(
        `SELECT * FROM rides 
         WHERE driver_id = $1 AND LOWER(status) != 'cancelled'
         ORDER BY 
           CASE WHEN LOWER(status) = 'completed' THEN 2 ELSE 1 END,
           CASE WHEN LOWER(status) != 'completed' THEN created_at ELSE departure_date END DESC`,
        [user.id]
      );
      
      console.log("Found", result.rows.length, "total rides");
      
      // Map database columns to camelCase for response
      const mappedRides = result.rows.map(row => {
        // Ensure status is consistently lowercase for frontend comparison
        const normalizedStatus = row.status ? row.status.toLowerCase() : 'active';
        
        return {
          id: row.id,
          driverId: row.driver_id,
          fromLocation: row.from_location,
          toLocation: row.to_location,
          departureDate: row.departure_date,
          estimatedArrivalDate: row.estimated_arrival_date,
          rideType: row.ride_type,
          price: row.price,
          totalSeats: row.total_seats,
          availableSeats: row.available_seats,
          vehicleType: row.vehicle_type,
          vehicleNumber: row.vehicle_number,
          description: row.description,
          status: normalizedStatus, // Use normalized status
          cancellationReason: row.cancellation_reason,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          // Add driver information
          driver: {
            id: user.id,
            fullName: user.fullName,
            averageRating: user.averageRating || 0,
            isKycVerified: user.isKycVerified
          }
        };
      });
      
      // Filter out cancelled rides
      const activeRides = mappedRides.filter(ride => ride.status !== 'cancelled');
      console.log("After filtering cancelled rides:", activeRides.length, "rides");
      
      // Log each ride with its status for debugging
      activeRides.forEach(ride => {
        console.log(`Ride ${ride.id} from ${ride.fromLocation} to ${ride.toLocation} has status: ${ride.status}`);
      });
      
      res.json(activeRides);
    } catch (error) {
      console.error("ERROR in my-rides endpoint:", error);
      res.status(500).json({ error: "Failed to retrieve rides" });
    }
  });
  
  rideRouter.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const ride = await storage.getRide(Number(id));
      
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      const driver = await storage.getUser(ride.driverId);
      res.json({ ...ride, driver });
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve ride" });
    }
  });
  
  rideRouter.put('/:id', authorize(['driver']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const ride = await storage.getRide(Number(id));
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      if (ride.driverId !== user.id) {
        return res.status(403).json({ error: "You can only update your own rides" });
      }
      
      const updated = await storage.updateRide(Number(id), req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update ride" });
    }
  });

  // Endpoint for marking a ride as completed (PATCH method - old)
  rideRouter.patch('/:id/complete', authorize(['driver']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      console.log("Ride completion requested via PATCH for ride ID:", id, "by user:", user.id);
      
      // Verify the ride exists
      const ride = await storage.getRide(Number(id));
      if (!ride) {
        console.log("Ride not found:", id);
        return res.status(404).json({ error: "Ride not found" });
      }
      
      console.log("Ride found:", ride);
      
      // Ensure only the driver of the ride can mark it as completed
      if (ride.driverId !== user.id) {
        console.log("Authorization error: ride driver ID", ride.driverId, "doesn't match user ID", user.id);
        return res.status(403).json({ error: "You can only mark your own rides as completed" });
      }
      
      // Get bookings related to this ride to update their status
      const bookings = await storage.getBookingsByRideId(Number(id));
      console.log("Found", bookings.length, "bookings for this ride");
      
      try {
        // Use storage interface to update status
        console.log("Attempting to update ride with ID:", id);
        
        const updatedRide = await storage.updateRide(Number(id), {
          status: "completed"
        });
        
        console.log("Ride update result:", updatedRide);
        
        // Update all related bookings to completed
        if (bookings.length > 0) {
          for (const booking of bookings) {
            if (booking.status === 'confirmed') {
              // Only update confirmed bookings to completed
              console.log("Updating booking:", booking.id, "from status:", booking.status, "to completed");
              const updatedBooking = await storage.updateBooking(booking.id, {
                status: "completed"
              });
              console.log("Booking update result:", updatedBooking);
            }
          }
        }
        
        res.json(updatedRide);
      } catch (dbError: any) {
        console.error("Database error during ride completion:", dbError);
        return res.status(500).json({ error: "Database error updating ride status", details: dbError.message });
      }
    } catch (error) {
      console.error("Error completing ride:", error);
      res.status(500).json({ error: "Failed to mark ride as completed" });
    }
  });
  
  // Ride status completion endpoint (improved from emergency fix)
  rideRouter.post('/:id/mark-completed', authorize(['driver']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as { id: number; role: string };
      
      console.log(`Ride completion requested for ID: ${id} by user: ${user.id}`);
      
      // First verify ride exists and belongs to this driver
      const [rideData] = await db.select().from(rides).where(eq(rides.id, Number(id)));
      
      if (!rideData) {
        console.log("Ride not found in database:", id);
        return res.status(404).json({ error: "Ride not found" });
      }
      
      if (rideData.driverId !== user.id) {
        console.log("Authorization error: ride driver ID", rideData.driverId, "doesn't match user ID", user.id);
        return res.status(403).json({ error: "You can only mark your own rides as completed" });
      }
      
      // Begin a transaction to ensure ride and bookings are updated atomically
      await pool.query('BEGIN');
      
      try {
        // Update ride status to completed
        const result = await pool.query(
          'UPDATE rides SET status = $1, updated_at = NOW() WHERE id = $2 AND status = $3 RETURNING *',
          ['completed', Number(id), 'active']
        );
        
        // Check if ride was actually updated (might already be completed)
        const rowCount = result.rowCount || 0;
        if (rowCount === 0) {
          // Check if the ride is already completed
          const currentStatus = await pool.query('SELECT status FROM rides WHERE id = $1', [Number(id)]);
          
          if (currentStatus.rows[0]?.status === 'completed') {
            await pool.query('COMMIT');
            return res.json({ 
              success: true, 
              message: "Ride was already marked as completed",
              rideId: Number(id),
              currentStatus: 'completed',
              updated: false
            });
          } else {
            throw new Error(`Could not update ride ${id} to completed status`);
          }
        }
        
        // Find and update related bookings
        const bookingsResult = await pool.query(
          'SELECT id FROM bookings WHERE ride_id = $1 AND status = $2',
          [Number(id), 'confirmed']
        );
        
        const bookingCount = bookingsResult.rowCount || 0;
        console.log(`Found ${bookingCount} confirmed bookings to update`);
        
        // Update each booking
        for (const booking of bookingsResult.rows) {
          await pool.query(
            'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2',
            ['completed', booking.id]
          );
        }
        
        await pool.query('COMMIT');
        
        return res.json({ 
          success: true, 
          message: "Ride and all associated bookings marked as completed successfully",
          rideId: Number(id),
          currentStatus: 'completed',
          updated: true,
          bookingsUpdated: bookingCount
        });
      } catch (dbError) {
        await pool.query('ROLLBACK');
        console.error("Database error during ride completion:", dbError);
        throw new Error(dbError instanceof Error ? dbError.message : "Unknown database error");
      }
    } catch (error) {
      console.error("Ride completion failed:", error);
      return res.status(500).json({ 
        error: "Failed to mark ride as completed", 
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Endpoint for cancelling a ride
  rideRouter.patch('/:id/cancel', authorize(['driver']), async (req, res) => {
    try {
      const { id } = req.params;
      const { cancellationReason } = req.body;
      const user = req.user as any;
      
      // Verify the ride exists
      const ride = await storage.getRide(Number(id));
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      // Ensure only the driver of the ride can cancel it
      if (ride.driverId !== user.id) {
        return res.status(403).json({ error: "You can only cancel your own rides" });
      }
      
      // Get bookings related to this ride to handle them
      const bookings = await storage.getBookingsByRideId(Number(id));
      
      // Debug: log ride and update data
      console.log("Ride to be updated:", ride);
      console.log("Column names from the schema:", 
        Object.keys(rides).filter(key => typeof key === 'string' && !key.startsWith('_')));
      
      // Use storage interface instead of direct database access
      const updated = await storage.updateRide(Number(id), {
        status: "cancelled",
        cancellationReason: cancellationReason || "Cancelled by driver"
      });
      
      console.log("Ride cancelled successfully:", updated);
      
      // Update all related bookings to cancelled
      if (bookings.length > 0) {
        console.log("Updating", bookings.length, "bookings to cancelled");
        for (const booking of bookings) {
          // Use storage interface methods
          await storage.updateBooking(booking.id, {
            status: "cancelled",
            cancellationReason: "Ride cancelled by driver: " + (cancellationReason || "No reason provided")
          });
            
          // Restore the seats in the ride
          if (booking.numberOfSeats > 0) {
            const rideToUpdate = await storage.getRide(booking.rideId);
            if (rideToUpdate) {
              await storage.updateRide(rideToUpdate.id, {
                availableSeats: rideToUpdate.availableSeats + booking.numberOfSeats
              });
            }
          }
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error cancelling ride:", error);
      res.status(500).json({ error: "Failed to cancel ride" });
    }
  });
  
  // Booking routes
  const bookingRouter = express.Router();
  
  bookingRouter.post('/', authorize(['customer']), validateBody(insertBookingSchema), async (req, res) => {
    try {
      const user = req.user as any;
      
      // Check if customer needs KYC verification
      if (!user.isKycVerified) {
        // Get customer's existing bookings
        const bookings = await storage.getBookingsByCustomerId(user.id);
        if (bookings.length >= 1) {
          return res.status(403).json({ 
            error: "KYC verification required after your first booking", 
            kycRequired: true 
          });
        }
      }
      
      const ride = await storage.getRide(req.body.rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      if (ride.availableSeats < req.body.numberOfSeats) {
        return res.status(400).json({ error: "Not enough available seats" });
      }
      
      // Check if user already has a booking for this ride
      const existingBookings = await storage.getBookingsByCustomerId(user.id);
      const alreadyBooked = existingBookings.some(booking => 
        booking.rideId === req.body.rideId && 
        booking.status !== 'cancelled'
      );
      
      if (alreadyBooked) {
        return res.status(400).json({ 
          error: "You have already booked this ride. Check your bookings." 
        });
      }
      
      // Get booking fee settings
      let bookingFee = 0;
      try {
        const bookingFeeSetting = await storage.getSetting('booking_fee');
        if (bookingFeeSetting && bookingFeeSetting.value) {
          // Parse the value as it's stored as JSON in the database
          const settings = typeof bookingFeeSetting.value === 'string' 
            ? JSON.parse(bookingFeeSetting.value) 
            : bookingFeeSetting.value;
          
          // Only apply booking fee if enabled in settings
          if (settings && typeof settings === 'object') {
            if (settings.enabled) {
              bookingFee = settings.amount || 0;
              console.log("📊 Booking fee applied:", bookingFee);
            } else {
              console.log("📊 Booking fee is disabled");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching booking fee settings:", error);
        // Default to 0 if there's an error
        bookingFee = 0;
      }
      
      // For full vehicle booking, we always book the total seats
      const bookingData = { 
        ...req.body, 
        customerId: user.id,
        bookingFee: bookingFee,
        status: 'pending',
        numberOfSeats: ride.totalSeats // Always book the total seats for full vehicle booking
      };
      
      console.log("📝 Creating new booking:", bookingData);
      
      // Use a direct SQL query for immediate consistency
      try {
        // Start a transaction
        await pool.query('BEGIN');
        
        // 1. Insert the booking directly with SQL
        const bookingResult = await pool.query(
          `INSERT INTO bookings 
            (customer_id, ride_id, number_of_seats, status, booking_fee, is_paid, created_at, updated_at) 
           VALUES 
            ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
           RETURNING *`,
          [user.id, req.body.rideId, ride.totalSeats, 'pending', bookingFee, false]
        );
        
        const newBooking = bookingResult.rows[0];
        console.log("🎉 New booking created:", newBooking);
        
        // 2. Update the available seats in the ride
        await pool.query(
          `UPDATE rides 
           SET available_seats = available_seats - $1, updated_at = NOW() 
           WHERE id = $2`,
          [ride.totalSeats, req.body.rideId]
        );
        
        // Commit the transaction
        await pool.query('COMMIT');
        
        // Add customer data to the response
        const bookingWithCustomer = {
          id: newBooking.id,
          customerId: newBooking.customer_id,
          rideId: newBooking.ride_id,
          numberOfSeats: newBooking.number_of_seats,
          status: newBooking.status,
          bookingFee: newBooking.booking_fee,
          isPaid: newBooking.is_paid,
          createdAt: newBooking.created_at,
          updatedAt: newBooking.updated_at,
          customer: {
            id: user.id,
            fullName: user.fullName,
            role: user.role,
            averageRating: user.averageRating || 0
          },
          ride: {
            id: ride.id,
            fromLocation: ride.fromLocation,
            toLocation: ride.toLocation,
            departureDate: ride.departureDate,
            price: ride.price,
            rideType: ride.rideType,
            vehicleType: ride.vehicleType,
            vehicleNumber: ride.vehicleNumber
          }
        };
        
        // Send email notifications for the new booking
        try {
          // Get driver details for email notification
          const driver = await storage.getUser(ride.driverId);
          
          if (driver) {
            // Send booking notification to driver
            const driverEmailData = emailService.getRideBookingEmail(
              driver.fullName, 
              driver.email, 
              user.fullName, 
              {
                fromLocation: ride.fromLocation,
                toLocation: ride.toLocation,
                departureDate: ride.departureDate,
                numberOfSeats: newBooking.number_of_seats,
                customerName: user.fullName,
                customerMobile: user.mobile,
                ridePrice: ride.price,
                bookingFee: newBooking.booking_fee,
                bookingId: newBooking.id
              }
            );
            const driverEmailSent = await emailService.sendEmail(driverEmailData);
            if (driverEmailSent) {
              console.log("Booking notification email sent to driver:", driver.email);
            }
          }
          
          // Send booking request confirmation to customer
          const customerEmailData = emailService.getBookingRequestEmail(
            user.fullName,
            user.email,
            driver ? driver.fullName : 'Driver',
            {
              fromLocation: ride.fromLocation,
              toLocation: ride.toLocation,
              departureDate: ride.departureDate,
              numberOfSeats: newBooking.number_of_seats,
              ridePrice: ride.price,
              bookingFee: newBooking.booking_fee,
              vehicleType: ride.vehicleType,
              vehicleNumber: ride.vehicleNumber,
              bookingId: newBooking.id
            }
          );
          const customerEmailSent = await emailService.sendEmail(customerEmailData);
          if (customerEmailSent) {
            console.log("Booking confirmation email sent to customer:", user.email);
          }
        } catch (emailError) {
          console.error("Error sending booking notification emails:", emailError);
          // Don't fail booking if email fails
        }
        
        console.log("Responding with booking:", bookingWithCustomer);
        res.status(201).json(bookingWithCustomer);
      } catch (dbError) {
        console.error("Database error during booking creation:", dbError);
        await pool.query('ROLLBACK');
        throw new Error(`Booking creation failed: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`);
      }
    } catch (error) {
      res.status(500).json({ 
        error: "Booking failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  bookingRouter.get('/my-bookings', authorize(['customer']), async (req, res) => {
    try {
      const user = req.user as any;
      const bookings = await storage.getBookingsByCustomerId(user.id);
      
      // Get ride details for each booking
      const bookingsWithRides = await Promise.all(
        bookings.map(async (booking) => {
          const ride = await storage.getRide(booking.rideId);
          const driver = ride ? await storage.getUser(ride.driverId) : null;
          // Check if the current user (customer) has rated this booking
          const customerRatings = await storage.getRatingsByFromUserId(user.id);
          const hasRated = customerRatings.some(r => r.bookingId === booking.id);
          
          // Include driver's mobile number if booking is confirmed
          const driverInfo = driver ? {
            id: driver.id,
            fullName: driver.fullName,
            averageRating: driver.averageRating,
            mobile: booking.status === 'confirmed' || booking.status === 'completed' ? driver.mobile : undefined
          } : null;
          
          return { 
            ...booking, 
            ride, 
            driver: driverInfo,
            hasRated 
          };
        })
      );
      
      // Sort bookings by creation date (newest first)
      const sortedBookings = bookingsWithRides.sort((a, b) => {
        // Safely handle potentially missing date values
        const dateAStr = a.createdAt instanceof Date ? a.createdAt.toISOString() : 
                         (typeof a.createdAt === 'string' ? a.createdAt : new Date().toISOString());
        const dateBStr = b.createdAt instanceof Date ? b.createdAt.toISOString() : 
                         (typeof b.createdAt === 'string' ? b.createdAt : new Date().toISOString());
        
        const dateA = new Date(dateAStr);
        const dateB = new Date(dateBStr);
        return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
      });
      
      res.json(sortedBookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve bookings" });
    }
  });
  
  bookingRouter.get('/ride-bookings', authorize(['driver']), async (req, res) => {
    try {
      const user = req.user as any;
      console.log("🔍 Fetching ride bookings for driver ID:", user.id);
      
      // Use direct SQL for better performance and real-time data
      const query = `
        SELECT 
          b.*,
          r.id as ride_id, r.from_location, r.to_location, r.departure_date, 
          r.price, r.ride_type, r.vehicle_type, r.vehicle_number, r.status as ride_status,
          c.id as customer_id, c.full_name as customer_name, c.role as customer_role, 
          c.average_rating as customer_rating, c.mobile as customer_mobile,
          b.customer_has_rated, b.driver_has_rated
        FROM 
          bookings b
        JOIN 
          rides r ON b.ride_id = r.id 
        JOIN 
          users c ON b.customer_id = c.id
        WHERE 
          r.driver_id = $1
        ORDER BY 
          b.created_at DESC
      `;
      
      const result = await pool.query(query, [user.id]);
      console.log(`Found ${result.rows.length} bookings for driver ${user.id}`);
      
      // Map the results to match the expected format
      const mappedBookings = await Promise.all(
        result.rows.map(async (row) => {
          console.log(`Booking #${row.id} - driver_has_rated: ${row.driver_has_rated}, customer_has_rated: ${row.customer_has_rated}`);
          return {
            id: row.id,
            customerId: row.customer_id,
            rideId: row.ride_id,
            numberOfSeats: row.number_of_seats,
            status: row.status,
            bookingFee: row.booking_fee,
            isPaid: row.is_paid,
            cancellationReason: row.cancellation_reason,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            customerHasRated: row.customer_has_rated === true,
            driverHasRated: row.driver_has_rated === true,
            ride: {
              id: row.ride_id,
              fromLocation: row.from_location,
              toLocation: row.to_location,
              departureDate: row.departure_date,
              price: row.price,
              rideType: row.ride_type,
              vehicleType: row.vehicle_type,
              vehicleNumber: row.vehicle_number,
              status: row.ride_status
            },
            customer: {
              id: row.customer_id,
              fullName: row.customer_name,
              role: row.customer_role,
              averageRating: row.customer_rating,
              mobile: row.customer_mobile
            }
          };
        })
      );
      
      res.json(mappedBookings);
    } catch (error) {
      console.error("Error fetching ride bookings:", error);
      res.status(500).json({ error: "Failed to retrieve bookings" });
    }
  });
  
  bookingRouter.put('/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      
      if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const booking = await storage.getBooking(Number(id));
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Authorize - either the customer who made the booking or the driver of the ride
      if (req.isAuthenticated()) {
        const user = req.user as any;
        const ride = await storage.getRide(booking.rideId);
        
        if (booking.customerId !== user.id && ride?.driverId !== user.id && user.role !== 'admin') {
          return res.status(403).json({ error: "Not authorized to update this booking" });
        }
      } else {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check if reason is provided for cancellation
      if (status === 'cancelled' && !reason) {
        return res.status(400).json({ error: "Cancellation reason is required" });
      }
      
      // Use direct SQL for all booking updates to ensure consistency and real-time updates
      if (status === 'cancelled' && reason) {
        console.log("🚫 Cancelling booking:", id, "with reason:", reason);
        
        try {
          // Start transaction
          await pool.query('BEGIN');
          
          // 1. Update booking
          const updateBookingQuery = `
            UPDATE bookings 
            SET status = $1, cancellation_reason = $2, updated_at = NOW() 
            WHERE id = $3 
            RETURNING *
          `;
          const bookingResult = await pool.query(updateBookingQuery, ['cancelled', reason, id]);
          const updatedBooking = bookingResult.rows[0];
          
          // 2. If we have a booking, update ride available_seats if needed
          if (updatedBooking) {
            const ride = await storage.getRide(updatedBooking.ride_id);
            if (ride) {
              const seatsToReturn = updatedBooking.number_of_seats || 1;
              const updateRideQuery = `
                UPDATE rides 
                SET available_seats = available_seats + $1, updated_at = NOW() 
                WHERE id = $2
              `;
              await pool.query(updateRideQuery, [seatsToReturn, ride.id]);
            }
          }
          
          await pool.query('COMMIT');
          
          // Format the response to match the expected schema
          const formattedBooking = {
            id: updatedBooking.id,
            customerId: updatedBooking.customer_id,
            rideId: updatedBooking.ride_id,
            numberOfSeats: updatedBooking.number_of_seats,
            status: updatedBooking.status,
            bookingFee: updatedBooking.booking_fee,
            isPaid: updatedBooking.is_paid,
            cancellationReason: updatedBooking.cancellation_reason,
            createdAt: updatedBooking.created_at,
            updatedAt: updatedBooking.updated_at
          };
          
          // Send cancellation email notifications
          try {
            console.log("📧 Starting cancellation email process...");
            const ride = await storage.getRide(updatedBooking.ride_id);
            const customer = await storage.getUser(updatedBooking.customer_id);
            const driver = ride ? await storage.getUser(ride.driverId) : null;
            
            console.log("📧 Email data:", { 
              rideFound: !!ride, 
              customerFound: !!customer, 
              driverFound: !!driver 
            });
            
            if (ride && customer && driver) {
              // Determine who cancelled (check current user)
              const user = req.user as any;
              const cancelledBy = user.id === customer.id ? 'customer' : 'driver';
              console.log("📧 Cancellation by:", cancelledBy);
              
              // Send cancellation notification to driver
              const driverEmailData = emailService.getRideCancelledEmail(
                driver.fullName,
                driver.email,
                true, // isDriver = true means this is notification TO driver
                {
                  fromLocation: ride.fromLocation,
                  toLocation: ride.toLocation,
                  departureDate: ride.departureDate,
                  customerName: customer.fullName,
                  cancellationReason: reason,
                  cancelledBy: cancelledBy,
                  bookingId: updatedBooking.id
                }
              );
              const driverEmailSent = await emailService.sendEmail(driverEmailData);
              console.log("Driver cancellation email sent:", driverEmailSent);
              
              // Send cancellation notification to customer
              const customerEmailData = emailService.getRideCancelledEmail(
                customer.fullName,
                customer.email,
                false, // isDriver = false means this is notification TO customer
                {
                  fromLocation: ride.fromLocation,
                  toLocation: ride.toLocation,
                  departureDate: ride.departureDate,
                  driverName: driver.fullName,
                  cancellationReason: reason,
                  cancelledBy: cancelledBy,
                  bookingId: updatedBooking.id
                }
              );
              const customerEmailSent = await emailService.sendEmail(customerEmailData);
              console.log("Customer cancellation email sent:", customerEmailSent);
              
              console.log("Cancellation emails sent to both driver and customer");
            }
          } catch (emailError) {
            console.error("Error sending cancellation emails:", emailError);
            // Don't fail the cancellation if email fails
          }
          
          console.log("✅ Booking cancelled:", formattedBooking);
          res.json(formattedBooking);
        } catch (dbError: any) {
          console.error("Database error during booking cancellation:", dbError);
          await pool.query('ROLLBACK');
          return res.status(500).json({ error: "Database error during cancellation", details: dbError.message });
        }
      } else if (status === 'confirmed') {
        console.log("✅ CONFIRMING BOOKING:", id);
        
        try {
          // Start transaction
          await pool.query('BEGIN');
          
          // 1. Update booking status to confirmed
          const updateBookingQuery = `
            UPDATE bookings 
            SET status = $1, updated_at = NOW() 
            WHERE id = $2 
            RETURNING *
          `;
          const bookingResult = await pool.query(updateBookingQuery, ['confirmed', id]);
          const updatedBooking = bookingResult.rows[0];
          
          // Log the booking details for debugging
          console.log("📘 Booking confirmed with details:", {
            id: updatedBooking.id,
            rideId: updatedBooking.ride_id,
            status: updatedBooking.status
          });
          
          // Commit transaction
          await pool.query('COMMIT');
          
          // Get customer and ride details for the response
          const customer = await storage.getUser(updatedBooking.customer_id);
          const ride = await storage.getRide(updatedBooking.ride_id);
          
          // Format the response with complete data
          const formattedResponse = {
            id: updatedBooking.id,
            customerId: updatedBooking.customer_id,
            rideId: updatedBooking.ride_id,
            numberOfSeats: updatedBooking.number_of_seats,
            status: updatedBooking.status,
            bookingFee: updatedBooking.booking_fee,
            isPaid: updatedBooking.is_paid,
            createdAt: updatedBooking.created_at,
            updatedAt: updatedBooking.updated_at,
            customer: customer ? {
              id: customer.id,
              fullName: customer.fullName,
              role: customer.role,
              averageRating: customer.averageRating
            } : null,
            ride: ride ? {
              id: ride.id,
              fromLocation: ride.fromLocation,
              toLocation: ride.toLocation,
              departureDate: ride.departureDate,
              price: ride.price,
              rideType: ride.rideType,
              vehicleType: ride.vehicleType,
              vehicleNumber: ride.vehicleNumber
            } : null
          };
          
          // Send booking confirmation email notifications
          try {
            console.log("📧 Starting confirmation email process...");
            console.log("📧 Email data:", { customerFound: !!customer, rideFound: !!ride });
            
            if (customer && ride) {
              const driver = await storage.getUser(ride.driverId);
              console.log("📧 Driver found:", !!driver);
              
              if (driver) {
                // Send confirmation notification to customer
                const customerEmailData = emailService.getBookingConfirmationEmail(
                  customer.fullName,
                  customer.email,
                  driver.fullName,
                  {
                    fromLocation: ride.fromLocation,
                    toLocation: ride.toLocation,
                    departureDate: ride.departureDate,
                    numberOfSeats: updatedBooking.number_of_seats,
                    ridePrice: ride.price,
                    bookingFee: updatedBooking.booking_fee,
                    vehicleType: ride.vehicleType,
                    vehicleNumber: ride.vehicleNumber,
                    bookingId: updatedBooking.id,
                    driverMobile: driver.mobile
                  }
                );
                await emailService.sendEmail(customerEmailData);
                
                // Send confirmation notification to driver
                const driverEmailData = emailService.getRideBookingEmail(
                  driver.fullName,
                  driver.email,
                  customer.fullName,
                  {
                    fromLocation: ride.fromLocation,
                    toLocation: ride.toLocation,
                    departureDate: ride.departureDate,
                    numberOfSeats: updatedBooking.number_of_seats,
                    customerName: customer.fullName,
                    customerMobile: customer.mobile,
                    ridePrice: ride.price,
                    bookingFee: updatedBooking.booking_fee,
                    bookingId: updatedBooking.id,
                    isConfirmed: true
                  }
                );
                await emailService.sendEmail(driverEmailData);
                
                console.log("Booking confirmation emails sent to both customer and driver");
              }
            }
          } catch (emailError) {
            console.error("Error sending confirmation emails:", emailError);
            // Don't fail the confirmation if email fails
          }
          
          console.log("✅ Responding with complete booking data:", JSON.stringify(formattedResponse).slice(0, 200) + "...");
          res.json(formattedResponse);
        } catch (dbError: any) {
          console.error("Database error during booking confirmation:", dbError);
          await pool.query('ROLLBACK');
          return res.status(500).json({ error: "Database error during confirmation", details: dbError.message });
        }
      } else if (status === 'completed') {
        // Special handling for completion to ensure both booking and ride are marked as completed
        console.log("🔄 IMPORTANT: Marking booking as completed:", id);
        
        try {
          // Start transaction
          await pool.query('BEGIN');
          
          // First get the ride
          const ride = await storage.getRide(booking.rideId);
          if (!ride) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: "Associated ride not found" });
          }
          
          console.log("Found associated ride:", ride.id, "current status:", ride.status);
          
          // 1. Update the booking status first
          console.log("Step 1: Updating booking to completed");
          const bookingResult = await pool.query(
            'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            ['completed', id]
          );
          const updatedBooking = bookingResult.rows[0];
          
          // 2. Update the ride status using direct SQL for reliability
          console.log("Step 2: Ensuring ride is marked as completed using direct SQL");
          const rideResult = await pool.query(
            'UPDATE rides SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            ['completed', ride.id]
          );
          
          console.log("Ride update SQL result:", rideResult.rows[0]?.status || "No rows updated");
          
          // 3. Verify the update success
          const verifyResult = await pool.query('SELECT id, status FROM rides WHERE id = $1', [ride.id]);
          console.log("Verification query result:", verifyResult.rows[0]);
          
          // Commit the transaction
          await pool.query('COMMIT');
          
          // Send completion email notifications
          try {
            console.log("📧 Starting completion email process...");
            console.log("📧 Booking data:", { id: updatedBooking.id, customerId: updatedBooking.customer_id, rideId: ride.id });
            
            const customer = await storage.getUser(updatedBooking.customer_id);
            const driver = await storage.getUser(ride.driverId);
            
            console.log("📧 Email data:", { 
              customerFound: !!customer, 
              driverFound: !!driver,
              customerEmail: customer?.email,
              driverEmail: driver?.email
            });
            
            if (customer && driver) {
              console.log("📧 Attempting to send completion emails...");
              
              // Send proper completion notification to customer
              const customerEmailData = emailService.getRideCompletionEmail(
                customer.fullName,
                customer.email,
                false, // isDriver = false means this is notification TO customer
                {
                  fromLocation: ride.fromLocation,
                  toLocation: ride.toLocation,
                  departureDate: ride.departureDate,
                  driverName: driver.fullName,
                  bookingId: updatedBooking.id,
                  ridePrice: ride.price,
                  bookingFee: updatedBooking.booking_fee
                }
              );
              const customerEmailSent = await emailService.sendEmail(customerEmailData);
              console.log("📧 Customer completion email sent:", customerEmailSent);
              
              // Send proper completion notification to driver
              const driverEmailData = emailService.getRideCompletionEmail(
                driver.fullName,
                driver.email,
                true, // isDriver = true means this is notification TO driver
                {
                  fromLocation: ride.fromLocation,
                  toLocation: ride.toLocation,
                  departureDate: ride.departureDate,
                  customerName: customer.fullName,
                  bookingId: updatedBooking.id,
                  ridePrice: ride.price,
                  bookingFee: updatedBooking.booking_fee
                }
              );
              const driverEmailSent = await emailService.sendEmail(driverEmailData);
              console.log("📧 Driver completion email sent:", driverEmailSent);
              
              console.log("📧 Completion emails sent to both customer and driver");
            } else {
              console.log("📧 Missing customer or driver data - cannot send emails");
            }
          } catch (emailError) {
            console.error("📧 Error sending completion emails:", emailError);
            // Don't fail the completion if email fails
          }

          // Format the updated booking response
          const formattedBooking = {
            id: updatedBooking.id,
            customerId: updatedBooking.customer_id,
            rideId: updatedBooking.ride_id,
            numberOfSeats: updatedBooking.number_of_seats,
            status: updatedBooking.status,
            bookingFee: updatedBooking.booking_fee,
            isPaid: updatedBooking.is_paid,
            cancellationReason: updatedBooking.cancellation_reason,
            createdAt: updatedBooking.created_at,
            updatedAt: updatedBooking.updated_at,
            rideStatusUpdated: verifyResult.rows[0]?.status === 'completed',
            rideStatus: verifyResult.rows[0]?.status || ride.status
          };
          
          // Return the updated booking with additional information
          res.json(formattedBooking);
        } catch (dbError: any) {
          console.error("Database error during booking/ride completion:", dbError);
          await pool.query('ROLLBACK');
          return res.status(500).json({ error: "Database error updating statuses", details: dbError.message });
        }
      } else {
        // For other status changes
        console.log("Updating booking status:", id, "to:", status);
        try {
          const updateQuery = `
            UPDATE bookings 
            SET status = $1, updated_at = NOW() 
            WHERE id = $2 
            RETURNING *
          `;
          const result = await pool.query(updateQuery, [status, id]);
          const updatedBooking = result.rows[0];
          
          // Format the response
          const formattedBooking = {
            id: updatedBooking.id,
            customerId: updatedBooking.customer_id,
            rideId: updatedBooking.ride_id,
            numberOfSeats: updatedBooking.number_of_seats,
            status: updatedBooking.status,
            bookingFee: updatedBooking.booking_fee,
            isPaid: updatedBooking.is_paid,
            cancellationReason: updatedBooking.cancellation_reason,
            createdAt: updatedBooking.created_at,
            updatedAt: updatedBooking.updated_at
          };
          
          console.log("Booking updated:", formattedBooking);
          res.json(formattedBooking);
        } catch (dbError: any) {
          console.error("Database error during booking update:", dbError);
          return res.status(500).json({ error: "Database error updating booking", details: dbError.message });
        }
      }
    } catch (error) {
      console.error("Error in booking status update:", error);
      res.status(500).json({ error: "Failed to update booking status" });
    }
  });
  
  // Rating routes
  const ratingRouter = express.Router();
  
  ratingRouter.post('/', validateBody(insertRatingSchema), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const user = req.user as any;
      
      // Validate the booking exists and belongs to the user
      const booking = await storage.getBooking(req.body.bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Check if booking is completed
      if (booking.status !== 'completed') {
        return res.status(400).json({ error: "Can only rate completed bookings" });
      }
      
      // Get the ride to find driver
      const ride = await storage.getRide(booking.rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      // Determine who is rating whom
      let fromUserId, toUserId;
      
      if (user.id === booking.customerId) {
        // Customer rating driver
        fromUserId = user.id;
        toUserId = ride.driverId;
      } else if (user.id === ride.driverId) {
        // Driver rating customer
        fromUserId = user.id;
        toUserId = booking.customerId;
      } else {
        return res.status(403).json({ error: "You can only rate your own bookings" });
      }
      
      // Check if this specific user has already rated this specific booking
      // This needs to be a direct SQL query to avoid any caching issues
      const checkRatingQuery = `
        SELECT id FROM ratings 
        WHERE from_user_id = $1 AND booking_id = $2
      `;
      const ratingResult = await pool.query(checkRatingQuery, [fromUserId, booking.id]);
      
      if (ratingResult.rows.length > 0) {
        return res.status(400).json({ 
          error: "You have already rated this booking",
          details: "Each user can only submit one rating per booking" 
        });
      }
      
      // Begin transaction to ensure both operations complete
      await pool.query('BEGIN');
      
      try {
        // First create the rating
        const ratingData = {
          ...req.body,
          fromUserId,
          toUserId
        };
        
        const rating = await storage.createRating(ratingData);
        
        // Now update the booking's hasRated field for the current user
        if (user.id === booking.customerId) {
          // If customer is rating, update customerHasRated field
          await pool.query(
            'UPDATE bookings SET customer_has_rated = true, updated_at = NOW() WHERE id = $1',
            [booking.id]
          );
        } else {
          // If driver is rating, update driverHasRated field
          await pool.query(
            'UPDATE bookings SET driver_has_rated = true, updated_at = NOW() WHERE id = $1',
            [booking.id]
          );
        }
        
        // Commit the transaction
        await pool.query('COMMIT');
        
        res.status(201).json(rating);
      } catch (txnError) {
        // Rollback the transaction if anything fails
        await pool.query('ROLLBACK');
        throw txnError;
      }
    } catch (error) {
      console.error("Rating submission error:", error);
      res.status(500).json({ 
        error: "Rating submission failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Get all ratings for a specific user
  ratingRouter.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const ratings = await storage.getRatingsByToUserId(Number(userId));
      
      // Get user details for each rating
      const ratingsWithUsers = await Promise.all(
        ratings.map(async (rating) => {
          const fromUser = await storage.getUser(rating.fromUserId);
          return { 
            ...rating, 
            fromUser: {
              id: fromUser?.id,
              fullName: fromUser?.fullName,
              role: fromUser?.role
            }
          };
        })
      );
      
      res.json(ratingsWithUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve ratings" });
    }
  });
  
  // Get ratings for a specific booking
  ratingRouter.get('/booking/:bookingId', async (req, res) => {
    try {
      const { bookingId } = req.params;
      
      // Get the booking to ensure it exists
      const booking = await storage.getBooking(Number(bookingId));
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Get the ride to find the driver
      const ride = await storage.getRide(booking.rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      // Find ratings for this booking
      const query = `
        SELECT r.*, u.full_name, u.role
        FROM ratings r
        JOIN users u ON r.from_user_id = u.id
        WHERE r.booking_id = $1
      `;
      
      const result = await pool.query(query, [Number(bookingId)]);
      
      // Format the ratings
      const bookingRatings = result.rows.map(row => ({
        id: row.id,
        fromUserId: row.from_user_id,
        toUserId: row.to_user_id,
        bookingId: row.booking_id,
        rating: row.rating,
        review: row.review,
        createdAt: row.created_at,
        fromUser: {
          id: row.from_user_id,
          fullName: row.full_name,
          role: row.role
        }
      }));
      
      res.json(bookingRatings);
    } catch (error) {
      console.error("Error fetching booking ratings:", error);
      res.status(500).json({ 
        error: "Failed to retrieve booking ratings",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Admin routes
  const adminRouter = express.Router();
  
  // Admin Settings Management
  adminRouter.get('/settings/booking-fee', authorize(['admin']), async (req, res) => {
    try {
      const setting = await storage.getSetting('booking_fee');
      if (!setting) {
        // Return default if not found
        return res.json({ enabled: true, amount: 200 });
      }
      res.json(setting.value);
    } catch (error) {
      console.error('Error fetching booking fee setting:', error);
      res.status(500).json({ error: 'Failed to fetch booking fee setting' });
    }
  });

  adminRouter.patch('/settings/booking-fee', authorize(['admin']), async (req, res) => {
    try {
      const { enabled, amount } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Enabled must be a boolean' });
      }
      
      if (amount !== undefined && (typeof amount !== 'number' || amount < 0)) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }
      
      const value = { enabled, amount: amount || 0 };
      const setting = await storage.updateSetting('booking_fee', value);
      
      res.json(setting?.value || value);
    } catch (error) {
      console.error('Error updating booking fee setting:', error);
      res.status(500).json({ error: 'Failed to update booking fee setting' });
    }
  });
  
  // Public settings endpoint
  app.get('/api/settings/booking-fee', async (req, res) => {
    try {
      const setting = await storage.getSetting('booking_fee');
      if (!setting) {
        // Return default if not found
        return res.json({ enabled: true, amount: 200 });
      }
      res.json(setting.value);
    } catch (error) {
      console.error('Error fetching booking fee setting:', error);
      res.status(500).json({ error: 'Failed to fetch booking fee setting' });
    }
  });
  
  // Admin KYC management
  adminRouter.get('/kyc', authorize(['admin']), async (req, res) => {
    try {
      // Get all KYC verifications instead of only pending ones
      const kycs = await db.select().from(kycVerifications);

      if (!kycs || kycs.length === 0) {
        return res.json([]);
      }
      
      // Get user details for each KYC verification
      const detailedKyc = await Promise.all(
        kycs.map(async (kyc) => {
          const user = await storage.getUser(kyc.userId);
          return { ...kyc, user };
        })
      );
      
      res.json(detailedKyc);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve KYC verifications" });
    }
  });
  
  adminRouter.patch('/kyc/:id', authorize(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body;
      
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      
      const kyc = await storage.getKycVerification(Number(id));
      if (!kyc) {
        return res.status(404).json({ error: "KYC verification not found" });
      }
      
      // Update KYC status
      const updatedKyc = await storage.updateKycVerification(Number(id), { 
        status, 
        remarks 
      });
      
      // Get user details for email notification
      const user = await storage.getUser(kyc.userId);
      
      // If approved, update user's KYC status
      if (status === 'approved') {
        await storage.updateUser(kyc.userId, { isKycVerified: true });
        
        // Send approval email
        if (user) {
          try {
            const emailData = emailService.getKycApprovedEmail(user.fullName, user.email);
            const emailSent = await emailService.sendEmail(emailData);
            if (emailSent) {
              console.log("KYC approval email sent to:", user.email);
            } else {
              console.log("KYC approval email could not be sent to:", user.email);
            }
          } catch (emailError) {
            console.error("Error sending KYC approval email:", emailError);
          }
        }
      } else if (status === 'rejected') {
        // Send rejection email
        if (user) {
          try {
            const emailData = emailService.getKycRejectedEmail(user.fullName, user.email, remarks || 'Please review and resubmit your documents.');
            const emailSent = await emailService.sendEmail(emailData);
            if (emailSent) {
              console.log("KYC rejection email sent to:", user.email);
            } else {
              console.log("KYC rejection email could not be sent to:", user.email);
            }
          } catch (emailError) {
            console.error("Error sending KYC rejection email:", emailError);
          }
        }
      }
      
      res.json(updatedKyc);
    } catch (error) {
      res.status(500).json({ error: "Failed to update KYC status" });
    }
  });
  
  // Admin ride request management
  adminRouter.get('/ride-requests', authorize(['admin']), async (req, res) => {
    try {
      const requests = await storage.getAllRideRequests();
      
      // Get user details for each request
      const requestsWithUsers = await Promise.all(
        requests.map(async (request) => {
          const user = await storage.getUser(request.userId);
          return { ...request, user };
        })
      );
      
      res.json(requestsWithUsers);
    } catch (error) {
      console.error("Error fetching ride requests:", error);
      res.status(500).json({ error: "Failed to retrieve ride requests" });
    }
  });
  
  adminRouter.patch('/ride-requests/:id/status', authorize(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['pending', 'responded', 'closed'].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      
      const updatedRequest = await storage.updateRideRequestStatus(Number(id), status);
      if (!updatedRequest) {
        return res.status(404).json({ error: "Ride request not found" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating ride request status:", error);
      res.status(500).json({ error: "Failed to update ride request status" });
    }
  });

  // Dashboard statistics for admin
  adminRouter.get('/users/stats', authorize(['admin']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const drivers = users.filter(user => user.role === 'driver').length;
      const customers = users.filter(user => user.role === 'customer').length;
      
      res.json({
        total: users.length,
        drivers,
        customers,
        admin: users.length - drivers - customers
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve user statistics" });
    }
  });
  
  adminRouter.get('/kyc/stats', authorize(['admin']), async (req, res) => {
    try {
      // Use the same exact query used in the general KYC endpoint
      const kycs = await db.select().from(kycVerifications);
      
      // Set default values
      let stats = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        recent: []
      };
      
      if (!kycs || kycs.length === 0) {
        return res.json(stats);
      }
      
      const pending = kycs.filter(kyc => kyc.status === 'pending').length;
      const approved = kycs.filter(kyc => kyc.status === 'approved').length;
      const rejected = kycs.filter(kyc => kyc.status === 'rejected').length;
      
      // Get 5 most recent KYC submissions for the dashboard
      const sortedKycs = [...kycs].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      const recentKyc = await Promise.all(
        sortedKycs.slice(0, 5).map(async (kyc) => {
          const user = await storage.getUser(kyc.userId);
          return { ...kyc, user };
        })
      );
      
      // Ensure Content-Type is set to application/json
      res.setHeader("Content-Type", "application/json");
      return res.json({
        total: kycs.length,
        pending,
        approved,
        rejected,
        recent: recentKyc
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve KYC statistics" });
    }
  });
  
  adminRouter.get('/rides/stats', authorize(['admin']), async (req, res) => {
    try {
      const rides = await storage.getAllRides();
      const now = new Date();
      const active = rides.filter(ride => new Date(ride.departureDate) > now).length;
      const completed = rides.length - active;
      
      res.json({
        total: rides.length,
        active,
        completed
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve ride statistics" });
    }
  });
  
  adminRouter.get('/bookings/stats', authorize(['admin']), async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      const confirmed = bookings.filter(booking => booking.status === 'confirmed').length;
      const pending = bookings.filter(booking => booking.status === 'pending').length;
      const cancelled = bookings.filter(booking => booking.status === 'cancelled').length;
      
      // Get 5 most recent bookings for the dashboard
      const recentBookings = await Promise.all(
        bookings
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 5)
          .map(async (booking) => {
            const ride = await storage.getRide(booking.rideId);
            const customer = await storage.getUser(booking.customerId);
            const driver = ride ? await storage.getUser(ride.driverId) : null;
            
            return { 
              ...booking, 
              ride, 
              customer, 
              driver 
            };
          })
      );
      
      res.json({
        total: bookings.length,
        confirmed,
        pending,
        cancelled,
        recent: recentBookings
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve booking statistics" });
    }
  });
  
  adminRouter.get('/users', authorize(['admin']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve users" });
    }
  });
  
  adminRouter.patch('/users/:id', authorize(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const userData = req.body;
      console.log(`Updating user ${userId} with data:`, userData);
      
      // Use storage method instead of direct DB access to avoid import issues
      const updatedUser = await storage.updateUser(userId, userData);
      
      if (!updatedUser) {
        console.error("User update failed - no user returned");
        return res.status(404).json({ error: "User not found" });
      }
      
      console.log("User updated successfully:", updatedUser);
      
      // Ensure Content-Type is set to application/json 
      res.setHeader("Content-Type", "application/json");
      return res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      // Ensure Content-Type is set to application/json even in error cases
      res.setHeader("Content-Type", "application/json");
      return res.status(500).json({ error: "Failed to update user" });
    }
  });
  
  adminRouter.get('/rides', authorize(['admin']), async (req, res) => {
    try {
      const rides = await storage.getAllRides();
      
      // Get driver details for each ride
      const ridesWithDrivers = await Promise.all(
        rides.map(async (ride) => {
          const driver = await storage.getUser(ride.driverId);
          return { ...ride, driver };
        })
      );
      
      res.json(ridesWithDrivers);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve rides" });
    }
  });
  
  adminRouter.get('/bookings', authorize(['admin']), async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      
      // Get ride and user details for each booking
      const detailedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const ride = await storage.getRide(booking.rideId);
          const customer = await storage.getUser(booking.customerId);
          const driver = ride ? await storage.getUser(ride.driverId) : null;
          
          return { 
            ...booking, 
            ride, 
            customer, 
            driver 
          };
        })
      );
      
      res.json(detailedBookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve bookings" });
    }
  });
  
  adminRouter.get('/ratings', authorize(['admin']), async (req, res) => {
    try {
      const ratings = await storage.getAllRatings();
      
      // Get user details for each rating
      const detailedRatings = await Promise.all(
        ratings.map(async (rating) => {
          const fromUser = await storage.getUser(rating.fromUserId);
          const toUser = await storage.getUser(rating.toUserId);
          
          return { 
            ...rating, 
            fromUser, 
            toUser 
          };
        })
      );
      
      res.json(detailedRatings);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve ratings" });
    }
  });
  
  // Page Content routes
  const pageContentRouter = express.Router();
  
  // Ride Request routes
  const rideRequestRouter = express.Router();
  
  // Create a new ride request
  rideRequestRouter.post('/', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const user = req.user as any;
      const requestData = {
        ...req.body,
        userId: user.id,
        status: 'pending'
      };
      
      const rideRequest = await storage.createRideRequest(requestData);
      res.status(201).json(rideRequest);
    } catch (error) {
      console.error("Error creating ride request:", error);
      res.status(500).json({ error: "Failed to create ride request" });
    }
  });
  
  // Get ride requests for current user
  rideRequestRouter.get('/my-requests', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const user = req.user as any;
      const requests = await storage.getRideRequestsByUserId(user.id);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching user ride requests:", error);
      res.status(500).json({ error: "Failed to fetch ride requests" });
    }
  });
  
  // Get all page contents
  pageContentRouter.get('/', async (req, res) => {
    try {
      const contents = await storage.getAllPageContents();
      res.json(contents);
    } catch (error) {
      console.error('Error fetching page contents:', error);
      res.status(500).json({ error: "Failed to retrieve page contents" });
    }
  });
  
  // Get page content by slug
  pageContentRouter.get('/slug/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const content = await storage.getPageContentBySlug(slug);
      
      if (!content) {
        return res.status(404).json({ error: "Page content not found" });
      }
      
      res.json(content);
    } catch (error) {
      console.error(`Error fetching page content with slug ${req.params.slug}:`, error);
      res.status(500).json({ error: "Failed to retrieve page content" });
    }
  });
  
  // Get page contents by category
  pageContentRouter.get('/category/:category', async (req, res) => {
    try {
      const { category } = req.params;
      const contents = await storage.getPageContentsByCategory(category);
      res.json(contents);
    } catch (error) {
      console.error(`Error fetching page contents for category ${req.params.category}:`, error);
      res.status(500).json({ error: "Failed to retrieve page contents" });
    }
  });
  
  // Admin only routes for managing page content
  adminRouter.get('/page-contents', authorize(['admin']), async (req, res) => {
    try {
      const contents = await storage.getAllPageContents();
      res.json(contents);
    } catch (error) {
      console.error('Error fetching page contents:', error);
      res.status(500).json({ error: "Failed to retrieve page contents" });
    }
  });
  
  adminRouter.get('/page-contents/:id', authorize(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const content = await storage.getPageContent(Number(id));
      
      if (!content) {
        return res.status(404).json({ error: "Page content not found" });
      }
      
      res.json(content);
    } catch (error) {
      console.error(`Error fetching page content with ID ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to retrieve page content" });
    }
  });
  
  adminRouter.post('/page-contents', authorize(['admin']), validateBody(insertPageContentSchema), async (req, res) => {
    try {
      const content = await storage.createPageContent(req.body);
      res.status(201).json(content);
    } catch (error) {
      console.error('Error creating page content:', error);
      res.status(500).json({ error: "Failed to create page content" });
    }
  });
  
  adminRouter.patch('/page-contents/:id', authorize(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const content = await storage.updatePageContent(Number(id), req.body);
      
      if (!content) {
        return res.status(404).json({ error: "Page content not found" });
      }
      
      res.json(content);
    } catch (error) {
      console.error(`Error updating page content with ID ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update page content" });
    }
  });
  
  adminRouter.delete('/page-contents/:id', authorize(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePageContent(Number(id));
      
      if (!success) {
        return res.status(404).json({ error: "Page content not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting page content with ID ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete page content" });
    }
  });
  
  // App Settings routes
  adminRouter.get('/settings', authorize(['admin']), async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching all settings:', error);
      res.status(500).json({ error: "Failed to retrieve settings" });
    }
  });
  
  adminRouter.get('/settings/:key', authorize(['admin']), async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSetting(key);
      
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error(`Error fetching setting with key ${req.params.key}:`, error);
      res.status(500).json({ error: "Failed to retrieve setting" });
    }
  });
  
  // Public API endpoint for settings
  app.get('/api/settings/public', async (req, res) => {
    try {
      const allSettings = await storage.getAllSettings();
      // Filter to only include public settings (contact and social)
      const publicSettings = allSettings.filter(setting => 
        setting.key.startsWith('contact_') || 
        setting.key.startsWith('social_')
      );
      res.json(publicSettings);
    } catch (error) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ error: "Failed to retrieve public settings" });
    }
  });

  adminRouter.put('/settings', authorize(['admin']), async (req, res) => {
    try {
      const { key, value } = req.body;
      
      if (!key) {
        return res.status(400).json({ error: "Key is required" });
      }
      
      const setting = await storage.updateSetting(key, value);
      
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error('Error updating setting:', error);
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  // Admin email settings routes
  adminRouter.get('/email-settings', authorize(['admin']), async (req, res) => {
    try {
      const settings = await storage.getEmailSettings();
      res.json(settings || {});
    } catch (error) {
      console.error('Error fetching email settings:', error);
      res.status(500).json({ error: 'Failed to fetch email settings' });
    }
  });

  adminRouter.post('/email-settings', authorize(['admin']), validateBody(z.object({
    smtpHost: z.string().min(1),
    smtpPort: z.number().min(1).max(65535),
    smtpUsername: z.string().min(1),
    smtpPassword: z.string().min(1),
    fromEmail: z.string().email(),
    fromName: z.string().min(1),
    isEnabled: z.boolean(),
  })), async (req, res) => {
    try {
      const settings = await storage.updateEmailSettings(req.body);
      
      // Reset email service settings cache
      const { emailService } = await import('./email-service.js');
      emailService.resetSettings();
      
      res.json(settings);
    } catch (error) {
      console.error('Error updating email settings:', error);
      res.status(500).json({ error: 'Failed to update email settings' });
    }
  });

  adminRouter.post('/email-settings/test', authorize(['admin']), validateBody(z.object({
    smtpHost: z.string().min(1),
    smtpPort: z.number().min(1).max(65535),
    smtpUsername: z.string().min(1),
    smtpPassword: z.string().min(1),
    fromEmail: z.string().email(),
    fromName: z.string().min(1),
    isEnabled: z.boolean(),
  })), async (req, res) => {
    try {
      const isValid = await storage.testEmailConnection(req.body);
      res.json({ success: isValid });
    } catch (error) {
      console.error('Error testing email connection:', error);
      res.status(500).json({ error: 'Failed to test email connection' });
    }
  });
  
  // Public page endpoint (no auth required)
  app.get('/api/page/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const page = await storage.getPageContentBySlug(slug);
      
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      // Only return published pages to public
      if (!page.isPublished) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      res.json(page);
    } catch (error) {
      console.error("Error fetching page:", error);
      res.status(500).json({ error: "Failed to fetch page" });
    }
  });

  // Register all routes
  app.use('/api/auth', authRouter);
  app.use('/api/kyc', kycRouter);
  app.use('/api/rides', rideRouter);
  app.use('/api/bookings', bookingRouter);
  app.use('/api/ratings', ratingRouter);
  app.use('/api/page-contents', pageContentRouter);
  app.use('/api/ride-requests', rideRequestRouter);
  app.use('/api/admin', adminRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
