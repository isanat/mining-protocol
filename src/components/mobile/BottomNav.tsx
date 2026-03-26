"use client";

import { motion } from "framer-motion";
import { 
  Home, 
  Pickaxe, 
  History, 
  User, 
  MoreHorizontal,
  Server,
  Wallet,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TabId = "home" | "miners" | "history" | "profile" | "more" | "rentals" | "affiliate" | "settings" | "admin";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  userRole?: string;
}

const mainTabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Início", icon: Home },
  { id: "miners", label: "Minerar", icon: Pickaxe },
  { id: "history", label: "Histórico", icon: History },
  { id: "profile", label: "Perfil", icon: User },
  { id: "more", label: "Mais", icon: MoreHorizontal },
];

export function BottomNav({ activeTab, onTabChange, userRole }: BottomNavProps) {
  const handleTabClick = (tabId: TabId) => {
    // Haptic feedback for supported devices
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
    onTabChange(tabId);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "8px"
      }}
    >
      <div className="flex items-center justify-around px-2 max-w-lg mx-auto">
        {mainTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[60px] min-h-[44px] py-1 px-3 rounded-xl transition-all duration-200",
                "touch-manipulation select-none",
                isActive && "bg-amber-500/10"
              )}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-full bg-amber-500/20"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30
                    }}
                  />
                )}
                <Icon 
                  className={cn(
                    "w-6 h-6 relative z-10 transition-colors duration-200",
                    isActive ? "text-amber-500" : "text-gray-400"
                  )} 
                />
              </div>
              <span 
                className={cn(
                  "text-[10px] mt-1 font-medium transition-colors duration-200",
                  isActive ? "text-amber-500" : "text-gray-500"
                )}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -bottom-[1px] w-8 h-1 bg-amber-500 rounded-full"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Quick action buttons for floating action button (FAB)
interface QuickActionProps {
  onDeposit: () => void;
  onWithdraw: () => void;
}

export function QuickActionFab({ onDeposit, onWithdraw }: QuickActionProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="fixed right-4 bottom-24 z-40"
      style={{
        marginBottom: "env(safe-area-inset-bottom)"
      }}
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onDeposit}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 flex items-center justify-center touch-manipulation"
        aria-label="Depositar"
      >
        <Wallet className="w-6 h-6 text-white" />
      </motion.button>
    </motion.div>
  );
}

// Extended menu for "More" tab
interface MoreMenuProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  userRole?: string;
}

export const moreMenuItems = [
  { id: "rentals" as TabId, label: "Meus Aluguéis", icon: Server },
  { id: "affiliate" as TabId, label: "Afiliados", icon: User },
  { id: "settings" as TabId, label: "Configurações", icon: Settings },
];

// Admin menu item - shown only for admins
export const adminMenuItem = { id: "admin" as TabId, label: "Administração", icon: Settings };

// Helper to get menu items based on user role
export function getMoreMenuItems(userRole?: string) {
  const items = [...moreMenuItems];
  if (userRole === "admin") {
    items.unshift(adminMenuItem);
  }
  return items;
}
