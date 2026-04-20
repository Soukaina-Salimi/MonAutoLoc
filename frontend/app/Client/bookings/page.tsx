"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import ChatbotWidget from "@/components/ChatbotWidget";

import {
  Car,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  FileText,
  User,
  LogOut,
  Settings,
  Bell,
  Search,
  Filter,
  Eye,
  Download,
  Mail,
  Phone,
  MapPin,
  Star,
  CreditCard,
  DollarSign,
  CalendarDays,
  ArrowRight,
  Home,
  X,
} from "lucide-react";
import api from "@/lib/api";

// Interface pour le type Booking
interface Booking {
  id: number;
  vehicule: {
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
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "completed";
  total_price: number;
  created_at: string;
  owner?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
}

// Interface pour l'utilisateur connecté
interface User {
  id: number;
  name: string;
  email: string;
  role: {
    name: string;
  };
}

// Type unifié — couvre les 2 sources
interface UnifiedBooking {
  id: number;
  type: "location" | "service"; // ← distingue les deux
  service_type: string; // "location" | "transport_bagages" | ...
  status:
    | "pending"
    | "approved"
    | "confirmed"
    | "rejected"
    | "cancelled"
    | "completed";
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
  pickup_address?: string;
  delivery_address?: string;
  pickup_city?: string;
  delivery_city?: string;
  pickup_date?: string;
  pickup_time?: string;
  service_details?: any;
  client_notes?: string;
  estimated_price?: number;
  final_price?: number;
  contract?: {
    contract_number: string;
    status?: string;
    has_pdf?: boolean;
  } | null;
  // Commun
  owner?: { id: number; name: string; email: string; phone?: string };
}

export default function MyBookings() {
  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<UnifiedBooking[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(5);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    cancelled: 0,
    totalSpent: 0,
  });

  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    // Vérifier l'authentification
    if (!token) {
      router.push("/login");
      return;
    }

    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);

        // Rediriger si c'est un owner
        if (userData.role?.name === "owner") {
          router.push("/owner/bookings");
          return;
        }
      } catch (error) {
        console.error("Error parsing user:", error);
      }
    }

    // Charger les réservations
    const fetchBookings = async () => {
      try {
        setLoading(true);

        // ── Appels parallèles ────────────────────────────────
        const [bookingsRes, servicesRes] = await Promise.allSettled([
          api.get("/bookings/my"),
          api.get("/service-requests/my"), // ← nouveau endpoint
        ]);

        const unified: UnifiedBooking[] = [];

        // ── Traiter les bookings location ────────────────────
        if (bookingsRes.status === "fulfilled") {
          const locationBookings: UnifiedBooking[] = bookingsRes.value.data.map(
            (b: any) => ({
              ...b,
              type: "location",
              service_type: "location",
              total_price: b.total_price,
              owner: b.owner || null,
              contract: b.contract || null,
            }),
          );
          unified.push(...locationBookings);
        }

        // ── Traiter les service_requests ─────────────────────
        if (servicesRes.status === "fulfilled") {
          const serviceBookings: UnifiedBooking[] = servicesRes.value.data.map(
            (r: any) => ({
              id: r.id,
              type: "service",
              service_type: r.service_type,
              status: r.status === "confirmed" ? "approved" : r.status, // normaliser
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
              owner: r.owner || null,
            }),
          );
          unified.push(...serviceBookings);
        }

        // Trier par date décroissante
        unified.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        setBookings(unified);
        setFilteredBookings(unified);

        // Stats unifiées
        setStats({
          total: unified.length,
          pending: unified.filter((b) => b.status === "pending").length,
          approved: unified.filter((b) => b.status === "approved").length,
          completed: unified.filter((b) => b.status === "completed").length,
          cancelled: unified.filter(
            (b) => b.status === "cancelled" || b.status === "rejected",
          ).length,
          totalSpent: unified
            .filter((b) => b.status === "completed" || b.status === "approved")
            .reduce((sum, b) => sum + (b.total_price || 0), 0),
        });
      } catch (err: any) {
        if (err.response?.status === 401) router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  // Filtrer et trier les réservations
  useEffect(() => {
    let filtered = [...bookings];

    // Recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (b) =>
          b.vehicule?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          false ||
          b.vehicule?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          false ||
          b.owner?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          false,
      );
    }

    // Filtre par statut
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // Tri
    switch (sortBy) {
      case "newest":
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        break;
      case "oldest":
        filtered.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        break;
      case "price-desc":
        filtered.sort((a, b) => b.total_price - a.total_price);
        break;
      case "price-asc":
        filtered.sort((a, b) => a.total_price - b.total_price);
        break;
      case "start-date":
        filtered.sort(
          (a, b) =>
            new Date(a.start_date || 0).getTime() -
            new Date(b.start_date || 0).getTime(),
        );
        break;
    }

    setFilteredBookings(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, bookings]);

  const cancelBooking = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir annuler cette réservation ?")) {
      return;
    }

    try {
      await api.patch(`/bookings/${id}/cancel`);

      // Mettre à jour localement
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)),
      );

      alert("✅ Réservation annulée avec succès");
    } catch (err: any) {
      console.error("Error cancelling booking:", err);
      alert(err.response?.data?.message || "Erreur lors de l'annulation");
    }
  };

  const handleViewDetails = (id: number) => {
    router.push(`/bookings/${id}`);
  };

  const handleViewVehicle = (id: number) => {
    router.push(`/vehicules/${id}`);
  };

  const handleContactOwner = (email?: string) => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };
  const handleLogin = (): void => {
    router.push("/login");
  };

  const handleOwners = (): void => {
    router.push("/owners");
  };
  const handleRegister = (): void => {
    router.push("/register");
  };

  // Fonction pour nettoyer l'URL de l'image
  const getImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    // Remplacer l'URL interne par l'URL publique
    if (url.includes("http://auth-service")) {
      return url.replace("http://auth-service", "http://localhost");
    }
    if (url.includes("http://vehicle-service")) {
      return url.replace("http://vehicle-service", "http://localhost");
    }
    return url;
  };
  const navItems = [
    { label: "Accueil", href: "/" },
    { label: "Véhicules", href: "/vehicules" },
    { label: "Comment ça marche", href: "#" },
    { label: "Propriétaire", href: "/owners" },
    { label: "Contact", href: "#" },
  ];
  const handleDashboard = () => {
    router.push("/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBookings.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  // Fonction pour obtenir le style du statut
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        bg: "bg-yellow-100",
        text: "text-yellow-600",
        icon: Clock,
        label: "En attente",
      },
      approved: {
        bg: "bg-green-100",
        text: "text-green-600",
        icon: CheckCircle,
        label: "Confirmée",
      },
      rejected: {
        bg: "bg-red-100",
        text: "text-red-600",
        icon: XCircle,
        label: "Rejetée",
      },
      cancelled: {
        bg: "bg-gray-100",
        text: "text-gray-600",
        icon: XCircle,
        label: "Annulée",
      },
      completed: {
        bg: "bg-blue-100",
        text: "text-blue-600",
        icon: CheckCircle,
        label: "Terminée",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <Calendar className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600 animate-pulse" />
          </div>
          <p className="mt-4 text-gray-600">
            Chargement de vos réservations...
          </p>
        </div>
      </div>
    );
  }
  // Card pour les demandes de services (bagages/livraison/déménagement)
  const SERVICE_CONFIG = {
    transport_bagages: {
      label: "Transport Bagages",
      icon: "🧳",
      color: "teal",
      border: "border-teal-400",
      bg: "bg-teal-50",
    },
    livraison_colis: {
      label: "Livraison Colis",
      icon: "📦",
      color: "orange",
      border: "border-orange-400",
      bg: "bg-orange-50",
    },
    demenagement: {
      label: "Déménagement",
      icon: "🚛",
      color: "rose",
      border: "border-rose-400",
      bg: "bg-rose-50",
    },
    location: {
      label: "Location véhicule",
      icon: "🚗",
      color: "blue",
      border: "border-blue-400",
      bg: "bg-blue-50",
    },
  };

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
  const cancelServiceRequest = async (id: number) => {
    if (!confirm("Annuler cette demande ?")) return;
    try {
      await api.patch(`/service-requests/${id}/cancel`);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === id && b.type === "service"
            ? { ...b, status: "cancelled" }
            : b,
        ),
      );
    } catch {
      alert("Erreur lors de l'annulation");
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navbar user={user} setUser={setUser} />
      <ChatbotWidget />
      {/* Header avec stats */}
      <section className="pt-28 pb-8 px-4 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Mes réservations
            </h1>
            <p className="text-white/90">
              Gérez toutes vos réservations en un coup d'œil
            </p>
          </motion.div>

          {/* Statistiques */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
          >
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/70 text-sm">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/70 text-sm">En attente</p>
              <p className="text-2xl font-bold text-yellow-300">
                {stats.pending}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/70 text-sm">Confirmées</p>
              <p className="text-2xl font-bold text-green-300">
                {stats.approved}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/70 text-sm">Terminées</p>
              <p className="text-2xl font-bold text-blue-300">
                {stats.completed}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/70 text-sm">Dépensé</p>
              <p className="text-2xl font-bold text-white">
                {stats.totalSpent}€
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filtres */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-4"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par véhicule ou propriétaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="approved">Confirmées</option>
                <option value="completed">Terminées</option>
                <option value="cancelled">Annulées</option>
                <option value="rejected">Rejetées</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="newest">Plus récentes</option>
                <option value="oldest">Plus anciennes</option>
                <option value="start-date">Par date de début</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="price-asc">Prix croissant</option>
              </select>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Liste des réservations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-12 text-center"
          >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Aucune réservation
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== "all"
                ? "Aucune réservation ne correspond à vos critères"
                : "Vous n'avez pas encore de réservations"}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Link
                href="/vehicules"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                Découvrir les véhicules
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            )}
          </motion.div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              <div className="space-y-4">
                {currentItems.map((booking, index) => {
                  const svcConfig =
                    SERVICE_CONFIG[
                      booking.service_type as keyof typeof SERVICE_CONFIG
                    ] ?? SERVICE_CONFIG.location;

                  return (
                    <motion.div
                      key={`${booking.type}-${booking.id}`}
                      variants={fadeInUp}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ delay: index * 0.05 }}
                      className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4 ${svcConfig.border}`}
                    >
                      <div className="p-6">
                        {/* Badge type de service */}
                        <div className="flex items-center justify-between mb-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${svcConfig.bg} text-gray-700`}
                          >
                            {svcConfig.icon} {svcConfig.label}
                          </span>
                          {getStatusBadge(booking.status)}
                        </div>

                        {/* ── Contenu selon le type ─────────────────── */}
                        {booking.type === "location" && booking.vehicule ? (
                          /* ── LOCATION VÉHICULE (existant) ──────── */
                          <>
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                                {booking.vehicule.image_url ? (
                                  <img
                                    src={getImageUrl(
                                      booking.vehicule.image_url,
                                    )}
                                    alt={`${booking.vehicule.brand} ${booking.vehicule.model}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                    <Car className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <Link
                                  href={`/vehicules/${booking.vehicule.id}`}
                                  className="text-xl font-bold text-gray-800 hover:text-blue-600 transition"
                                >
                                  {booking.vehicule.brand}{" "}
                                  {booking.vehicule.model}
                                </Link>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
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
                                  {new Date(
                                    booking.start_date!,
                                  ).toLocaleDateString("fr-FR")}
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-400">Fin</p>
                                <p className="font-medium text-sm">
                                  {new Date(
                                    booking.end_date!,
                                  ).toLocaleDateString("fr-FR")}
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-400">Total</p>
                                <p className="font-medium text-sm text-green-600">
                                  {booking.total_price} MAD
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-400">
                                  Propriétaire
                                </p>
                                <p className="font-medium text-sm truncate">
                                  {booking.owner?.name || "—"}
                                </p>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* ── SERVICE (bagages/livraison/déménagement) ── */
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-400">
                                    Adresse départ
                                  </p>
                                  <p className="text-sm font-medium text-gray-700">
                                    {booking.pickup_address ||
                                      booking.pickup_city ||
                                      "—"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-400">
                                    Adresse arrivée
                                  </p>
                                  <p className="text-sm font-medium text-gray-700">
                                    {booking.delivery_address ||
                                      booking.delivery_city ||
                                      "—"}
                                  </p>
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
                                <p className="text-xs text-gray-400">
                                  Prix estimé
                                </p>
                                <p className="font-medium text-sm text-green-600">
                                  {booking.final_price
                                    ? `${booking.final_price} MAD`
                                    : booking.estimated_price
                                      ? `~${booking.estimated_price} MAD`
                                      : "À confirmer"}
                                </p>
                              </div>
                              {booking.owner && (
                                <div className="bg-gray-50 rounded-xl p-3">
                                  <p className="text-xs text-gray-400">
                                    Prestataire
                                  </p>
                                  <p className="font-medium text-sm truncate">
                                    {booking.owner.name}
                                  </p>
                                </div>
                              )}
                            </div>
                            {booking.client_notes && (
                              <p className="text-xs text-gray-400 italic mb-3 truncate">
                                📝 {booking.client_notes.slice(0, 100)}
                              </p>
                            )}
                          </>
                        )}

                        {/* ── Actions communes ───────────────────────── */}
                        <div className="flex flex-wrap gap-2 border-t pt-4">
                          {booking.type === "location" && booking.vehicule && (
                            <button
                              onClick={() =>
                                handleViewVehicle(booking.vehicule!.id)
                              }
                              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" /> Voir le véhicule
                            </button>
                          )}
                          {booking.owner?.email && (
                            <button
                              onClick={() =>
                                handleContactOwner(booking.owner?.email)
                              }
                              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition flex items-center gap-2"
                            >
                              <Mail className="w-4 h-4" /> Contacter
                            </button>
                          )}
                          {booking.owner?.phone && (
                            <a
                              href={`tel:${booking.owner.phone}`}
                              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition flex items-center gap-2"
                            >
                              <Phone className="w-4 h-4" /> Appeler
                            </a>
                          )}
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
                          {booking.status === "pending" && (
                            <button
                              onClick={() =>
                                booking.type === "location"
                                  ? cancelBooking(booking.id)
                                  : cancelServiceRequest(booking.id)
                              }
                              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition flex items-center gap-2 ml-auto"
                            >
                              <XCircle className="w-4 h-4" /> Annuler
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-8">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>

                {[...Array(totalPages)].map((_, i) => (
                  <motion.button
                    key={i + 1}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-10 h-10 rounded-lg font-medium transition ${
                      currentPage === i + 1
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        : "border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {i + 1}
                  </motion.button>
                ))}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm">
            <p>
              &copy; {new Date().getFullYear()} AutoRent. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
