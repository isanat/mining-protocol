"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bitcoin, 
  TrendingUp, 
  TrendingDown,
  Wallet, 
  Zap, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft,
  Activity,
  Server,
  DollarSign,
  Coins,
  BarChart3,
  Users,
  LogOut,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Globe,
  Gauge,
  Shield,
  Link,
  Copy,
  Share2,
  UserPlus,
  Crown,
  PiggyBank,
  Percent,
  Lock,
  ChevronRight,
  Bell,
  Settings,
  History,
  Pickaxe,
  Home,
  User,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  useCryptoPrices, 
  useNetworkStats, 
  useFearGreed, 
  formatNumber, 
  formatPercent,
  useUSDTBRLRate,
} from "@/hooks/use-crypto-data";
import { BottomNav, TabId, moreMenuItems, QuickActionFab } from "@/components/mobile/BottomNav";
import { BottomSheet, DepositSheet, WithdrawSheet, MinerRentSheet } from "@/components/mobile/BottomSheet";
import { usePWA, IOSInstallInstructions } from "@/hooks/usePWA";
import { usePullToRefresh, PullIndicator } from "@/hooks/usePullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminTab } from "@/components/admin/AdminTab";

// Types
interface User {
  id: string;
  email: string;
  name: string;
  balance: number; // USDT (primary currency)
  balanceBrlEquivalent?: number;
  totalMined: number; // USDT
  totalMinedBrlEquivalent?: number;
  totalInvested: number; // USDT
  totalInvestedBrlEquivalent?: number;
  walletAddress?: string;
  pixKey?: string;
  role?: string;
  affiliateCode?: string;
  affiliateBalance?: number; // USDT
  affiliateBalanceBrlEquivalent?: number;
  totalAffiliateEarnings?: number;
  linkUnlocked?: boolean;
  hasInvested?: boolean;
  referredBy?: string;
  usdtRate?: number;
}

interface Miner {
  id: string;
  name: string;
  model: string;
  hashRate: number;
  powerConsumption: number;
  coin: string;
  pool: string;
  status: string;
  dailyRevenue: number; // USDT per day
  dailyRevenueBrl?: number; // BRL equivalent
  pricePerDay: number; // USDT per day
  pricePerDayBrl?: number; // BRL equivalent
  efficiency: number;
  image?: string;
  description?: string;
  usdtRate?: number;
}

interface MiningRental {
  id: string;
  minerId: string;
  miner?: Miner;
  startDate: string;
  endDate: string;
  amount: number;
  hashShare: number;
  status: string;
  dailyReturn: number;
  totalReturn: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number; // USDT (primary)
  brlAmount?: number; // BRL equivalent for PIX
  usdtRate?: number;
  status: string;
  description: string;
  createdAt: string;
}

