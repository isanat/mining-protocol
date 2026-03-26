"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
  snapPoints?: number[]; // Percentage of screen height
  initialSnap?: number;
  dismissible?: boolean;
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  className,
  showCloseButton = true,
  snapPoints = [0.5, 0.9],
  initialSnap = 0,
  dismissible = true,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const [currentSnap, setCurrentSnap] = useState(snapPoints[initialSnap]);
  
  // Get current snap point height in pixels
  const sheetHeight = typeof window !== "undefined" 
    ? window.innerHeight * currentSnap 
    : 400;
  
  // Transform for drag indicator opacity
  const dragIndicatorOpacity = useTransform(
    y,
    [0, 100],
    [1, 0.5]
  );

  // Handle drag end
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;
    
    // If dragged down fast or more than 100px
    if (velocity > 500 || offset > 100) {
      if (dismissible) {
        onOpenChange(false);
      }
    } else if (velocity < -500) {
      // Swipe up - snap to highest point
      setCurrentSnap(snapPoints[snapPoints.length - 1]);
    } else {
      // Snap to nearest snap point
      const currentHeight = sheetHeight - offset;
      const screenHeight = window.innerHeight;
      const currentPercentage = currentHeight / screenHeight;
      
      let nearestSnap = snapPoints[0];
      let minDistance = Math.abs(snapPoints[0] - currentPercentage);
      
      snapPoints.forEach((point) => {
        const distance = Math.abs(point - currentPercentage);
        if (distance < minDistance) {
          minDistance = distance;
          nearestSnap = point;
        }
      });
      
      setCurrentSnap(nearestSnap);
    }
  };

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Haptic feedback on open
  useEffect(() => {
    if (open && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => dismissible && onOpenChange(false)}
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
            }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0}
            onDragEnd={handleDragEnd}
            style={{ y }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "bg-[#1a1a1a] rounded-t-3xl",
              "border-t border-white/10",
              "shadow-2xl shadow-black/50",
              "max-h-[90vh]",
              className
            )}
          >
            {/* Drag Handle */}
            <motion.div 
              className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
              style={{ opacity: dragIndicatorOpacity }}
            >
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </motion.div>

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-4 pb-2">
                <div>
                  {title && (
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                  )}
                  {description && (
                    <p className="text-sm text-gray-400">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={() => onOpenChange(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto overscroll-contain max-h-[calc(90vh-80px)] pb-safe">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Preset configurations for common use cases
export function DepositSheet({ 
  open, 
  onOpenChange, 
  children 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Depositar"
      description="Escolha o método de depósito"
      snapPoints={[0.7, 0.9]}
      initialSnap={0}
    >
      <div className="px-4 pb-6">
        {children}
      </div>
    </BottomSheet>
  );
}

export function WithdrawSheet({ 
  open, 
  onOpenChange, 
  children 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Sacar"
      description="Escolha o método de saque"
      snapPoints={[0.6, 0.85]}
      initialSnap={0}
    >
      <div className="px-4 pb-6">
        {children}
      </div>
    </BottomSheet>
  );
}

export function MinerRentSheet({ 
  open, 
  onOpenChange, 
  children 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[0.75, 0.95]}
      initialSnap={0}
    >
      <div className="px-4 pb-6">
        {children}
      </div>
    </BottomSheet>
  );
}
