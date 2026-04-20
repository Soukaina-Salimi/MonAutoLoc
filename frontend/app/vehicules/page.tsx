"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Car,
    Menu,
    X,
    MapPin,
    Mail,
    ChevronRight,
    Star,
    Fuel,
    Gauge,
    Phone,
    Users,
    Calendar,
    Search,
    Filter,
    SlidersHorizontal,
    Grid3x3,
    List,
    ArrowLeft,
    Heart,
    Share2,
    TrendingUp,
    Sparkles,
    Clock,
    CheckCircle,
    XCircle
} from "lucide-react";
import api from "@/lib/api";

// Interface pour le type Vehicle
interface Vehicle {
    id: number;
    brand: string;
    model: string;
    price_per_day: number;
    image_url: string | null;
    year: number;
    fuel_type: string;
    transmission: string;
    seats: number;
    rating?: number;
    available: boolean;
    description?: string;
    color?: string;
    mileage?: number;
}

export default function Vehicules() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedBrand, setSelectedBrand] = useState<string>("all");
    const [selectedFuel, setSelectedFuel] = useState<string>("all");
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
    const [sortBy, setSortBy] = useState<string>("popular");

    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        const fetchVehicles = async () => {
            try {
                // Simuler un délai de chargement
                await new Promise(resolve => setTimeout(resolve, 800));

                const res = await api.get("/vehicules");
                // Ajouter des données mock pour les filtres si nécessaire
                const enhancedVehicles = res.data.map((v: any) => ({
                    ...v,
                    rating: v.rating || (Math.random() * 2 + 3).toFixed(1),
                    available: v.available ?? true,
                    fuel_type: v.fuel_type || ["Essence", "Diesel", "Hybride", "Électrique"][Math.floor(Math.random() * 4)],
                    transmission: v.transmission || ["Manuelle", "Automatique"][Math.floor(Math.random() * 2)],
                    seats: v.seats || [4, 5, 7][Math.floor(Math.random() * 3)],
                }));

                setVehicles(enhancedVehicles);
                setFilteredVehicles(enhancedVehicles);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching vehicles:", error);
                setLoading(false);
            }
        };

        fetchVehicles();
    }, []);

    // Filtrer les véhicules
    useEffect(() => {
        let filtered = vehicles;

        // Recherche
        if (searchTerm) {
            filtered = filtered.filter(v =>
                v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.year.toString().includes(searchTerm)
            );
        }

        // Filtre par marque
        if (selectedBrand !== "all") {
            filtered = filtered.filter(v => v.brand === selectedBrand);
        }

        // Filtre par carburant
        if (selectedFuel !== "all") {
            filtered = filtered.filter(v => v.fuel_type === selectedFuel);
        }

        // Filtre par prix
        filtered = filtered.filter(v =>
            v.price_per_day >= priceRange[0] && v.price_per_day <= priceRange[1]
        );

        // Tri
        switch (sortBy) {
            case "price-asc":
                filtered.sort((a, b) => a.price_per_day - b.price_per_day);
                break;
            case "price-desc":
                filtered.sort((a, b) => b.price_per_day - a.price_per_day);
                break;
            case "rating":
                filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case "newest":
                filtered.sort((a, b) => b.year - a.year);
                break;
            default: // popular
                filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }

        setFilteredVehicles(filtered);
    }, [searchTerm, selectedBrand, selectedFuel, priceRange, sortBy, vehicles]);

    const handleDashboard = () => {
        const user = localStorage.getItem("user");
        if (user) {
            const userData = JSON.parse(user);
            if (userData.role?.name === "owner") {
                router.push("/owner/dashboard");
            } else if (userData.role?.name === "client") {
                router.push("/dashboard");
            } else {
                router.push("/dashboard");
            }
        } else {
            router.push("/login");
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
    const handleVehicleClick = (id: number) => {
        router.push(`/vehicules/${id}`);
    };

    const handleWishlist = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        // Logique pour ajouter aux favoris
        console.log("Added to wishlist:", id);
    };

    const handleShare = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        // Logique pour partager
        console.log("Share:", id);
    };

    // Obtenir les marques uniques pour les filtres
    const brands = ["all", ...new Set(vehicles.map(v => v.brand))];
    const fuelTypes = ["all", "Essence", "Diesel", "Hybride", "Électrique"];

    // Animation variants
    const fadeInUp = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 30 }
    };

    const staggerContainer = {
        animate: {
            transition: {
                staggerChildren: 0.05
            }
        }
    };
    const navItems = [
        { label: "Accueil", href: "/" },
        { label: "Véhicules", href: "/vehicules" },
        { label: "Comment ça marche", href: "#" },
        { label: "Propriétaire", href: "/owners" },
        { label: "Contact", href: "#" },
    ];
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
                className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Link href="/" className="flex items-center space-x-2">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Car className="w-6 h-6 text-white" />
                                </div>
                                <span className="font-bold text-xl text-gray-800">AutoRent</span>
                            </Link>
                        </motion.div>

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

            {/* Header avec filtre */}
            <section className="pt-32 pb-12 px-4 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center text-white mb-8"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Notre flotte de véhicules
                        </h1>
                        <p className="text-xl text-white/90 max-w-2xl mx-auto">
                            Découvrez notre sélection de véhicules de qualité pour tous vos déplacements
                        </p>
                    </motion.div>

                    {/* Barre de recherche */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="bg-white rounded-2xl shadow-2xl p-4"
                    >
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Rechercher par marque, modèle..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="popular">Les plus populaires</option>
                                    <option value="price-asc">Prix croissant</option>
                                    <option value="price-desc">Prix décroissant</option>
                                    <option value="rating">Mieux notés</option>
                                    <option value="newest">Plus récents</option>
                                </select>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={`px-4 py-3 border rounded-xl flex items-center gap-2 transition-all duration-200 ${isFilterOpen
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "border-gray-200 hover:border-blue-600 hover:text-blue-600"
                                        }`}
                                >
                                    <SlidersHorizontal className="w-5 h-5" />
                                    <span className="hidden sm:inline">Filtres</span>
                                </motion.button>
                            </div>
                        </div>

                        {/* Filtres avancés */}
                        <AnimatePresence>
                            {isFilterOpen && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="border-t border-gray-200 mt-4 pt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Marque
                                                </label>
                                                <select
                                                    value={selectedBrand}
                                                    onChange={(e) => setSelectedBrand(e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="all">Toutes les marques</option>
                                                    {brands.filter(b => b !== "all").map(brand => (
                                                        <option key={brand} value={brand}>{brand}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Carburant
                                                </label>
                                                <select
                                                    value={selectedFuel}
                                                    onChange={(e) => setSelectedFuel(e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="all">Tous types</option>
                                                    {fuelTypes.filter(f => f !== "all").map(fuel => (
                                                        <option key={fuel} value={fuel}>{fuel}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Prix max: {priceRange[1]}€/jour
                                                </label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="500"
                                                    step="10"
                                                    value={priceRange[1]}
                                                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                                    className="w-full accent-blue-600"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </section>

            {/* Main content */}
            <section className="py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    {/* En-tête avec résultats et vue */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <p className="text-gray-600">
                                <span className="font-semibold text-gray-900">{filteredVehicles.length}</span> véhicules trouvés
                            </p>
                        </div>
                        <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setViewMode("grid")}
                                className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-blue-600 text-white" : "hover:bg-gray-100"
                                    }`}
                            >
                                <Grid3x3 className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setViewMode("list")}
                                className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-blue-600 text-white" : "hover:bg-gray-100"
                                    }`}
                            >
                                <List className="w-5 h-5" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Affichage des véhicules */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                <Car className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600 animate-pulse" />
                            </div>
                        </div>
                    ) : filteredVehicles.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-20 bg-white rounded-2xl shadow-sm"
                        >
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-12 h-12 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucun véhicule trouvé</h3>
                            <p className="text-gray-500 mb-4">Essayez de modifier vos filtres de recherche</p>
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setSelectedBrand("all");
                                    setSelectedFuel("all");
                                    setPriceRange([0, 500]);
                                }}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Réinitialiser les filtres
                            </button>
                        </motion.div>
                    ) : viewMode === "grid" ? (
                        // Vue grille
                        <motion.div
                            variants={staggerContainer}
                            initial="initial"
                            animate="animate"
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        >
                            {filteredVehicles.map((vehicle) => (
                                <motion.div
                                    key={vehicle.id}
                                    variants={fadeInUp}
                                    layout
                                    whileHover={{ y: -8 }}
                                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
                                    onClick={() => handleVehicleClick(vehicle.id)}
                                >
                                    <div className="relative h-48 bg-gradient-to-br from-blue-600 to-purple-600 overflow-hidden">
                                        {vehicle.image_url ? (
                                            <img
                                                src={vehicle.image_url}
                                                alt={`${vehicle.brand} ${vehicle.model}`}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Car className="w-20 h-20 text-white/50" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-lg">
                                            <p className="text-sm font-bold text-blue-600">{vehicle.price_per_day}€<span className="text-xs font-normal text-gray-500">/jour</span></p>
                                        </div>
                                        {!vehicle.available && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <span className="bg-red-500 text-white px-4 py-2 rounded-full font-medium">
                                                    Indisponible
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-800">
                                                    {vehicle.brand} {vehicle.model}
                                                </h3>
                                                <p className="text-sm text-gray-500">{vehicle.year}</p>
                                            </div>
                                            {vehicle.rating && (
                                                <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg">
                                                    <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                                                    <span className="text-xs font-medium">{vehicle.rating}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            <div className="flex items-center text-xs text-gray-600">
                                                <Fuel className="w-3 h-3 mr-1 text-gray-400" />
                                                {vehicle.fuel_type}
                                            </div>
                                            <div className="flex items-center text-xs text-gray-600">
                                                <Gauge className="w-3 h-3 mr-1 text-gray-400" />
                                                {vehicle.transmission}
                                            </div>
                                            <div className="flex items-center text-xs text-gray-600">
                                                <Users className="w-3 h-3 mr-1 text-gray-400" />
                                                {vehicle.seats} pl.
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={(e) => handleWishlist(e, vehicle.id)}
                                                className="p-2 border border-gray-200 rounded-lg hover:border-red-500 hover:text-red-500 transition-colors"
                                            >
                                                <Heart className="w-4 h-4" />
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={(e) => handleShare(e, vehicle.id)}
                                                className="p-2 border border-gray-200 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-colors"
                                            >
                                                <Share2 className="w-4 h-4" />
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 text-sm"
                                            >
                                                Réserver
                                            </motion.button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        // Vue liste
                        <motion.div
                            variants={staggerContainer}
                            initial="initial"
                            animate="animate"
                            className="space-y-4"
                        >
                            {filteredVehicles.map((vehicle) => (
                                <motion.div
                                    key={vehicle.id}
                                    variants={fadeInUp}
                                    layout
                                    whileHover={{ scale: 1.01 }}
                                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
                                    onClick={() => handleVehicleClick(vehicle.id)}
                                >
                                    <div className="flex flex-col md:flex-row">
                                        <div className="md:w-64 h-48 bg-gradient-to-br from-blue-600 to-purple-600 relative">
                                            {vehicle.image_url ? (
                                                <img
                                                    src={vehicle.image_url}
                                                    alt={`${vehicle.brand} ${vehicle.model}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Car className="w-20 h-20 text-white/50" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-2xl font-bold text-gray-800">
                                                        {vehicle.brand} {vehicle.model}
                                                    </h3>
                                                    <p className="text-gray-500">{vehicle.year} • {vehicle.fuel_type} • {vehicle.transmission}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-bold text-blue-600">{vehicle.price_per_day}€</p>
                                                    <p className="text-sm text-gray-500">par jour</p>
                                                </div>
                                            </div>

                                            <p className="text-gray-600 mb-4 line-clamp-2">
                                                {vehicle.description || `Découvrez la ${vehicle.brand} ${vehicle.model}, un véhicule élégant et confortable parfait pour vos déplacements.`}
                                            </p>

                                            <div className="flex items-center gap-4 mb-4">
                                                {vehicle.rating && (
                                                    <div className="flex items-center">
                                                        <div className="flex">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} className={`w-4 h-4 ${i < Math.floor(vehicle.rating!) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                                                            ))}
                                                        </div>
                                                        <span className="ml-2 text-sm text-gray-600">{vehicle.rating}/5</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Users className="w-4 h-4 mr-1" />
                                                    {vehicle.seats} places
                                                </div>
                                                <div className={`flex items-center text-sm ${vehicle.available ? 'text-green-600' : 'text-red-600'}`}>
                                                    {vehicle.available ? (
                                                        <>
                                                            <CheckCircle className="w-4 h-4 mr-1" />
                                                            Disponible
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-4 h-4 mr-1" />
                                                            Indisponible
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={(e) => handleWishlist(e, vehicle.id)}
                                                    className="px-4 py-2 border border-gray-200 rounded-lg hover:border-red-500 hover:text-red-500 transition-colors"
                                                >
                                                    <Heart className="w-4 h-4" />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200"
                                                >
                                                    Voir les détails
                                                </motion.button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300 mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Car className="w-6 h-6 text-white" />
                                </div>
                                <span className="font-bold text-xl text-white">AutoRent</span>
                            </div>
                            <p className="text-sm text-gray-400">
                                La solution idéale pour la location de véhicules en toute simplicité.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-4">Liens rapides</h3>
                            <ul className="space-y-2 text-sm">
                                <li><Link href="/" className="hover:text-white transition">Accueil</Link></li>
                                <li><Link href="/vehicules" className="hover:text-white transition">Véhicules</Link></li>
                                <li><Link href="/#how-it-works" className="hover:text-white transition">Comment ça marche</Link></li>
                                <li><Link href="/#contact" className="hover:text-white transition">Contact</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-4">Contact</h3>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    +33 1 23 45 67 89
                                </li>
                                <li className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    contact@autorent.com
                                </li>
                                <li className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Paris, France
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-4">Informations</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="hover:text-white transition">CGV</a></li>
                                <li><a href="#" className="hover:text-white transition">Politique de confidentialité</a></li>
                                <li><a href="#" className="hover:text-white transition">Mentions légales</a></li>
                                <li><a href="#" className="hover:text-white transition">FAQ</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
                        <p>&copy; {new Date().getFullYear()} AutoRent. Tous droits réservés.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}