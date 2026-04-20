"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
    X
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

export default function MyBookings() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
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
        totalSpent: 0
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
                // Simuler un délai
                await new Promise(resolve => setTimeout(resolve, 800));

                const res = await api.get("/my-bookings");

                // Enrichir les données avec des informations supplémentaires
                const enhancedBookings = res.data.map((booking: any) => ({
                    ...booking,
                    owner: booking.owner || {
                        id: 1,
                        name: "Jean Dupont",
                        email: "jean.dupont@example.com",
                        phone: "+33 6 12 34 56 78"
                    }
                }));

                setBookings(enhancedBookings);
                setFilteredBookings(enhancedBookings);

                // Calculer les statistiques
                const stats = {
                    total: enhancedBookings.length,
                    pending: enhancedBookings.filter((b: Booking) => b.status === "pending").length,
                    approved: enhancedBookings.filter((b: Booking) => b.status === "approved").length,
                    completed: enhancedBookings.filter((b: Booking) => b.status === "completed").length,
                    cancelled: enhancedBookings.filter((b: Booking) => b.status === "cancelled" || b.status === "rejected").length,
                    totalSpent: enhancedBookings
                        .filter((b: Booking) => b.status === "completed" || b.status === "approved")
                        .reduce((sum: number, b: Booking) => sum + b.total_price, 0)
                };
                setStats(stats);

                setLoading(false);
            } catch (err: any) {
                console.error("Error fetching bookings:", err);
                if (err.response?.status === 401) {
                    router.push("/login");
                }
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
            filtered = filtered.filter(b =>
                b.vehicule.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.vehicule.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.owner?.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtre par statut
        if (statusFilter !== "all") {
            filtered = filtered.filter(b => b.status === statusFilter);
        }

        // Tri
        switch (sortBy) {
            case "newest":
                filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
            case "oldest":
                filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                break;
            case "price-desc":
                filtered.sort((a, b) => b.total_price - a.total_price);
                break;
            case "price-asc":
                filtered.sort((a, b) => a.total_price - b.total_price);
                break;
            case "start-date":
                filtered.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
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
            setBookings(prev =>
                prev.map(b =>
                    b.id === id ? { ...b, status: "cancelled" } : b
                )
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
    const currentItems = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

    // Fonction pour obtenir le style du statut
    const getStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { bg: "bg-yellow-100", text: "text-yellow-600", icon: Clock, label: "En attente" },
            approved: { bg: "bg-green-100", text: "text-green-600", icon: CheckCircle, label: "Confirmée" },
            rejected: { bg: "bg-red-100", text: "text-red-600", icon: XCircle, label: "Rejetée" },
            cancelled: { bg: "bg-gray-100", text: "text-gray-600", icon: XCircle, label: "Annulée" },
            completed: { bg: "bg-blue-100", text: "text-blue-600", icon: CheckCircle, label: "Terminée" }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
            </span>
        );
    };

    // Animation variants
    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <Calendar className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                    <p className="mt-4 text-gray-600">Chargement de vos réservations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <div className="flex items-center space-x-4">
                            <Link href="/" className="flex items-center space-x-2">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Car className="w-6 h-6 text-white" />
                                </div>
                                <span className="font-bold text-xl text-gray-800">AutoRent</span>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-8">

                            {navItems.map((item) => (
                                <motion.div
                                    key={item.label}
                                    whileHover={{ y: -2 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <Link
                                        href={item.href}
                                        className="text-gray-600 hover:text-blue-600 transition duration-200 font-medium relative group"
                                    >
                                        {item.label}
                                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all group-hover:w-full"></span>
                                    </Link>
                                </motion.div>
                            ))}

                            {user ? (
                                <div className="flex items-center space-x-4">
                                    <span className="text-gray-700 font-medium">
                                        Bonjour, {user.name}
                                    </span>

                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        onClick={() => router.push("/Client/profile")}
                                        className="text-blue-600 font-medium"
                                    >
                                        Profil
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        onClick={() => router.push("/Client/bookings")}
                                        className="text-blue-600 font-medium"
                                    >
                                        Réservations
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        onClick={() => {
                                            localStorage.removeItem("token");
                                            localStorage.removeItem("user");
                                            setUser(null);
                                            router.push("/");
                                        }}
                                        className="text-red-500 font-medium"
                                    >
                                        Logout
                                    </motion.button>
                                </div>
                            ) : (
                                <>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        onClick={handleLogin}
                                        className="text-gray-600 hover:text-blue-600 font-medium"
                                    >
                                        Connexion
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        onClick={handleRegister}
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-xl font-medium"
                                    >
                                        Inscription
                                    </motion.button>
                                </>
                            )}
                        </div>


                        {/* Mobile menu button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden text-gray-600 hover:text-gray-900"
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </motion.button>
                    </div>
                </div>
            </motion.nav>

            {/* Header avec stats */}
            <section className="pt-28 pb-8 px-4 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-white mb-8"
                    >
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Mes réservations</h1>
                        <p className="text-white/90">Gérez toutes vos réservations en un coup d'œil</p>
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
                            <p className="text-2xl font-bold text-yellow-300">{stats.pending}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-white/70 text-sm">Confirmées</p>
                            <p className="text-2xl font-bold text-green-300">{stats.approved}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-white/70 text-sm">Terminées</p>
                            <p className="text-2xl font-bold text-blue-300">{stats.completed}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-white/70 text-sm">Dépensé</p>
                            <p className="text-2xl font-bold text-white">{stats.totalSpent}€</p>
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
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucune réservation</h3>
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
                                {currentItems.map((booking, index) => (
                                    <motion.div
                                        key={booking.id}
                                        variants={fadeInUp}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                                    >
                                        <div className="p-6">
                                            {/* En-tête */}
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                                                <div className="flex items-center space-x-4 mb-2 lg:mb-0">
                                                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                                                        {booking.vehicule.image_url ? (
                                                            <img
                                                                src={booking.vehicule.image_url}
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
                                                            {booking.vehicule.brand} {booking.vehicule.model}
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
                                                {getStatusBadge(booking.status)}
                                            </div>

                                            {/* Détails */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <CalendarDays className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Début</p>
                                                        <p className="font-medium text-gray-800">
                                                            {new Date(booking.start_date).toLocaleDateString('fr-FR')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                                        <CalendarDays className="w-4 h-4 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Fin</p>
                                                        <p className="font-medium text-gray-800">
                                                            {new Date(booking.end_date).toLocaleDateString('fr-FR')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                        <DollarSign className="w-4 h-4 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Total</p>
                                                        <p className="font-medium text-gray-800">{booking.total_price}€</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                                        <User className="w-4 h-4 text-orange-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Propriétaire</p>
                                                        <p className="font-medium text-gray-800">{booking.owner?.name}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-wrap gap-2 border-t pt-4">
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleViewVehicle(booking.vehicule.id)}
                                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition flex items-center"
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Voir le véhicule
                                                </motion.button>

                                                {booking.owner?.email && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => handleContactOwner(booking.owner?.email)}
                                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition flex items-center"
                                                    >
                                                        <Mail className="w-4 h-4 mr-2" />
                                                        Contacter
                                                    </motion.button>
                                                )}

                                                {(booking.status === "pending" || booking.status === "approved") && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => cancelBooking(booking.id)}
                                                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center ml-auto"
                                                    >
                                                        <XCircle className="w-4 h-4 mr-2" />
                                                        Annuler
                                                    </motion.button>
                                                )}
                                            </div>

                                            {/* Message d'info pour les réservations annulées/rejetées */}
                                            {(booking.status === "rejected" || booking.status === "cancelled") && (
                                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                    <p className="text-sm text-gray-600 flex items-center">
                                                        <AlertCircle className="w-4 h-4 mr-2 text-gray-400" />
                                                        {booking.status === "rejected"
                                                            ? "Cette réservation a été rejetée par le propriétaire"
                                                            : "Cette réservation a été annulée"}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </AnimatePresence>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center space-x-2 mt-8">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                                        className={`w-10 h-10 rounded-lg font-medium transition ${currentPage === i + 1
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                                            : 'border border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {i + 1}
                                    </motion.button>
                                ))}

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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
                        <p>&copy; {new Date().getFullYear()} AutoRent. Tous droits réservés.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}