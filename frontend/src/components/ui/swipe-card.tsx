"use client";

import { useState, useRef, useCallback } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SwipeCardProps {
  children: React.ReactNode;
  onDelete: () => Promise<void>;
  deleteConfirmation?: string;
  disabled?: boolean;
}

const SWIPE_REVEAL_THRESHOLD = 80;
const SWIPE_AUTO_TRIGGER_THRESHOLD = 160;

export function SwipeCard({
  children,
  onDelete,
  deleteConfirmation = "Are you sure you want to delete this item?",
  disabled = false,
}: SwipeCardProps) {
  const [offset, setOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      startX.current = e.touches[0].clientX;
      currentX.current = e.touches[0].clientX;
      isDragging.current = true;
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current || disabled) return;

      const touchX = e.touches[0].clientX;
      const deltaX = touchX - startX.current;

      // Only allow left swipe (negative delta)
      if (deltaX < 0) {
        currentX.current = touchX;
        setOffset(Math.max(deltaX, -SWIPE_AUTO_TRIGGER_THRESHOLD));
        setIsRevealed(Math.abs(deltaX) >= SWIPE_REVEAL_THRESHOLD);
      }
    },
    [disabled]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const deltaX = currentX.current - startX.current;

    if (Math.abs(deltaX) >= SWIPE_AUTO_TRIGGER_THRESHOLD) {
      setShowDialog(true);
      setOffset(0);
      setIsRevealed(false);
    } else if (Math.abs(deltaX) >= SWIPE_REVEAL_THRESHOLD) {
      // Keep revealed state
      setOffset(-SWIPE_REVEAL_THRESHOLD);
    } else {
      // Snap back
      setOffset(0);
      setIsRevealed(false);
    }
  }, []);

  const handleDelete = async () => {
    setOffset(0);
    setIsRevealed(false);
    await onDelete();
  };

  const handleSnapBack = () => {
    setOffset(0);
    setIsRevealed(false);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete panel behind the card */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-danger-500 transition-opacity duration-150"
        style={{ opacity: isRevealed ? 1 : 0 }}
      >
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogTrigger asChild>
            <button
              className="p-2 text-white"
              onClick={() => setShowDialog(true)}
              aria-label="Delete item"
            >
              <Trash2 className="size-5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Confirmation</AlertDialogTitle>
              <AlertDialogDescription>{deleteConfirmation}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleSnapBack}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-danger-500 hover:bg-danger-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Card content */}
      <div
        className="relative transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${offset}px)`,
          touchAction: "pan-y",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={isRevealed ? handleSnapBack : undefined}
        role="button"
        aria-label="Swipe left to delete"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Delete") {
            setShowDialog(true);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