export default function MiningDashboard() {
  // Mobile detection
  const isMobile = useIsMobile();
  
  // State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [selectedMiner, setSelectedMiner] = useState<Miner | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showRentModal, setShowRentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(true);
  
  // User state
  const [user, setUser] = useState<User | null>(null);
  const [miners, setMiners] = useState<Miner[]>([]);
  const [rentals, setRentals] = useState<MiningRental[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("pix");
  const [depositNetwork, setDepositNetwork] = useState<string>("TRC20");
  const [depositStep, setDepositStep] = useState(1);
  const [depositTxHash, setDepositTxHash] = useState("");
  const [depositVerifying, setDepositVerifying] = useState(false);
  const [depositVerified, setDepositVerified] = useState<boolean | null>(null);
  const [depositVerificationMessage, setDepositVerificationMessage] = useState("");
  const [depositExplorerUrl, setDepositExplorerUrl] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("pix");
  const [rentDays, setRentDays] = useState(7);
  
  // PWA hooks
  const { canInstall, isIOS, install, showIOSInstructions, hideIOSInstructions } = usePWA();
  
  // USDT/BRL rate hook for conversion
  const {
    rate: usdtBrlRate,
    loading: rateLoading,
    convertUsdtToBrl,
    convertBrlToUsdt,
    formatUsdtWithBrl,
  } = useUSDTBRLRate();

  // Real crypto data hooks
  const { 
    coins: cryptoPrices, 
    exchangeRate, 
    marketOverview, 
    loading: pricesLoading, 
    error: pricesError,
    lastUpdate: pricesLastUpdate,
    refetch: refetchPrices 
  } = useCryptoPrices();
  
  const { 
    network, 
    mining: miningStats, 
    loading: networkLoading, 
    refetch: refetchNetwork 
  } = useNetworkStats();
  
  const { 
    current: fearGreed, 
    historical: fearGreedHistorical, 
    loading: fgiLoading,
    refetch: refetchFGI 
  } = useFearGreed();

  // Get BTC price for calculations
  const btcPrice = cryptoPrices.find(c => c.id === "bitcoin");
  const btcPriceBrl = btcPrice?.priceBrl || 580000;
  const btcChange24h = btcPrice?.change24h || 0;

  // Refresh all data function
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refetchPrices(),
      refetchNetwork(),
      refetchFGI(),
    ]);
    toast.success("Dados atualizados!");
  }, [refetchPrices, refetchNetwork, refetchFGI]);

  // Pull to refresh
  const { containerRef, isPulling, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: refreshAllData,
    threshold: 80,
    disabled: !isAuthenticated,
  });

  // Fetch miners from API
  const fetchMiners = async () => {
    try {
      const res = await fetch("/api/miners");
      const data = await res.json();
      setMiners(data.miners || []);
    } catch (error) {
      console.error("Error fetching miners:", error);
      toast.error("Erro ao carregar mineradoras");
    }
  };

  // Fetch miners on mount
  useEffect(() => {
    void fetchMiners();
  }, []);

  // Check for existing session
  useEffect(() => {
    const savedUser = localStorage.getItem("miningUser");
    const savedToken = localStorage.getItem("miningToken");
    
    if (savedUser && savedToken) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setIsAuthenticated(true);
      setShowLogin(false);
      
      const savedRentals = localStorage.getItem("miningRentals");
      if (savedRentals) setRentals(JSON.parse(savedRentals));
      
      const savedTransactions = localStorage.getItem("miningTransactions");
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    }
    setApiLoading(false);
  }, []);
  
  // Auth functions
  const handleLogin = async () => {
    setLoading(true);
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
        setShowLogin(false);
        localStorage.setItem("miningUser", JSON.stringify(data.user));
        localStorage.setItem("miningToken", "demo-token");
        toast.success("Login realizado com sucesso!");
      } else {
        const mockUser: User = {
          id: "user_" + Math.random().toString(36).substr(2, 9),
          email: loginEmail || "demo@miningprotocol.com",
          name: "Usuário Demo",
          balance: 200.00, // USDT
          balanceBrlEquivalent: 200.00 * usdtBrlRate,
          totalMined: 450.75, // USDT
          totalInvested: 1000.00, // USDT
          walletAddress: "TRX123456789abcdefghijklmnopqrstuv",
          pixKey: "demo@email.com",
          affiliateCode: "DEMO" + Math.random().toString(36).substr(2, 4).toUpperCase(),
          affiliateBalance: 0,
          totalAffiliateEarnings: 0,
          linkUnlocked: false,
          hasInvested: false,
          usdtRate: usdtBrlRate,
        };
        
        setUser(mockUser);
        setIsAuthenticated(true);
        setShowLogin(false);
        localStorage.setItem("miningUser", JSON.stringify(mockUser));
        localStorage.setItem("miningToken", "demo-token");
        toast.success("Login demo realizado!");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro ao fazer login");
    }
    
    setLoading(false);
  };
  
  const handleRegister = async () => {
    setLoading(true);
    
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: registerName, 
          email: registerEmail, 
          password: registerPassword 
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
        setShowRegister(false);
        localStorage.setItem("miningUser", JSON.stringify(data.user));
        localStorage.setItem("miningToken", "demo-token");
        toast.success("Conta criada com sucesso!");
      } else {
        toast.error(data.error || "Erro ao criar conta");
      }
    } catch (error) {
      console.error("Register error:", error);
      toast.error("Erro ao criar conta");
    }
    
    setLoading(false);
  };
  
  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setRentals([]);
    setTransactions([]);
    localStorage.removeItem("miningUser");
    localStorage.removeItem("miningToken");
    localStorage.removeItem("miningRentals");
    localStorage.removeItem("miningTransactions");
    setShowLogin(true);
    setActiveTab("home");
    toast.info("Logout realizado");
  };
  
  // Deposit function (PIX) - Converts BRL to USDT
  const handleDeposit = async () => {
    if (!user || !depositAmount) return;
    setLoading(true);
    
    const brlAmount = parseFloat(depositAmount);
    if (brlAmount < 20) {
      toast.error("Depósito mínimo: R$ 20");
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user.id
        },
        body: JSON.stringify({ 
          brlAmount,
          method: "pix" 
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        const usdtAmount = data.investment?.usdtAmount || convertBrlToUsdt(brlAmount);
        const newTransaction: Transaction = {
          id: data.investment.id,
          type: "deposit",
          amount: usdtAmount, // USDT
          brlAmount: brlAmount,
          usdtRate: data.usdtRate || usdtBrlRate,
          status: "pending",
          description: `Depósito PIX: R$ ${brlAmount.toFixed(2)} → $${usdtAmount.toFixed(2)} USDT`,
          createdAt: new Date().toISOString()
        };
        
        const updatedTransactions = [newTransaction, ...transactions];
        setTransactions(updatedTransactions);
        localStorage.setItem("miningTransactions", JSON.stringify(updatedTransactions));
        
        toast.success(`Depósito de R$ ${brlAmount.toFixed(2)} será creditado como $${usdtAmount.toFixed(2)} USDT`);
        setShowDepositModal(false);
        setDepositAmount("");
      } else {
        toast.error(data.error || "Erro ao processar depósito");
      }
    } catch (error) {
      console.error("Deposit error:", error);
      toast.error("Erro ao processar depósito");
    }
    
    setLoading(false);
  };
  
  // USDT Deposit function - Direct USDT deposit
  const handleUSDTDeposit = async () => {
    if (!user || !depositAmount || !depositTxHash) return;
    setLoading(true);
    setDepositVerifying(true);
    setDepositVerified(null);
    setDepositVerificationMessage("Verificando transação na blockchain...");
    
    const usdtAmount = parseFloat(depositAmount);
    const method = depositNetwork === "TRC20" ? "usdt_trc20" : "usdt_polygon";
    
    let isValidHash = false;
    if (depositNetwork === "TRC20") {
      isValidHash = /^(0x)?[a-fA-F0-9]{64}$/.test(depositTxHash.trim());
    } else if (depositNetwork === "Polygon") {
      isValidHash = /^0x[a-fA-F0-9]{64}$/.test(depositTxHash.trim());
    }
    
    if (!isValidHash) {
      toast.error(`Hash inválido para a rede ${depositNetwork}`);
      setLoading(false);
      setDepositVerifying(false);
      setDepositVerified(false);
      setDepositVerificationMessage(`Hash inválido para a rede ${depositNetwork}`);
      return;
    }
    
    try {
      const brlAmount = usdtAmount * 5;
      
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user.id
        },
        body: JSON.stringify({ 
          amount: brlAmount, 
          usdtAmount,
          method,
          network: depositNetwork,
          txHash: depositTxHash.trim()
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        if (data.explorerUrl) {
          setDepositExplorerUrl(data.explorerUrl);
        }

        if (data.autoApproved && data.verified) {
          setDepositVerified(true);
          setDepositVerificationMessage(data.message || "Depósito confirmado! Saldo creditado automaticamente.");
          
          // Update user balance in USDT
          const updatedUser = { 
            ...user, 
            balance: user.balance + usdtAmount, // USDT
            balanceBrlEquivalent: (user.balance + usdtAmount) * usdtBrlRate,
            totalInvested: user.totalInvested + usdtAmount, // USDT
            hasInvested: true,
            linkUnlocked: true,
            usdtRate: data.usdtRate || usdtBrlRate,
          };
          setUser(updatedUser);
          localStorage.setItem("miningUser", JSON.stringify(updatedUser));
          
          const newTransaction: Transaction = {
            id: data.investment.id,
            type: "deposit",
            amount: usdtAmount, // USDT primary
            status: "completed",
            description: `Depósito USDT (${depositNetwork}) - $${usdtAmount.toFixed(2)} USDT creditado`,
            createdAt: new Date().toISOString()
          };
          
          const updatedTransactions = [newTransaction, ...transactions];
          setTransactions(updatedTransactions);
          localStorage.setItem("miningTransactions", JSON.stringify(updatedTransactions));
          
          toast.success("Depósito confirmado automaticamente!");
          
          setTimeout(() => {
            setShowDepositModal(false);
            setDepositStep(1);
            setDepositAmount("");
            setDepositTxHash("");
            setDepositVerifying(false);
            setDepositVerified(null);
            setDepositVerificationMessage("");
            setDepositExplorerUrl("");
          }, 2000);
        } else {
          setDepositVerified(false);
          setDepositVerificationMessage(data.message || "Verificação pendente. O sistema verificará automaticamente.");
          
          const newTransaction: Transaction = {
            id: data.investment.id,
            type: "deposit",
            amount: usdtAmount, // USDT primary
            status: "pending",
            description: `Depósito USDT (${depositNetwork}) - Verificação pendente`,
            createdAt: new Date().toISOString()
          };
          
          const updatedTransactions = [newTransaction, ...transactions];
          setTransactions(updatedTransactions);
          localStorage.setItem("miningTransactions", JSON.stringify(updatedTransactions));
          
          toast.info("Comprovante recebido! Verificando transação...");
        }
      } else {
        setDepositVerified(false);
        setDepositVerificationMessage(data.error || "Erro ao processar depósito");
        toast.error(data.error || "Erro ao processar depósito");
      }
    } catch (error) {
      console.error("USDT deposit error:", error);
      setDepositVerified(false);
      setDepositVerificationMessage("Erro ao processar depósito USDT");
      toast.error("Erro ao processar depósito USDT");
    }
    
    setLoading(false);
    setDepositVerifying(false);
  };
  
  // Withdraw function - All amounts in USDT
  const handleWithdraw = async () => {
    if (!user || !withdrawAmount) return;
    
    const usdtAmount = parseFloat(withdrawAmount);
    if (usdtAmount > user.balance) {
      toast.error(`Saldo insuficiente! Disponível: $${user.balance.toFixed(2)} USDT`);
      return;
    }
    
    setLoading(true);
    
    const brlEquivalent = convertUsdtToBrl(usdtAmount);
    const newTransaction: Transaction = {
      id: "tx_" + Math.random().toString(36).substr(2, 9),
      type: "withdrawal",
      amount: usdtAmount, // USDT primary
      brlAmount: withdrawMethod === "pix" ? brlEquivalent : undefined,
      usdtRate: usdtBrlRate,
      status: "pending",
      description: `Saque via ${withdrawMethod.toUpperCase()}: $${usdtAmount.toFixed(2)} USDT${withdrawMethod === "pix" ? ` (≈ R$ ${brlEquivalent.toFixed(2)})` : ""}`,
      createdAt: new Date().toISOString()
    };
    
    const updatedUser = { 
      ...user, 
      balance: user.balance - usdtAmount,
      balanceBrlEquivalent: (user.balance - usdtAmount) * usdtBrlRate,
    };
    const updatedTransactions = [newTransaction, ...transactions];
    
    setUser(updatedUser);
    setTransactions(updatedTransactions);
    localStorage.setItem("miningUser", JSON.stringify(updatedUser));
    localStorage.setItem("miningTransactions", JSON.stringify(updatedTransactions));
    
    toast.success(`Saque de $${usdtAmount.toFixed(2)} USDT solicitado! Processamento em até 24 horas.`);
    setShowWithdrawModal(false);
    setWithdrawAmount("");
    setLoading(false);
  };
  
  // Rent miner function - All amounts in USDT
  const handleRentMiner = async () => {
    if (!user || !selectedMiner) return;
    
    const totalCostUsdt = selectedMiner.pricePerDay * rentDays; // USDT
    const totalCostBrl = totalCostUsdt * usdtBrlRate;
    
    if (totalCostUsdt > user.balance) {
      toast.error(`Saldo insuficiente! Necessário: $${totalCostUsdt.toFixed(2)} USDT (≈ R$ ${totalCostBrl.toFixed(2)})`);
      return;
    }
    
    setLoading(true);
    
    const dailyReturnUsdt = selectedMiner.dailyRevenue * 0.7; // USDT
    const totalReturnUsdt = dailyReturnUsdt * rentDays;
    
    const newRental: MiningRental = {
      id: "rental_" + Math.random().toString(36).substr(2, 9),
      minerId: selectedMiner.id,
      miner: selectedMiner,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + rentDays * 24 * 60 * 60 * 1000).toISOString(),
      amount: totalCostUsdt, // USDT
      hashShare: 100,
      status: "active",
      dailyReturn: dailyReturnUsdt, // USDT
      totalReturn: totalReturnUsdt // USDT
    };
    
    const newTransaction: Transaction = {
      id: "tx_" + Math.random().toString(36).substr(2, 9),
      type: "rental_payment",
      amount: totalCostUsdt, // USDT
      brlAmount: totalCostBrl,
      usdtRate: usdtBrlRate,
      status: "completed",
      description: `Aluguel ${selectedMiner.name} - ${rentDays} dias: $${totalCostUsdt.toFixed(2)} USDT`,
      createdAt: new Date().toISOString()
    };
    
    const updatedUser = { 
      ...user, 
      balance: user.balance - totalCostUsdt,
      balanceBrlEquivalent: (user.balance - totalCostUsdt) * usdtBrlRate,
      totalInvested: user.totalInvested + totalCostUsdt // USDT
    };
    const updatedRentals = [newRental, ...rentals];
    const updatedTransactions = [newTransaction, ...transactions];
    
    setUser(updatedUser);
    setRentals(updatedRentals);
    setTransactions(updatedTransactions);
    localStorage.setItem("miningUser", JSON.stringify(updatedUser));
    localStorage.setItem("miningRentals", JSON.stringify(updatedRentals));
    localStorage.setItem("miningTransactions", JSON.stringify(updatedTransactions));
    
    toast.success(`Mineradora alugada! Retorno estimado: $${totalReturnUsdt.toFixed(2)} USDT (≈ R$ ${(totalReturnUsdt * usdtBrlRate).toFixed(2)})`);
    setShowRentModal(false);
    setSelectedMiner(null);
    setLoading(false);
  };
  
  // Loading state
  if (apiLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }
  
  // Login/Register Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md"
        >
          <Card className="bg-[#1a1a1a] border-white/10 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl">
                  <Bitcoin className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                    Mining Protocol
                  </CardTitle>
                  <p className="text-xs text-gray-500">Powered by Real Hardware</p>
                </div>
              </div>
              <CardDescription className="text-gray-400">
                Plataforma de aluguel de hashpower
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <AnimatePresence mode="wait">
                {showLogin && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="mobile-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="mobile-input"
                      />
                    </div>
                    
                    <Button
                      onClick={handleLogin}
                      disabled={loading}
                      className="w-full mobile-button-primary"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
                    </Button>
                    
                    <div className="text-center">
                      <button
                        onClick={() => { setShowLogin(false); setShowRegister(true); }}
                        className="text-sm text-gray-400 hover:text-amber-500 transition-colors touch-manipulation py-2"
                      >
                        Não tem conta? <span className="text-amber-500">Cadastre-se</span>
                      </button>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10">
                      <Button
                        onClick={handleLogin}
                        variant="outline"
                        className="w-full mobile-button-secondary"
                      >
                        Entrar com conta demo
                      </Button>
                    </div>
                  </motion.div>
                )}
                
                {showRegister && (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-300">Nome completo</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Seu nome"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className="mobile-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-gray-300">Email</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="mobile-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-gray-300">Senha</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="mobile-input"
                      />
                    </div>
                    
                    <Button
                      onClick={handleRegister}
                      disabled={loading}
                      className="w-full mobile-button-primary"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar conta"}
                    </Button>
                    
                    <div className="text-center">
                      <button
                        onClick={() => { setShowRegister(false); setShowLogin(true); }}
                        className="text-sm text-gray-400 hover:text-amber-500 transition-colors touch-manipulation py-2"
                      >
                        Já tem conta? <span className="text-amber-500">Entrar</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Ao continuar, você concorda com nossos termos de uso
            </p>
          </div>
        </motion.div>
        
        {/* PWA Install Prompt */}
        {canInstall && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-4 right-4 max-w-md mx-auto"
          >
            <Card className="bg-amber-500/10 border-amber-500/30 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <Bitcoin className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Instalar App</p>
                  <p className="text-xs text-gray-400">Adicione à tela inicial</p>
                </div>
                <Button
                  onClick={install}
                  size="sm"
                  className="bg-amber-500 text-black hover:bg-amber-600"
                >
                  Instalar
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    );
  }
  
  // Main Dashboard with Mobile-First Design
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-safe">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />
      </div>
      
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
              <Bitcoin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm">Mining Protocol</h1>
              <p className="text-[10px] text-gray-500">v2.0 PWA</p>
            </div>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Balance - USDT Primary */}
            <div className="text-right mr-2">
              <p className="text-xs text-gray-500">Saldo USDT</p>
              <p className="text-sm font-semibold text-white">
                $ {(user?.balance ?? 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-gray-500">
                ≈ R$ {convertUsdtToBrl(user?.balance ?? 0).toFixed(0)}
              </p>
            </div>
            
            {/* Notifications */}
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 touch-manipulation">
              <Bell className="w-5 h-5 text-gray-400" />
            </button>
            
            {/* User Avatar */}
            <button 
              onClick={() => setActiveTab("profile")}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500/20 touch-manipulation"
            >
              <span className="text-amber-500 font-semibold text-sm">
                {user?.name?.charAt(0) || "U"}
              </span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content Area with Pull-to-Refresh */}
      <main 
        ref={containerRef}
        id="main-content"
        className="relative overflow-y-auto scroll-native"
        style={{ 
          height: "calc(100vh - 140px - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
        }}
      >
        {/* Pull Indicator */}
        <PullIndicator 
          pullDistance={pullDistance} 
          isRefreshing={isRefreshing} 
        />
        
        <div className="px-4 py-4">
          <AnimatePresence mode="wait">
            {/* Home Tab */}
            {activeTab === "home" && (
              <HomeTab
                user={user}
                cryptoPrices={cryptoPrices}
                btcPrice={btcPrice}
                btcPriceBrl={btcPriceBrl}
                btcChange24h={btcChange24h}
                network={network}
                miningStats={miningStats}
                fearGreed={fearGreed}
                fearGreedHistorical={fearGreedHistorical}
                rentals={rentals}
                transactions={transactions}
                miners={miners}
                pricesLastUpdate={pricesLastUpdate}
                onDeposit={() => setShowDepositModal(true)}
                onNavigate={setActiveTab}
              />
            )}
            
            {/* Miners Tab */}
            {activeTab === "miners" && (
              <MinersTab
                miners={miners}
                onSelectMiner={(miner) => {
                  setSelectedMiner(miner);
                  setShowRentModal(true);
                }}
              />
            )}
            
            {/* History Tab */}
            {activeTab === "history" && (
              <HistoryTab transactions={transactions} />
            )}
            
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <ProfileTab
                user={user}
                onLogout={handleLogout}
                onDeposit={() => setShowDepositModal(true)}
                onWithdraw={() => setShowWithdrawModal(true)}
              />
            )}
            
            {/* More Tab */}
            {activeTab === "more" && (
              <MoreTab
                user={user}
                onNavigate={setActiveTab}
              />
            )}
            
            {/* Additional Tabs */}
            {activeTab === "rentals" && (
              <RentalsTab
                rentals={rentals}
                miners={miners}
                onNavigate={setActiveTab}
              />
            )}
            
            {activeTab === "affiliate" && (
              <AffiliateTab user={user} />
            )}
            
            {activeTab === "admin" && user?.role === "admin" && (
              <AdminTab />
            )}
          </AnimatePresence>
        </div>
      </main>
      
      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole={user?.role}
      />
      
      {/* Quick Action FAB */}
      <QuickActionFab
        onDeposit={() => setShowDepositModal(true)}
        onWithdraw={() => setShowWithdrawModal(true)}
      />
      
      {/* Deposit Bottom Sheet */}
      <DepositSheet
        open={showDepositModal}
        onOpenChange={(open) => {
          setShowDepositModal(open);
          if (!open) {
            setDepositStep(1);
            setDepositAmount("");
            setDepositTxHash("");
            setDepositVerifying(false);
            setDepositVerified(null);
            setDepositVerificationMessage("");
          }
        }}
      >
        <Tabs value={depositMethod} onValueChange={(v) => {
          setDepositMethod(v);
          setDepositStep(1);
          setDepositAmount("");
        }}>
          <TabsList className="bg-[#262626] w-full rounded-xl">
            <TabsTrigger value="pix" className="flex-1 rounded-lg data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-500">
              PIX
            </TabsTrigger>
            <TabsTrigger value="usdt" className="flex-1 rounded-lg data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500">
              USDT
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pix" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Valor do depósito (BRL)</Label>
              <Input
                type="number"
                placeholder="Mínimo R$ 20"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="mobile-input text-lg"
              />
              {depositAmount && parseFloat(depositAmount) >= 20 && (
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
                  <p className="text-xs text-gray-400">Você receberá:</p>
                  <p className="text-lg font-bold text-amber-400">
                    $ {convertBrlToUsdt(parseFloat(depositAmount)).toFixed(2)} USDT
                  </p>
                  <p className="text-xs text-gray-500">Taxa: 1 USDT ≈ R$ {usdtBrlRate.toFixed(2)}</p>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {[100, 500, 1000].map((value) => (
                <Button
                  key={value}
                  variant="outline"
                  size="sm"
                  onClick={() => setDepositAmount(value.toString())}
                  className="mobile-button-secondary text-sm"
                >
                  R$ {value}
                </Button>
              ))}
            </div>
            
            <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
              <p className="text-xs text-gray-400 mb-2">Chave PIX para depósito:</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-emerald-500 text-sm font-mono">mining@protocol.com</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText("mining@protocol.com");
                    toast.success("Chave PIX copiada!");
                  }}
                  className="text-emerald-500"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Button
              onClick={handleDeposit}
              disabled={loading || !depositAmount || parseFloat(depositAmount) < 20}
              className="w-full mobile-button-primary"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Confirmar Depósito
            </Button>
          </TabsContent>
          
          <TabsContent value="usdt" className="space-y-4 mt-4">
            <AnimatePresence mode="wait">
              {depositStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Valor em USDT</Label>
                    <Input
                      type="number"
                      placeholder="Mínimo $20 USDT"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="mobile-input text-lg"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-300">Rede</Label>
                    <Select value={depositNetwork} onValueChange={setDepositNetwork}>
                      <SelectTrigger className="mobile-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        <SelectItem value="TRC20">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-500/20 text-emerald-500">TRC20</Badge>
                            <span>Tron Network</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Polygon">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-purple-500/20 text-purple-500">Polygon</Badge>
                            <span>Polygon (MATIC)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    onClick={() => setDepositStep(2)}
                    disabled={!depositAmount || parseFloat(depositAmount) < 20}
                    className="w-full mobile-button-primary"
                  >
                    Continuar
                  </Button>
                </motion.div>
              )}
              
              {depositStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="text-center p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                    <p className="text-2xl font-bold text-white">${depositAmount} USDT</p>
                    <Badge className="mt-2 bg-amber-500/20 text-amber-500">{depositNetwork}</Badge>
                  </div>
                  
                  <div className="p-4 bg-[#262626] rounded-xl border border-white/10">
                    <p className="text-xs text-gray-400 mb-2">Endereço para depósito:</p>
                    <div className="flex items-start gap-2">
                      <code className="text-amber-500 text-xs break-all font-mono flex-1">
                        {depositNetwork === "TRC20" 
                          ? "TRX123456789abcdefghijklmnopqrstuv"
                          : "0x123456789abcdefABCDEF123456789abcdefABCD"}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            depositNetwork === "TRC20" 
                              ? "TRX123456789abcdefghijklmnopqrstuv"
                              : "0x123456789abcdefABCDEF123456789abcdefABCD"
                          );
                          toast.success("Endereço copiado!");
                        }}
                        className="text-amber-500"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <div className="text-xs text-gray-300">
                        <p className="font-semibold text-red-400 mb-1">ATENÇÃO:</p>
                        <ul className="space-y-1">
                          <li>• Envie apenas USDT pela rede <strong>{depositNetwork}</strong></li>
                          <li>• Outros tokens serão perdidos</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDepositStep(1)} className="flex-1 mobile-button-secondary">
                      Voltar
                    </Button>
                    <Button onClick={() => setDepositStep(3)} className="flex-1 mobile-button-primary">
                      Já Enviei
                    </Button>
                  </div>
                </motion.div>
              )}
              
              {depositStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {depositVerifying && (
                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        <div>
                          <p className="text-sm font-medium text-white">Verificando...</p>
                          <p className="text-xs text-gray-400">{depositVerificationMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {depositVerified === true && (
                    <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-emerald-400">Confirmado!</p>
                          <p className="text-xs text-gray-400">{depositVerificationMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {depositVerified === false && !depositVerifying && (
                    <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <div>
                          <p className="text-sm font-medium text-white">Verificação Pendente</p>
                          <p className="text-xs text-gray-400">{depositVerificationMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-gray-300">Hash da Transação</Label>
                    <Input
                      placeholder={depositNetwork === "TRC20" ? "Hash de 64 caracteres..." : "0x..."}
                      value={depositTxHash}
                      onChange={(e) => setDepositTxHash(e.target.value)}
                      className="mobile-input font-mono text-xs"
                      disabled={depositVerifying || depositVerified === true}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDepositStep(2)} className="flex-1 mobile-button-secondary" disabled={depositVerifying || depositVerified === true}>
                      Voltar
                    </Button>
                    <Button
                      onClick={handleUSDTDeposit}
                      disabled={loading || !depositTxHash || depositVerifying || depositVerified === true}
                      className="flex-1 mobile-button-primary"
                    >
                      {depositVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Verificar
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </DepositSheet>
      
      {/* Withdraw Bottom Sheet */}
      <WithdrawSheet
        open={showWithdrawModal}
        onOpenChange={setShowWithdrawModal}
      >
        <Tabs value={withdrawMethod} onValueChange={setWithdrawMethod}>
          <TabsList className="bg-[#262626] w-full rounded-xl">
            <TabsTrigger value="pix" className="flex-1 rounded-lg">PIX</TabsTrigger>
            <TabsTrigger value="usdt" className="flex-1 rounded-lg">USDT</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pix" className="space-y-4 mt-4">
            <div className="p-4 bg-[#262626] rounded-xl">
              <p className="text-sm text-gray-400">Saldo disponível</p>
              <p className="text-2xl font-bold text-white">
                $ {(user?.balance ?? 0).toFixed(2)} <span className="text-lg text-amber-400">USDT</span>
              </p>
              <p className="text-sm text-gray-500">
                ≈ R$ {convertUsdtToBrl(user?.balance ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Valor do saque (USDT)</Label>
              <Input
                type="number"
                placeholder="0.00 USDT"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="mobile-input text-lg"
              />
              {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                <p className="text-sm text-emerald-400">
                  ≈ R$ {convertUsdtToBrl(parseFloat(withdrawAmount)).toFixed(2)} via PIX
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Chave PIX</Label>
              <Input
                placeholder="CPF, Email ou Telefone"
                className="mobile-input"
                defaultValue={user?.pixKey}
              />
            </div>
            
            <Button
              onClick={handleWithdraw}
              disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) > (user?.balance ?? 0)}
              className="w-full mobile-button-primary"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Solicitar Saque"}
            </Button>
          </TabsContent>
          
          <TabsContent value="usdt" className="space-y-4 mt-4">
            <div className="p-4 bg-[#262626] rounded-xl">
              <p className="text-sm text-gray-400">Saldo USDT</p>
              <p className="text-2xl font-bold text-amber-400">
                $ {(user?.balance ?? 0).toFixed(2)} <span className="text-lg text-white">USDT</span>
              </p>
              <p className="text-sm text-gray-500">
                ≈ R$ {convertUsdtToBrl(user?.balance ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Valor em USDT</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="mobile-input text-lg"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Endereço (TRC20)</Label>
              <Input
                placeholder="TRX..."
                className="mobile-input"
                defaultValue={user?.walletAddress}
              />
            </div>
            
            <Button
              onClick={handleWithdraw}
              disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) > (user?.balance ?? 0)}
              className="w-full mobile-button-primary"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Solicitar Saque"}
            </Button>
          </TabsContent>
        </Tabs>
      </WithdrawSheet>
      
      {/* Rent Miner Bottom Sheet */}
      <MinerRentSheet
        open={showRentModal}
        onOpenChange={(open) => {
          setShowRentModal(open);
          if (!open) setSelectedMiner(null);
        }}
      >
        {selectedMiner && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <Server className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedMiner.name}</h3>
                <p className="text-sm text-gray-400">{selectedMiner.coin}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#262626] rounded-xl">
                <p className="text-xs text-gray-400">Hashrate</p>
                <p className="text-lg font-semibold text-white">{selectedMiner.hashRate} TH/s</p>
              </div>
              <div className="p-3 bg-[#262626] rounded-xl">
                <p className="text-xs text-gray-400">Receita/dia</p>
                <p className="text-lg font-semibold text-emerald-400">$ {selectedMiner.dailyRevenue.toFixed(2)}</p>
                <p className="text-xs text-gray-500">≈ R$ {convertUsdtToBrl(selectedMiner.dailyRevenue).toFixed(0)}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Período</Label>
              <Select value={rentDays.toString()} onValueChange={(v) => setRentDays(parseInt(v))}>
                <SelectTrigger className="mobile-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  {[7, 14, 30, 60, 90].map((days) => (
                    <SelectItem key={days} value={days.toString()}>
                      {days} dias
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-4 bg-[#262626] rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Custo</span>
                <div className="text-right">
                  <span className="text-white">$ {(selectedMiner.pricePerDay * rentDays).toFixed(2)} USDT</span>
                  <p className="text-xs text-gray-500">≈ R$ {convertUsdtToBrl(selectedMiner.pricePerDay * rentDays).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Retorno estimado</span>
                <div className="text-right">
                  <span className="text-emerald-400">$ {(selectedMiner.dailyRevenue * 0.7 * rentDays).toFixed(2)} USDT</span>
                  <p className="text-xs text-gray-500">≈ R$ {convertUsdtToBrl(selectedMiner.dailyRevenue * 0.7 * rentDays).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex justify-between text-sm font-medium pt-2 border-t border-white/10">
                <span className="text-gray-300">Lucro estimado</span>
                <div className="text-right">
                  <span className="text-amber-500">$ {((selectedMiner.dailyRevenue * 0.7 - selectedMiner.pricePerDay) * rentDays).toFixed(2)} USDT</span>
                  <p className="text-xs text-gray-500">≈ R$ {convertUsdtToBrl((selectedMiner.dailyRevenue * 0.7 - selectedMiner.pricePerDay) * rentDays).toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleRentMiner}
              disabled={loading || !!(user && user.balance < selectedMiner.pricePerDay * rentDays)}
              className="w-full mobile-button-primary"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : user && user.balance < selectedMiner.pricePerDay * rentDays ? (
                "Saldo insuficiente"
              ) : (
                `Alugar por $${(selectedMiner.pricePerDay * rentDays).toFixed(2)} USDT`
              )}
            </Button>
          </div>
        )}
      </MinerRentSheet>
      
      {/* iOS Install Instructions */}
      {showIOSInstructions && (
        <IOSInstallInstructions onClose={hideIOSInstructions} />
      )}
    </div>
  );
}

// ============================================
// TAB COMPONENTS
// ============================================

// Home Tab Component
function HomeTab({ 
  user,
  cryptoPrices,
  btcPrice,
  btcPriceBrl,
  btcChange24h,
  network,
  miningStats,
  fearGreed,
  fearGreedHistorical,
  rentals,
  transactions,
  miners,
  pricesLastUpdate,
  onDeposit,
  onNavigate,
}: { 
  user: User | null;
  cryptoPrices: ReturnType<typeof useCryptoPrices>["coins"];
  btcPrice: ReturnType<typeof useCryptoPrices>["coins"][0] | undefined;
  btcPriceBrl: number;
  btcChange24h: number;
  network: ReturnType<typeof useNetworkStats>["network"];
  miningStats: ReturnType<typeof useNetworkStats>["mining"];
  fearGreed: ReturnType<typeof useFearGreed>["current"];
  fearGreedHistorical: ReturnType<typeof useFearGreed>["historical"];
  rentals: MiningRental[];
  transactions: Transaction[];
  miners: Miner[];
  pricesLastUpdate: Date | null;
  onDeposit: () => void;
  onNavigate: (tab: TabId) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Balance Card - USDT Primary */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Saldo Total</p>
              <p className="text-3xl font-bold text-white">
                $ {(user?.balance ?? 0).toFixed(2)} <span className="text-lg text-amber-400">USDT</span>
              </p>
              <p className="text-sm text-gray-400 flex items-center mt-1">
                ≈ R$ {(user?.balanceBrlEquivalent ?? (user?.balance ?? 0) * 5.23).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onDeposit}
                size="sm"
                className="bg-amber-500 text-black hover:bg-amber-600 h-11"
              >
                <ArrowDownLeft className="w-4 h-4 mr-1" />
                Depositar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="mobile-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total Minerado</p>
                <p className="text-lg font-bold text-white">
                  $ {(user?.totalMined ?? 0).toFixed(2)} USDT
                </p>
                <p className="text-xs text-gray-500">
                  ≈ R$ {(user?.totalMinedBrlEquivalent ?? (user?.totalMined ?? 0) * 5.23).toFixed(0)}
                </p>
              </div>
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <Bitcoin className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mobile-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total Investido</p>
                <p className="text-lg font-bold text-white">
                  $ {(user?.totalInvested ?? 0).toFixed(2)} USDT
                </p>
                <p className="text-xs text-gray-500">
                  ≈ R$ {(user?.totalInvestedBrlEquivalent ?? (user?.totalInvested ?? 0) * 5.23).toFixed(0)}
                </p>
              </div>
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <Server className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* BTC Price Card */}
      <Card className="mobile-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <Bitcoin className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Bitcoin</p>
                <p className="text-xl font-bold text-white">
                  R$ {(btcPriceBrl ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
            <Badge className={cn(
              "px-3 py-1",
              btcChange24h >= 0 ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
            )}>
              {btcChange24h >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {formatPercent(btcChange24h)}
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Server, label: "Minerar", color: "text-amber-500", tab: "miners" as TabId },
          { icon: Clock, label: "Aluguéis", color: "text-purple-500", tab: "rentals" as TabId },
          { icon: Activity, label: "Histórico", color: "text-blue-500", tab: "history" as TabId },
          { icon: UserPlus, label: "Afiliados", color: "text-emerald-500", tab: "affiliate" as TabId },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => onNavigate(item.tab)}
            className="flex flex-col items-center justify-center p-3 bg-[#1a1a1a] rounded-2xl border border-white/5 touch-manipulation active:scale-95 transition-transform"
          >
            <item.icon className={cn("w-6 h-6 mb-1", item.color)} />
            <span className="text-xs text-gray-400">{item.label}</span>
          </button>
        ))}
      </div>
      
      {/* Recent Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Atividade Recente</h3>
          <button onClick={() => onNavigate("history")} className="text-xs text-amber-500 touch-manipulation py-2">
            Ver tudo
          </button>
        </div>
        
        {transactions.length === 0 ? (
          <Card className="mobile-card">
            <CardContent className="p-6 text-center">
              <Activity className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhuma transação ainda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 3).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    tx.type === "deposit" && "bg-emerald-500/20",
                    tx.type === "withdrawal" && "bg-red-500/20",
                    tx.type === "rental_payment" && "bg-amber-500/20",
                  )}>
                    {tx.type === "deposit" && <ArrowDownLeft className="w-4 h-4 text-emerald-500" />}
                    {tx.type === "withdrawal" && <ArrowUpRight className="w-4 h-4 text-red-500" />}
                    {tx.type === "rental_payment" && <Server className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div>
                    <p className="text-sm text-white truncate max-w-[150px]">{tx.description}</p>
                    <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <span className={cn(
                  "font-semibold",
                  tx.type === "deposit" || tx.type === "mining_profit" ? "text-emerald-400" : "text-red-400"
                )}>
                  {tx.type === "deposit" || tx.type === "mining_profit" ? "+" : "-"}$ {tx.amount.toFixed(2)} USDT
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Crypto Prices */}
      <div className="space-y-3">
        <h3 className="font-semibold text-white">Preços de Cripto</h3>
        <div className="space-y-2">
          {cryptoPrices.slice(0, 5).map((coin) => (
            <div key={coin.id} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center">
                  {coin.symbol === "BTC" ? (
                    <Bitcoin className="w-5 h-5 text-amber-500" />
                  ) : (
                    <span className="text-xs font-bold text-gray-400">{coin.symbol}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{coin.name}</p>
                  <p className="text-xs text-gray-500">{coin.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  R$ {coin.priceBrl.toLocaleString("pt-BR", { minimumFractionDigits: coin.priceBrl < 1 ? 4 : 0 })}
                </p>
                <span className={cn(
                  "text-xs",
                  coin.change24h >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {formatPercent(coin.change24h)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Miners Tab Component
function MinersTab({ 
  miners, 
  onSelectMiner 
}: { 
  miners: Miner[];
  onSelectMiner: (miner: Miner) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-bold text-white">Mineradoras</h2>
        <p className="text-sm text-gray-400">Selecione para alugar</p>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge className="bg-emerald-500/20 text-emerald-500">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
          {miners.filter(m => m.status === "online").length} Online
        </Badge>
      </div>
      
      <div className="space-y-3">
        {miners.map((miner) => (
          <Card
            key={miner.id}
            className={cn(
              "mobile-card-interactive cursor-pointer",
              miner.status === "maintenance" && "opacity-50"
            )}
            onClick={() => miner.status !== "maintenance" && onSelectMiner(miner)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-xl">
                    <Server className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{miner.name}</h3>
                    <p className="text-xs text-gray-400">{miner.description}</p>
                  </div>
                </div>
                <Badge className={cn(
                  miner.status === "online" ? "bg-emerald-500/20 text-emerald-500" : "bg-yellow-500/20 text-yellow-500"
                )}>
                  {miner.status === "online" ? "Online" : "Manutenção"}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-[#262626] rounded-lg">
                  <p className="text-xs text-gray-400">Hashrate</p>
                  <p className="text-sm font-semibold text-white">{miner.hashRate} TH/s</p>
                </div>
                <div className="p-2 bg-[#262626] rounded-lg">
                  <p className="text-xs text-gray-400">Receita/dia</p>
                  <p className="text-sm font-semibold text-emerald-400">$ {miner.dailyRevenue.toFixed(2)}</p>
                </div>
                <div className="p-2 bg-[#262626] rounded-lg">
                  <p className="text-xs text-gray-400">Custo/dia</p>
                  <p className="text-sm font-semibold text-amber-400">$ {miner.pricePerDay.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

// History Tab Component
function HistoryTab({ transactions }: { transactions: Transaction[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-bold text-white">Histórico</h2>
        <p className="text-sm text-gray-400">Todas as movimentações</p>
      </div>
      
      {transactions.length === 0 ? (
        <Card className="mobile-card">
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhuma transação ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  tx.type === "deposit" && "bg-emerald-500/20",
                  tx.type === "withdrawal" && "bg-red-500/20",
                  tx.type === "rental_payment" && "bg-amber-500/20",
                  tx.type === "mining_profit" && "bg-blue-500/20",
                )}>
                  {tx.type === "deposit" && <ArrowDownLeft className="w-5 h-5 text-emerald-500" />}
                  {tx.type === "withdrawal" && <ArrowUpRight className="w-5 h-5 text-red-500" />}
                  {tx.type === "rental_payment" && <Server className="w-5 h-5 text-amber-500" />}
                  {tx.type === "mining_profit" && <Bitcoin className="w-5 h-5 text-blue-500" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{tx.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <p className={cn(
                "font-semibold",
                tx.type === "deposit" || tx.type === "mining_profit" ? "text-emerald-400" : "text-red-400"
              )}>
                {tx.type === "deposit" || tx.type === "mining_profit" ? "+" : "-"}$ {tx.amount.toFixed(2)} USDT
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Profile Tab Component
function ProfileTab({ 
  user, 
  onLogout, 
  onDeposit, 
  onWithdraw 
}: { 
  user: User | null;
  onLogout: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Profile Header */}
      <div className="flex items-center gap-4 p-4 bg-[#1a1a1a] rounded-2xl border border-white/5">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
          <span className="text-2xl font-bold text-amber-500">
            {user?.name?.charAt(0) || "U"}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{user?.name}</h2>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>
      </div>
      
      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="mobile-card">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Saldo USDT</p>
            <p className="text-xl font-bold text-amber-400">
              $ {(user?.balance ?? 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="mobile-card">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Total Investido</p>
            <p className="text-xl font-bold text-white">
              $ {(user?.totalInvested ?? 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={onDeposit}
          className="w-full flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-white/5 touch-manipulation"
        >
          <div className="flex items-center gap-3">
            <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
            <span className="text-white">Depositar</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
        
        <button
          onClick={onWithdraw}
          className="w-full flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-white/5 touch-manipulation"
        >
          <div className="flex items-center gap-3">
            <ArrowUpRight className="w-5 h-5 text-red-500" />
            <span className="text-white">Sacar</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-white/5 touch-manipulation"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-gray-400" />
            <span className="text-white">Sair</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </motion.div>
  );
}

// More Tab Component
function MoreTab({ 
  user, 
  onNavigate 
}: { 
  user: User | null;
  onNavigate: (tab: TabId) => void;
}) {
  const menuItems = [
    { icon: Server, label: "Meus Aluguéis", tab: "rentals" as TabId },
    { icon: UserPlus, label: "Afiliados", tab: "affiliate" as TabId },
    { icon: Settings, label: "Configurações", tab: "settings" as TabId },
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-bold text-white">Mais</h2>
      </div>
      
      <div className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => onNavigate(item.tab)}
            className="w-full flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-white/5 touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-gray-400" />
              <span className="text-white">{item.label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        ))}
      </div>
      
      {user?.role === "admin" && (
        <button
          onClick={() => onNavigate("admin")}
          className="w-full flex items-center justify-between p-4 bg-amber-500/10 rounded-xl border border-amber-500/30 touch-manipulation"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-500" />
            <span className="text-white">Painel Admin</span>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-400" />
        </button>
      )}
    </motion.div>
  );
}

// Rentals Tab Component
function RentalsTab({ 
  rentals, 
  miners,
  onNavigate 
}: { 
  rentals: MiningRental[];
  miners: Miner[];
  onNavigate: (tab: TabId) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-bold text-white">Meus Aluguéis</h2>
        <p className="text-sm text-gray-400">Mineradoras ativas</p>
      </div>
      
      {rentals.length === 0 ? (
        <Card className="mobile-card">
          <CardContent className="py-12 text-center">
            <Server className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">Nenhum aluguel ainda</p>
            <Button
              onClick={() => onNavigate("miners")}
              className="mobile-button-primary"
            >
              Ver Mineradoras
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rentals.map((rental) => {
            const miner = miners.find(m => m.id === rental.minerId) || rental.miner;
            const progress = Math.min(100, ((Date.now() - new Date(rental.startDate).getTime()) / (new Date(rental.endDate).getTime() - new Date(rental.startDate).getTime())) * 100);
            const daysLeft = Math.max(0, Math.ceil((new Date(rental.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            
            return (
              <Card key={rental.id} className="mobile-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-xl">
                        <Server className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{miner?.name || "Mineradora"}</h3>
                        <p className="text-xs text-gray-400">{miner?.coin}</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      rental.status === "active" ? "bg-emerald-500/20 text-emerald-500" : "bg-gray-500/20 text-gray-400"
                    )}>
                      {rental.status === "active" ? "Ativo" : "Finalizado"}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-2 bg-[#262626] rounded-lg">
                      <p className="text-xs text-gray-400">Retorno Diário</p>
                      <p className="text-sm font-semibold text-emerald-400">$ {rental.dailyReturn.toFixed(2)} USDT</p>
                    </div>
                    <div className="p-2 bg-[#262626] rounded-lg">
                      <p className="text-xs text-gray-400">Dias Restantes</p>
                      <p className="text-sm font-semibold text-white">{daysLeft} dias</p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Progresso</span>
                      <span className="text-white">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-gray-700" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// Affiliate Tab Component
function AffiliateTab({ user }: { user: User | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-bold text-white">Afiliados</h2>
        <p className="text-sm text-gray-400">Ganhe comissões</p>
      </div>
      
      {/* Balance Card */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-green-600/10 border-emerald-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Saldo de Comissões (USDT)</p>
              <p className="text-2xl font-bold text-white">
                $ {(user?.affiliateBalance || 0).toFixed(2)} <span className="text-lg text-amber-400">USDT</span>
              </p>
            </div>
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <PiggyBank className="w-8 h-8 text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Referral Link */}
      <Card className="mobile-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Link className="w-4 h-4 text-amber-500" />
            Link de Indicação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user?.linkUnlocked ? (
            <div className="flex gap-2">
              <Input
                readOnly
                value={`https://mining-protocol.com/register?ref=${user?.affiliateCode}`}
                className="mobile-input text-xs"
              />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(`https://mining-protocol.com/register?ref=${user?.affiliateCode}`);
                  toast.success("Link copiado!");
                }}
                className="bg-amber-500 text-black"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <Lock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Faça seu primeiro investimento para desbloquear</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Commission Levels */}
      <Card className="mobile-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base">Comissões por Nível</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            {[
              { level: 1, percent: 10, color: "bg-amber-500" },
              { level: 2, percent: 5, color: "bg-orange-500" },
              { level: 3, percent: 3, color: "bg-purple-500" },
              { level: 4, percent: 2, color: "bg-blue-500" },
              { level: 5, percent: 1, color: "bg-green-500" },
            ].map((item) => (
              <div key={item.level} className="text-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center mb-1",
                  item.color
                )}>
                  <span className="text-white text-xs font-bold">{item.percent}%</span>
                </div>
                <p className="text-[10px] text-gray-400">Nv {item.level}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
