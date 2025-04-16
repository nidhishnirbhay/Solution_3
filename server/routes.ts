import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertUserSchema,
  insertKycSchema,
  insertRideSchema,
  insertBookingSchema,
  insertRatingSchema
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
      // Create admin user
      await storage.createUser({
        username: 'oyegaadicabs@gmail.com',
        password: 'OGC.2000',
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
  // Seed the admin user
  await seedAdminUser();
  
  const MemorySessionStore = MemoryStore(session);
  
  // Configure session and passport
  app.use(session({
    secret: 'oyegaadi-secret-key-for-production-use-env-var',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      sameSite: 'lax'
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
    async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'Invalid username or password' });
        }
        if (user.password !== password) {
          return done(null, false, { message: 'Invalid username or password' });
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
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message });
      
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          isKycVerified: user.isKycVerified
        });
      });
    })(req, res, next);
  });
  
  authRouter.post('/register', validateBody(insertUserSchema), async (req, res) => {
    try {
      const { username, mobile } = req.body;
      
      // Check if username or mobile already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      const existingMobile = await storage.getUserByMobile(mobile);
      if (existingMobile) {
        return res.status(400).json({ error: "Mobile number already registered" });
      }
      
      const newUser = await storage.createUser(req.body);
      
      // Auto-login after registration
      req.logIn(newUser, (err) => {
        if (err) return res.status(500).json({ error: "Login after registration failed" });
        return res.status(201).json({
          id: newUser.id,
          username: newUser.username,
          fullName: newUser.fullName,
          role: newUser.role,
          isKycVerified: newUser.isKycVerified
        });
      });
    } catch (error) {
      res.status(500).json({ error: "Registration failed" });
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
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      isKycVerified: user.isKycVerified,
      mobile: user.mobile,
      averageRating: user.averageRating
    });
  });
  
  // KYC routes
  const kycRouter = express.Router();
  
  kycRouter.post('/', validateBody(insertKycSchema), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const user = req.user as any;
      const userId = Number(user.id);
      
      // Prepare the data ensuring userId is a number
      const kycData = { 
        ...req.body, 
        userId: userId
      };
      
      const kyc = await storage.createKycVerification(kycData);
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
  
  kycRouter.get('/my-kyc', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
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
  
  rideRouter.post('/', authorize(['driver']), validateBody(insertRideSchema), async (req, res) => {
    try {
      const user = req.user as any;
      
      // Check if driver is KYC verified
      if (!user.isKycVerified) {
        return res.status(403).json({ error: "KYC verification required to publish rides" });
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
      
      const ride = await storage.createRide(rideData);
      res.status(201).json(ride);
    } catch (error) {
      console.error("Ride creation error:", error);
      res.status(500).json({ error: "Failed to create ride" });
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
  
  rideRouter.get('/my-rides', authorize(['driver']), async (req, res) => {
    try {
      const user = req.user as any;
      const rides = await storage.getRidesByDriverId(user.id);
      
      // Add driver information to each ride
      const ridesWithDriver = rides.map(ride => ({
        ...ride,
        driver: {
          id: user.id,
          fullName: user.fullName,
          averageRating: user.averageRating || 0,
          isKycVerified: user.isKycVerified
        }
      }));
      
      res.json(ridesWithDriver);
    } catch (error) {
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
      
      const bookingData = { 
        ...req.body, 
        customerId: user.id,
        bookingFee: 200,
        status: 'pending'
      };
      
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      res.status(500).json({ error: "Booking failed" });
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
          const rating = await storage.getRatingByBookingId(booking.id);
          return { 
            ...booking, 
            ride, 
            driver,
            hasRated: !!rating 
          };
        })
      );
      
      res.json(bookingsWithRides);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve bookings" });
    }
  });
  
  bookingRouter.get('/ride-bookings', authorize(['driver']), async (req, res) => {
    try {
      const user = req.user as any;
      const rides = await storage.getRidesByDriverId(user.id);
      
      const allBookings = [];
      for (const ride of rides) {
        const bookings = await storage.getBookingsByRideId(ride.id);
        
        // Get customer details for each booking
        const bookingsWithCustomers = await Promise.all(
          bookings.map(async (booking) => {
            const customer = await storage.getUser(booking.customerId);
            const rating = await storage.getRatingByBookingId(booking.id);
            return { 
              ...booking, 
              ride, 
              customer,
              hasRated: !!rating 
            };
          })
        );
        
        allBookings.push(...bookingsWithCustomers);
      }
      
      res.json(allBookings);
    } catch (error) {
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
      
      // If status is cancelled, include the reason in the update
      const updateData: any = { status };
      if (status === 'cancelled' && reason) {
        updateData.cancellationReason = reason;
      }
      
      const updated = await storage.updateBooking(Number(id), updateData);
      res.json(updated);
    } catch (error) {
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
      
      // Check if already rated
      const existingRating = await storage.getRatingByBookingId(booking.id);
      if (existingRating) {
        return res.status(400).json({ error: "Booking already rated" });
      }
      
      // Determine who is rating whom
      let fromUserId, toUserId;
      
      // Get the ride to find driver
      const ride = await storage.getRide(booking.rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
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
      
      const ratingData = {
        ...req.body,
        fromUserId,
        toUserId
      };
      
      const rating = await storage.createRating(ratingData);
      res.status(201).json(rating);
    } catch (error) {
      res.status(500).json({ error: "Rating submission failed" });
    }
  });
  
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
  
  // Admin routes
  const adminRouter = express.Router();
  
  // Admin KYC management
  adminRouter.get('/kyc', authorize(['admin']), async (req, res) => {
    try {
      const kycVerifications = await storage.getPendingKycVerifications();
      
      // Get user details for each KYC verification
      const detailedKyc = await Promise.all(
        kycVerifications.map(async (kyc) => {
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
      
      // If approved, update user's KYC status
      if (status === 'approved') {
        await storage.updateUser(kyc.userId, { isKycVerified: true });
      }
      
      res.json(updatedKyc);
    } catch (error) {
      res.status(500).json({ error: "Failed to update KYC status" });
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
      const allKyc = await storage.getPendingKycVerifications();
      const pending = allKyc.filter(kyc => kyc.status === 'pending').length;
      const approved = allKyc.filter(kyc => kyc.status === 'approved').length;
      const rejected = allKyc.filter(kyc => kyc.status === 'rejected').length;
      
      // Get 5 most recent KYC submissions for the dashboard
      const recentKyc = await Promise.all(
        allKyc
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 5)
          .map(async (kyc) => {
            const user = await storage.getUser(kyc.userId);
            return { ...kyc, user };
          })
      );
      
      res.json({
        total: allKyc.length,
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
  
  // Register all routes
  app.use('/api/auth', authRouter);
  app.use('/api/kyc', kycRouter);
  app.use('/api/rides', rideRouter);
  app.use('/api/bookings', bookingRouter);
  app.use('/api/ratings', ratingRouter);
  app.use('/api/admin', adminRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
