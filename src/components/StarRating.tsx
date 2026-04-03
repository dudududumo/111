import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  toolId: string;
  initialRating?: number;
  lastRatedAt?: string;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  toolId,
  initialRating = 0,
  lastRatedAt,
  onRatingChange,
  readOnly = false,
}) => {
  const [rating, setRating] = useState<number>(initialRating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const handleRatingClick = (value: number) => {
    if (readOnly) return;
    const newRating = value;
    setRating(newRating);
    onRatingChange?.(newRating);
  };

  const handleStarClick = (index: number, e: React.MouseEvent) => {
    if (readOnly) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    const value = isHalf ? index + 0.5 : index + 1;
    handleRatingClick(value);
  };

  const handleStarHover = (index: number, e: React.MouseEvent) => {
    if (readOnly) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    const value = isHalf ? index + 0.5 : index + 1;
    setHoverRating(value);
  };

  const handleStarLeave = () => {
    if (readOnly) return;
    setHoverRating(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((index) => {
          const filled = displayRating >= index + 1;
          const halfFilled = displayRating > index && displayRating < index + 1;

          return (
            <div
              key={index}
              onClick={(e) => handleStarClick(index, e)}
              onMouseMove={(e) => handleStarHover(index, e)}
              onMouseLeave={handleStarLeave}
              className={`relative cursor-pointer transition-transform hover:scale-110 ${readOnly ? "cursor-default" : ""}`}
            >
              <Star
                className={`w-4 h-4 ${filled ? "text-yellow-400 fill-yellow-400" : "text-stone-300"}`}
              />
              {halfFilled && (
                <div className="absolute inset-0 overflow-hidden w-1/2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {lastRatedAt && (
        <span className="text-[10px] text-stone-400">
          上次评分：{formatDate(lastRatedAt)}
        </span>
      )}
    </div>
  );
};

export default StarRating;
