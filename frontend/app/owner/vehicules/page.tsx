"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import MarketingPublisher from "@/components/MarketingPublisher";

import {
  Car,
  PlusCircle,
  LayoutDashboard,
  Calendar,
  DollarSign,
  Settings,
  Bell,
  Menu,
  LogOut,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Gauge,
  CalendarDays,
} from "lucide-react";

// Interface pour l'utilisateur
interface User {
  id: number;
  name: string;
  email: string;
  role: {
    id: number;
    name: string;
  };
}

// Interface pour le véhicule
interface Vehicle {
  id: number;
  brand: string;
  model: string;
  year: number;
  price_per_day: number;
  image_url: string | null;
  fuel_type?: string;
  transmission?: string;
  license_plate: string;
  description?: string;
  seats?: number;
  available?: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function Vehicles() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(6);
  const currentPath = "/owner/vehicules";
  const [openMarketing, setOpenMarketing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  useEffect(() => {
    const userData = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!userData || !token) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser: User = JSON.parse(userData);

      if (parsedUser.role.name !== "owner") {
        router.push("/dashboard");
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.error("Error parsing user:", error);
      router.push("/login");
      return;
    }

    const fetchVehicles = async () => {
      try {
        const res = await api.get<Vehicle[]>("/vehicules");
        setVehicles(res.data);
        setFilteredVehicles(res.data);
        setLoading(false);
      } catch (error: any) {
        console.error(error);
        if (error.response?.status === 401) {
          router.push("/login");
        }
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  // Filter vehicles based on search
  useEffect(() => {
    let filtered = vehicles;

    if (searchTerm) {
      filtered = vehicles.filter(
        (v) =>
          v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.year?.toString().includes(searchTerm) ||
          v.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredVehicles(filtered);
    setCurrentPage(1);
  }, [searchTerm, vehicles]);

  const handleAddVehicules = () => {
    router.push("/owner/add-vehicule");
  };

  const handleDashboard = () => {
    router.push("/owner/dashboard");
  };

  const handleBookings = () => {
    router.push("/owner/bookings");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const handleEditVehicle = (id: number) => {
    router.push(`/owner/vehicules/${id}/edit`);
  };

  const handleViewVehicle = (id: number) => {
    router.push(`/owner/vehicules/${id}`);
  };

  const handleDeleteVehicle = async (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce véhicule ?")) {
      try {
        await api.delete(`/vehicules/${id}`);
        setVehicles((prev) => prev.filter((v) => v.id !== id));
        alert("✅ Véhicule supprimé avec succès");
      } catch (error) {
        console.error("Error deleting vehicle:", error);
        alert("❌ Erreur lors de la suppression");
      }
    }
  };

  // Calculer le prix moyen
  const calculateAveragePrice = (): number => {
    if (vehicles.length === 0) return 0;
    const sum = vehicles.reduce((acc, v) => acc + v.price_per_day, 0);
    return Math.round(sum / vehicles.length);
  };

  // Calculer l'année moyenne
  const calculateAverageYear = (): number => {
    if (vehicles.length === 0) return 0;
    const sum = vehicles.reduce((acc, v) => acc + v.year, 0);
    return Math.round(sum / vehicles.length);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredVehicles.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de vos véhicules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {openMarketing && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setOpenMarketing(false)}
                className="bg-white px-3 py-1 rounded-lg"
              >
                Fermer
              </button>
            </div>

            <MarketingPublisher
              vehicle={selectedVehicle}
              ownerId={user?.id ?? 0}
            />
          </div>
        </div>
      )}
      {/* Sidebar */}
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
                <h1 className="text-2xl font-bold text-gray-800">
                  Mes véhicules
                </h1>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total véhicules</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {vehicles.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Car className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Prix moyen/jour</p>
                  <p className="text-3xl font-bold text-gray-800">
                    ${calculateAveragePrice()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Année moyenne</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {calculateAverageYear()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Add Button */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par marque, modèle ou année..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleAddVehicules}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition duration-200 flex items-center justify-center"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Ajouter un véhicule
            </button>
          </div>

          {/* Vehicles Grid */}
          {currentItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun véhicule
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? "Aucun véhicule ne correspond à votre recherche"
                  : "Vous n'avez pas encore ajouté de véhicules"}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleAddVehicules}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition duration-200"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Ajouter votre premier véhicule
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentItems.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition duration-300 overflow-hidden group"
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-gray-200">
                      {vehicle.image_url ? (
                        <img
                          src={vehicle.image_url}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600">
                          <Car className="w-16 h-16 text-white opacity-50" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-lg shadow-md">
                        <p className="text-sm font-bold text-blue-600">
                          ${vehicle.price_per_day}/jour
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">
                            {vehicle.brand} {vehicle.model}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {vehicle.year}
                          </p>
                        </div>
                      </div>

                      {/* Caracteristiques */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Fuel className="w-4 h-4 mr-1 text-gray-400" />
                          {vehicle.fuel_type || "Essence"}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Gauge className="w-4 h-4 mr-1 text-gray-400" />
                          {vehicle.transmission || "Manuelle"}
                        </div>
                      </div>

                      {/* License plate */}
                      <div className="bg-gray-100 rounded-lg px-3 py-2 mb-4">
                        <p className="text-xs text-gray-500">Immatriculation</p>
                        <p className="font-mono font-medium">
                          {vehicle.license_plate}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewVehicle(vehicle.id)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition duration-200 flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </button>
                        <button
                          onClick={() => handleEditVehicle(vehicle.id)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 flex items-center justify-center"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            setOpenMarketing(true);
                          }}
                          className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm"
                        >
                          Marketing IA
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl shadow-sm px-4 py-3 mt-6">
                  <div className="flex items-center">
                    <p className="text-sm text-gray-700">
                      Page <span className="font-medium">{currentPage}</span>{" "}
                      sur <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
