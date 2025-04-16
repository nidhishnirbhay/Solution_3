import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  users, 
  kycVerifications, 
  rides, 
  bookings, 
  ratings,
  type User, 
  type InsertUser, 
  type KycVerification, 
  type InsertKycVerification,
  type Ride,
  type InsertRide,
  type Booking,
  type InsertBooking,
  type Rating,
  type InsertRating
} from "@shared/schema";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.mobile, mobile));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        isKycVerified: false,
        averageRating: 0
      })
      .returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role));
  }

  // KYC methods
  async createKycVerification(kyc: InsertKycVerification): Promise<KycVerification> {
    const [kycVerification] = await db
      .insert(kycVerifications)
      .values({
        ...kyc,
        status: "pending"
      })
      .returning();
    return kycVerification;
  }

  async getKycVerification(id: number): Promise<KycVerification | undefined> {
    const [kyc] = await db.select().from(kycVerifications).where(eq(kycVerifications.id, id));
    return kyc;
  }

  async getKycVerificationsByUserId(userId: number): Promise<KycVerification[]> {
    return db.select().from(kycVerifications).where(eq(kycVerifications.userId, userId));
  }

  async getPendingKycVerifications(): Promise<KycVerification[]> {
    return db.select().from(kycVerifications).where(eq(kycVerifications.status, "pending"));
  }

  async updateKycVerification(id: number, data: Partial<KycVerification>): Promise<KycVerification | undefined> {
    const [updatedKyc] = await db
      .update(kycVerifications)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(kycVerifications.id, id))
      .returning();
    
    // If KYC is approved, update the user's KYC verification status
    if (data.status === "approved" && updatedKyc) {
      await db
        .update(users)
        .set({ isKycVerified: true })
        .where(eq(users.id, updatedKyc.userId));
    }
    
    return updatedKyc;
  }

  // Ride methods
  async createRide(ride: InsertRide): Promise<Ride> {
    // Make sure availableSeats starts equal to totalSeats
    const [newRide] = await db
      .insert(rides)
      .values({
        ...ride,
        availableSeats: ride.totalSeats
      })
      .returning();
    return newRide;
  }

  async getRide(id: number): Promise<Ride | undefined> {
    const [ride] = await db.select().from(rides).where(eq(rides.id, id));
    return ride;
  }

  async getRidesByDriverId(driverId: number): Promise<Ride[]> {
    return db.select().from(rides).where(eq(rides.driverId, driverId));
  }

  async searchRides(fromLocation: string, toLocation: string, date?: string, rideType?: string): Promise<Ride[]> {
    // Base query with conditions - explicitly exclude cancelled rides
    let baseQuery = db
      .select()
      .from(rides)
      .where(
        and(
          sql`LOWER(${rides.fromLocation}) LIKE LOWER(${'%' + fromLocation + '%'})`,
          sql`LOWER(${rides.toLocation}) LIKE LOWER(${'%' + toLocation + '%'})`,
          sql`${rides.availableSeats} > 0`,
          sql`${rides.status} != 'cancelled'` // Explicitly exclude cancelled rides
        )
      );
    
    // Need to execute the base query before applying more filters
    let results = await baseQuery;
    
    // Filter by date if provided
    if (date) {
      results = results.filter(ride => {
        const rideDate = new Date(ride.departureDate);
        const searchDate = new Date(date);
        return rideDate.toDateString() === searchDate.toDateString();
      });
    }
    
    // Filter by ride type if provided
    if (rideType && rideType !== "all") {
      results = results.filter(ride => {
        // Handle ride type as array or string
        if (Array.isArray(ride.rideType)) {
          return ride.rideType.includes(rideType);
        } else {
          return ride.rideType === rideType;
        }
      });
    }
    
    console.log(`Search results: ${results.length} rides found matching from=${fromLocation}, to=${toLocation}`);
    
    return results;
  }

  async updateRide(id: number, data: Partial<Ride>): Promise<Ride | undefined> {
    const [updatedRide] = await db
      .update(rides)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(rides.id, id))
      .returning();
    return updatedRide;
  }

  async getAllRides(): Promise<Ride[]> {
    return db.select().from(rides);
  }

  // Booking methods
  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db
      .insert(bookings)
      .values({
        ...booking,
        isPaid: false
      })
      .returning();
    
    // Update available seats in the ride
    const [ride] = await db.select().from(rides).where(eq(rides.id, booking.rideId));
    if (ride && booking.numberOfSeats) {
      const seatsToBook = booking.numberOfSeats || 1; // Default to 1 seat if not specified
      const updatedAvailableSeats = ride.availableSeats - seatsToBook;
      await db
        .update(rides)
        .set({ availableSeats: updatedAvailableSeats })
        .where(eq(rides.id, ride.id));
    }
    
    return newBooking;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getBookingsByCustomerId(customerId: number): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.customerId, customerId));
  }

  async getBookingsByRideId(rideId: number): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.rideId, rideId));
  }

  async updateBooking(id: number, data: Partial<Booking>): Promise<Booking | undefined> {
    const booking = await this.getBooking(id);
    if (!booking) return undefined;
    
    // Handle seat adjustments if booking is cancelled
    if (booking.status !== 'cancelled' && data.status === 'cancelled') {
      const ride = await this.getRide(booking.rideId);
      if (ride && booking.numberOfSeats) {
        const seatsToReturn = booking.numberOfSeats || 1; // Default to 1 if not specified
        const newAvailableSeats = ride.availableSeats + seatsToReturn;
        await this.updateRide(ride.id, { availableSeats: newAvailableSeats });
      }
    }
    
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(bookings.id, id))
      .returning();
    
    return updatedBooking;
  }

  async getAllBookings(): Promise<Booking[]> {
    return db.select().from(bookings);
  }

  // Rating methods
  async createRating(rating: InsertRating): Promise<Rating> {
    const [newRating] = await db
      .insert(ratings)
      .values(rating)
      .returning();
    
    // Update user average rating
    const userRatings = await db
      .select()
      .from(ratings)
      .where(eq(ratings.toUserId, rating.toUserId));
    
    if (userRatings.length > 0) {
      const sum = userRatings.reduce((acc, curr) => acc + curr.rating, 0);
      const average = sum / userRatings.length;
      
      await db
        .update(users)
        .set({ averageRating: average })
        .where(eq(users.id, rating.toUserId));
    }
    
    return newRating;
  }

  async getRating(id: number): Promise<Rating | undefined> {
    const [rating] = await db.select().from(ratings).where(eq(ratings.id, id));
    return rating;
  }

  async getRatingsByFromUserId(fromUserId: number): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.fromUserId, fromUserId));
  }

  async getRatingsByToUserId(toUserId: number): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.toUserId, toUserId));
  }

  async getRatingByBookingId(bookingId: number): Promise<Rating | undefined> {
    const [rating] = await db.select().from(ratings).where(eq(ratings.bookingId, bookingId));
    return rating;
  }

  async getAllRatings(): Promise<Rating[]> {
    return db.select().from(ratings);
  }
}