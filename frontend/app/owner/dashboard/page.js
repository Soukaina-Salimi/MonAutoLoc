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
    TrendingUp,
    Users,
    Settings,
    Bell,
    Menu,
    X
} from "lucide-react";

export default function OwnerDashboard() {
    const [data, setData] = useState(null);
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

        api.get("/owner/dashboard")
            .then(res => setData(res.data))
            .catch(() => router.push("/login"));

    }, []);

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

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement de votre tableau de bord...</p>
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
                                onClick={() => router.push("/owner/dashboard")}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg font-medium"
                            >
                                <LayoutDashboard className="w-5 h-5" />
                                <span>Tableau de bord</span>
                            </button>
                            <button
                                onClick={handleBookings}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition duration-200"
                            >
                                <CalendarCheck className="w-5 h-5" />
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
                                <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
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
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {/* Earnings Card */}
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Revenus totaux</p>
                                    <p className="text-3xl font-bold text-gray-800">
                                        ${data.total_earnings?.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-green-500 mt-2">+12.5% ce mois</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        {/* Bookings Card */}
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Réservations totales</p>
                                    <p className="text-3xl font-bold text-gray-800">
                                        {data.total_bookings}
                                    </p>
                                    <p className="text-xs text-blue-500 mt-2">+8 nouvelles ce mois</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <CalendarCheck className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        {/* Vehicles Card */}
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Véhicules</p>
                                    <p className="text-3xl font-bold text-gray-800">
                                        {data.total_vehicles}
                                    </p>
                                    <p className="text-xs text-purple-500 mt-2">+2 ajoutés ce mois</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                    <Car className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Graphique d'activité (placeholder) */}
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Activité récente</h2>
                        <div className="h-64 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                            <p className="text-gray-500">Graphique d'activité (à implémenter)</p>
                        </div>
                    </div>

                    {/* Actions rapides */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <button
                            onClick={handleBookings}
                            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition duration-300 text-left group"
                        >
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition duration-300">
                                <CalendarCheck className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-2">Demandes de réservation</h3>
                            <p className="text-sm text-gray-500">Gérez les demandes en attente</p>
                        </button>

                        <button
                            onClick={handleVehicules}
                            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition duration-300 text-left group"
                        >
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition duration-300">
                                <Car className="w-6 h-6 text-purple-600" />
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-2">Mes véhicules</h3>
                            <p className="text-sm text-gray-500">Consultez et gérez votre flotte</p>
                        </button>

                        <button
                            onClick={handleAddVehicules}
                            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition duration-300 text-left group"
                        >
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition duration-300">
                                <PlusCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-2">Ajouter un véhicule</h3>
                            <p className="text-sm text-gray-500">Élargissez votre flotte</p>
                        </button>
                    </div>

                    {/* Dernières réservations (tableau) */}
                    <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Dernières réservations</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Client</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Véhicule</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Dates</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Montant</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4">Jean Dupont</td>
                                        <td className="py-3 px-4">Renault Clio</td>
                                        <td className="py-3 px-4">15-20 Mars 2024</td>
                                        <td className="py-3 px-4">$250</td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs">
                                                En attente
                                            </span>
                                        </td>
                                    </tr>
                                    <tr className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4">Marie Martin</td>
                                        <td className="py-3 px-4">Peugeot 308</td>
                                        <td className="py-3 px-4">10-15 Avril 2024</td>
                                        <td className="py-3 px-4">$380</td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs">
                                                Confirmée
                                            </span>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="py-3 px-4">Pierre Durand</td>
                                        <td className="py-3 px-4">Citroën C3</td>
                                        <td className="py-3 px-4">5-8 Mai 2024</td>
                                        <td className="py-3 px-4">$180</td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs">
                                                Terminée
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}