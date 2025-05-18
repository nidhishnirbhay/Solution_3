import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface InteractiveRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  onChange: (rating: number) => void;
  readOnly?: boolean;
  showLabels?: boolean;
  immediate?: boolean;
}

// Rating descriptions for different star levels
const ratingLabels = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent"
};

export function InteractiveRating({
  rating,
  maxRating = 5,
  size = "md",
  onChange,
  readOnly = false,
  showLabels = true,
  immediate = true
}: InteractiveRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(rating);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isRatingLocked, setIsRatingLocked] = useState(false);

  // Update internal state when prop changes
  useEffect(() => {
    setSelectedRating(rating);
  }, [rating]);

  // Size-based values for styling
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  const fontSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };
  
  // Get the current effective rating (either hovered or selected)
  const currentDisplayRating = hoverRating || selectedRating;
  
  const handleStarClick = (index: number) => {
    if (readOnly || isRatingLocked) return;
    
    setSelectedRating(index);
    setIsAnimating(true);
    // Temporarily lock rating to prevent rapid changes
    setIsRatingLocked(true);
    
    // Unlock after animation completes
    setTimeout(() => {
      setIsRatingLocked(false);
    }, 500);
    
    // If immediate mode, trigger onChange immediately
    if (immediate) {
      onChange(index);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1 relative z-0">
        {Array.from({ length: maxRating }).map((_, index) => {
          const starValue = index + 1;
          const isActive = starValue <= currentDisplayRating;
          
          return (
            <motion.button
              key={index}
              type="button"
              className="focus:outline-none p-2 mx-1" // Increased padding for larger touch target
              onMouseEnter={() => {
                if (!readOnly && !isRatingLocked) {
                  setHoverRating(starValue);
                }
              }}
              onMouseLeave={() => {
                if (!readOnly && !isRatingLocked) {
                  setHoverRating(0);
                }
              }}
              onClick={() => handleStarClick(starValue)}
              whileTap={{ scale: readOnly ? 1 : 0.95 }}
              animate={
                isAnimating && isActive 
                  ? { 
                      scale: [1, 1.1, 1], // Further reduced scale animation
                      transition: { 
                        duration: 0.2, // Shorter duration
                        delay: index * 0.03 // Less delay between stars
                      }
                    } 
                  : {}
              }
              onAnimationComplete={() => setIsAnimating(false)}
              disabled={readOnly || isRatingLocked}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  "transition-colors duration-100", // Faster color transition
                  isActive
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                )}
              />
            </motion.button>
          );
        })}
      </div>

      {showLabels && currentDisplayRating > 0 && (
        <motion.span 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "text-center font-medium", 
            fontSizeClasses[size],
            currentDisplayRating >= 4
              ? "text-green-600"
              : currentDisplayRating >= 3
              ? "text-blue-600"
              : currentDisplayRating >= 2
              ? "text-yellow-600"
              : "text-red-600"
          )}
        >
          {ratingLabels[currentDisplayRating as keyof typeof ratingLabels] || ""}
        </motion.span>
      )}
    </div>
  );
}