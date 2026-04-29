"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Car,
  CalendarCheck,
  DollarSign,
  PlusCircle,
  LayoutDashboard,
  Settings,
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
  Calendar,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

// ── Types ──────────────────────────────────────────────────
interface UserOwner {
  id: number;
  name: string;
  email: string;
  role: { id: number; name: string };
  owner_services?: { service_type: string }[];
}

interface DashboardStats {
  total_earnings: number;
  total_bookings: number;
  total_vehicles: number;
  total_service_requests: number;
  pending_service_requests: number;
  confirmed_service_requests: number;
  completed_service_requests: number;
  revenue_this_month: number;
  bookings_this_month: number;
  vehicles_this_month: number;
}

interface ServiceRequest {
  id: number;
  service_type: "transport_bagages" | "livraison_colis" | "demenagement";
  status: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  pickup_date: string;
  pickup_time: string | null;
  pickup_city: string;
  delivery_city: string;
  pickup_address: string | null;
  delivery_address: string | null;
  estimated_price: number | null;
  client_notes: string | null;
  service_details: any;
  created_at: string;
  client_name: string | null;
  owner_name: string | null;
  client_phone: string | null;
  client_email: string | null;
}

interface RecentBooking {
  id: number;
  client_name: string;
  vehicle_name: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
}

// ── Helpers ────────────────────────────────────────────────
const SERVICE_CONFIG = {
  transport_bagages: {
    label: "Transport Bagages",
    icon: Luggage,
    color: "teal",
    bg: "bg-teal-100",
    text: "text-teal-700",
    border: "border-teal-500",
  },
  livraison_colis: {
    label: "Livraison Colis",
    icon: Package,
    color: "orange",
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-500",
  },
  demenagement: {
    label: "Déménagement",
    icon: Truck,
    color: "rose",
    bg: "bg-rose-100",
    text: "text-rose-700",
    border: "border-rose-500",
  },
} as const;

