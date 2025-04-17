import { pgTable, text, serial, integer, boolean, timestamp, json, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User related schemas
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  mobile: text("mobile").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default('customer'),
  isKycVerified: boolean("is_kyc_verified").default(false),
  isSuspended: boolean("is_suspended").default(false),
  emergencyContact: text("emergency_contact"),
  averageRating: doublePrecision("average_rating").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  mobile: true,
  fullName: true,
  role: true,
  emergencyContact: true,
});

// KYC related schemas
export const kycVerifications = pgTable("kyc_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  documentType: text("document_type").notNull(),
  documentId: text("document_id").notNull(),
  documentUrl: text("document_url").notNull(),
  vehicleType: text("vehicle_type"),
  vehicleNumber: text("vehicle_number"),
  drivingLicenseUrl: text("driving_license_url"),
  selfieUrl: text("selfie_url"),
  status: text("status").default("pending"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKycSchema = createInsertSchema(kycVerifications).pick({
  userId: true,
  documentType: true,
  documentId: true,
  documentUrl: true,
  vehicleType: true,
  vehicleNumber: true,
  drivingLicenseUrl: true,
  selfieUrl: true,
});

// Ride related schemas
export const rides = pgTable("rides", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull(),
  fromLocation: text("from_location").notNull(),
  toLocation: text("to_location").notNull(),
  departureDate: timestamp("departure_date").notNull(),
  estimatedArrivalDate: timestamp("estimated_arrival_date"),
  rideType: text("ride_type").array().notNull(), // Array of "one-way", "sharing"
  price: integer("price").notNull(),
  totalSeats: integer("total_seats").notNull(),
  availableSeats: integer("available_seats").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  vehicleNumber: text("vehicle_number").notNull(),
  description: text("description"),
  status: text("status").default("active").notNull(), // active, cancelled
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRideSchema = createInsertSchema(rides).pick({
  driverId: true,
  fromLocation: true,
  toLocation: true,
  departureDate: true,
  estimatedArrivalDate: true,
  rideType: true,
  price: true,
  totalSeats: true,
  availableSeats: true,
  vehicleType: true,
  vehicleNumber: true,
  description: true,
}).extend({
  departureDate: z.coerce.date(),
  estimatedArrivalDate: z.coerce.date().nullable(),
  availableSeats: z.coerce.number().int().min(1, "At least one seat must be available"),
  totalSeats: z.coerce.number().int().min(1, "At least one seat must be available"),
  price: z.coerce.number().int().min(1, "Price must be greater than 0"),
});

// Booking related schemas
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  rideId: integer("ride_id").notNull(),
  numberOfSeats: integer("number_of_seats").notNull().default(1),
  status: text("status").notNull().default('pending'), // pending, confirmed, cancelled, completed
  bookingFee: integer("booking_fee").notNull().default(200),
  isPaid: boolean("is_paid").default(false),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  rideId: true,
  numberOfSeats: true,
  status: true,
  bookingFee: true,
  isPaid: true,
}).extend({
  // customerId is handled by the server using session data
  numberOfSeats: z.coerce.number().int().min(1, "At least one seat is required"),
  bookingFee: z.coerce.number().int().optional(),
});

// Rating related schemas
export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  bookingId: integer("booking_id").notNull().unique(),
  rating: integer("rating").notNull(),
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRatingSchema = createInsertSchema(ratings).pick({
  fromUserId: true,
  toUserId: true,
  bookingId: true,
  rating: true,
  review: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type KycVerification = typeof kycVerifications.$inferSelect;
export type InsertKycVerification = z.infer<typeof insertKycSchema>;

export type Ride = typeof rides.$inferSelect;
export type InsertRide = z.infer<typeof insertRideSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// App settings schema
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).pick({
  key: true,
  value: true,
});

export type Rating = typeof ratings.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = z.infer<typeof insertAppSettingsSchema>;
