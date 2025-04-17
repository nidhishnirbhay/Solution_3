import { db, pool } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  users, 
  kycVerifications, 
  rides, 
  bookings, 
  ratings,
  appSettings,
  type User, 
  type InsertUser, 
  type KycVerification, 
  type InsertKycVerification,
  type Ride,
  type InsertRide,
  type Booking,
  type InsertBooking,
  type Rating,
  type InsertRating,
  type AppSetting,
  type InsertAppSetting
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
    try {
      // Convert data to a SQL-friendly format
      const setClause = Object.entries(data)
        .map(([key, value]) => {
          // Convert camelCase to snake_case for SQL
          const sqlKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          
          // Handle different types of values
          if (value === null) return `${sqlKey} = NULL`;
          if (typeof value === 'boolean') return `${sqlKey} = ${value}`;
          if (typeof value === 'number') return `${sqlKey} = ${value}`;
          if (value instanceof Date) return `${sqlKey} = '${value.toISOString()}'`;
          return `${sqlKey} = '${value}'`;
        })
        .join(', ');
      
      // Execute direct SQL update
      const query = `
        UPDATE users 
        SET ${setClause}, updated_at = NOW() 
        WHERE id = $1 
        RETURNING *
      `;
      
      console.log("SQL Update User Query:", query);
      
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      // Convert back from snake_case to camelCase
      const row = result.rows[0];
      return {
        id: row.id,
        username: row.username,
        password: row.password,
        fullName: row.full_name,
        role: row.role,
        mobile: row.mobile,
        isKycVerified: row.is_kyc_verified,
        isSuspended: row.is_suspended,
        averageRating: row.average_rating,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error("SQL Error in updateUser:", error);
      throw error;
    }
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
    try {
      // Trim input values to handle extra spaces
      const trimmedFrom = fromLocation.trim();
      const trimmedTo = toLocation.trim();
      
      console.log(`Searching rides with criteria: from=${trimmedFrom}, to=${trimmedTo}, date=${date || 'any'}`);
      
      // Use more flexible pattern matching with % at both ends
      let baseQuery = db
        .select()
        .from(rides)
        .where(
          and(
            sql`LOWER(${rides.fromLocation}) LIKE LOWER(${'%' + trimmedFrom + '%'})`,
            sql`LOWER(${rides.toLocation}) LIKE LOWER(${'%' + trimmedTo + '%'})`,
            sql`${rides.availableSeats} > 0`,
            sql`${rides.status} = 'active'` // Only show active rides in search
          )
        )
        .orderBy(desc(rides.createdAt)); // Show newest rides first
      
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
      
      console.log(`Search results: ${results.length} rides found matching from=${trimmedFrom}, to=${trimmedTo}`);
      
      return results;
    } catch (error) {
      console.error("Error in searchRides:", error);
      return []; // Return empty array on error
    }
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
  
  // App Settings methods
  async getSetting(key: string): Promise<AppSetting | undefined> {
    try {
      const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
      return setting;
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      throw error;
    }
  }
  
  async updateSetting(key: string, value: any): Promise<AppSetting | undefined> {
    try {
      // First check if the setting exists
      const existingSetting = await this.getSetting(key);
      
      if (existingSetting) {
        // Update existing setting
        const [updatedSetting] = await db
          .update(appSettings)
          .set({
            value,
            updatedAt: new Date()
          })
          .where(eq(appSettings.key, key))
          .returning();
        return updatedSetting;
      } else {
        // Create new setting if it doesn't exist
        const [newSetting] = await db
          .insert(appSettings)
          .values({
            key,
            value
          })
          .returning();
        return newSetting;
      }
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      throw error;
    }
  }
  
  async getAllSettings(): Promise<AppSetting[]> {
    try {
      return await db.select().from(appSettings);
    } catch (error) {
      console.error('Error getting all settings:', error);
      throw error;
    }
  }
}