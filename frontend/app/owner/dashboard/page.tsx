"use client";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Car,
  CalendarCheck,
  DollarSign,
  PlusCircle,
  Bell,
  Menu,
  Package,
  Luggage,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  MapPin,
  User,
  TrendingUp,
  TrendingDown,
  Calendar,
  Star,
  BarChart3,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Fuel,
  Users,
  Shield,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardStats {
  total_vehicles: number;
  available_vehicles: number;
  rented_vehicles: number;
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  total_earnings: number;
  revenue_this_month: number;
  revenue_last_month: number;
  bookings_this_month: number;
  avg_rating: number;
  total_service_requests: number;
  pending_service_requests: number;
  occupation_rate: number;
}

interface RevenuePoint {
  month: string;
  revenue: number;
  bookings: number;
}

interface TopVehicle {
  id: number;
  brand: string;
  model: string;
  year: number;
  price_per_day: number;
  city: string;
  status: string;
  average_rating: number;
  image_url: string | null;
}

interface RecentBooking {
  id: number;
  client_name: string;
  vehicle_name: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  nb_days: number;
}

interface ServiceRequest {
  id: number;
  service_type: string;
  status: string;
  pickup_date: string;
  pickup_city: string;
  delivery_city: string;
  estimated_price: number | null;
  client_name: string | null;
  client_notes: string | null;
}

