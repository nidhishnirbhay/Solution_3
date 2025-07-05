# OyeGaadi - Ride Sharing Platform

## Overview

OyeGaadi is a comprehensive ride-sharing platform built with modern web technologies. The application enables customers to find and book rides, allows drivers to publish rides, and provides administrators with powerful management tools. The platform features KYC verification, real-time ride management, and comprehensive booking systems.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: React Query (TanStack Query) for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript throughout the application
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Session-based authentication with cookies
- **File Uploads**: Multer for handling file uploads (KYC documents)
- **Email Service**: Nodemailer with SMTP support

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless support
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Key Tables**: users, rides, bookings, kyc_verifications, ratings, app_settings, page_contents

## Key Components

### User Management System
- **Multi-role Support**: Admin, Driver, and Customer roles
- **Authentication**: Secure session-based auth with bcrypt password hashing
- **KYC Verification**: Document upload and verification system for drivers
- **User Suspension**: Administrative controls for account management

### Ride Management
- **Ride Publishing**: Drivers can create rides with pricing and scheduling
- **Ride Search**: Customers can search rides by location and date
- **Booking System**: Seat reservation with confirmation workflow
- **Status Management**: Automated ride status updates based on departure times

### Admin Dashboard
- **User Management**: View and manage all platform users
- **KYC Review**: Approve or reject driver verification documents
- **Ride Oversight**: Monitor all rides and bookings
- **Business Settings**: Configure platform fees and email settings
- **Content Management**: Manage public pages and business information

### Communication Features
- **Email Integration**: SMTP-based email notifications
- **Ride Requests**: Customers can request rides for specific routes
- **Rating System**: Post-ride rating and feedback mechanism

## Data Flow

### User Registration and Authentication
1. User registers with personal information
2. Password is hashed using bcrypt before storage
3. Session-based authentication maintains login state
4. Role-based access control determines available features

### Ride Booking Process
1. Customer searches for available rides
2. System filters rides by location, date, and availability
3. Customer selects ride and confirms booking
4. Driver receives booking notification
5. System updates seat availability

### KYC Verification Workflow
1. Driver uploads required documents (ID, driving license, selfie)
2. Admin reviews documents in verification dashboard
3. Admin approves or rejects with optional remarks
4. Driver's KYC status is updated accordingly
5. Only KYC-verified drivers can publish rides

## External Dependencies

### Core Libraries
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form state management
- **zod**: Runtime type validation
- **bcrypt**: Password hashing
- **multer**: File upload handling
- **nodemailer**: Email functionality

### UI Framework
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Development Tools
- **typescript**: Type safety throughout the application
- **vite**: Fast development server and build tool
- **esbuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with PostgreSQL 16
- **Hot Reload**: Vite HMR for instant development feedback
- **Database**: Local PostgreSQL with Neon serverless for production
- **File Storage**: Local filesystem for uploads

### Production Build
- **Frontend**: Vite builds optimized static assets
- **Backend**: esbuild bundles server code for Node.js deployment
- **Database Migrations**: Drizzle Kit handles schema updates
- **Environment Variables**: Secure configuration for database, email, and API keys

### Replit Configuration
- **Modules**: nodejs-20, web, postgresql-16
- **Deployment Target**: Autoscale for production scaling
- **Port Configuration**: Internal port 5000 mapped to external port 80
- **Build Process**: npm run build followed by npm run start

## Changelog
- July 5, 2025. Updated authentication system to use mobile numbers instead of usernames for login, improving user experience since mobile numbers are easier to remember and always unique
- June 26, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.