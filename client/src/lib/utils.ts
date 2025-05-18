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

/**
 * Formats the date and time according to Indian conventions
 * Handles early morning times (12:00 AM to 5:30 AM) by referring to them
 * as the previous date's late night
 * 
 * @param dateStr ISO date string or Date object
 * @param timeStr Optional time string (HH:MM)
 * @returns Formatted date string with appropriate indication
 */
export function formatDateTimeForIndia(dateStr: string | Date, timeStr?: string): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  
  // If time is not provided, just format the date
  if (!timeStr) {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
  
  // Parse the time
  const [hours, minutes] = timeStr.split(':').map(Number);
  const dateWithTime = new Date(date);
  dateWithTime.setHours(hours, minutes, 0, 0);
  
  // Indian time format
  const displayTime = dateWithTime.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Indian date format
  let displayDate = dateWithTime.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  
  // Special case for early morning hours (12:00 AM to 5:30 AM)
  if (hours >= 0 && hours < 5 || (hours === 5 && minutes <= 30)) {
    // For display purposes in India, we consider these times as part of the previous day
    // Add a note that this is early morning/late night
    return `${displayDate} (late night/early morning) ${displayTime}`;
  }
  
  return `${displayDate} ${displayTime}`;
}
