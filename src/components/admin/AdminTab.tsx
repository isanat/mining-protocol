"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, Wallet, ArrowDownLeft, ArrowUpRight, Server, Settings,
  TrendingUp, Check, X, Search, ChevronLeft,
  Plus, Edit, Trash2, RefreshCw,
  Crown, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AdminSection = 'dashboard' | 'users' | 'deposits' | 'withdrawals' | 'miners' | 'affiliates';

interface AdminStats {
  users: { total: number; active: number; newToday: number; withAffiliateLink: number };
  financial: { totalInvestedUsdt: number; totalBalanceUsdt: number; totalCommissionsPaidUsdt: number; };
  withdrawals: { pending: number; pendingAmountUsdt: number; };
  mining: { totalMiners: number; onlineMiners: number; activeRentals: number; };
  deposits: { pending: number; investedTodayUsdt: number; };
}

interface AdminUser {
  id: string; name: string; email: string; role: string; balance: number; balanceBrl: number;
  totalInvested: number; totalMined: number; affiliateBalance: number; totalAffiliateEarnings: number;
  hasInvested: boolean; affiliateCode: string | null; referredByName: string | null; totalReferrals: number; createdAt: string;
}

interface Deposit {
  id: string; userId: string; amount: number; amountBrl: number; method: string; network: string | null;
  txHash: string | null; status: string; createdAt: string;
  user: { id: string; name: string; email: string; };
}

interface Withdrawal {
  id: string; userId: string; amount: number; amountBrl: number; netAmount: number; method: string;
  status: string; createdAt: string;
  user: { id: string; name: string; email: string; pixKey: string | null; walletAddress: string | null; };
}

interface AdminMiner {
  id: string; name: string; model: string; hashRate: number; powerConsumption: number;
  coin: string; pool: string; dailyRevenue: number; pricePerDay: number; efficiency: number;
  status: string; description: string | null; activeRentals: number; totalRentals: number; totalRevenue: number;
}

interface Affiliate {
  id: string; name: string; email: string; affiliateCode: string; affiliateBalance: number;
  totalAffiliateEarnings: number; hasInvested: boolean; linkUnlocked: boolean; createdAt: string;
  stats: { directReferrals: number; totalReferrals: number; totalCommissions: number; paidCommissions: number; totalWithdrawals: number; };
}

