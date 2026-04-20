"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import {
    LogOut, Car, CalendarCheck, DollarSign, PlusCircle,
    LayoutDashboard, Settings, Bell, Menu,
    Package, Luggage, Truck, CheckCircle, XCircle,
    Clock, ChevronRight, MapPin, User
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
}
interface ServiceRequest {
    id: number;
    service_type: "transport_bagages" | "livraison_colis" | "demenagement";
    status: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
    // ✅ noms corrects du backend
    pickup_date: string;        // était scheduled_date
    pickup_time: string | null; // était scheduled_time
    pickup_city: string;
    delivery_city: string;
    pickup_address: string | null;
    delivery_address: string | null;
    estimated_price: number | null; // était price
    client_notes: string | null;    // était notes
    service_details: any;
    created_at: string;
    client_name: string | null;
    owner_name: string | null;
    // client n'est pas un objet — le backend envoie client_name directement
}

// ── Helpers ────────────────────────────────────────────────
const SERVICE_CONFIG = {
    transport_bagages: { label: "Transport Bagages", icon: Luggage, color: "teal", bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-500" },
    livraison_colis: { label: "Livraison Colis", icon: Package, color: "orange", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-500" },
    demenagement: { label: "Déménagement", icon: Truck, color: "rose", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-500" },
} as const;

const STATUS_CONFIG = {
    pending: { label: "En attente", bg: "bg-yellow-100", text: "text-yellow-700" },
    confirmed: { label: "Acceptée", bg: "bg-green-100", text: "text-green-700" },
    rejected: { label: "Refusée", bg: "bg-red-100", text: "text-red-700" },
    cancelled: { label: "Annulée", bg: "bg-gray-100", text: "text-gray-600" },
    completed: { label: "Terminée", bg: "bg-blue-100", text: "text-blue-700" },
};

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Composant carte demande ────────────────────────────────
function RequestCard({ req, onAction }: { req: ServiceRequest; onAction: (id: number, action: "approve" | "reject") => void }) {
    const svc = SERVICE_CONFIG[req.service_type];
    const Icon = svc.icon;
    const status = STATUS_CONFIG[req.status];

    return (
        <div className={`bg-white rounded-xl border-l-4 ${svc.border} shadow-sm p-4 hover:shadow-md transition`}>
            <div className="flex items-start justify-between gap-3">
                {/* Icône + service */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 ${svc.bg} rounded-xl flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${svc.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold ${svc.text}`}>{svc.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
                                {status.label}
                            </span>
                        </div>
                      
                      
                       {/* Adresses → afficher villes si adresses null */}
    <div className="flex items-start gap-1">
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

    {/* Date → pickup_date au lieu de scheduled_date */}
    <span>{formatDate(req.pickup_date)}</span>
    {req.pickup_time && <span>à {req.pickup_time.slice(0, 5)}</span>}

    {/* Prix → estimated_price */}
    {req.estimated_price && (
        <span className="text-xs font-semibold text-gray-800">{req.estimated_price} MAD</span>
    )}

    {/* Notes → client_notes */}
    {req.client_notes && (
        <p className="text-xs text-gray-400 mt-1 italic truncate">
            📝 {req.client_notes.slice(0, 80)}...
        </p>
    )}

    {/* Client → client_name string direct */}
    {req.client_name && (
        <div className="flex items-center gap-1 mt-1">
            <User className="w-3 h-3 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{req.client_name}</span>
        </div>
    )}
                    </div>
                </div>

                {/* Actions — seulement si pending */}
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

    // Demandes de services
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [reqLoading, setReqLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "confirmed" | "completed">("pending");
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Services actifs de l'owner
    const [hasOtherServices, setHasOtherServices] = useState(false);

    const router = useRouter();
    const currentPath = "/owner/dashboard";

    // ── Init ────────────────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        if (!token || !userData) { router.replace("/login"); return; }

        try {
            const parsed: UserOwner = JSON.parse(userData);
            if (parsed.role.name !== "owner") { router.replace("/"); return; }
            setUser(parsed);

            // Vérifie si l'owner a des services autres que location
            const services = parsed.owner_services ?? [];
            const other = services.some(s => s.service_type !== "location");
            setHasOtherServices(other);

            setIsChecking(false);
        } catch {
            localStorage.clear();
            router.replace("/login");
            return;
        }

        // Stats véhicules
        api.get("/owner/stats")
            .then(res => setData(res.data as DashboardStats))
            .catch(() => setData({ total_earnings: 0, total_bookings: 0, total_vehicles: 0 }));
    }, []);

    // ── Charger les demandes si owner a d'autres services ──
    useEffect(() => {
        if (!hasOtherServices) return;
        fetchRequests();
    }, [hasOtherServices, activeFilter]);

    async function fetchRequests() {
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

            await api.patch(`/service-requests/${id}/status`, {
                status: status
            });

            // update local
            setRequests(prev => prev.map(r =>
                r.id === id ? { ...r, status } : r
            ));

        } catch {
            alert("Erreur lors de l'action. Réessayez.");
        } finally {
            setActionLoading(null);
        }
    }

    // ── Render guards ───────────────────────────────────────
    if (isChecking) return null;
    if (!data) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Chargement...</p>
            </div>
        </div>
    );

    // ── Compter les pending ─────────────────────────────────
    const pendingCount = requests.filter(r => r.status === "pending").length;

    return (
        <div className="min-h-screen bg-gray-50 flex">

            {/* ── SIDEBAR ─────────────────────────────────── */}
              <Sidebar
                user={user || undefined}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                currentPath={currentPath}
            />
            {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}


            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* ── MAIN CONTENT ────────────────────────────── */}
            <div className="flex-1 overflow-hidden">
                {/* Header */}
                <header className="bg-white shadow-sm sticky top-0 z-10">
                    <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden text-gray-600">
                                <Menu className="w-6 h-6" />
                            </button>
                            <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
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
                            <button className="text-gray-600"><Settings className="w-6 h-6" /></button>
                        </div>
                    </div>
                </header>

                <main className="p-4 sm:p-6 lg:p-8 overflow-y-auto">

                    {/* ── STATS CARDS ─── (inchangées + 1 nouvelle si services) */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 ${hasOtherServices ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                        {/* Revenus */}
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Revenus totaux</p>
                                    <p className="text-3xl font-bold text-gray-800">{data.total_earnings?.toLocaleString()} MAD</p>
                                    <p className="text-xs text-green-500 mt-2">+12.5% ce mois</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        {/* Réservations véhicules */}
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Réservations véhicules</p>
                                    <p className="text-3xl font-bold text-gray-800">{data.total_bookings}</p>
                                    <p className="text-xs text-blue-500 mt-2">+8 nouvelles ce mois</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <CalendarCheck className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        {/* Véhicules */}
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Véhicules</p>
                                    <p className="text-3xl font-bold text-gray-800">{data.total_vehicles}</p>
                                    <p className="text-xs text-purple-500 mt-2">+2 ajoutés ce mois</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                    <Car className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </div>

                        {/* ★ NOUVELLE CARD — Demandes services (si actif) */}
                        {hasOtherServices && (
                            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Demandes services</p>
                                        <p className="text-3xl font-bold text-gray-800">{requests.length}</p>
                                        {pendingCount > 0
                                            ? <p className="text-xs text-orange-500 mt-2 font-semibold">{pendingCount} en attente de réponse</p>
                                            : <p className="text-xs text-gray-400 mt-2">Aucune en attente</p>
                                        }
                                    </div>
                                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                        <Package className="w-6 h-6 text-orange-600" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── GRAPHIQUE ACTIVITÉ (inchangé) ─────── */}
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Activité récente</h2>
                        <div className="h-48 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                            <p className="text-gray-400 text-sm">Graphique d'activité (à implémenter)</p>
                        </div>
                    </div>

                    {/* ── ACTIONS RAPIDES (inchangées) ─────────── */}
                    <div className={`grid grid-cols-1 gap-4 mb-8 ${hasOtherServices ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
                        {[
                            { label: "Réservations", desc: "Gérez les demandes en attente", icon: CalendarCheck, bg: "bg-blue-100", hover: "hover:bg-blue-200", text: "text-blue-600", onClick: () => router.push("/owner/bookings") },
                            { label: "Mes véhicules", desc: "Consultez et gérez votre flotte", icon: Car, bg: "bg-purple-100", hover: "hover:bg-purple-200", text: "text-purple-600", onClick: () => router.push("/owner/vehicules") },
                            { label: "Ajouter véhicule", desc: "Élargissez votre flotte", icon: PlusCircle, bg: "bg-green-100", hover: "hover:bg-green-200", text: "text-green-600", onClick: () => router.push("/owner/add-vehicule") },
                        ].map(item => (
                            <button key={item.label} onClick={item.onClick}
                                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition text-left group">
                                <div className={`w-12 h-12 ${item.bg} rounded-lg flex items-center justify-center mb-4 group-hover:${item.hover} transition`}>
                                    <item.icon className={`w-6 h-6 ${item.text}`} />
                                </div>
                                <h3 className="font-semibold text-gray-800 mb-1">{item.label}</h3>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                            </button>
                        ))}

                        {/* Action rapide Demandes (si actif) */}
                        {hasOtherServices && (
                            <button
                                onClick={() => document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" })}
                                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition text-left group relative">
                                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-200 transition">
                                    <Package className="w-6 h-6 text-orange-600" />
                                </div>
                                <h3 className="font-semibold text-gray-800 mb-1">Demandes services</h3>
                                <p className="text-sm text-gray-500">Bagages, livraison, déménagement</p>
                                {pendingCount > 0 && (
                                    <span className="absolute top-4 right-4 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                                        {pendingCount} new
                                    </span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* ── DERNIÈRES RÉSERVATIONS VÉHICULES (inchangé) ── */}
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-800">Dernières réservations véhicules</h2>
                            <button onClick={() => router.push("/owner/bookings")}
                                className="text-sm text-blue-600 flex items-center gap-1 hover:underline">
                                Voir tout <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        {["Client", "Véhicule", "Dates", "Montant", "Statut"].map(h => (
                                            <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-500">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { client: "Jean Dupont", v: "Renault Clio", d: "15-20 Mars 2024", m: "250", s: "pending", sl: "En attente", sc: "bg-yellow-100 text-yellow-600" },
                                        { client: "Marie Martin", v: "Peugeot 308", d: "10-15 Avril 2024", m: "380", s: "confirmed", sl: "Confirmée", sc: "bg-green-100 text-green-600" },
                                        { client: "Pierre Durand", v: "Citroën C3", d: "5-8 Mai 2024", m: "180", s: "completed", sl: "Terminée", sc: "bg-blue-100 text-blue-600" },
                                    ].map((row, i) => (
                                        <tr key={i} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4 text-sm">{row.client}</td>
                                            <td className="py-3 px-4 text-sm">{row.v}</td>
                                            <td className="py-3 px-4 text-sm">{row.d}</td>
                                            <td className="py-3 px-4 text-sm font-medium">{row.m} MAD</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.sc}`}>{row.sl}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ══ SECTION DEMANDES DE SERVICES ★ NOUVEAU ══ */}
                    {hasOtherServices && (
                        <div id="services-section" className="bg-white rounded-xl shadow-sm p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-800">Demandes de services</h2>
                                    <p className="text-sm text-gray-400 mt-0.5">Bagages · Livraison · Déménagement</p>
                                </div>
                                {pendingCount > 0 && (
                                    <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-sm font-semibold">
                                        {pendingCount} en attente
                                    </span>
                                )}
                            </div>

                            {/* Filtres */}
                            <div className="flex gap-2 mb-5 flex-wrap">
                                {(["pending", "confirmed", "completed", "all"] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setActiveFilter(f)}
                                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition
                                            ${activeFilter === f
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                                        {{ pending: "En attente", confirmed: "Acceptées", completed: "Terminées", all: "Toutes" }[f]}
                                        {f === "pending" && pendingCount > 0 && (
                                            <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Liste */}
                            {reqLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
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
                                    {requests.map(req => (
                                        <RequestCard
                                            key={req.id}
                                            req={req}
                                            onAction={actionLoading === null ? handleAction : () => { }}
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