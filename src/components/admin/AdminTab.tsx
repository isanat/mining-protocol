"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Wallet, ArrowDownLeft, ArrowUpRight, Server, Settings,
  TrendingUp, Check, X, Search, ChevronLeft, ChevronRight,
  Plus, Edit, Trash2, RefreshCw, ExternalLink, Copy,
  Crown, Activity, DollarSign, Shield, AlertTriangle,
  Eye, FileText, Clock, Hash, Link2, Percent, Save
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ===== TYPES =====
type AdminSection = 'dashboard' | 'users' | 'deposits' | 'withdrawals' | 'miners' | 'affiliates' | 'settings' | 'logs';

interface AdminStats {
  usdtRate: number;
  users: { total: number; active: number; newToday: number; withAffiliateLink: number };
  financial: { 
    totalInvestedUsdt: number; totalInvestedBrl: number;
    totalBalanceUsdt: number; totalBalanceBrl: number;
    totalCommissionsPaidUsdt: number; totalCommissionsPaidBrl: number;
    totalCommissionsPendingUsdt: number; totalCommissionsPendingBrl: number;
    totalAffiliateBalanceUsdt: number; totalAffiliateBalanceBrl: number;
  };
  withdrawals: { pending: number; pendingAmountUsdt: number; pendingAmountBrl: number };
  mining: { totalMiners: number; onlineMiners: number; activeRentals: number };
  deposits: { pending: number; investedTodayUsdt: number; investedTodayBrl: number };
}

interface AdminUser {
  id: string; name: string; email: string; role: string; 
  balance: number; balanceBrl: number;
  totalInvested: number; totalInvestedBrl: number;
  totalMined: number; totalMinedBrl: number;
  affiliateBalance: number; affiliateBalanceBrl: number;
  totalAffiliateEarnings: number;
  hasInvested: boolean; linkUnlocked: boolean;
  affiliateCode: string | null; referredByName: string | null; 
  totalReferrals: number; 
  pixKey: string | null; walletAddress: string | null;
  createdAt: string;
}

interface Deposit {
  id: string; userId: string; 
  amount: number; brlAmount: number | null; usdtRate: number | null;
  method: string; network: string | null;
  txHash: string | null; pixTxId: string | null;
  status: string; adminNotes: string | null;
  createdAt: string; processedAt: string | null;
  user: { id: string; name: string; email: string; };
}

interface Withdrawal {
  id: string; userId: string; 
  amount: number; brlAmount: number | null;
  netAmount: number; fee: number;
  method: string; address: string | null; pixKey: string | null;
  status: string; adminNotes: string | null;
  createdAt: string; processedAt: string | null;
  user: { id: string; name: string; email: string; pixKey: string | null; walletAddress: string | null; };
}

interface AdminMiner {
  id: string; name: string; model: string; 
  hashRate: number; powerConsumption: number;
  coin: string; pool: string; 
  dailyRevenue: number; pricePerDay: number; efficiency: number;
  status: string; description: string | null; image: string | null;
  activeRentals: number; totalRentals: number; totalRevenue: number;
  createdAt: string;
}

interface Affiliate {
  id: string; name: string; email: string; 
  affiliateCode: string; 
  affiliateBalance: number; totalAffiliateEarnings: number;
  hasInvested: boolean; linkUnlocked: boolean;
  createdAt: string;
  stats: { 
    directReferrals: number; totalReferrals: number; 
    totalCommissions: number; paidCommissions: number; 
    totalWithdrawals: number; 
  };
}

interface AdminLog {
  id: string; adminId: string; action: string;
  entity: string; entityId: string | null;
  oldValue: string | null; newValue: string | null;
  description: string; ipAddress: string | null;
  createdAt: string;
  admin: { id: string; name: string; email: string } | null;
}

interface SystemConfig {
  id: string; key: string; value: string; type: string;
  description: string | null; category: string; isActive: boolean;
}

interface AffiliateLevel {
  id: string; level: number; percentage: number;
  description: string | null; isActive: boolean;
}

interface AdminLog {
  id: string; adminId: string; action: string;
  entity: string; entityId: string | null;
  oldValue: string | null; newValue: string | null;
  description: string; ipAddress: string | null;
  createdAt: string;
}

