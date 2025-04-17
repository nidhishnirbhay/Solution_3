import { 
  users, type User, type InsertUser,
  kycVerifications, type KycVerification, type InsertKycVerification,
  rides, type Ride, type InsertRide,
  bookings, type Booking, type InsertBooking,
  ratings, type Rating, type InsertRating,
  appSettings, type AppSetting, type InsertAppSetting
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByMobile(mobile: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;

  // KYC methods
  createKycVerification(kyc: InsertKycVerification): Promise<KycVerification>;
  getKycVerification(id: number): Promise<KycVerification | undefined>;
  getKycVerificationsByUserId(userId: number): Promise<KycVerification[]>;
  getPendingKycVerifications(): Promise<KycVerification[]>;
  updateKycVerification(id: number, data: Partial<KycVerification>): Promise<KycVerification | undefined>;

  // Ride methods
  createRide(ride: InsertRide): Promise<Ride>;
  getRide(id: number): Promise<Ride | undefined>;
  getRidesByDriverId(driverId: number): Promise<Ride[]>;
  searchRides(fromLocation: string, toLocation: string, date?: string, rideType?: string): Promise<Ride[]>;
  updateRide(id: number, data: Partial<Ride>): Promise<Ride | undefined>;
  getAllRides(): Promise<Ride[]>;

  // Booking methods
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByCustomerId(customerId: number): Promise<Booking[]>;
  getBookingsByRideId(rideId: number): Promise<Booking[]>;
  updateBooking(id: number, data: Partial<Booking>): Promise<Booking | undefined>;
  getAllBookings(): Promise<Booking[]>;

  // Rating methods
  createRating(rating: InsertRating): Promise<Rating>;
  getRating(id: number): Promise<Rating | undefined>;
  getRatingsByFromUserId(fromUserId: number): Promise<Rating[]>;
  getRatingsByToUserId(toUserId: number): Promise<Rating[]>;
  getRatingByBookingId(bookingId: number): Promise<Rating | undefined>;
  getAllRatings(): Promise<Rating[]>;
  
  // App Settings methods
  getSetting(key: string): Promise<AppSetting | undefined>;
  updateSetting(key: string, value: any): Promise<AppSetting | undefined>;
  getAllSettings(): Promise<AppSetting[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private kycVerifications: Map<number, KycVerification>;
  private rides: Map<number, Ride>;
  private bookings: Map<number, Booking>;
  private ratings: Map<number, Rating>;
  
  private userIdCounter: number;
  private kycIdCounter: number;
  private rideIdCounter: number;
  private bookingIdCounter: number;
  private ratingIdCounter: number;

  constructor() {
    this.users = new Map();
    this.kycVerifications = new Map();
    this.rides = new Map();
    this.bookings = new Map();
    this.ratings = new Map();
    
    this.userIdCounter = 1;
    this.kycIdCounter = 1;
    this.rideIdCounter = 1;
    this.bookingIdCounter = 1;
    this.ratingIdCounter = 1;
    
    // Create an admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      mobile: "9999999999",
      fullName: "Admin User",
      role: "admin"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.mobile === mobile,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const timestamp = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      isKycVerified: false, 
      averageRating: 0,
      createdAt: timestamp
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser: User = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  // KYC methods
  async createKycVerification(kyc: InsertKycVerification): Promise<KycVerification> {
    const id = this.kycIdCounter++;
    const timestamp = new Date();
    const kycVerification: KycVerification = { 
      ...kyc, 
      id, 
      status: "pending", 
      remarks: "",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.kycVerifications.set(id, kycVerification);
    return kycVerification;
  }

  async getKycVerification(id: number): Promise<KycVerification | undefined> {
    return this.kycVerifications.get(id);
  }

  async getKycVerificationsByUserId(userId: number): Promise<KycVerification[]> {
    return Array.from(this.kycVerifications.values()).filter(
      (kyc) => kyc.userId === userId,
    );
  }

  async getPendingKycVerifications(): Promise<KycVerification[]> {
    return Array.from(this.kycVerifications.values()).filter(
      (kyc) => kyc.status === "pending",
    );
  }

  async updateKycVerification(id: number, data: Partial<KycVerification>): Promise<KycVerification | undefined> {
    const kyc = await this.getKycVerification(id);
    if (!kyc) return undefined;
    
    const updatedKyc: KycVerification = { 
      ...kyc, 
      ...data, 
      updatedAt: new Date() 
    };
    this.kycVerifications.set(id, updatedKyc);
    
    // If KYC is approved, update user's KYC status
    if (data.status === 'approved') {
      const user = await this.getUser(kyc.userId);
      if (user) {
        await this.updateUser(user.id, { isKycVerified: true });
      }
    }
    
    return updatedKyc;
  }

  // Ride methods
  async createRide(ride: InsertRide): Promise<Ride> {
    const id = this.rideIdCounter++;
    const timestamp = new Date();
    const newRide: Ride = { 
      ...ride, 
      id, 
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.rides.set(id, newRide);
    return newRide;
  }

  async getRide(id: number): Promise<Ride | undefined> {
    return this.rides.get(id);
  }

  async getRidesByDriverId(driverId: number): Promise<Ride[]> {
    return Array.from(this.rides.values()).filter(
      (ride) => ride.driverId === driverId,
    );
  }

  async searchRides(fromLocation: string, toLocation: string, date?: string, rideType?: string): Promise<Ride[]> {
    let filteredRides = Array.from(this.rides.values()).filter(
      (ride) => 
        ride.fromLocation.toLowerCase().includes(fromLocation.toLowerCase()) &&
        ride.toLocation.toLowerCase().includes(toLocation.toLowerCase())
    );
    
    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      
      filteredRides = filteredRides.filter(ride => {
        const rideDate = new Date(ride.departureDate);
        rideDate.setHours(0, 0, 0, 0);
        return rideDate.getTime() === searchDate.getTime();
      });
    }
    
    if (rideType && rideType !== 'all') {
      filteredRides = filteredRides.filter(
        (ride) => ride.rideType === rideType
      );
    }
    
    return filteredRides;
  }

  async updateRide(id: number, data: Partial<Ride>): Promise<Ride | undefined> {
    const ride = await this.getRide(id);
    if (!ride) return undefined;
    
    const updatedRide: Ride = { 
      ...ride, 
      ...data, 
      updatedAt: new Date() 
    };
    this.rides.set(id, updatedRide);
    return updatedRide;
  }

  async getAllRides(): Promise<Ride[]> {
    return Array.from(this.rides.values());
  }

  // Booking methods
  async createBooking(booking: InsertBooking): Promise<Booking> {
    const id = this.bookingIdCounter++;
    const timestamp = new Date();
    const newBooking: Booking = { 
      ...booking, 
      id, 
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.bookings.set(id, newBooking);
    
    // Update available seats in the ride
    const ride = await this.getRide(booking.rideId);
    if (ride) {
      const newAvailableSeats = ride.availableSeats - booking.numberOfSeats;
      await this.updateRide(ride.id, { availableSeats: newAvailableSeats });
    }
    
    return newBooking;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByCustomerId(customerId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.customerId === customerId,
    );
  }

  async getBookingsByRideId(rideId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.rideId === rideId,
    );
  }

  async updateBooking(id: number, data: Partial<Booking>): Promise<Booking | undefined> {
    const booking = await this.getBooking(id);
    if (!booking) return undefined;
    
    // Handle seat adjustments if booking is cancelled
    if (booking.status !== 'cancelled' && data.status === 'cancelled') {
      const ride = await this.getRide(booking.rideId);
      if (ride) {
        const newAvailableSeats = ride.availableSeats + booking.numberOfSeats;
        await this.updateRide(ride.id, { availableSeats: newAvailableSeats });
      }
    }
    
    const updatedBooking: Booking = { 
      ...booking, 
      ...data, 
      updatedAt: new Date() 
    };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async getAllBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }

  // Rating methods
  async createRating(rating: InsertRating): Promise<Rating> {
    const id = this.ratingIdCounter++;
    const timestamp = new Date();
    const newRating: Rating = { 
      ...rating, 
      id, 
      createdAt: timestamp 
    };
    this.ratings.set(id, newRating);
    
    // Update user average rating
    const userId = rating.toUserId;
    const userRatings = await this.getRatingsByToUserId(userId);
    
    if (userRatings.length > 0) {
      const totalRating = userRatings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = totalRating / userRatings.length;
      await this.updateUser(userId, { averageRating });
    }
    
    return newRating;
  }

  async getRating(id: number): Promise<Rating | undefined> {
    return this.ratings.get(id);
  }

  async getRatingsByFromUserId(fromUserId: number): Promise<Rating[]> {
    return Array.from(this.ratings.values()).filter(
      (rating) => rating.fromUserId === fromUserId,
    );
  }

  async getRatingsByToUserId(toUserId: number): Promise<Rating[]> {
    return Array.from(this.ratings.values()).filter(
      (rating) => rating.toUserId === toUserId,
    );
  }

  async getRatingByBookingId(bookingId: number): Promise<Rating | undefined> {
    return Array.from(this.ratings.values()).find(
      (rating) => rating.bookingId === bookingId,
    );
  }

  async getAllRatings(): Promise<Rating[]> {
    return Array.from(this.ratings.values());
  }
}

// Use the DatabaseStorage implementation instead of MemStorage
import { DatabaseStorage } from "./db-storage";
export const storage = new DatabaseStorage();
