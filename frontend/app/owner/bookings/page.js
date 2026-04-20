"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import {
    Calendar,
    User,
    Car,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    LogOut,
    LayoutDashboard,
    PlusCircle,
    Settings,
    Bell,
    Menu
} from "lucide-react";

export default function OwnerBookings() {
    const [bookings, setBookings] = useState([]);
    const [filteredBookings, setFilteredBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = JSON.parse(localStorage.getItem("user"));

        if (!token || !userData) {
            router.push("/login");
            return;
        }

        if (userData.role.name !== "owner") {
            router.push("/unauthorized");
            return;
        }

        setUser(userData);

        api.get("/owner-bookings")
            .then(res => {
                setBookings(res.data);
                setFilteredBookings(res.data);
                setLoading(false);
            })
            .catch(err => {
                if (err.response?.status === 401) {
                    router.push("/login");
                }
                setLoading(false);
            });

    }, []);

    // Filter bookings based on search and status
    useEffect(() => {
        let filtered = bookings;

        if (searchTerm) {
            filtered = filtered.filter(b =>
                b.vehicule.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.vehicule.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.user.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter(b => b.status === statusFilter);
        }

        setFilteredBookings(filtered);
        setCurrentPage(1);
    }, [searchTerm, statusFilter, bookings]);

    const updateStatus = async (id, status) => {
        try {
            await api.patch(`/bookings/${id}/status`, { status });
            // Update local state instead of reloading
            setBookings(prev =>
                prev.map(b => b.id === id ? { ...b, status } : b)
            );
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
    };

    const handleBookings = () => {
        router.push("/owner/bookings");
    };

    const handleVehicules = () => {
        router.push("/owner/vehicules");
    };

    const handleAddVehicules = () => {
        router.push("/owner/add-vehicule");
    };

    const handleDashboard = () => {
        router.push("/owner/dashboard");
    };

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

    // Status badge component
    const StatusBadge = ({ status }) => {
        const statusConfig = {
            pending: { bg: "bg-yellow-100", text: "text-yellow-600", icon: Clock, label: "En attente" },
            approved: { bg: "bg-green-100", text: "text-green-600", icon: CheckCircle, label: "Approuvée" },
            rejected: { bg: "bg-red-100", text: "text-red-600", icon: XCircle, label: "Rejetée" },
            completed: { bg: "bg-blue-100", text: "text-blue-600", icon: CheckCircle, label: "Terminée" }
        };

        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des réservations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar pour desktop */}
            <div className={`
                fixed inset-y-0 left-0 transform 
                ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
                lg:relative lg:translate-x-0 transition duration-200 ease-in-out
                w-64 bg-white shadow-lg z-30
            `}>
                <div className="h-full flex flex-col">
                    {/* Profile Section */}
                    <div className="p-6 border-b">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-xl">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-800 truncate">{user?.name}</h3>
                                <p className="text-sm text-gray-500">Propriétaire</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4">
                        <div className="space-y-2">
                            <button
                                onClick={handleDashboard}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition duration-200"
                            >
                                <LayoutDashboard className="w-5 h-5" />
                                <span>Tableau de bord</span>
                            </button>
                            <button
                                onClick={handleBookings}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg font-medium"
                            >
                                <Calendar className="w-5 h-5" />
                                <span>Réservations</span>
                            </button>
                            <button
                                onClick={handleVehicules}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition duration-200"
                            >
                                <Car className="w-5 h-5" />
                                <span>Mes véhicules</span>
                            </button>
                            <button
                                onClick={handleAddVehicules}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition duration-200"
                            >
                                <PlusCircle className="w-5 h-5" />
                                <span>Ajouter véhicule</span>
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.removeItem("token");
                                    localStorage.removeItem("user");
                                    setUser(null);
                                    router.push("/");
                                }} className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition duration-200"
                            >
                                <PlusCircle className="w-5 h-5" />
                                <span>Logout</span>
                            </button>
                        </div>

                        <div className="absolute bottom-4 left-4 right-4">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition duration-200"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Déconnexion</span>
                            </button>
                        </div>
                    </nav>
                </div>
            </div>

            {/* Mobile sidebar backdrop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Main Content */}
            <div className="flex-1">
                {/* Header */}
                <header className="bg-white shadow-sm sticky top-0 z-10">
                    <div className="px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className="lg:hidden text-gray-600 hover:text-gray-900"
                                >
                                    <Menu className="w-6 h-6" />
                                </button>
                                <h1 className="text-2xl font-bold text-gray-800">Demandes de réservation</h1>
                            </div>

                            <div className="flex items-center space-x-4">
                                <button className="relative text-gray-600 hover:text-gray-900">
                                    <Bell className="w-6 h-6" />
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                                        3
                                    </span>
                                </button>
                                <button className="text-gray-600 hover:text-gray-900">
                                    <Settings className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="p-4 sm:p-6 lg:p-8">
                    {/* Filters */}
                    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Rechercher par véhicule ou client..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="sm:w-48 relative">
                                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                                >
                                    <option value="all">Tous les statuts</option>
                                    <option value="pending">En attente</option>
                                    <option value="approved">Approuvées</option>
                                    <option value="rejected">Rejetées</option>
                                    <option value="completed">Terminées</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Bookings List */}
                    {currentItems.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune réservation</h3>
                            <p className="text-gray-500">
                                {searchTerm || statusFilter !== "all"
                                    ? "Aucune réservation ne correspond à vos critères"
                                    : "Vous n'avez pas encore de réservations"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {currentItems.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition duration-300 overflow-hidden"
                                >
                                    <div className="p-6">
                                        {/* En-tête de la carte */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                                            <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                                                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                                    <Car className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-800 text-lg">
                                                        {booking.vehicule.brand} {booking.vehicule.model || ''}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        Immatriculation: {booking.vehicule.license_plate}
                                                    </p>
                                                </div>
                                            </div>
                                            <StatusBadge status={booking.status} />
                                        </div>

                                        {/* Détails de la réservation */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <User className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Client</p>
                                                    <p className="font-medium text-gray-700">{booking.user.name}</p>
                                                    <p className="text-xs text-gray-500">{booking.user.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                    <Calendar className="w-4 h-4 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Période</p>
                                                    <p className="font-medium text-gray-700">
                                                        {new Date(booking.start_date).toLocaleDateString('fr-FR')}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        au {new Date(booking.end_date).toLocaleDateString('fr-FR')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <Clock className="w-4 h-4 text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Durée</p>
                                                    <p className="font-medium text-gray-700">
                                                        {Math.ceil((new Date(booking.end_date) - new Date(booking.start_date)) / (1000 * 60 * 60 * 24))} jours
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Total: ${booking.total_price || "À calculer"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions pour les réservations en attente */}
                                        {booking.status === "pending" && (
                                            <div className="border-t pt-4 mt-2">
                                                <p className="text-sm text-yellow-600 mb-3 flex items-center">
                                                    <Clock className="w-4 h-4 mr-1" />
                                                    En attente de votre décision
                                                </p>
                                                <div className="flex space-x-3">
                                                    <button
                                                        onClick={() => updateStatus(booking.id, "approved")}
                                                        className="flex-1 sm:flex-none px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition duration-200 font-medium flex items-center justify-center"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        Approuver
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(booking.id, "rejected")}
                                                        className="flex-1 sm:flex-none px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition duration-200 font-medium flex items-center justify-center"
                                                    >
                                                        <XCircle className="w-4 h-4 mr-2" />
                                                        Rejeter
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Message pour les réservations approuvées/rejetées */}
                                        {booking.status !== "pending" && (
                                            <div className="border-t pt-4 mt-2">
                                                <p className="text-sm text-gray-500">
                                                    {booking.status === "approved" && "✅ Réservation approuvée - En attente du client"}
                                                    {booking.status === "rejected" && "❌ Réservation rejetée"}
                                                    {booking.status === "completed" && "✓ Réservation terminée"}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between bg-white rounded-xl shadow-sm px-4 py-3 mt-6">
                                    <div className="flex items-center">
                                        <p className="text-sm text-gray-700">
                                            Page <span className="font-medium">{currentPage}</span> sur{" "}
                                            <span className="font-medium">{totalPages}</span>
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}