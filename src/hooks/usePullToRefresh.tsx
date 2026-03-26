"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: PullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
  });

  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return;

    const touch = e.touches[0];
    startY.current = touch.clientY;
  }, [disabled, state.isRefreshing]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return;

    const container = containerRef.current;
    if (!container) return;

    // Only trigger if scrolled to top
    if (container.scrollTop > 0) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;

    // Only track downward pull
    if (deltaY > 0) {
      const pullDistance = Math.min(deltaY * 0.5, threshold * 1.5); // Resistance
      
      setState((prev) => ({
        ...prev,
        isPulling: true,
        pullDistance,
      }));
    }
  }, [disabled, state.isRefreshing, threshold]);

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling || state.isRefreshing) return;

    if (state.pullDistance >= threshold) {
      // Trigger refresh
      setState((prev) => ({
        ...prev,
        isRefreshing: true,
        pullDistance: threshold,
      }));

      // Haptic feedback
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(20);
      }

      try {
        await onRefresh();
      } catch (error) {
        console.error("[PullToRefresh] Refresh error:", error);
      }

      setState((prev) => ({
        ...prev,
        isRefreshing: false,
        pullDistance: 0,
        isPulling: false,
      }));
    } else {
      // Reset without refresh
      setState((prev) => ({
        ...prev,
        isPulling: false,
        pullDistance: 0,
      }));
    }
  }, [state.isPulling, state.isRefreshing, state.pullDistance, threshold, onRefresh]);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled]);

  return {
    ...state,
    containerRef,
  };
}

// Pull indicator component
export function PullIndicator({ 
  pullDistance, 
  isRefreshing, 
  threshold = 80 
}: { 
  pullDistance: number; 
  isRefreshing: boolean;
  threshold?: number;
}) {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: pullDistance > 0 || isRefreshing ? 1 : 0,
        y: Math.min(pullDistance, threshold)
      }}
      className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-40"
      style={{ 
        height: pullDistance > 0 || isRefreshing ? 60 : 0,
      }}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/10 shadow-lg">
        <motion.div
          animate={{ 
            rotate: isRefreshing ? 360 : rotation 
          }}
          transition={isRefreshing ? { 
            repeat: Infinity, 
            duration: 1, 
            ease: "linear" 
          } : { duration: 0 }}
          className="flex items-center justify-center"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className={isRefreshing ? "text-amber-500" : "text-gray-400"}
          >
            <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1.05 6.64 2.86L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}