export function AdminTab() {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [miners, setMiners] = useState<AdminMiner[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);

  const [userSearch, setUserSearch] = useState("");
  const [depositStatus, setDepositStatus] = useState("pending");
  const [withdrawalStatus, setWithdrawalStatus] = useState("pending");

  const [showUserModal, setShowUserModal] = useState(false);
  const [showMinerModal, setShowMinerModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editingMiner, setEditingMiner] = useState<AdminMiner | null>(null);

  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "user", balance: 0 });
  const [minerForm, setMinerForm] = useState({
    name: "", model: "", hashRate: 0, powerConsumption: 0, coin: "BTC",
    pool: "Binance Pool", dailyRevenue: 0, pricePerDay: 0, efficiency: 0, description: "", status: "online"
  });

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({ page: "1", limit: "20", search: userSearch });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchDeposits = async () => {
    try {
      const params = new URLSearchParams({ status: depositStatus, limit: "50" });
      const res = await fetch(`/api/admin/deposits?${params}`);
      const data = await res.json();
      setDeposits(data.deposits || []);
    } catch (error) {
      console.error("Error fetching deposits:", error);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const params = new URLSearchParams({ status: withdrawalStatus, limit: "50" });
      const res = await fetch(`/api/admin/withdrawals?${params}`);
      const data = await res.json();
      if (data.success) setWithdrawals(data.withdrawals);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
    }
  };

  const fetchMiners = async () => {
    try {
      const res = await fetch("/api/admin/miners");
      const data = await res.json();
      if (data.success) setMiners(data.miners);
    } catch (error) {
      console.error("Error fetching miners:", error);
    }
  };

  const fetchAffiliates = async () => {
    try {
      const res = await fetch("/api/admin/affiliates");
      const data = await res.json();
      if (data.success) setAffiliates(data.affiliates);
    } catch (error) {
      console.error("Error fetching affiliates:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (activeSection === 'users') fetchUsers();
    else if (activeSection === 'deposits') fetchDeposits();
    else if (activeSection === 'withdrawals') fetchWithdrawals();
    else if (activeSection === 'miners') fetchMiners();
    else if (activeSection === 'affiliates') fetchAffiliates();
  }, [activeSection, userSearch, depositStatus, withdrawalStatus]);

  const handleApproveDeposit = async (depositId: string) => {
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId, action: "approve" })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Depósito aprovado!");
        fetchDeposits(); fetchStats();
      } else toast.error(data.error || "Erro");
    } catch { toast.error("Erro"); }
  };

  const handleRejectDeposit = async (depositId: string) => {
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId, action: "reject" })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Depósito rejeitado");
        fetchDeposits(); fetchStats();
      } else toast.error(data.error || "Erro");
    } catch { toast.error("Erro"); }
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, action: "approve" })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Saque aprovado!");
        fetchWithdrawals(); fetchStats();
      } else toast.error(data.error || "Erro");
    } catch { toast.error("Erro"); }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, action: "reject" })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Saque rejeitado");
        fetchWithdrawals(); fetchStats();
      } else toast.error(data.error || "Erro");
    } catch { toast.error("Erro"); }
  };

  const handleCompleteWithdrawal = async (withdrawalId: string) => {
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, action: "process" })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Saque processado!");
        fetchWithdrawals(); fetchStats();
      } else toast.error(data.error || "Erro");
    } catch { toast.error("Erro"); }
  };

  const handleSaveUser = async () => {
    try {
      const method = editingUser ? "PUT" : "POST";
      const body = editingUser ? { id: editingUser.id, ...userForm } : userForm;
      const res = await fetch("/api/admin/users", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingUser ? "Usuário atualizado!" : "Usuário criado!");
        setShowUserModal(false); setEditingUser(null);
        setUserForm({ name: "", email: "", password: "", role: "user", balance: 0 });
        fetchUsers();
      } else toast.error(data.error || "Erro");
    } catch { toast.error("Erro"); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Excluir este usuário?")) return;
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("Excluído!"); fetchUsers(); }
      else toast.error(data.error || "Erro");
    } catch { toast.error("Erro"); }
  };

  const handleSaveMiner = async () => {
    try {
      const method = editingMiner ? "PUT" : "POST";
      const body = editingMiner ? { id: editingMiner.id, ...minerForm } : minerForm;
      const res = await fetch("/api/admin/miners", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingMiner ? "Mineradora atualizada!" : "Mineradora criada!");
        setShowMinerModal(false); setEditingMiner(null);
        setMinerForm({ name: "", model: "", hashRate: 0, powerConsumption: 0, coin: "BTC", pool: "Binance Pool", dailyRevenue: 0, pricePerDay: 0, efficiency: 0, description: "", status: "online" });
        fetchMiners();
      } else toast.error(data.error || "Erro");
    } catch { toast.error("Erro"); }
  };

  const handleDeleteMiner = async (minerId: string) => {
    if (!confirm("Excluir esta mineradora?")) return;
    try {
      const res = await fetch(`/api/admin/miners?id=${minerId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("Excluída!"); fetchMiners(); }
      else toast.error(data.error || "Erro");
    } catch { toast.error("Erro"); }
  };

  const statsCards = [
    { title: "Usuários", value: stats?.users.total || 0, sub: `${stats?.users.newToday || 0} hoje`, icon: Users, color: "from-blue-500 to-cyan-500" },
    { title: "Depósitos Pendentes", value: stats?.deposits.pending || 0, sub: "aguardando", icon: Wallet, color: "from-amber-500 to-orange-500" },
    { title: "Saques Pendentes", value: stats?.withdrawals.pending || 0, sub: `$${stats?.withdrawals.pendingAmountUsdt || 0}`, icon: ArrowDownLeft, color: "from-red-500 to-rose-500" },
    { title: "Total Investido", value: `$${(stats?.financial.totalInvestedUsdt || 0).toLocaleString()}`, sub: "USDT", icon: TrendingUp, color: "from-emerald-500 to-green-500" },
    { title: "Mineradoras", value: stats?.mining.totalMiners || 0, sub: `${stats?.mining.onlineMiners || 0} online`, icon: Server, color: "from-purple-500 to-pink-500" },
    { title: "Aluguéis Ativos", value: stats?.mining.activeRentals || 0, sub: "em andamento", icon: Activity, color: "from-teal-500 to-cyan-500" },
  ];

  const renderDashboard = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statsCards.map((card, i) => (
          <Card key={i} className="mobile-card cursor-pointer hover:border-white/20">
            <CardContent className="p-4">
              <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-r flex items-center justify-center mb-3", card.color)}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-gray-400">{card.title}</p>
              <p className="text-lg font-bold text-white">{card.value}</p>
              <p className="text-[10px] text-gray-500">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mobile-card">
        <CardHeader className="pb-2"><CardTitle className="text-white text-base">Ações</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[{id:'users',label:'Usuários',icon:Users},{id:'deposits',label:'Depósitos',icon:Wallet},{id:'withdrawals',label:'Saques',icon:ArrowDownLeft},{id:'miners',label:'Mineradoras',icon:Server}].map(item => (
            <Button key={item.id} onClick={() => setActiveSection(item.id as AdminSection)} className="w-full justify-start bg-white/5 hover:bg-white/10 text-white">
              <item.icon className="w-4 h-4 mr-3" />{item.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-10 mobile-input" />
        </div>
        <Button onClick={() => { setEditingUser(null); setUserForm({ name: "", email: "", password: "", role: "user", balance: 0 }); setShowUserModal(true); }} className="bg-amber-500 text-black"><Plus className="w-4 h-4" /></Button>
      </div>
      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id} className="mobile-card">
            <CardContent className="p-4">
              <div className="flex justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{u.name}</p>
                    {u.role === "admin" && <Badge className="bg-amber-500/20 text-amber-500 text-[10px]">Admin</Badge>}
                  </div>
                  <p className="text-sm text-gray-400">{u.email}</p>
                  <p className="text-xs text-gray-500">Saldo: ${u.balance.toFixed(2)} • Investido: ${u.totalInvested.toFixed(2)}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditingUser(u); setUserForm({ name: u.name, email: u.email, password: "", role: u.role, balance: u.balance }); setShowUserModal(true); }}><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleDeleteUser(u.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderDeposits = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={depositStatus} onValueChange={setDepositStatus}>
          <SelectTrigger className="flex-1 mobile-input"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="confirmed">Confirmados</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchDeposits} variant="outline" size="icon"><RefreshCw className="w-4 h-4" /></Button>
      </div>
      {deposits.length === 0 ? (
        <Card className="mobile-card"><CardContent className="py-8 text-center"><Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" /><p className="text-gray-400">Nenhum depósito</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {deposits.map((d) => (
            <Card key={d.id} className="mobile-card">
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">${d.amount.toFixed(2)} USDT</p>
                      <Badge className={d.status === "confirmed" ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"}>{d.status === "confirmed" ? "Confirmado" : "Pendente"}</Badge>
                    </div>
                    <p className="text-sm text-gray-400">{d.user.name} • {d.user.email}</p>
                    <p className="text-xs text-gray-500">{d.method.toUpperCase()} • {new Date(d.createdAt).toLocaleDateString()}</p>
                    {d.txHash && <p className="text-[10px] text-amber-400 font-mono truncate">{d.txHash.slice(0, 20)}...</p>}
                  </div>
                  {d.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" className="bg-emerald-500 text-white" onClick={() => handleApproveDeposit(d.id)}><Check className="w-4 h-4" /></Button>
                      <Button size="sm" className="bg-red-500 text-white" onClick={() => handleRejectDeposit(d.id)}><X className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderWithdrawals = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={withdrawalStatus} onValueChange={setWithdrawalStatus}>
          <SelectTrigger className="flex-1 mobile-input"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchWithdrawals} variant="outline" size="icon"><RefreshCw className="w-4 h-4" /></Button>
      </div>
      {withdrawals.length === 0 ? (
        <Card className="mobile-card"><CardContent className="py-8 text-center"><ArrowDownLeft className="w-12 h-12 text-gray-600 mx-auto mb-3" /><p className="text-gray-400">Nenhum saque</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {withdrawals.map((w) => (
            <Card key={w.id} className="mobile-card">
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">${w.amount.toFixed(2)} USDT</p>
                      <Badge className={w.status === "completed" ? "bg-emerald-500/20 text-emerald-500" : w.status === "approved" ? "bg-blue-500/20 text-blue-500" : "bg-amber-500/20 text-amber-500"}>
                        {w.status === "completed" ? "Completo" : w.status === "approved" ? "Aprovado" : "Pendente"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">{w.user.name} • {w.user.email}</p>
                    {w.user.pixKey && <p className="text-[10px] text-gray-400">PIX: {w.user.pixKey}</p>}
                  </div>
                  {w.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" className="bg-emerald-500 text-white" onClick={() => handleApproveWithdrawal(w.id)}><Check className="w-4 h-4" /></Button>
                      <Button size="sm" className="bg-red-500 text-white" onClick={() => handleRejectWithdrawal(w.id)}><X className="w-4 h-4" /></Button>
                    </div>
                  )}
                  {w.status === "approved" && (
                    <Button size="sm" className="bg-blue-500 text-white" onClick={() => handleCompleteWithdrawal(w.id)}><ArrowUpRight className="w-4 h-4 mr-1" />Pago</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderMiners = () => (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-semibold text-white">Mineradoras ({miners.length})</h3>
        <Button onClick={() => { setEditingMiner(null); setMinerForm({ name: "", model: "", hashRate: 0, powerConsumption: 0, coin: "BTC", pool: "Binance Pool", dailyRevenue: 0, pricePerDay: 0, efficiency: 0, description: "", status: "online" }); setShowMinerModal(true); }} className="bg-amber-500 text-black"><Plus className="w-4 h-4 mr-2" />Nova</Button>
      </div>
      <div className="space-y-2">
        {miners.map((m) => (
          <Card key={m.id} className="mobile-card">
            <CardContent className="p-4">
              <div className="flex justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{m.name}</p>
                    <Badge className={m.status === "online" ? "bg-emerald-500/20 text-emerald-500" : "bg-gray-500/20 text-gray-400"}>{m.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-400">{m.model} • {m.coin}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div><span className="text-gray-500">Hash:</span> <span className="text-white">{m.hashRate} TH/s</span></div>
                    <div><span className="text-gray-500">Preço:</span> <span className="text-white">${m.pricePerDay}/dia</span></div>
                    <div><span className="text-gray-500">Revenue:</span> <span className="text-emerald-400">${m.dailyRevenue}/dia</span></div>
                    <div><span className="text-gray-500">Ativos:</span> <span className="text-white">{m.activeRentals}</span></div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditingMiner(m); setMinerForm({ name: m.name, model: m.model, hashRate: m.hashRate, powerConsumption: m.powerConsumption, coin: m.coin, pool: m.pool, dailyRevenue: m.dailyRevenue, pricePerDay: m.pricePerDay, efficiency: m.efficiency, description: m.description || "", status: m.status }); setShowMinerModal(true); }}><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleDeleteMiner(m.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderAffiliates = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Afiliados ({affiliates.length})</h3>
      <div className="space-y-2">
        {affiliates.map((a) => (
          <Card key={a.id} className="mobile-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">{a.name}</p>
                {a.hasInvested && <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Investiu</Badge>}
              </div>
              <p className="text-sm text-gray-400">{a.email}</p>
              <p className="text-xs text-amber-400 font-mono">Código: {a.affiliateCode}</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div><span className="text-gray-500">Indicações:</span> <span className="text-white">{a.stats.directReferrals} diretas, {a.stats.totalReferrals} total</span></div>
                <div><span className="text-gray-500">Comissões:</span> <span className="text-emerald-400">${a.stats.totalCommissions.toFixed(2)}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center gap-3">
        {activeSection !== 'dashboard' && <Button variant="ghost" size="sm" onClick={() => setActiveSection('dashboard')}><ChevronLeft className="w-4 h-4" /></Button>}
        <div>
          <h2 className="text-xl font-bold text-white">
            {activeSection === 'dashboard' ? 'Painel Admin' : activeSection === 'users' ? 'Usuários' : activeSection === 'deposits' ? 'Depósitos' : activeSection === 'withdrawals' ? 'Saques' : activeSection === 'miners' ? 'Mineradoras' : 'Afiliados'}
          </h2>
          <p className="text-sm text-gray-400">Administração da plataforma</p>
        </div>
      </div>

      {loading && activeSection === 'dashboard' ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 text-amber-500 animate-spin" /></div>
      ) : (
        <>
          {activeSection === 'dashboard' && renderDashboard()}
          {activeSection === 'users' && renderUsers()}
          {activeSection === 'deposits' && renderDeposits()}
          {activeSection === 'withdrawals' && renderWithdrawals()}
          {activeSection === 'miners' && renderMiners()}
          {activeSection === 'affiliates' && renderAffiliates()}
        </>
      )}

      {/* User Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="bg-[#1a1a1a] border-white/10">
          <DialogHeader><DialogTitle className="text-white">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-gray-300">Nome</Label><Input value={userForm.name} onChange={(e) => setUserForm({...userForm, name: e.target.value})} className="mobile-input" /></div>
            <div className="space-y-2"><Label className="text-gray-300">Email</Label><Input value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} className="mobile-input" /></div>
            {!editingUser && <div className="space-y-2"><Label className="text-gray-300">Senha</Label><Input type="password" value={userForm.password} onChange={(e) => setUserForm({...userForm, password: e.target.value})} className="mobile-input" /></div>}
            <div className="space-y-2"><Label className="text-gray-300">Função</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm({...userForm, role: v})}>
                <SelectTrigger className="mobile-input"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="user">Usuário</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-gray-300">Saldo (USDT)</Label><Input type="number" value={userForm.balance} onChange={(e) => setUserForm({...userForm, balance: parseFloat(e.target.value) || 0})} className="mobile-input" /></div>
            <Button onClick={handleSaveUser} className="w-full bg-amber-500 text-black">{editingUser ? 'Atualizar' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Miner Modal */}
      <Dialog open={showMinerModal} onOpenChange={setShowMinerModal}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white">{editingMiner ? 'Editar Mineradora' : 'Nova Mineradora'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-gray-300">Nome</Label><Input value={minerForm.name} onChange={(e) => setMinerForm({...minerForm, name: e.target.value})} className="mobile-input" /></div>
              <div className="space-y-2"><Label className="text-gray-300">Modelo</Label><Input value={minerForm.model} onChange={(e) => setMinerForm({...minerForm, model: e.target.value})} className="mobile-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-gray-300">Hashrate (TH/s)</Label><Input type="number" value={minerForm.hashRate} onChange={(e) => setMinerForm({...minerForm, hashRate: parseFloat(e.target.value) || 0})} className="mobile-input" /></div>
              <div className="space-y-2"><Label className="text-gray-300">Consumo (W)</Label><Input type="number" value={minerForm.powerConsumption} onChange={(e) => setMinerForm({...minerForm, powerConsumption: parseFloat(e.target.value) || 0})} className="mobile-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-gray-300">Moeda</Label><Input value={minerForm.coin} onChange={(e) => setMinerForm({...minerForm, coin: e.target.value})} className="mobile-input" /></div>
              <div className="space-y-2"><Label className="text-gray-300">Pool</Label><Input value={minerForm.pool} onChange={(e) => setMinerForm({...minerForm, pool: e.target.value})} className="mobile-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-gray-300">Receita/dia (USDT)</Label><Input type="number" value={minerForm.dailyRevenue} onChange={(e) => setMinerForm({...minerForm, dailyRevenue: parseFloat(e.target.value) || 0})} className="mobile-input" /></div>
              <div className="space-y-2"><Label className="text-gray-300">Preço/dia (USDT)</Label><Input type="number" value={minerForm.pricePerDay} onChange={(e) => setMinerForm({...minerForm, pricePerDay: parseFloat(e.target.value) || 0})} className="mobile-input" /></div>
            </div>
            <div className="space-y-2"><Label className="text-gray-300">Status</Label>
              <Select value={minerForm.status} onValueChange={(v) => setMinerForm({...minerForm, status: v})}>
                <SelectTrigger className="mobile-input"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="online">Online</SelectItem><SelectItem value="offline">Offline</SelectItem><SelectItem value="maintenance">Manutenção</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveMiner} className="w-full bg-amber-500 text-black">{editingMiner ? 'Atualizar' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