interface UserOwner {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: { name: string };
  owner_services: { service_type: string; is_active: boolean }[];
  is_agency: boolean;
  agency_name: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("fr-MA").format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function pctChange(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

const STATUS_CFG: Record<string, { label: string; cls: string; dot: string }> =
  {
    pending: {
      label: "En attente",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-400",
    },
    confirmed: {
      label: "Confirmée",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-400",
    },
    completed: {
      label: "Terminée",
      cls: "bg-green-50 text-green-700 border-green-200",
      dot: "bg-green-500",
    },
    rejected: {
      label: "Refusée",
      cls: "bg-red-50 text-red-700 border-red-200",
      dot: "bg-red-400",
    },
    cancelled: {
      label: "Annulée",
      cls: "bg-gray-50 text-gray-600 border-gray-200",
      dot: "bg-gray-400",
    },
  };

const SVC_CFG: Record<string, { label: string; icon: any; color: string }> = {
  transport_bagages: { label: "Bagages", icon: Luggage, color: "teal" },
  livraison_colis: { label: "Livraison", icon: Package, color: "orange" },
  demenagement: { label: "Déménage.", icon: Truck, color: "rose" },
};

// ── Mini Bar Chart ─────────────────────────────────────────────────────────────

function MiniBarChart({
  data,
  height = 80,
}: {
  data: RevenuePoint[];
  height?: number;
}) {
  if (!data.length) return null;
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const pct = (d.revenue / maxRev) * 100;
        const isLast = i === data.length - 1;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 group relative"
          >
            {/* Tooltip */}
            <div
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 
                            bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5
                            opacity-0 group-hover:opacity-100 transition-opacity
                            pointer-events-none whitespace-nowrap z-10 shadow-lg"
            >
              <p className="font-semibold">{fmt(d.revenue)} MAD</p>
              <p className="text-gray-400">{d.bookings} rés.</p>
            </div>
            <div
              className={`w-full rounded-t-md transition-all duration-500 ${
                isLast
                  ? "bg-gradient-to-t from-blue-600 to-blue-400"
                  : "bg-gradient-to-t from-gray-200 to-gray-100 group-hover:from-blue-200 group-hover:to-blue-100"
              }`}
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            <span className="text-xs text-gray-400 hidden sm:block truncate w-full text-center">
              {d.month.split(" ")[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Sparkline ──────────────────────────────────────────────────────────────────

function Sparkline({
  values,
  color = "#3B82F6",
}: {
  values: number[];
  color?: string;
}) {
  if (values.length < 2) return null;
  const w = 80,
    h = 32;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;

  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  trendLabel,
  sparkline,
  prefix = "",
  suffix = "",
  highlight = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  trend?: number;
  trendLabel?: string;
  sparkline?: number[];
  prefix?: string;
  suffix?: string;
  highlight?: boolean;
}) {
  const isUp = (trend ?? 0) >= 0;
  const TIcon = isUp ? TrendingUp : TrendingDown;
  const tColor = isUp ? "text-emerald-600" : "text-red-500";

  return (
    <div
      className={`relative bg-white rounded-2xl p-5 border transition-all duration-200
                     hover:shadow-lg hover:-translate-y-0.5 overflow-hidden
                     ${highlight ? "border-blue-200 ring-1 ring-blue-100" : "border-gray-100"}`}
    >
      {highlight && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent pointer-events-none" />
      )}

      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {sparkline && (
          <Sparkline values={sparkline} color={isUp ? "#10B981" : "#EF4444"} />
        )}
      </div>

      <p className="text-sm text-gray-500 mb-1 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-800 leading-none">
        {prefix}
        {typeof value === "number" ? fmt(value) : value}
        {suffix}
      </p>

      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}

      {trend !== undefined && (
        <div
          className={`flex items-center gap-1 mt-3 text-xs font-medium ${tColor}`}
        >
          <TIcon className="w-3.5 h-3.5" />
          <span>
            {isUp ? "+" : ""}
            {trend}%
          </span>
          {trendLabel && (
            <span className="text-gray-400 font-normal">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Occupation Ring ────────────────────────────────────────────────────────────

function OccupationRing({
  rate,
  available,
  rented,
  total,
}: {
  rate: number;
  available: number;
  rented: number;
  total: number;
}) {
  const R = 36;
  const circumference = 2 * Math.PI * R;
  const strokeDash = (rate / 100) * circumference;

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-24 h-24 shrink-0">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="8"
          />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="8"
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-800">{rate}%</span>
          <span className="text-xs text-gray-400">occupé</span>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-500">Loués</span>
          </div>
          <span className="text-sm font-semibold text-gray-700">{rented}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-200" />
            <span className="text-xs text-gray-500">Disponibles</span>
          </div>
          <span className="text-sm font-semibold text-gray-700">
            {available}
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-gray-100 pt-2">
          <span className="text-xs text-gray-400">Total flotte</span>
          <span className="text-sm font-bold text-gray-800">{total}</span>
        </div>
      </div>
    </div>
  );
}

// ── Véhicule Top Card ──────────────────────────────────────────────────────────

function VehicleTopCard({ v, rank }: { v: TopVehicle; rank: number }) {
  const statusCls =
    v.status === "available"
      ? "text-emerald-600 bg-emerald-50"
      : "text-blue-600 bg-blue-50";
  const statusLabel = v.status === "available" ? "Disponible" : "Loué";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 group">
      <span
        className={`text-sm font-bold w-6 text-center shrink-0 ${
          rank === 1
            ? "text-amber-500"
            : rank === 2
              ? "text-gray-400"
              : "text-gray-300"
        }`}
      >
        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
      </span>

      <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shrink-0">
        {v.image_url ? (
          <img
            src={v.image_url}
            alt={v.model}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {v.brand} {v.model}
        </p>
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5" />
          {v.city} · {v.year}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-gray-800">
          {fmt(v.price_per_day)} MAD
        </p>
        <div className="flex items-center gap-1 justify-end mt-0.5">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs text-gray-600">
            {(v.average_rating || 0).toFixed(1)}
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ml-1 ${statusCls}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Booking Row ────────────────────────────────────────────────────────────────

function BookingRow({ b }: { b: RecentBooking }) {
  const st = STATUS_CFG[b.status] ?? STATUS_CFG.pending;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 group hover:bg-gray-50 -mx-4 px-4 rounded-lg transition">
      <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          {b.client_name}
        </p>
        <p className="text-xs text-gray-400 truncate">{b.vehicle_name}</p>
      </div>
      <div className="text-center shrink-0 hidden sm:block">
        <p className="text-xs text-gray-500">{fmtDate(b.start_date)}</p>
        <p className="text-xs text-gray-400">{b.nb_days}j</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-gray-800">{fmt(b.total_price)}</p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.cls}`}
        >
          {st.label}
        </span>
      </div>
    </div>
  );
}

// ── Service Request Card ───────────────────────────────────────────────────────

function ServiceReqCard({
  req,
  onAction,
  actionLoading,
}: {
  req: ServiceRequest;
  onAction: (id: number, action: "approve" | "reject") => void;
  actionLoading: number | null;
}) {
  const svc = SVC_CFG[req.service_type];
  const Icon = svc?.icon ?? Package;
  const st = STATUS_CFG[req.status] ?? STATUS_CFG.pending;
  const loading = actionLoading === req.id;

  const colorMap: Record<string, string> = {
    teal: "bg-teal-50 text-teal-600",
    orange: "bg-orange-50 text-orange-600",
    rose: "bg-rose-50 text-rose-600",
  };
  const iconCls = colorMap[svc?.color ?? "teal"];

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition group">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl ${iconCls} flex items-center justify-center shrink-0`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-gray-800">
              {svc?.label}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.cls}`}
            >
              {st.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-green-500" />
              {req.pickup_city}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-red-400" />
              {req.delivery_city}
            </span>
            <span className="flex items-center gap-1 col-span-2">
              <Calendar className="w-2.5 h-2.5" />
              {fmtDate(req.pickup_date)}
              {req.client_name && (
                <>
                  {" "}
                  · <User className="w-2.5 h-2.5" /> {req.client_name}
                </>
              )}
            </span>
          </div>

          {req.estimated_price && (
            <p className="text-sm font-bold text-emerald-600 mt-1">
              {fmt(req.estimated_price)} MAD
            </p>
          )}
        </div>

        {req.status === "pending" && (
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              onClick={() => onAction(req.id, "approve")}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white 
                         rounded-lg text-xs font-medium hover:bg-emerald-600 transition disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              Accepter
            </button>
            <button
              onClick={() => onAction(req.id, "reject")}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200
                         rounded-lg text-xs font-medium hover:bg-red-100 transition disabled:opacity-50"
            >
              <XCircle className="w-3 h-3" /> Refuser
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function OwnerDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<UserOwner | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [topVehicles, setTopVehicles] = useState<TopVehicle[]>([]);
  const [recentBkgs, setRecentBkgs] = useState<RecentBooking[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("pending");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [chartMonths, setChartMonths] = useState(6);
  const [greeting, setGreeting] = useState("Bonjour");

  const hasOtherServices = (user?.owner_services ?? []).some(
    (s) => s.service_type !== "location" && s.is_active,
  );

  // Salutation selon l'heure
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Bonjour");
    else if (h < 18) setGreeting("Bon après-midi");
    else setGreeting("Bonsoir");
  }, []);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.replace("/login");
      return;
    }
    try {
      const parsed: UserOwner = JSON.parse(userData);
      if (parsed.role.name !== "owner") {
        router.replace("/");
        return;
      }
      setUser(parsed);
      setIsChecking(false);
    } catch {
      localStorage.clear();
      router.replace("/login");
    }
  }, []);

  // Fetch all data
  useEffect(() => {
    if (!isChecking) fetchAll();
  }, [isChecking]);

  useEffect(() => {
    if (!isChecking) fetchRevenueChart();
  }, [chartMonths, isChecking]);

  async function fetchAll() {
    setLoadingStats(true);
    try {
      const [statsRes, vehiclesRes, bookingsRes, requestsRes, revenueRes] =
        await Promise.allSettled([
          api.get("/owner/stats"),
          api.get("/owner/top-vehicles"),
          api.get("/owner/recent-bookings?limit=6"),
          api.get("/service-requests?status=pending"),
          api.get(`/owner/revenue-chart?months=${chartMonths}`),
        ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (vehiclesRes.status === "fulfilled")
        setTopVehicles(vehiclesRes.value.data);
      if (bookingsRes.status === "fulfilled")
        setRecentBkgs(bookingsRes.value.data);
      if (requestsRes.status === "fulfilled")
        setRequests(requestsRes.value.data);
      if (revenueRes.status === "fulfilled")
        setRevenueData(revenueRes.value.data);
    } finally {
      setLoadingStats(false);
    }
  }

  async function fetchRevenueChart() {
    try {
      const { data } = await api.get(
        `/owner/revenue-chart?months=${chartMonths}`,
      );
      setRevenueData(data);
    } catch {}
  }

  async function fetchFilteredRequests(filter: string) {
    setActiveFilter(filter);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const { data } = await api.get(`/service-requests${params}`);
      setRequests(data);
    } catch {}
  }

  async function handleAction(id: number, action: "approve" | "reject") {
    setActionLoading(id);
    try {
      const status = action === "approve" ? "confirmed" : "rejected";
      await api.patch(`/service-requests/${id}/status`, { status });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
      // Refresh stats
      const { data } = await api.get("/owner/stats");
      setStats(data);
    } catch {
      alert("Erreur. Réessayez.");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Computed values ────────────────────────────────────────────────────────

  const revTrend = stats
    ? pctChange(stats.revenue_this_month, stats.revenue_last_month)
    : 0;
  const pendingCount = stats?.pending_service_requests ?? 0;
  const sparkRevenue = revenueData.map((d) => d.revenue);
  const sparkBookings = revenueData.map((d) => d.bookings);
  const displayName = user?.is_agency
    ? (user.agency_name ?? user.name)
    : (user?.name ?? "");

  if (isChecking) return null;

  // ── Skeleton loader ────────────────────────────────────────────────────────

  const Skeleton = ({ className = "" }: { className?: string }) => (
    <div className={`bg-gray-100 rounded-xl animate-pulse ${className}`} />
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        user={user || undefined}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentPath="/owner/dashboard"
        stats={{ pending: pendingCount }}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <p className="text-xs text-gray-400 font-medium">
                  {greeting} 👋
                </p>
                <h1 className="text-lg font-bold text-gray-800 leading-tight">
                  {displayName}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchAll}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <Link
                href="/owner/add-vehicule"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white 
                           rounded-xl text-sm font-medium hover:bg-blue-700 transition"
              >
                <PlusCircle className="w-4 h-4" /> Ajouter un véhicule
              </Link>
              <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition">
                <Bell className="w-5 h-5" />
                {pendingCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* ── Alerte demandes en attente ─────────────────────────────────── */}
          {pendingCount > 0 && (
            <div
              className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 
                            flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  {pendingCount} demande{pendingCount > 1 ? "s" : ""} de service
                  en attente
                </p>
                <p className="text-xs text-amber-600">
                  Répondez rapidement pour améliorer votre taux de conversion
                </p>
              </div>
              <button
                onClick={() =>
                  document
                    .getElementById("services-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-xs font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1"
              >
                Voir <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ── KPI Cards ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {loadingStats ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36" />
              ))
            ) : stats ? (
              <>
                <KpiCard
                  label="Revenus du mois"
                  value={stats.revenue_this_month}
                  suffix=" MAD"
                  icon={DollarSign}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  trend={revTrend}
                  trendLabel=" vs mois passé"
                  sparkline={sparkRevenue}
                  highlight
                />
                <KpiCard
                  label="Réservations"
                  value={stats.total_bookings}
                  sub={`${stats.confirmed_bookings} confirmées`}
                  icon={CalendarCheck}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                  trend={pctChange(
                    stats.bookings_this_month,
                    Math.max(
                      stats.total_bookings - stats.bookings_this_month,
                      1,
                    ),
                  )}
                  trendLabel=" ce mois"
                  sparkline={sparkBookings}
                />
                <KpiCard
                  label="Flotte"
                  value={stats.total_vehicles}
                  sub={`${stats.available_vehicles} dispo · ${stats.rented_vehicles} loués`}
                  icon={Car}
                  iconBg="bg-violet-50"
                  iconColor="text-violet-600"
                />
                <KpiCard
                  label="Note moyenne"
                  value={(stats.avg_rating || 0).toFixed(1)}
                  sub="sur 5 étoiles"
                  icon={Star}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-500"
                />
              </>
            ) : null}
          </div>

          {/* ── Row 2 : Graphique + Occupation ───────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Graphique revenus */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-gray-800">
                    Revenus & Réservations
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Évolution sur {chartMonths} mois
                  </p>
                </div>
                <div className="flex gap-1">
                  {[3, 6, 12].map((m) => (
                    <button
                      key={m}
                      onClick={() => setChartMonths(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                        chartMonths === m
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              {revenueData.length > 0 ? (
                <>
                  <MiniBarChart data={revenueData} height={120} />
                  {/* Légende chiffres */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-500" />
                      <span className="text-xs text-gray-500">
                        Revenus totaux
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-800">
                      {fmt(revenueData.reduce((s, d) => s + d.revenue, 0))} MAD
                    </p>
                  </div>
                </>
              ) : (
                <div className="h-32 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      Aucune donnée pour la période
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Occupation */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-base font-bold text-gray-800 mb-1">
                Occupation flotte
              </h2>
              <p className="text-xs text-gray-400 mb-5">
                Taux d'utilisation actuel
              </p>

              {stats ? (
                <OccupationRing
                  rate={stats.occupation_rate}
                  available={stats.available_vehicles}
                  rented={stats.rented_vehicles}
                  total={stats.total_vehicles}
                />
              ) : (
                <Skeleton className="h-24" />
              )}

              {/* Bookings summary */}
              {stats && (
                <div className="mt-5 space-y-2 border-t border-gray-50 pt-4">
                  {[
                    {
                      label: "En attente",
                      val: stats.pending_bookings,
                      color: "bg-amber-400",
                    },
                    {
                      label: "Confirmées",
                      val: stats.confirmed_bookings,
                      color: "bg-blue-400",
                    },
                    {
                      label: "Terminées",
                      val: stats.completed_bookings,
                      color: "bg-emerald-400",
                    },
                  ].map(({ label, val, color }) => {
                    const total = stats.total_bookings || 1;
                    const pct = Math.round((val / total) * 100);
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">{label}</span>
                          <span className="font-medium text-gray-700">
                            {val}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-full`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Row 3 : Top véhicules + Réservations récentes ─────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Top véhicules */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800">
                  Meilleurs véhicules
                </h2>
                <Link
                  href="/owner/vehicules"
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                >
                  Tous <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {topVehicles.length > 0 ? (
                <div>
                  {topVehicles.map((v, i) => (
                    <VehicleTopCard key={v.id} v={v} rank={i + 1} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Car className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Aucun véhicule</p>
                  <Link
                    href="/owner/vehicules/add"
                    className="text-xs text-blue-600 mt-1 inline-flex items-center gap-1"
                  >
                    <PlusCircle className="w-3 h-3" /> Ajouter un véhicule
                  </Link>
                </div>
              )}
            </div>

            {/* Réservations récentes */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800">
                  Réservations récentes
                </h2>
                <Link
                  href="/owner/services"
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                >
                  Toutes <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {recentBkgs.length > 0 ? (
                <div>
                  {recentBkgs.map((b) => (
                    <BookingRow key={b.id} b={b} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <CalendarCheck className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Aucune réservation</p>
                  <p className="text-xs text-gray-300 mt-1">
                    Publiez des véhicules pour recevoir des réservations
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Actions rapides ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              {
                label: "Ajouter véhicule",
                icon: PlusCircle,
                href: "/owner/vehicules/add",
                bg: "from-blue-500 to-blue-600",
                desc: "Élargir ma flotte",
              },
              {
                label: "Mes réservations",
                icon: CalendarCheck,
                href: "/owner/services",
                bg: "from-violet-500 to-violet-600",
                desc: "Gérer les demandes",
              },
              {
                label: "Marketing IA",
                icon: Sparkles,
                href: "/owner/vehicules",
                bg: "from-pink-500 to-rose-500",
                desc: "Publier sur les réseaux",
              },
              {
                label: "Mon profil",
                icon: User,
                href: "/owner/profile",
                bg: "from-slate-600 to-slate-700",
                desc: "Documents & agence",
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`bg-gradient-to-br ${item.bg} text-white rounded-2xl p-4
                            hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
              >
                <item.icon className="w-5 h-5 mb-3 opacity-90" />
                <p className="text-sm font-semibold leading-tight">
                  {item.label}
                </p>
                <p className="text-xs opacity-70 mt-0.5">{item.desc}</p>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
