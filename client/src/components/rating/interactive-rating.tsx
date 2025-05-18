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
    if (readOnly) return;
    
    setSelectedRating(index);
    setIsAnimating(true);
    
    // If immediate mode, trigger onChange immediately
    if (immediate) {
      onChange(index);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1">
        {Array.from({ length: maxRating }).map((_, index) => {
          const starValue = index + 1;
          const isActive = starValue <= currentDisplayRating;
          
          return (
            <motion.button
              key={index}
              type="button"
              className="focus:outline-none"
              onMouseEnter={() => !readOnly && setHoverRating(starValue)}
              onMouseLeave={() => !readOnly && setHoverRating(0)}
              onClick={() => handleStarClick(starValue)}
              whileTap={{ scale: readOnly ? 1 : 0.8 }}
              animate={
                isAnimating && isActive 
                  ? { 
                      scale: [1, 1.5, 1],
                      transition: { 
                        duration: 0.3,
                        delay: index * 0.05 
                      }
                    } 
                  : {}
              }
              onAnimationComplete={() => setIsAnimating(false)}
              disabled={readOnly}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  "transition-colors duration-200",
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