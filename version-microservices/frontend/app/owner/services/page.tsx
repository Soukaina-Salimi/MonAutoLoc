"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import Sidebar from "@/components/Sidebar";

import {
  Package,
  Luggage,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  ChevronRight,
  LayoutDashboard,
  Car,
  PlusCircle,
  LogOut,
  Settings,
  Bell,
  Menu,
  CalendarCheck,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  DollarSign,
  ArrowRight,
  Eye,
  X,
  FileText,
} from "lucide-react";

// ─── Types unifiés ────────────────────────────────────────────────────────────

interface UserOwner {
  id: number;
  name: string;
  email: string;
  role: { id: number; name: string };
  owner_services?: { service_type: string }[];
}

interface UnifiedBooking {
  id: number;
  type: "location" | "service";
  service_type: string;
  status:
    | "pending"
    | "approved"
    | "confirmed"
    | "rejected"
    | "cancelled"
    | "completed"
    | "in_progress";
  created_at: string;
  total_price: number;

  // Champs location (bookings)
  vehicule?: {
    id: number;
    brand: string;
    model: string;
    price_per_day: number;
    image_url: string | null;
    year: number;
    fuel_type: string;
    transmission: string;
    seats: number;
  };
  start_date?: string;
  end_date?: string;

  // Champs services (service_requests)
  pickup_address?: string | null;
  delivery_address?: string | null;
  pickup_city?: string | null;
  delivery_city?: string | null;
  pickup_date?: string;
  pickup_time?: string;
  service_details?: any;
  client_notes?: string | null;
  estimated_price?: number;
  final_price?: number;

  // Client (pour owner)
  client?: { id: number; name: string; email: string; phone?: string } | null;

  contract?: {
    contract_number: string;
    status?: string;
    has_pdf?: boolean;
  } | null;
}