// ===== MAIN COMPONENT =====
export function AdminTab() {
  // State
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  
  // Data states
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [miners, setMiners] = useState<AdminMiner[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({});
  const [allConfigs, setAllConfigs] = useState<SystemConfig[]>([]);
  const [affiliateLevels, setAffiliateLevels] = useState<AffiliateLevel[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  
  // Pagination
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  
  // Filters
  const [depositStatus, setDepositStatus] = useState("pending");
  const [depositMethod, setDepositMethod] = useState("all");
  const [withdrawalStatus, setWithdrawalStatus] = useState("pending");
  
  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showMinerModal, setShowMinerModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Editing
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editingMiner, setEditingMiner] = useState<AdminMiner | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  
  // Forms
  const [userForm, setUserForm] = useState({
    name: "", email: "", password: "", role: "user", 
    balance: 0, pixKey: "", walletAddress: "",
    affiliateBalance: 0, hasInvested: false, linkUnlocked: false
  });
  
  const [minerForm, setMinerForm] = useState({
    name: "", model: "", hashRate: 0, powerConsumption: 0, 
    coin: "BTC", pool: "Binance Pool", 
    dailyRevenue: 0, pricePerDay: 0, efficiency: 0, 
    description: "", status: "online", image: ""
  });
  
  const [adminNotes, setAdminNotes] = useState("");
  const [txHashInput, setTxHashInput] = useState("");
  
  // Config form
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [levelForm, setLevelForm] = useState<AffiliateLevel[]>([]);

  // ===== FETCH FUNCTIONS =====
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (data.success) setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Erro ao carregar estatísticas");
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ 
        page: userPage.toString(), 
        limit: "20", 
        search: userSearch 
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setUserTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    }
  }, [userPage, userSearch]);

  const fetchDeposits = useCallback(async () => {
    try {
      const params = new URLSearchParams({ 
        status: depositStatus, 
        method: depositMethod,
        limit: "50" 
      });
      const res = await fetch(`/api/admin/deposits?${params}`);
      const data = await res.json();
      setDeposits(data.deposits || []);
    } catch (error) {
      console.error("Error fetching deposits:", error);
      toast.error("Erro ao carregar depósitos");
    }
  }, [depositStatus, depositMethod]);

  const fetchWithdrawals = useCallback(async () => {
    try {
      const params = new URLSearchParams({ 
        status: withdrawalStatus, 
        limit: "50" 
      });
      const res = await fetch(`/api/admin/withdrawals?${params}`);
      const data = await res.json();
      if (data.success) setWithdrawals(data.withdrawals);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Erro ao carregar saques");
    }
  }, [withdrawalStatus]);

  const fetchMiners = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/miners");
      const data = await res.json();
      if (data.success) setMiners(data.miners);
    } catch (error) {
      console.error("Error fetching miners:", error);
      toast.error("Erro ao carregar mineradoras");
    }
  }, []);

  const fetchAffiliates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/affiliates");
      const data = await res.json();
      if (data.success) {
        setAffiliates(data.affiliates);
        setAffiliateLevels(data.levels || []);
      }
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      toast.error("Erro ao carregar afiliados");
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ 
        page: logPage.toString(), 
        limit: "30" 
      });
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setLogTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast.error("Erro ao carregar logs");
    }
  }, [logPage]);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/config");
      const data = await res.json();
      if (data.success) {
        setConfigs(data.configs || {});
        setAllConfigs(data.allConfigs || []);
        setAffiliateLevels(data.affiliateLevels || []);
        
        // Populate level form
        if (data.affiliateLevels && data.affiliateLevels.length > 0) {
          setLevelForm(data.affiliateLevels);
        }
        
        // Populate config form
        const configValues: Record<string, string> = {};
        for (const config of data.allConfigs || []) {
          configValues[config.key] = config.value;
        }
        for (const [key, value] of Object.entries(data.defaults || {})) {
          if (!configValues[key]) configValues[key] = value as string;
        }
        setConfigForm(configValues);
      }
    } catch (error) {
      console.error("Error fetching configs:", error);
      toast.error("Erro ao carregar configurações");
    }
  }, []);

  // ===== EFFECTS =====
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    };
    loadData();
  }, [fetchStats]);

  useEffect(() => {
    if (activeSection === 'users') fetchUsers();
    else if (activeSection === 'deposits') fetchDeposits();
    else if (activeSection === 'withdrawals') fetchWithdrawals();
    else if (activeSection === 'miners') fetchMiners();
    else if (activeSection === 'affiliates') fetchAffiliates();
    else if (activeSection === 'settings') fetchConfigs();
    else if (activeSection === 'logs') fetchLogs();
  }, [activeSection, fetchUsers, fetchDeposits, fetchWithdrawals, fetchMiners, fetchAffiliates, fetchConfigs, fetchLogs]);

  // ===== HANDLERS =====
  
  // User handlers
  const handleSaveUser = async () => {
    try {
      const method = editingUser ? "PUT" : "POST";
      const body = editingUser 
        ? { id: editingUser.id, ...userForm } 
        : userForm;
      
      const res = await fetch("/api/admin/users", {
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(editingUser ? "Usuário atualizado!" : "Usuário criado!");
        setShowUserModal(false);
        setEditingUser(null);
        setUserForm({ name: "", email: "", password: "", role: "user", balance: 0, pixKey: "", walletAddress: "", affiliateBalance: 0, hasInvested: false, linkUnlocked: false });
        fetchUsers();
        fetchStats();
      } else {
        toast.error(data.error || "Erro ao salvar usuário");
      }
    } catch {
      toast.error("Erro ao salvar usuário");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.")) return;
    
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Usuário excluído com sucesso!");
        fetchUsers();
        fetchStats();
      } else {
        toast.error(data.error || "Erro ao excluir usuário");
      }
    } catch {
      toast.error("Erro ao excluir usuário");
    }
  };

  const openUserModal = (user?: AdminUser) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
        balance: user.balance,
        pixKey: user.pixKey || "",
        walletAddress: user.walletAddress || "",
        affiliateBalance: user.affiliateBalance,
        hasInvested: user.hasInvested,
        linkUnlocked: user.linkUnlocked
      });
    } else {
      setEditingUser(null);
      setUserForm({ name: "", email: "", password: "", role: "user", balance: 0, pixKey: "", walletAddress: "", affiliateBalance: 0, hasInvested: false, linkUnlocked: false });
    }
    setShowUserModal(true);
  };

  // Deposit handlers
  const handleApproveDeposit = async (depositId: string) => {
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId, action: "approve", adminNotes })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Depósito aprovado! $${data.deposit.amount.toFixed(2)} USDT creditado.`);
        setShowDepositModal(false);
        setAdminNotes("");
        fetchDeposits();
        fetchStats();
      } else {
        toast.error(data.error || "Erro ao aprovar depósito");
      }
    } catch {
      toast.error("Erro ao aprovar depósito");
    }
  };

  const handleRejectDeposit = async (depositId: string) => {
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId, action: "reject", adminNotes })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Depósito rejeitado");
        setShowDepositModal(false);
        setAdminNotes("");
        fetchDeposits();
        fetchStats();
      } else {
        toast.error(data.error || "Erro ao rejeitar depósito");
      }
    } catch {
      toast.error("Erro ao rejeitar depósito");
    }
  };

  const handleVerifyDeposit = async (depositId: string) => {
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId })
      });
      const data = await res.json();
      
      if (data.success && data.explorerUrl) {
        window.open(data.explorerUrl, '_blank');
      } else {
        toast.error(data.error || "Erro ao verificar transação");
      }
    } catch {
      toast.error("Erro ao verificar transação");
    }
  };

  // Withdrawal handlers
  const handleApproveWithdrawal = async (withdrawalId: string) => {
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, action: "approve", adminNotes })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Saque aprovado!");
        setShowWithdrawalModal(false);
        setAdminNotes("");
        fetchWithdrawals();
        fetchStats();
      } else {
        toast.error(data.error || "Erro ao aprovar saque");
      }
    } catch {
      toast.error("Erro ao aprovar saque");
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, action: "reject", adminNotes })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Saque rejeitado - saldo devolvido ao usuário");
        setShowWithdrawalModal(false);
        setAdminNotes("");
        fetchWithdrawals();
        fetchStats();
      } else {
        toast.error(data.error || "Erro ao rejeitar saque");
      }
    } catch {
      toast.error("Erro ao rejeitar saque");
    }
  };

  const handleCompleteWithdrawal = async (withdrawalId: string) => {
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, action: "process", adminNotes, txHash: txHashInput })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Saque marcado como completo!");
        setShowWithdrawalModal(false);
        setAdminNotes("");
        setTxHashInput("");
        fetchWithdrawals();
        fetchStats();
      } else {
        toast.error(data.error || "Erro ao processar saque");
      }
    } catch {
      toast.error("Erro ao processar saque");
    }
  };

  // Miner handlers
  const handleSaveMiner = async () => {
    try {
      const method = editingMiner ? "PUT" : "POST";
      const body = editingMiner 
        ? { id: editingMiner.id, ...minerForm } 
        : minerForm;
      
      const res = await fetch("/api/admin/miners", {
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(editingMiner ? "Mineradora atualizada!" : "Mineradora criada!");
        setShowMinerModal(false);
        setEditingMiner(null);
        setMinerForm({ name: "", model: "", hashRate: 0, powerConsumption: 0, coin: "BTC", pool: "Binance Pool", dailyRevenue: 0, pricePerDay: 0, efficiency: 0, description: "", status: "online", image: "" });
        fetchMiners();
        fetchStats();
      } else {
        toast.error(data.error || "Erro ao salvar mineradora");
      }
    } catch {
      toast.error("Erro ao salvar mineradora");
    }
  };

  const handleDeleteMiner = async (minerId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta mineradora?")) return;
    
    try {
      const res = await fetch(`/api/admin/miners?id=${minerId}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Mineradora excluída!");
        fetchMiners();
        fetchStats();
      } else {
        toast.error(data.error || "Erro ao excluir mineradora");
      }
    } catch {
      toast.error("Erro ao excluir mineradora");
    }
  };

  const openMinerModal = (miner?: AdminMiner) => {
    if (miner) {
      setEditingMiner(miner);
      setMinerForm({
        name: miner.name,
        model: miner.model,
        hashRate: miner.hashRate,
        powerConsumption: miner.powerConsumption,
        coin: miner.coin,
        pool: miner.pool,
        dailyRevenue: miner.dailyRevenue,
        pricePerDay: miner.pricePerDay,
        efficiency: miner.efficiency,
        description: miner.description || "",
        status: miner.status,
        image: miner.image || ""
      });
    } else {
      setEditingMiner(null);
      setMinerForm({ name: "", model: "", hashRate: 0, powerConsumption: 0, coin: "BTC", pool: "Binance Pool", dailyRevenue: 0, pricePerDay: 0, efficiency: 0, description: "", status: "online", image: "" });
    }
    setShowMinerModal(true);
  };

  // Config handlers
  const handleSaveConfigs = async () => {
    try {
      const configsArray = Object.entries(configForm).map(([key, value]) => ({
        key,
        value,
        type: value === "true" || value === "false" ? "boolean" : isNaN(Number(value)) ? "string" : "number"
      }));
      
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: configsArray, affiliateLevels: levelForm })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Configurações salvas!");
        fetchConfigs();
      } else {
        toast.error(data.error || "Erro ao salvar configurações");
      }
    } catch {
      toast.error("Erro ao salvar configurações");
    }
  };

  const handleInitConfigs = async () => {
    try {
      const res = await fetch("/api/admin/config", { method: "PUT" });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Configurações padrão inicializadas!");
        fetchConfigs();
      } else {
        toast.error(data.error || "Erro ao inicializar configurações");
      }
    } catch {
      toast.error("Erro ao inicializar configurações");
    }
  };

  // Utility functions
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const formatCurrency = (value: number, currency: 'USDT' | 'BRL' = 'USDT') => {
    if (currency === 'USDT') {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-500/20 text-amber-500",
      confirmed: "bg-emerald-500/20 text-emerald-500",
      approved: "bg-blue-500/20 text-blue-500",
      completed: "bg-emerald-500/20 text-emerald-500",
      cancelled: "bg-red-500/20 text-red-500",
      rejected: "bg-red-500/20 text-red-500",
      active: "bg-emerald-500/20 text-emerald-500",
      online: "bg-emerald-500/20 text-emerald-500",
      offline: "bg-gray-500/20 text-gray-400",
      maintenance: "bg-amber-500/20 text-amber-500"
    };
    const labels: Record<string, string> = {
      pending: "Pendente",
      confirmed: "Confirmado",
      approved: "Aprovado",
      completed: "Completo",
      cancelled: "Cancelado",
      rejected: "Rejeitado",
      active: "Ativo",
      online: "Online",
      offline: "Offline",
      maintenance: "Manutenção"
    };
    return <Badge className={styles[status] || "bg-gray-500/20 text-gray-400"}>{labels[status] || status}</Badge>;
  };

  // ===== RENDER SECTIONS =====
  
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Usuários", value: stats?.users.total || 0, sub: `${stats?.users.newToday || 0} novos hoje`, icon: Users, color: "from-blue-500 to-cyan-500" },
          { title: "Depósitos Pendentes", value: stats?.deposits.pending || 0, sub: "aguardando aprovação", icon: Wallet, color: "from-amber-500 to-orange-500" },
          { title: "Saques Pendentes", value: stats?.withdrawals.pending || 0, sub: formatCurrency(stats?.withdrawals.pendingAmountUsdt || 0), icon: ArrowDownLeft, color: "from-red-500 to-rose-500" },
          { title: "Total Investido", value: formatCurrency(stats?.financial.totalInvestedUsdt || 0), sub: formatCurrency(stats?.financial.totalInvestedBrl || 0, 'BRL'), icon: TrendingUp, color: "from-emerald-500 to-green-500" },
          { title: "Saldo Usuários", value: formatCurrency(stats?.financial.totalBalanceUsdt || 0), sub: "USDT em contas", icon: DollarSign, color: "from-purple-500 to-pink-500" },
          { title: "Comissões Afiliados", value: formatCurrency(stats?.financial.totalAffiliateBalanceUsdt || 0), sub: "aguardando saque", icon: Crown, color: "from-yellow-500 to-amber-500" },
          { title: "Mineradoras", value: stats?.mining.totalMiners || 0, sub: `${stats?.mining.onlineMiners || 0} online`, icon: Server, color: "from-teal-500 to-cyan-500" },
          { title: "Aluguéis Ativos", value: stats?.mining.activeRentals || 0, sub: "em operação", icon: Activity, color: "from-indigo-500 to-violet-500" },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-white/10 hover:border-white/20 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-r flex items-center justify-center mb-3", card.color)}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs text-gray-400 mb-1">{card.title}</p>
                <p className="text-xl font-bold text-white">{card.value}</p>
                <p className="text-[10px] text-gray-500 mt-1">{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="bg-[#1a1a1a] border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'users', label: 'Gerenciar Usuários', icon: Users, count: stats?.users.total },
              { id: 'deposits', label: 'Aprovar Depósitos', icon: Wallet, count: stats?.deposits.pending, urgent: true },
              { id: 'withdrawals', label: 'Processar Saques', icon: ArrowUpRight, count: stats?.withdrawals.pending, urgent: true },
              { id: 'miners', label: 'Mineradoras', icon: Server, count: stats?.mining.totalMiners },
              { id: 'affiliates', label: 'Afiliados', icon: Crown, count: stats?.users.withAffiliateLink },
              { id: 'settings', label: 'Configurações', icon: Settings },
              { id: 'logs', label: 'Logs', icon: FileText },
            ].map((item) => (
              <Button
                key={item.id}
                onClick={() => setActiveSection(item.id as AdminSection)}
                className={cn(
                  "h-auto py-4 flex-col gap-2 bg-white/5 hover:bg-white/10 border border-white/10",
                  item.urgent && "animate-pulse"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
                {item.count !== undefined && (
                  <Badge className="bg-amber-500/20 text-amber-500 text-[10px]">{item.count}</Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* USDT Rate */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-500 font-bold text-sm">₮</span>
            </div>
            <div>
              <p className="text-sm text-gray-400">Taxa USDT/BRL</p>
              <p className="text-xl font-bold text-white">{stats?.usdtRate ? `R$${stats.usdtRate.toFixed(2)}` : 'Carregando...'}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchStats}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={userSearch}
            onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
            className="pl-10 bg-[#1a1a1a] border-white/10 text-white"
          />
        </div>
        <Button onClick={() => openUserModal()} className="bg-amber-500 hover:bg-amber-600 text-black">
          <Plus className="w-4 h-4 mr-2" /> Novo Usuário
        </Button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {users.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="bg-[#1a1a1a] border-white/10 hover:border-white/20 transition-all">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-white">{user.name}</p>
                        {user.role === "admin" && (
                          <Badge className="bg-amber-500/20 text-amber-500 text-[10px]">
                            <Crown className="w-3 h-3 mr-1" /> ADMIN
                          </Badge>
                        )}
                        {user.hasInvested && (
                          <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Investiu</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{user.email}</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Saldo</p>
                          <p className="text-sm font-medium text-white">{formatCurrency(user.balance)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Investido</p>
                          <p className="text-sm font-medium text-emerald-400">{formatCurrency(user.totalInvested)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Minerado</p>
                          <p className="text-sm font-medium text-blue-400">{formatCurrency(user.totalMined)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Afiliados</p>
                          <p className="text-sm font-medium text-amber-400">{user.totalReferrals}</p>
                        </div>
                      </div>

                      {user.affiliateCode && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-gray-500">Código:</span>
                          <code className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">{user.affiliateCode}</code>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(user.affiliateCode!)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      {user.referredByName && (
                        <p className="text-[10px] text-gray-500 mt-1">Indicado por: {user.referredByName}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openUserModal(user)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => handleDeleteUser(user.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {userTotalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="flex items-center text-sm text-gray-400">{userPage} / {userTotalPages}</span>
          <Button variant="ghost" size="sm" disabled={userPage === userTotalPages} onClick={() => setUserPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  const renderDeposits = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={depositStatus} onValueChange={setDepositStatus}>
          <SelectTrigger className="flex-1 bg-[#1a1a1a] border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="confirmed">Confirmados</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={depositMethod} onValueChange={setDepositMethod}>
          <SelectTrigger className="flex-1 bg-[#1a1a1a] border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Métodos</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
            <SelectItem value="usdt_trc20">USDT TRC20</SelectItem>
            <SelectItem value="usdt_polygon">USDT Polygon</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchDeposits}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {deposits.length === 0 ? (
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardContent className="py-12 text-center">
            <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum depósito encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {deposits.map((deposit) => (
              <motion.div
                key={deposit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="bg-[#1a1a1a] border-white/10 hover:border-white/20 transition-all">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-xl font-bold text-white">{formatCurrency(deposit.amount)}</p>
                          {getStatusBadge(deposit.status)}
                          <Badge className="bg-blue-500/20 text-blue-400">{deposit.method.toUpperCase()}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Usuário:</span>
                            <p className="text-white">{deposit.user.name}</p>
                            <p className="text-gray-400 text-xs">{deposit.user.email}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Data:</span>
                            <p className="text-white">{formatDate(deposit.createdAt)}</p>
                          </div>
                        </div>

                        {deposit.txHash && (
                          <div className="flex items-center gap-2 mt-2">
                            <Hash className="w-3 h-3 text-amber-400" />
                            <code className="text-xs text-amber-400 font-mono truncate max-w-[200px]">{deposit.txHash}</code>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(deposit.txHash!)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                            {deposit.network && (
                              <Button variant="ghost" size="sm" className="h-5 p-0 text-xs" onClick={() => handleVerifyDeposit(deposit.id)}>
                                <ExternalLink className="w-3 h-3 mr-1" /> Verificar
                              </Button>
                            )}
                          </div>
                        )}

                        {deposit.adminNotes && (
                          <p className="text-xs text-gray-400 mt-2 bg-white/5 p-2 rounded">Nota: {deposit.adminNotes}</p>
                        )}
                      </div>

                      {deposit.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white"
                            onClick={() => handleApproveDeposit(deposit.id)}
                          >
                            <Check className="w-4 h-4 mr-1" /> Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => { setSelectedDeposit(deposit); setAdminNotes(""); setShowDepositModal(true); }}
                          >
                            <X className="w-4 h-4 mr-1" /> Rejeitar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  const renderWithdrawals = () => (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={withdrawalStatus} onValueChange={setWithdrawalStatus}>
          <SelectTrigger className="flex-1 bg-[#1a1a1a] border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="completed">Completos</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchWithdrawals}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {withdrawals.length === 0 ? (
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardContent className="py-12 text-center">
            <ArrowUpRight className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum saque encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {withdrawals.map((w) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-[#1a1a1a] border-white/10">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-xl font-bold text-white">{formatCurrency(w.amount)}</p>
                          {getStatusBadge(w.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Usuário:</span>
                            <p className="text-white">{w.user.name}</p>
                            <p className="text-gray-400 text-xs">{w.user.email}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Método:</span>
                            <p className="text-white">{w.method.toUpperCase()}</p>
                            <p className="text-gray-400 text-xs">Taxa: {formatCurrency(w.fee)}</p>
                          </div>
                        </div>

                        {w.pixKey && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">PIX:</span>
                            <code className="text-xs text-emerald-400">{w.pixKey}</code>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(w.pixKey!)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {w.address && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">Endereço:</span>
                            <code className="text-xs text-amber-400 truncate max-w-[200px]">{w.address}</code>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(w.address!)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {w.status === "pending" && (
                          <>
                            <Button size="sm" className="bg-emerald-500 text-white" onClick={() => handleApproveWithdrawal(w.id)}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => { setSelectedWithdrawal(w); setAdminNotes(""); setShowWithdrawalModal(true); }}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {w.status === "approved" && (
                          <Button size="sm" className="bg-blue-500 text-white" onClick={() => { setSelectedWithdrawal(w); setTxHashInput(""); setShowWithdrawalModal(true); }}>
                            <ArrowUpRight className="w-4 h-4 mr-1" /> Processar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  const renderMiners = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">{miners.length} Mineradoras</h3>
        <Button onClick={() => openMinerModal()} className="bg-amber-500 text-black">
          <Plus className="w-4 h-4 mr-2" /> Nova
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {miners.map((miner) => (
          <Card key={miner.id} className="bg-[#1a1a1a] border-white/10">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{miner.name}</p>
                    {getStatusBadge(miner.status)}
                  </div>
                  <p className="text-sm text-gray-400">{miner.model} • {miner.coin}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openMinerModal(miner)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-400" onClick={() => handleDeleteMiner(miner.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/5 p-2 rounded">
                  <p className="text-gray-500 text-xs">Hashrate</p>
                  <p className="text-white font-medium">{miner.hashRate} TH/s</p>
                </div>
                <div className="bg-white/5 p-2 rounded">
                  <p className="text-gray-500 text-xs">Consumo</p>
                  <p className="text-white font-medium">{miner.powerConsumption}W</p>
                </div>
                <div className="bg-white/5 p-2 rounded">
                  <p className="text-gray-500 text-xs">Receita/dia</p>
                  <p className="text-emerald-400 font-medium">{formatCurrency(miner.dailyRevenue)}</p>
                </div>
                <div className="bg-white/5 p-2 rounded">
                  <p className="text-gray-500 text-xs">Preço/dia</p>
                  <p className="text-amber-400 font-medium">{formatCurrency(miner.pricePerDay)}</p>
                </div>
              </div>

              <div className="flex justify-between mt-3 pt-3 border-t border-white/10 text-xs text-gray-400">
                <span>Aluguéis ativos: <span className="text-white">{miner.activeRentals}</span></span>
                <span>Receita total: <span className="text-emerald-400">{formatCurrency(miner.totalRevenue)}</span></span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderAffiliates = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">{affiliates.length} Afiliados</h3>
      </div>

      {/* Affiliate Levels */}
      {affiliateLevels.length > 0 && (
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Níveis de Comissão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {affiliateLevels.map((level) => (
                <Badge key={level.id} className="bg-amber-500/20 text-amber-400">
                  N{level.level}: {level.percentage}%
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {affiliates.map((affiliate) => (
          <Card key={affiliate.id} className="bg-[#1a1a1a] border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-semibold text-white">{affiliate.name}</p>
                {affiliate.hasInvested && <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Investiu</Badge>}
                {affiliate.linkUnlocked && <Badge className="bg-blue-500/20 text-blue-500 text-[10px]">Link Ativo</Badge>}
              </div>
              <p className="text-sm text-gray-400">{affiliate.email}</p>
              
              <div className="flex items-center gap-2 mt-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <code className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-sm">{affiliate.affiliateCode}</code>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(affiliate.affiliateCode)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-white/5 p-2 rounded">
                  <p className="text-gray-500 text-xs">Indicações Diretas</p>
                  <p className="text-white font-medium">{affiliate.stats.directReferrals}</p>
                </div>
                <div className="bg-white/5 p-2 rounded">
                  <p className="text-gray-500 text-xs">Total na Rede</p>
                  <p className="text-white font-medium">{affiliate.stats.totalReferrals}</p>
                </div>
                <div className="bg-white/5 p-2 rounded">
                  <p className="text-gray-500 text-xs">Comissões</p>
                  <p className="text-emerald-400 font-medium">{formatCurrency(affiliate.stats.totalCommissions)}</p>
                </div>
                <div className="bg-white/5 p-2 rounded">
                  <p className="text-gray-500 text-xs">Saldo</p>
                  <p className="text-amber-400 font-medium">{formatCurrency(affiliate.affiliateBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Configurações do Sistema</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleInitConfigs}>
            Inicializar Padrões
          </Button>
          <Button className="bg-amber-500 text-black" onClick={handleSaveConfigs}>
            <Save className="w-4 h-4 mr-2" /> Salvar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="bg-[#1a1a1a] border border-white/10">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="affiliate">Afiliados</TabsTrigger>
          <TabsTrigger value="withdrawal">Saques</TabsTrigger>
          <TabsTrigger value="mining">Mineração</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card className="bg-[#1a1a1a] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base">Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Modo de Manutenção</Label>
                  <p className="text-xs text-gray-400">Desabilita o acesso aos usuários</p>
                </div>
                <Switch
                  checked={configForm.maintenance_mode === "true"}
                  onCheckedChange={(checked) => setConfigForm({...configForm, maintenance_mode: checked.toString()})}
                />
              </div>
              <Separator className="bg-white/10" />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Permitir Registros</Label>
                  <p className="text-xs text-gray-400">Novos usuários podem se cadastrar</p>
                </div>
                <Switch
                  checked={configForm.allow_registration === "true" || configForm.allow_registration === undefined}
                  onCheckedChange={(checked) => setConfigForm({...configForm, allow_registration: checked.toString()})}
                />
              </div>
              <Separator className="bg-white/10" />
              <div className="space-y-2">
                <Label className="text-white">Depósito Mínimo (USDT)</Label>
                <Input
                  type="number"
                  value={configForm.min_deposit || "100"}
                  onChange={(e) => setConfigForm({...configForm, min_deposit: e.target.value})}
                  className="bg-[#0a0a0a] border-white/10 text-white"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="affiliate" className="space-y-4">
          <Card className="bg-[#1a1a1a] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Níveis de Comissão
              </CardTitle>
              <CardDescription>Porcentagem de comissão por nível na hierarquia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((level) => {
                  const levelData = levelForm.find(l => l.level === level) || { level, percentage: level === 1 ? 10 : level === 2 ? 5 : level === 3 ? 3 : level === 4 ? 2 : 1, isActive: true };
                  return (
                    <div key={level} className="flex items-center gap-4">
                      <Badge className="w-16 justify-center bg-amber-500/20 text-amber-400">Nível {level}</Badge>
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          type="number"
                          value={levelData.percentage}
                          onChange={(e) => {
                            const newLevels = [...levelForm];
                            const existingIndex = newLevels.findIndex(l => l.level === level);
                            if (existingIndex >= 0) {
                              newLevels[existingIndex] = { ...newLevels[existingIndex], percentage: parseFloat(e.target.value) || 0 };
                            } else {
                              newLevels.push({ id: '', level, percentage: parseFloat(e.target.value) || 0, isActive: true });
                            }
                            setLevelForm(newLevels);
                          }}
                          className="w-20 bg-[#0a0a0a] border-white/10 text-white"
                        />
                        <Percent className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base">Saque de Comissões</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Taxa de Saque (%)</Label>
                  <Input
                    type="number"
                    value={configForm.affiliate_withdrawal_fee || "5"}
                    onChange={(e) => setConfigForm({...configForm, affiliate_withdrawal_fee: e.target.value})}
                    className="bg-[#0a0a0a] border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Saque Mínimo (USDT)</Label>
                  <Input
                    type="number"
                    value={configForm.affiliate_min_withdrawal || "50"}
                    onChange={(e) => setConfigForm({...configForm, affiliate_min_withdrawal: e.target.value})}
                    className="bg-[#0a0a0a] border-white/10 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawal" className="space-y-4">
          <Card className="bg-[#1a1a1a] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base">Configurações de Saque</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Taxa de Saque (%)</Label>
                  <Input
                    type="number"
                    value={configForm.withdrawal_fee_percent || "2"}
                    onChange={(e) => setConfigForm({...configForm, withdrawal_fee_percent: e.target.value})}
                    className="bg-[#0a0a0a] border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Saque Mínimo (USDT)</Label>
                  <Input
                    type="number"
                    value={configForm.min_withdrawal || "50"}
                    onChange={(e) => setConfigForm({...configForm, min_withdrawal: e.target.value})}
                    className="bg-[#0a0a0a] border-white/10 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Tempo de Processamento (horas)</Label>
                <Input
                  type="number"
                  value={configForm.withdrawal_processing_time || "24"}
                  onChange={(e) => setConfigForm({...configForm, withdrawal_processing_time: e.target.value})}
                  className="bg-[#0a0a0a] border-white/10 text-white"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mining" className="space-y-4">
          <Card className="bg-[#1a1a1a] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base">Configurações de Mineração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Share do Usuário (%)</Label>
                <p className="text-xs text-gray-400">Porcentagem do lucro que vai para o usuário</p>
                <Input
                  type="number"
                  value={configForm.miner_profit_share || "70"}
                  onChange={(e) => setConfigForm({...configForm, miner_profit_share: e.target.value})}
                  className="bg-[#0a0a0a] border-white/10 text-white"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Logs de Auditoria</h3>
        <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum log encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="bg-[#1a1a1a] border-white/10">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn(
                        "text-[10px]",
                        log.action === 'create' && "bg-emerald-500/20 text-emerald-500",
                        log.action === 'update' && "bg-blue-500/20 text-blue-500",
                        log.action === 'delete' && "bg-red-500/20 text-red-500",
                        log.action === 'approve' && "bg-emerald-500/20 text-emerald-500",
                        log.action === 'reject' && "bg-red-500/20 text-red-500",
                        !['create', 'update', 'delete', 'approve', 'reject'].includes(log.action) && "bg-gray-500/20 text-gray-400"
                      )}>
                        {log.action.toUpperCase()}
                      </Badge>
                      <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">
                        {log.entity}
                      </Badge>
                    </div>
                    <p className="text-sm text-white mt-1">{log.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {log.admin && (
                        <span>Por: <span className="text-gray-300">{log.admin.name}</span></span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {logTotalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={logPage === 1} onClick={() => setLogPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="flex items-center text-sm text-gray-400">{logPage} / {logTotalPages}</span>
          <Button variant="ghost" size="sm" disabled={logPage === logTotalPages} onClick={() => setLogPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  // ===== MAIN RENDER =====
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {activeSection !== 'dashboard' && (
          <Button variant="ghost" size="sm" onClick={() => setActiveSection('dashboard')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            {activeSection === 'dashboard' && 'Painel Administrativo'}
            {activeSection === 'users' && 'Gerenciar Usuários'}
            {activeSection === 'deposits' && 'Aprovar Depósitos'}
            {activeSection === 'withdrawals' && 'Processar Saques'}
            {activeSection === 'miners' && 'Mineradoras'}
            {activeSection === 'affiliates' && 'Programa de Afiliados'}
            {activeSection === 'settings' && 'Configurações'}
            {activeSection === 'logs' && 'Logs de Auditoria'}
          </h2>
          <p className="text-sm text-gray-400">
            {activeSection === 'dashboard' && 'Visão geral da plataforma'}
            {activeSection === 'users' && `${users.length} usuários encontrados`}
            {activeSection === 'deposits' && `${deposits.filter(d => d.status === 'pending').length} pendentes`}
            {activeSection === 'withdrawals' && `${withdrawals.filter(w => w.status === 'pending').length} pendentes`}
          </p>
        </div>
      </div>

      {/* Content */}
      {loading && activeSection === 'dashboard' ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <>
          {activeSection === 'dashboard' && renderDashboard()}
          {activeSection === 'users' && renderUsers()}
          {activeSection === 'deposits' && renderDeposits()}
          {activeSection === 'withdrawals' && renderWithdrawals()}
          {activeSection === 'miners' && renderMiners()}
          {activeSection === 'affiliates' && renderAffiliates()}
          {activeSection === 'settings' && renderSettings()}
          {activeSection === 'logs' && renderLogs()}
        </>
      )}

      {/* User Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Nome</Label>
                <Input value={userForm.name} onChange={(e) => setUserForm({...userForm, name: e.target.value})} className="bg-[#0a0a0a] border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Email</Label>
                <Input value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} className="bg-[#0a0a0a] border-white/10 text-white" />
              </div>
            </div>
            
            {!editingUser && (
              <div className="space-y-2">
                <Label className="text-gray-300">Senha</Label>
                <Input type="password" value={userForm.password} onChange={(e) => setUserForm({...userForm, password: e.target.value})} className="bg-[#0a0a0a] border-white/10 text-white" />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Função</Label>
                <Select value={userForm.role} onValueChange={(v) => setUserForm({...userForm, role: v})}>
                  <SelectTrigger className="bg-[#0a0a0a] border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Saldo (USDT)</Label>
                <Input type="number" value={userForm.balance} onChange={(e) => setUserForm({...userForm, balance: parseFloat(e.target.value) || 0})} className="bg-[#0a0a0a] border-white/10 text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Saldo Afiliado (USDT)</Label>
                <Input type="number" value={userForm.affiliateBalance} onChange={(e) => setUserForm({...userForm, affiliateBalance: parseFloat(e.target.value) || 0})} className="bg-[#0a0a0a] border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Chave PIX</Label>
                <Input value={userForm.pixKey} onChange={(e) => setUserForm({...userForm, pixKey: e.target.value})} className="bg-[#0a0a0a] border-white/10 text-white" placeholder="Opcional" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Carteira USDT</Label>
              <Input value={userForm.walletAddress} onChange={(e) => setUserForm({...userForm, walletAddress: e.target.value})} className="bg-[#0a0a0a] border-white/10 text-white" placeholder="Endereço TRC20 ou Polygon" />
            </div>

            {editingUser && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Já Investiu</Label>
                    <p className="text-xs text-gray-400">Fez primeiro depósito</p>
                  </div>
                  <Switch checked={userForm.hasInvested} onCheckedChange={(v) => setUserForm({...userForm, hasInvested: v})} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Link Desbloqueado</Label>
                    <p className="text-xs text-gray-400">Pode indicar afiliados</p>
                  </div>
                  <Switch checked={userForm.linkUnlocked} onCheckedChange={(v) => setUserForm({...userForm, linkUnlocked: v})} />
                </div>
              </div>
            )}

            <Button onClick={handleSaveUser} className="w-full bg-amber-500 hover:bg-amber-600 text-black">
              {editingUser ? 'Atualizar Usuário' : 'Criar Usuário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Miner Modal */}
      <Dialog open={showMinerModal} onOpenChange={setShowMinerModal}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingMiner ? 'Editar Mineradora' : 'Nova Mineradora'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Nome</Label>
                <Input value={minerForm.name} onChange={(e) => setMinerForm({...minerForm, name: e.target.value})} className="bg-[#0a0a0a] border-white/10 text-white" placeholder="Antminer S19 Pro" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Modelo</Label>
                <Input value={minerForm.model} onChange={(e) => setMinerForm({...minerForm, model: e.target.value})} className="bg-[#0a0a0a] border-white/10 text-white" placeholder="S19 Pro" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Hashrate (TH/s)</Label>
                <Input type="number" value={minerForm.hashRate} onChange={(e) => setMinerForm({...minerForm, hashRate: parseFloat(e.target.value) || 0})} className="bg-[#0a0a0a] border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Consumo (W)</Label>
                <Input type="number" value={minerForm.powerConsumption} onChange={(e) => setMinerForm({...minerForm, powerConsumption: parseFloat(e.target.value) || 0})} className="bg-[#0a0a0a] border-white/10 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Moeda</Label>
                <Select value={minerForm.coin} onValueChange={(v) => setMinerForm({...minerForm, coin: v})}>
                  <SelectTrigger className="bg-[#0a0a0a] border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC">BTC</SelectItem>
                    <SelectItem value="KAS">KAS</SelectItem>
                    <SelectItem value="LTC">LTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Pool</Label>
                <Input value={minerForm.pool} onChange={(e) => setMinerForm({...minerForm, pool: e.target.value})} className="bg-[#0a0a0a] border-white/10 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Receita/dia (USDT)</Label>
                <Input type="number" value={minerForm.dailyRevenue} onChange={(e) => setMinerForm({...minerForm, dailyRevenue: parseFloat(e.target.value) || 0})} className="bg-[#0a0a0a] border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Preço/dia (USDT)</Label>
                <Input type="number" value={minerForm.pricePerDay} onChange={(e) => setMinerForm({...minerForm, pricePerDay: parseFloat(e.target.value) || 0})} className="bg-[#0a0a0a] border-white/10 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Status</Label>
              <Select value={minerForm.status} onValueChange={(v) => setMinerForm({...minerForm, status: v})}>
                <SelectTrigger className="bg-[#0a0a0a] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Descrição</Label>
              <Textarea value={minerForm.description} onChange={(e) => setMinerForm({...minerForm, description: e.target.value})} className="bg-[#0a0a0a] border-white/10 text-white" rows={3} />
            </div>
            <Button onClick={handleSaveMiner} className="w-full bg-amber-500 hover:bg-amber-600 text-black">
              {editingMiner ? 'Atualizar Mineradora' : 'Criar Mineradora'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Modal */}
      <Dialog open={showWithdrawalModal} onOpenChange={setShowWithdrawalModal}>
        <DialogContent className="bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Processar Saque</DialogTitle>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4 py-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <p className="text-sm text-gray-400">Valor</p>
                <p className="text-xl font-bold text-white">{formatCurrency(selectedWithdrawal.amount)}</p>
                <p className="text-sm text-gray-400 mt-2">Usuário: {selectedWithdrawal.user.name}</p>
                <p className="text-xs text-gray-500">{selectedWithdrawal.user.email}</p>
                {selectedWithdrawal.pixKey && <p className="text-xs text-emerald-400 mt-2">PIX: {selectedWithdrawal.pixKey}</p>}
                {selectedWithdrawal.address && <p className="text-xs text-amber-400 mt-2">Endereço: {selectedWithdrawal.address}</p>}
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300">Notas do Admin</Label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="bg-[#0a0a0a] border-white/10 text-white" rows={2} />
              </div>
              
              {selectedWithdrawal.status === "pending" && (
                <div className="flex gap-2">
                  <Button className="flex-1 bg-emerald-500 text-white" onClick={() => handleApproveWithdrawal(selectedWithdrawal.id)}>
                    Aprovar
                  </Button>
                  <Button className="flex-1" variant="destructive" onClick={() => handleRejectWithdrawal(selectedWithdrawal.id)}>
                    Rejeitar
                  </Button>
                </div>
              )}
              
              {selectedWithdrawal.status === "approved" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-gray-300">TX Hash (opcional)</Label>
                    <Input value={txHashInput} onChange={(e) => setTxHashInput(e.target.value)} className="bg-[#0a0a0a] border-white/10 text-white" placeholder="Hash da transação" />
                  </div>
                  <Button className="w-full bg-blue-500 text-white" onClick={() => handleCompleteWithdrawal(selectedWithdrawal.id)}>
                    <Check className="w-4 h-4 mr-2" /> Marcar como Pago
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deposit Modal (for rejection with notes) */}
      <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
        <DialogContent className="bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Rejeitar Depósito</DialogTitle>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4 py-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <p className="text-sm text-gray-400">Valor</p>
                <p className="text-xl font-bold text-white">{formatCurrency(selectedDeposit.amount)}</p>
                <p className="text-sm text-gray-400 mt-2">Usuário: {selectedDeposit.user.name}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300">Motivo da Rejeição</Label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="bg-[#0a0a0a] border-white/10 text-white" rows={2} placeholder="Explique o motivo..." />
              </div>
              
              <Button className="w-full" variant="destructive" onClick={() => handleRejectDeposit(selectedDeposit.id)}>
                <X className="w-4 h-4 mr-2" /> Confirmar Rejeição
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