const STATUS_CONFIG = {
  pending: {
    label: "En attente",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
  },
  confirmed: { label: "Confirmée", bg: "bg-green-100", text: "text-green-700" },
  rejected: { label: "Refusée", bg: "bg-red-100", text: "text-red-700" },
  cancelled: { label: "Annulée", bg: "bg-gray-100", text: "text-gray-600" },
  completed: { label: "Terminée", bg: "bg-blue-100", text: "text-blue-700" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Composant carte demande ────────────────────────────────
function RequestCard({
  req,
  onAction,
}: {
  req: ServiceRequest;
  onAction: (id: number, action: "approve" | "reject") => void;
}) {
  const svc = SERVICE_CONFIG[req.service_type];
  const Icon = svc.icon;
  const status = STATUS_CONFIG[req.status];

  return (
    <div
      className={`bg-white rounded-xl border-l-4 ${svc.border} shadow-sm p-4 hover:shadow-md transition`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={`w-10 h-10 ${svc.bg} rounded-xl flex items-center justify-center shrink-0`}
          >
            <Icon className={`w-5 h-5 ${svc.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold ${svc.text}`}>
                {svc.label}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}
              >
                {status.label}
              </span>
            </div>

            <div className="flex items-start gap-1 mt-1">
              <MapPin className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600 truncate">
                {req.pickup_address || req.pickup_city}
              </span>
            </div>
            <div className="flex items-start gap-1">
              <MapPin className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600 truncate">
                {req.delivery_address || req.delivery_city}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(req.pickup_date)}</span>
              {req.pickup_time && <span>à {req.pickup_time.slice(0, 5)}</span>}
            </div>

            {req.estimated_price && (
              <div className="text-sm font-semibold text-green-600 mt-1">
                {req.estimated_price} MAD
              </div>
            )}

            {req.client_notes && (
              <p className="text-xs text-gray-400 mt-1 italic truncate">
                📝 {req.client_notes.slice(0, 80)}...
              </p>
            )}

            {req.client_name && (
              <div className="flex items-center gap-1 mt-1">
                <User className="w-3 h-3 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {req.client_name}
                </span>
              </div>
            )}
          </div>
        </div>

        {req.status === "pending" && (
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => onAction(req.id, "approve")}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Accepter
            </button>
            <button
              onClick={() => onAction(req.id, "reject")}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 transition"
            >
              <XCircle className="w-3.5 h-3.5" /> Refuser
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ══════════════════════════════════════════════════════════
export default function OwnerDashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<UserOwner | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);

  // Demandes de services
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "confirmed" | "completed"
  >("pending");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Services actifs de l'owner
  const [hasOtherServices, setHasOtherServices] = useState(false);

  const router = useRouter();
  const currentPath = "/owner/dashboard";

  // ── Init ────────────────────────────────────────────────
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

      const services = parsed.owner_services ?? [];
      const other = services.some((s) => s.service_type !== "location");
      setHasOtherServices(other);

      setIsChecking(false);
    } catch {
      localStorage.clear();
      router.replace("/login");
      return;
    }

    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Récupérer les statistiques
      const [statsRes, bookingsRes, servicesRes] = await Promise.allSettled([
        api.get("/owner/stats"),
        api.get("/owner/recent-bookings?limit=5"),
        api.get("/service-requests"),
      ]);

      // Statistiques
      if (statsRes.status === "fulfilled") {
        setData(statsRes.value.data as DashboardStats);
      } else {
        setData({
          total_earnings: 0,
          total_bookings: 0,
          total_vehicles: 0,
          total_service_requests: 0,
          pending_service_requests: 0,
          confirmed_service_requests: 0,
          completed_service_requests: 0,
          revenue_this_month: 0,
          bookings_this_month: 0,
          vehicles_this_month: 0,
        });
      }

      // Réservations récentes
      if (bookingsRes.status === "fulfilled") {
        setRecentBookings(bookingsRes.value.data);
      }

      // Demandes de services
      if (servicesRes.status === "fulfilled") {
        setRequests(servicesRes.value.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  }

  // ── Charger les demandes filtrées ──
  useEffect(() => {
    if (!hasOtherServices) return;
    fetchFilteredRequests();
  }, [hasOtherServices, activeFilter]);

  async function fetchFilteredRequests() {
    setReqLoading(true);
    try {
      const params = activeFilter !== "all" ? `?status=${activeFilter}` : "";
      const { data } = await api.get(`/service-requests${params}`);
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setReqLoading(false);
    }
  }

  async function handleAction(id: number, action: "approve" | "reject") {
    setActionLoading(id);
    try {
      const status = action === "approve" ? "confirmed" : "rejected";
      await api.patch(`/service-requests/${id}/status`, { status });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
      fetchDashboardData(); // Rafraîchir les stats
    } catch {
      alert("Erreur lors de l'action. Réessayez.");
    } finally {
      setActionLoading(null);
    }
  }

  // Calcul des stats réelles
  const pendingCount =
    data?.pending_service_requests ??
    requests.filter((r) => r.status === "pending").length;
  const confirmedCount =
    data?.confirmed_service_requests ??
    requests.filter((r) => r.status === "confirmed").length;
  const completedCount =
    data?.completed_service_requests ??
    requests.filter((r) => r.status === "completed").length;

  // Calcul du pourcentage d'évolution
  const earningsChange =
    data?.revenue_this_month && data?.total_earnings
      ? ((data.revenue_this_month / data.total_earnings) * 100).toFixed(1)
      : 0;

  const bookingsChange =
    data?.bookings_this_month && data?.total_bookings
      ? ((data.bookings_this_month / data.total_bookings) * 100).toFixed(1)
      : 0;

  const vehiclesChange =
    data?.vehicles_this_month && data?.total_vehicles
      ? ((data.vehicles_this_month / data.total_vehicles) * 100).toFixed(1)
      : 0;

  // ── Render guards ───────────────────────────────────────
  if (isChecking) return null;
  if (!data)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );

  // Fonction pour obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    const config =
      STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
      STATUS_CONFIG.pending;
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        user={user || undefined}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentPath={currentPath}
      />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 overflow-hidden">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden text-gray-600"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">
                Tableau de bord
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative text-gray-600">
                <Bell className="w-6 h-6" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push("/owner/profile")}
                className="text-gray-600"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* STATS CARDS */}
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 ${hasOtherServices ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
          >
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Revenus totaux</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {data.total_earnings.toLocaleString()} MAD
                  </p>
                  <p
                    className={`text-xs mt-2 ${Number(earningsChange) >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {Number(earningsChange) >= 0 ? "+" : ""}
                    {earningsChange}% ce mois
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    Réservations véhicules
                  </p>
                  <p className="text-3xl font-bold text-gray-800">
                    {data.total_bookings}
                  </p>
                  <p
                    className={`text-xs mt-2 ${Number(bookingsChange) >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {Number(bookingsChange) >= 0 ? "+" : ""}
                    {bookingsChange}% ce mois
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <CalendarCheck className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Véhicules</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {data.total_vehicles}
                  </p>
                  <p
                    className={`text-xs mt-2 ${Number(vehiclesChange) >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {Number(vehiclesChange) >= 0 ? "+" : ""}
                    {vehiclesChange}% ce mois
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Car className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            {hasOtherServices && (
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      Demandes services
                    </p>
                    <p className="text-3xl font-bold text-gray-800">
                      {data.total_service_requests || requests.length}
                    </p>
                    {pendingCount > 0 ? (
                      <p className="text-xs text-orange-500 mt-2 font-semibold">
                        {pendingCount} en attente
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">
                        Aucune en attente
                      </p>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* GRAPHIQUE ACTIVITÉ */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Activité récente
            </h2>
            <div className="h-48 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Graphique d'activité</p>
                <p className="text-xs text-gray-300">
                  Statistiques détaillées dans l'onglet Analytics
                </p>
              </div>
            </div>
          </div>

          {/* ACTIONS RAPIDES */}
          <div
            className={`grid grid-cols-1 gap-4 mb-8 ${hasOtherServices ? "md:grid-cols-4" : "md:grid-cols-3"}`}
          >
            {[
              {
                label: "Réservations",
                desc: "Gérez les demandes en attente",
                icon: CalendarCheck,
                bg: "bg-blue-100",
                text: "text-blue-600",
                onClick: () => router.push("/owner/services"),
              },
              {
                label: "Mes véhicules",
                desc: "Consultez et gérez votre flotte",
                icon: Car,
                bg: "bg-purple-100",
                text: "text-purple-600",
                onClick: () => router.push("/owner/vehicules"),
              },
              {
                label: "Ajouter véhicule",
                desc: "Élargissez votre flotte",
                icon: PlusCircle,
                bg: "bg-green-100",
                text: "text-green-600",
                onClick: () => router.push("/owner/add-vehicule"),
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition text-left group"
              >
                <div
                  className={`w-12 h-12 ${item.bg} rounded-lg flex items-center justify-center mb-4 transition group-hover:scale-105`}
                >
                  <item.icon className={`w-6 h-6 ${item.text}`} />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  {item.label}
                </h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </button>
            ))}

            {hasOtherServices && (
              <button
                onClick={() =>
                  document
                    .getElementById("services-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition text-left group relative"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 transition group-hover:scale-105">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  Demandes services
                </h3>
                <p className="text-sm text-gray-500">
                  Bagages, livraison, déménagement
                </p>
                {pendingCount > 0 && (
                  <span className="absolute top-4 right-4 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* DERNIÈRES RÉSERVATIONS VÉHICULES */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Dernières réservations véhicules
              </h2>
              <button
                onClick={() => router.push("/owner/services")}
                className="text-sm text-blue-600 flex items-center gap-1 hover:underline"
              >
                Voir tout <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              {recentBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Car className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Aucune réservation récente</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                        Client
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                        Véhicule
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                        Dates
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                        Montant
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">
                          {booking.client_name}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">
                          {booking.vehicle_name}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {formatDate(booking.start_date)} -{" "}
                          {formatDate(booking.end_date)}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-green-600">
                          {booking.total_price} MAD
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(booking.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* SECTION DEMANDES DE SERVICES */}
          {hasOtherServices && (
            <div
              id="services-section"
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    Demandes de services
                  </h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Bagages · Livraison · Déménagement
                  </p>
                </div>
                {pendingCount > 0 && (
                  <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-sm font-semibold">
                    {pendingCount} en attente
                  </span>
                )}
              </div>

              <div className="flex gap-2 mb-5 flex-wrap">
                {(["pending", "confirmed", "completed", "all"] as const).map(
                  (f) => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition
                                            ${
                                              activeFilter === f
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                    >
                      {
                        {
                          pending: "En attente",
                          confirmed: "Confirmées",
                          completed: "Terminées",
                          all: "Toutes",
                        }[f]
                      }
                      {f === "pending" && pendingCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  ),
                )}
              </div>

              {reqLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-28 bg-gray-100 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">
                    {activeFilter === "pending"
                      ? "Aucune demande en attente"
                      : "Aucune demande dans cette catégorie"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