interface ServiceRequest {
  id: number;
  service_type: "transport_bagages" | "livraison_colis" | "demenagement";
  status:
    | "pending"
    | "confirmed"
    | "rejected"
    | "cancelled"
    | "completed"
    | "in_progress";
  pickup_date: string;
  pickup_time: string | null;
  pickup_city: string;
  delivery_city: string;
  pickup_address: string | null;
  delivery_address: string | null;
  estimated_price: number | null;
  final_price: number | null;
  client_notes: string | null;
  owner_notes: string | null;
  service_details: any;
  created_at: string;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SERVICE_CFG = {
  transport_bagages: {
    label: "Transport de bagages",
    icon: Luggage,
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-400",
    badge: "bg-teal-100 text-teal-800",
    dot: "bg-teal-500",
  },
  livraison_colis: {
    label: "Livraison de colis",
    icon: Package,
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-400",
    badge: "bg-orange-100 text-orange-800",
    dot: "bg-orange-500",
  },
  demenagement: {
    label: "Déménagement",
    icon: Truck,
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-400",
    badge: "bg-rose-100 text-rose-800",
    dot: "bg-rose-500",
  },
} as const;

const STATUS_CFG = {
  pending: {
    label: "En attente",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmée",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: CheckCircle,
  },
  in_progress: {
    label: "En cours",
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: ArrowRight,
  },
  completed: {
    label: "Terminée",
    bg: "bg-gray-100",
    text: "text-gray-600",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Annulée",
    bg: "bg-gray-100",
    text: "text-gray-500",
    icon: XCircle,
  },
  rejected: {
    label: "Refusée",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: XCircle,
  },
} as const;

const FILTERS = [
  { key: "all", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "confirmed", label: "Confirmées" },
  { key: "in_progress", label: "En cours" },
  { key: "completed", label: "Terminées" },
  { key: "rejected", label: "Refusées" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtDateFull(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function RequestDetailModal({
  req,
  onClose,
  onAction,
}: {
  req: ServiceRequest;
  onClose: () => void;
  onAction: (
    id: number,
    status: string,
    notes?: string,
    price?: number,
  ) => Promise<void>;
}) {
  const svc = SERVICE_CFG[req.service_type];
  const status = STATUS_CFG[req.status];
  const Icon = svc.icon;
  const [ownerNotes, setOwnerNotes] = useState(req.owner_notes ?? "");
  const [finalPrice, setFinalPrice] = useState<string>(
    req.final_price?.toString() ?? req.estimated_price?.toString() ?? "",
  );
  const [loading, setLoading] = useState(false);

  async function act(newStatus: string) {
    setLoading(true);
    await onAction(
      req.id,
      newStatus,
      ownerNotes || undefined,
      finalPrice ? Number(finalPrice) : undefined,
    );
    setLoading(false);
    onClose();
  }

  const bagages = req.service_details?.bagages ?? [];
  const extras = req.service_details?.extras ?? [];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div
          className={`${svc.bg} px-6 py-5 rounded-t-2xl flex items-start justify-between`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 ${svc.badge} rounded-xl flex items-center justify-center`}
            >
              <Icon className={`w-5 h-5 ${svc.text}`} />
            </div>
            <div>
              <h2 className={`font-bold text-base ${svc.text}`}>{svc.label}</h2>
              <p className="text-xs text-gray-500">
                Demande #{req.id} · {fmtDate(req.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}
            >
              <status.icon className="w-3.5 h-3.5" />
              {status.label}
            </span>
            {req.estimated_price && (
              <span className="ml-auto text-lg font-bold text-gray-800">
                {req.estimated_price} MAD
              </span>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Client
            </h3>
            {req.client_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-800">
                  {req.client_name}
                </span>
              </div>
            )}
            {req.client_phone && (
              <a
                href={`tel:${req.client_phone}`}
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Phone className="w-4 h-4" />
                {req.client_phone}
              </a>
            )}
            {req.client_email && (
              <a
                href={`mailto:${req.client_email}`}
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Mail className="w-4 h-4" />
                {req.client_email}
              </a>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Trajet
            </h3>
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center pt-1 gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <div className="w-0.5 h-6 bg-gray-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs text-gray-400">Départ</p>
                  <p className="text-sm font-medium text-gray-800">
                    {req.pickup_city}
                  </p>
                  {req.pickup_address && (
                    <p className="text-xs text-gray-500">
                      {req.pickup_address}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Arrivée</p>
                  <p className="text-sm font-medium text-gray-800">
                    {req.delivery_city}
                  </p>
                  {req.delivery_address && (
                    <p className="text-xs text-gray-500">
                      {req.delivery_address}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{fmtDateFull(req.pickup_date)}</span>
              {req.pickup_time && <span>à {req.pickup_time.slice(0, 5)}</span>}
            </div>
          </div>

          {bagages.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Bagages
              </h3>
              <div className="space-y-1.5">
                {bagages.map((b: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <span className="text-gray-700">
                      {b.count}× {b.label ?? b.type}
                    </span>
                  </div>
                ))}
                {extras.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {extras.map((e: string) => (
                      <span
                        key={e}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {req.client_notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-yellow-700 mb-1">
                Note du client
              </p>
              <p className="text-sm text-yellow-800">{req.client_notes}</p>
            </div>
          )}

          {req.status === "pending" && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Prix final (MAD)
                  </label>
                  <input
                    type="number"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                    placeholder={req.estimated_price?.toString() ?? "0"}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Note pour le client
                  </label>
                  <input
                    type="text"
                    value={ownerNotes}
                    onChange={(e) => setOwnerNotes(e.target.value)}
                    placeholder="Message optionnel…"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => act("confirmed")}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 transition disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" /> Accepter
                </button>
                <button
                  onClick={() => act("rejected")}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Refuser
                </button>
              </div>
            </div>
          )}

          {req.status === "confirmed" && (
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => act("in_progress")}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-600 transition disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" /> Démarrer
              </button>
            </div>
          )}
          {req.status === "in_progress" && (
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => act("completed")}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-900 transition disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" /> Marquer terminée
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function downloadContract(bookingId: number, contractNumber: string) {
  try {
    const response = await api.get(`/bookings/${bookingId}/contract`, {
      responseType: "blob", // Important — réponse binaire PDF
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${contractNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert("Impossible de télécharger le contrat.");
  }
}
// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  req,
  onQuickAction,
  onOpen,
}: {
  req: ServiceRequest;
  onQuickAction: (id: number, status: string) => void;
  onOpen: (req: ServiceRequest) => void;
}) {
  const svc = SERVICE_CFG[req.service_type];
  const status = STATUS_CFG[req.status];
  const Icon = svc.icon;

  return (
    <div
      className={`bg-white rounded-2xl border-l-4 ${svc.border} shadow-sm hover:shadow-md transition-all overflow-hidden`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={`w-10 h-10 ${svc.badge} rounded-xl flex items-center justify-center shrink-0`}
            >
              <Icon className={`w-5 h-5 ${svc.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-xs font-bold ${svc.text}`}>
                  {svc.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}
                >
                  <status.icon className="w-3 h-3" />
                  {status.label}
                </span>
                {req.status === "pending" && (
                  <span className="ml-auto text-xs text-orange-500 font-medium animate-pulse">
                    Action requise
                  </span>
                )}
              </div>
              {req.client_name && (
                <div className="flex items-center gap-1.5 mb-2">
                  <User className="w-3 h-3 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {req.client_name}
                  </span>
                  {req.client_phone && (
                    <span className="text-xs text-gray-400">
                      · {req.client_phone}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="font-medium text-gray-700">
                  {req.pickup_city}
                </span>
                <ArrowRight className="w-3 h-3" />
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="font-medium text-gray-700">
                  {req.delivery_city}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{fmtDate(req.pickup_date)}</span>
                  {req.pickup_time && (
                    <span>à {req.pickup_time.slice(0, 5)}</span>
                  )}
                </div>
                {(req.final_price ?? req.estimated_price) && (
                  <span className="font-bold text-gray-700">
                    {req.final_price ?? req.estimated_price} MAD
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => onOpen(req)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
            >
              <Eye className="w-3.5 h-3.5" /> Détails
            </button>
            {req.status === "pending" && (
              <>
                <button
                  onClick={() => onQuickAction(req.id, "confirmed")}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Accepter
                </button>
                <button
                  onClick={() => onQuickAction(req.id, "rejected")}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition border border-red-200"
                >
                  <XCircle className="w-3.5 h-3.5" /> Refuser
                </button>
              </>
            )}
            {req.status === "confirmed" && (
              <button
                onClick={() => onQuickAction(req.id, "in_progress")}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition"
              >
                <ArrowRight className="w-3.5 h-3.5" /> Démarrer
              </button>
            )}
            {req.status === "in_progress" && (
              <button
                onClick={() => onQuickAction(req.id, "completed")}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-medium hover:bg-gray-900 transition"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Terminer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OwnerServiceRequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<UnifiedBooking[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedReq, setSelectedReq] = useState<ServiceRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [stats, setStats] = useState({
    all: 0,
    pending: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    revenue: 0,
  });

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (!token || !userStr) {
      router.replace("/login");
      return;
    }
    try {
      const u: UserOwner = JSON.parse(userStr);
      if (u.role.name !== "owner") {
        router.replace("/");
        return;
      }
      setUser(u);
    } catch {
      router.replace("/login");
      return;
    }

    fetchBookings();
  }, []);

  // ── Fetch unifié (owner) ────────────────────────────────────────────────
  const fetchBookings = async () => {
    setLoading(true);
    try {
      // ✅ Appels OWNER
      const [bookingsRes, servicesRes] = await Promise.allSettled([
        api.get("/bookings/owner"),
        api.get("/service-requests"),
      ]);

      const unified: UnifiedBooking[] = [];

      // Traiter les réservations de véhicules reçues
      if (bookingsRes.status === "fulfilled" && bookingsRes.value.data) {
        const locationBookings: UnifiedBooking[] = bookingsRes.value.data.map(
          (b: any) => ({
            id: b.id,
            type: "location",
            service_type: "location",
            status: b.status,
            created_at: b.created_at,
            total_price: parseFloat(b.total_price) || 0,
            vehicule: b.vehicule,
            start_date: b.start_date,
            end_date: b.end_date,
            client: b.client || b.user,
            contract: b.contract || null, // ✅ AJOUTE CETTE LIGNE
          }),
        );
        unified.push(...locationBookings);
        console.log("📍 Location bookings:", locationBookings.length);
      }

      // Traiter les demandes de services reçues
      if (servicesRes.status === "fulfilled" && servicesRes.value.data) {
        const serviceBookings: UnifiedBooking[] = servicesRes.value.data.map(
          (r: any) => ({
            id: r.id,
            type: "service",
            service_type: r.service_type,
            status: r.status === "confirmed" ? "approved" : r.status,
            created_at: r.created_at,
            total_price: r.final_price ?? r.estimated_price ?? 0,
            pickup_address: r.pickup_address,
            delivery_address: r.delivery_address,
            pickup_city: r.pickup_city,
            delivery_city: r.delivery_city,
            pickup_date: r.pickup_date,
            pickup_time: r.pickup_time,
            service_details: r.service_details,
            client_notes: r.client_notes,
            estimated_price: r.estimated_price,
            final_price: r.final_price,
            client: {
              id: r.client_id,
              name: r.client_name,
              email: r.client_email,
              phone: r.client_phone,
            },
          }),
        );
        unified.push(...serviceBookings);
        console.log("📦 Service bookings:", serviceBookings.length);
      }

      // Trier par date décroissante
      unified.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setBookings(unified);
      setFilteredBookings(unified);

      // Stats
      setStats({
        all: unified.length,
        pending: unified.filter((b) => b.status === "pending").length,
        confirmed: unified.filter(
          (b) => b.status === "confirmed" || b.status === "approved",
        ).length,
        in_progress: unified.filter((b) => b.status === "in_progress").length,
        completed: unified.filter((b) => b.status === "completed").length,
        revenue: unified
          .filter((b) => b.status === "completed")
          .reduce((sum, b) => sum + (b.total_price || 0), 0),
      });
    } catch (err: any) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Filtrage ─────────────────────────────────────────────────────────────
  const filtered = bookings.filter((b) => {
    if (activeFilter !== "all" && b.status !== activeFilter) return false;
    if (serviceFilter !== "all" && b.service_type !== serviceFilter)
      return false;
    if (search) {
      const s = search.toLowerCase();
      const clientName = b.client?.name?.toLowerCase() || "";
      const pickupCity = b.pickup_city?.toLowerCase() || "";
      const deliveryCity = b.delivery_city?.toLowerCase() || "";
      const vehiculeName =
        `${b.vehicule?.brand} ${b.vehicule?.model}`.toLowerCase();
      if (
        !clientName.includes(s) &&
        !pickupCity.includes(s) &&
        !deliveryCity.includes(s) &&
        !vehiculeName.includes(s)
      ) {
        return false;
      }
    }
    return true;
  });

  // ── Action (quick ou depuis modal) ───────────────────────────────────────
  async function handleAction(
    id: number,
    status: string,
    notes?: string,
    price?: number,
  ) {
    setActionLoading(id);
    try {
      await api.patch(`/service-requests/${id}/status`, {
        status,
        ...(notes ? { owner_notes: notes } : {}),
        ...(price ? { final_price: price } : {}),
      });
      setBookings((prev) =>
        prev.map((r) =>
          r.id === id && r.type === "service"
            ? { ...r, status: status as any }
            : r,
        ),
      );
    } catch {
      alert("Erreur lors de l'action.");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Action réservation véhicule ──────────────────────────────────────────
  async function handleBookingAction(id: number, action: "approve" | "reject") {
    setActionLoading(id);
    try {
      const status = action === "approve" ? "approved" : "rejected";
      await api.patch(`/bookings/${id}/status`, { status });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === id && b.type === "location"
            ? { ...b, status: status as any }
            : b,
        ),
      );
    } catch {
      alert("Erreur lors de l'action.");
    } finally {
      setActionLoading(null);
    }
  }

  const navItems = [
    {
      label: "Tableau de bord",
      icon: LayoutDashboard,
      path: "/owner/dashboard",
    },
    { label: "Réservations", icon: CalendarCheck, path: "/owner/bookings" },
    { label: "Mes véhicules", icon: Car, path: "/owner/vehicules" },
    { label: "Ajouter", icon: PlusCircle, path: "/owner/add-vehicule" },
    { label: "Services", icon: Package, path: "/owner/services", active: true },
    { label: "Mon profil", icon: Settings, path: "/owner/profile" },
  ];
  // Fonction pour nettoyer l'URL de l'image
  const getImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.includes("http://auth-service")) {
      return url.replace("http://auth-service", "http://localhost");
    }
    if (url.includes("http://vehicle-service")) {
      return url.replace("http://vehicle-service", "http://localhost");
    }
    return url;
  };
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        user={user}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentPath="/owner/services"
      />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen((v) => !v)}
                className="lg:hidden text-gray-600"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Réservations reçues
                </h1>
                <p className="text-xs text-gray-400">
                  Véhicules · Bagages · Livraison · Déménagement
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {stats.pending > 0 && (
                <span className="flex items-center gap-1.5 bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-full text-sm font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {stats.pending} en attente
                </span>
              )}
              <button
                onClick={fetchBookings}
                className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-500"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button className="relative text-gray-500">
                <Bell className="w-6 h-6" />
                {stats.pending > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {stats.pending}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {[
              {
                label: "Total",
                val: stats.all,
                color: "border-gray-400",
                bg: "bg-gray-50",
                text: "text-gray-800",
              },
              {
                label: "En attente",
                val: stats.pending,
                color: "border-yellow-400",
                bg: "bg-yellow-50",
                text: "text-yellow-700",
              },
              {
                label: "Confirmées",
                val: stats.confirmed,
                color: "border-green-400",
                bg: "bg-green-50",
                text: "text-green-700",
              },
              {
                label: "En cours",
                val: stats.in_progress,
                color: "border-blue-400",
                bg: "bg-blue-50",
                text: "text-blue-700",
              },
              {
                label: "Terminées",
                val: stats.completed,
                color: "border-purple-400",
                bg: "bg-purple-50",
                text: "text-purple-700",
              },
            ].map(({ label, val, color, bg, text }) => (
              <div
                key={label}
                className={`${bg} rounded-xl border ${color} border-opacity-50 p-4`}
              >
                <p className="text-2xl font-bold text-gray-800">{val}</p>
                <p className={`text-xs font-medium ${text} mt-0.5`}>{label}</p>
              </div>
            ))}
          </div>

          {/* Revenus */}
          {stats.completed > 0 && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Revenus terminés</p>
                <p className="text-white text-2xl font-bold">
                  {stats.revenue.toLocaleString()} MAD
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-white/40" />
            </div>
          )}

          {/* Filtres */}
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher par client, ville, véhicule…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    activeFilter === key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                  {key === "pending" && stats.pending > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {stats.pending}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setServiceFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${serviceFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                Tous les services
              </button>
              <button
                onClick={() => setServiceFilter("location")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${serviceFilter === "location" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                🚗 Location véhicules
              </button>
              {Object.entries(SERVICE_CFG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setServiceFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    serviceFilter === key
                      ? `${cfg.badge}`
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <cfg.icon className="w-3 h-3" /> {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Liste des réservations */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-sm p-4 animate-pulse h-28"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
              <Package className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-gray-700 mb-1">
                {bookings.length === 0
                  ? "Aucune réservation reçue"
                  : "Aucun résultat"}
              </h3>
              <p className="text-sm text-gray-400">
                {bookings.length === 0
                  ? "Les réservations des clients apparaîtront ici."
                  : "Essayez de modifier vos filtres."}
              </p>
              {bookings.length > 0 && (
                <button
                  onClick={() => {
                    setActiveFilter("all");
                    setServiceFilter("all");
                    setSearch("");
                  }}
                  className="mt-4 text-sm text-blue-600 hover:underline"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((booking) => {
                // Configuration selon le type
                // Récupérer les configurations
                const statusConfig =
                  STATUS_CFG[booking.status as keyof typeof STATUS_CFG];
                const StatusIcon = statusConfig?.icon;

                let svcConfig;
                let iconEl;

                if (booking.type === "location") {
                  svcConfig = {
                    label: "Location véhicule",
                    border: "border-blue-400",
                    bg: "bg-blue-50",
                    icon: Car,
                  };
                  iconEl = <Car className="w-5 h-5 text-blue-600" />;
                } else {
                  const cfg =
                    SERVICE_CFG[
                      booking.service_type as keyof typeof SERVICE_CFG
                    ];
                  svcConfig = {
                    label: cfg.label,
                    border: cfg.border,
                    bg: cfg.bg,
                    icon: cfg.icon,
                  };
                  iconEl = <cfg.icon className="w-5 h-5" />;
                }

                return (
                  <div
                    key={`${booking.type}-${booking.id}`}
                    className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden border-l-4 ${svcConfig.border}`}
                  >
                    <div className="p-5">
                      {/* En-tête */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 ${svcConfig.bg} rounded-lg flex items-center justify-center`}
                          >
                            {iconEl}
                          </div>
                          <span className="font-semibold text-gray-800">
                            {svcConfig.label}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig?.bg || "bg-gray-100"} ${statusConfig?.text || "text-gray-600"}`}
                        >
                          {StatusIcon && <StatusIcon className="w-3 h-3" />}
                          {statusConfig?.label || booking.status}
                        </span>
                      </div>

                      {/* Contenu selon type */}
                      {booking.type === "location" && booking.vehicule ? (
                        // Location véhicule
                        <>
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                              {getImageUrl(booking.vehicule.image_url) ? (
                                <img
                                  src={getImageUrl(booking.vehicule.image_url)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Car className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-800 text-lg">
                                {booking.vehicule.brand}{" "}
                                {booking.vehicule.model}
                              </h3>
                              <div className="flex gap-3 text-sm text-gray-500 mt-1">
                                <span>{booking.vehicule.year}</span>
                                <span>•</span>
                                <span>{booking.vehicule.fuel_type}</span>
                                <span>•</span>
                                <span>{booking.vehicule.transmission}</span>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400">Début</p>
                              <p className="font-medium text-sm">
                                {booking.start_date
                                  ? new Date(
                                      booking.start_date,
                                    ).toLocaleDateString("fr-FR")
                                  : "—"}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400">Fin</p>
                              <p className="font-medium text-sm">
                                {booking.end_date
                                  ? new Date(
                                      booking.end_date,
                                    ).toLocaleDateString("fr-FR")
                                  : "—"}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400">Total</p>
                              <p className="font-medium text-sm text-green-600">
                                {booking.total_price} MAD
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400">Client</p>
                              <p className="font-medium text-sm truncate">
                                {booking.client?.name || "—"}
                              </p>
                            </div>
                          </div>
                          {(booking.status === "approved" ||
                            booking.status === "completed") && (
                            <div className="mb-4">
                              <button
                                onClick={() =>
                                  downloadContract(
                                    booking.id,
                                    booking.contract?.contract_number ??
                                      `CTR-${booking.id}`,
                                  )
                                }
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Contrat PDF
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        // Service
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-400">Départ</p>
                                <p className="text-sm font-medium">
                                  {booking.pickup_city || "—"}
                                </p>
                                {booking.pickup_address && (
                                  <p className="text-xs text-gray-400">
                                    {booking.pickup_address}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-400">Arrivée</p>
                                <p className="text-sm font-medium">
                                  {booking.delivery_city || "—"}
                                </p>
                                {booking.delivery_address && (
                                  <p className="text-xs text-gray-400">
                                    {booking.delivery_address}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                            {booking.pickup_date && (
                              <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-400">Date</p>
                                <p className="font-medium text-sm">
                                  {new Date(
                                    booking.pickup_date,
                                  ).toLocaleDateString("fr-FR")}
                                  {booking.pickup_time &&
                                    ` à ${booking.pickup_time.slice(0, 5)}`}
                                </p>
                              </div>
                            )}
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400">Prix</p>
                              <p className="font-medium text-sm text-green-600">
                                {booking.total_price} MAD
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400">Client</p>
                              <p className="font-medium text-sm truncate">
                                {booking.client?.name || "—"}
                              </p>
                            </div>
                          </div>
                          {booking.client_notes && (
                            <p className="text-xs text-gray-400 italic mb-3">
                              📝 {booking.client_notes}
                            </p>
                          )}
                        </>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 border-t pt-4 mt-2">
                        {booking.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                booking.type === "location"
                                  ? handleBookingAction(booking.id, "approve")
                                  : handleAction(booking.id, "confirmed")
                              }
                              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" /> Accepter
                            </button>
                            <button
                              onClick={() =>
                                booking.type === "location"
                                  ? handleBookingAction(booking.id, "reject")
                                  : handleAction(booking.id, "rejected")
                              }
                              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition flex items-center gap-1"
                            >
                              <XCircle className="w-4 h-4" /> Refuser
                            </button>
                          </>
                        )}
                        {booking.status === "confirmed" &&
                          booking.type === "service" && (
                            <button
                              onClick={() =>
                                handleAction(booking.id, "in_progress")
                              }
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center gap-1"
                            >
                              <ArrowRight className="w-4 h-4" /> Démarrer
                            </button>
                          )}
                        {booking.status === "in_progress" &&
                          booking.type === "service" && (
                            <button
                              onClick={() =>
                                handleAction(booking.id, "completed")
                              }
                              className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" /> Terminer
                            </button>
                          )}
                        {booking.type === "service" &&
                          booking.service_details && (
                            <button
                              onClick={() => setSelectedReq(booking as any)}
                              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" /> Détails
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-center text-xs text-gray-400 pt-2">
                {filtered.length} réservation{filtered.length > 1 ? "s" : ""}{" "}
                affichée{filtered.length > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Modal détail service */}
      {selectedReq && (
        <RequestDetailModal
          req={selectedReq}
          onClose={() => setSelectedReq(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
