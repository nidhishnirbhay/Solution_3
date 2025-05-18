import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility function to validate date/time with India timezone considerations
 * Accounts for early morning hours (12:00 AM to 5:30 AM) by validating against
 * India Standard Time (IST)
 */
export function isValidFutureDateInIndia(date: string, time?: string): boolean {
  // If only date is provided without time
  if (!time) {
    const selectedDate = new Date(date);
    const today = new Date();
    
    // Reset time to start of day for comparison
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    return selectedDate >= today;
  }
  
  // For date-time combination
  // Parse the date and time
  const [hours, minutes] = time.split(':').map(Number);
  const selectedDateTime = new Date(date);
  selectedDateTime.setHours(hours, minutes, 0, 0);
  
  // Current time in Indian Standard Time (UTC+5:30)
  const now = new Date();
  const indiaTimeOffsetMinutes = 330; // IST is UTC+5:30 (330 minutes)
  const localOffsetMinutes = now.getTimezoneOffset();
  const totalOffsetMinutes = indiaTimeOffsetMinutes + localOffsetMinutes;
  
  // Create a new date object with the adjusted time for India
  const indiaTime = new Date(now.getTime() + (totalOffsetMinutes * 60000));
  
  console.log("Validating date/time in IST:", {
    selectedDateTime: selectedDateTime.toLocaleString(),
    indiaTime: indiaTime.toLocaleString(),
    isValid: selectedDateTime > indiaTime
  });
  
  return selectedDateTime > indiaTime;
}
