"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAStatus {
  isInstalled: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

export function usePWA() {
  const [status, setStatus] = useState<PWAStatus>({
    isInstalled: false,
    isStandalone: false,
    canInstall: false,
    isIOS: false,
    isAndroid: false,
    installPrompt: null,
  });

  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    // Check device type
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    // Check if already installed
    const isInstalled = isStandalone || 
      document.referrer.includes("android-app://");

    setStatus((prev) => ({
      ...prev,
      isInstalled,
      isStandalone,
      isIOS,
      isAndroid,
    }));

    // Listen for install prompt (Android/Desktop)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      
      setStatus((prev) => ({
        ...prev,
        canInstall: true,
        installPrompt: promptEvent,
      }));
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setStatus((prev) => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        installPrompt: null,
      }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration.scope);
          
          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New version available
                  console.log("[PWA] New version available!");
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("[PWA] Service Worker registration failed:", error);
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Install the PWA
  const install = useCallback(async () => {
    if (status.isIOS) {
      // Show iOS instructions
      setShowIOSInstructions(true);
      return;
    }

    if (!status.installPrompt) {
      return;
    }

    try {
      await status.installPrompt.prompt();
      const result = await status.installPrompt.userChoice;
      
      if (result.outcome === "accepted") {
        console.log("[PWA] User accepted install");
        setStatus((prev) => ({
          ...prev,
          canInstall: false,
          installPrompt: null,
        }));
      }
    } catch (error) {
      console.error("[PWA] Install failed:", error);
    }
  }, [status.installPrompt, status.isIOS]);

  // Hide iOS instructions
  const hideIOSInstructions = useCallback(() => {
    setShowIOSInstructions(false);
  }, []);

  return {
    ...status,
    showIOSInstructions,
    install,
    hideIOSInstructions,
  };
}

// Hook for push notifications permission
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported("Notification" in window && "serviceWorker" in navigator);
    
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("[PWA] Notification permission error:", error);
      return false;
    }
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || permission !== "granted") return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      // Get push subscription would go here with VAPID keys
      return registration;
    } catch (error) {
      console.error("[PWA] Push subscription error:", error);
      return null;
    }
  }, [supported, permission]);

  return {
    supported,
    permission,
    requestPermission,
    subscribe,
  };
}

// iOS Install Instructions Component
export function IOSInstallInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">
          Instalar no iPhone/iPad
        </h3>
        <ol className="space-y-3 text-gray-300 text-sm">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold">1</span>
            <span>Toque no botão &quot;Compartilhar&quot; <span className="inline-block w-5 h-5 bg-gray-700 rounded align-middle mx-1">↑</span> na barra inferior</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold">2</span>
            <span>Role para baixo e toque em &quot;Adicionar à Tela de Início&quot;</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold">3</span>
            <span>Toque em &quot;Adicionar&quot; no canto superior direito</span>
          </li>
        </ol>
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-amber-500 text-black font-semibold rounded-xl touch-manipulation"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
