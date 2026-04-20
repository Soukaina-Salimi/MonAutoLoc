"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import {
    Car,
    Sun,
    Maximize2,
    ParkingCircle,
    Smartphone,
    Calendar,
    Fuel,
    Gauge,
    Users,
    Star,
    ChevronLeft,
    Heart,
    Share2,
    CheckCircle,
    XCircle,
    AlertCircle,
    User,
    Mail,
    Phone,
    MapPin,
    Clock,
    Camera,
    Shield,
    CreditCard,
    Info,
    ArrowRight,
    CalendarDays,
    Award,
    Wrench,
    Map,
    Navigation,
    Battery,
    Wind,
    Thermometer,
    Snowflake,
    Cigarette,
    Dog,
    Wifi,
    Coffee,
    Luggage,
    Menu,
    LayoutDashboard,
    LogOut,
    Settings,
    Bell,
    Home,
    BookOpen,
    MessageCircle,
    ThumbsUp,
    ChevronRight,
    ChevronLeft as ChevronLeftIcon
} from "lucide-react";

// Interface pour les images
interface VehicleImage {
    id: number;
    path: string;
    vehicule_id: number;
    created_at?: string;
}

// Interface pour le véhicule
interface Vehicle {
    id: number;
    brand: string;
    model: string;
    address: string;
    puissance: number;
    city: string;
    price_per_day: number;
    year: number;
    fuel_type: string;
    transmission: string;
    seats: number;
    rating?: number;
    available: boolean;
    description?: string;
    color?: string;
    mileage?: number;
    license_plate?: string;
    features?: string[];
    location?: string;
    insurance_included?: boolean;
    unlimited_mileage?: boolean;
    user?: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        rating?: number;
        total_vehicles?: number;
        member_since?: string;
        avatar?: string;
    };
    images?: VehicleImage[];
    specifications?: {
        engine?: string;
        power?: number;
        consumption?: string;
        co2?: number;
        trunk?: number;
        doors?: number;
    };
    reviews_count?: number;
    reviews_avg_rating?: number;
}

// Interface pour l'utilisateur connecté
interface User {
    id: number;
    name: string;
    email: string;
    role: {
        id: number;
        name: string;
    };
}

export default function VehicleDetailsPage() {
    const { id } = useParams();
    const router = useRouter();

    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [bookingLoading, setBookingLoading] = useState<boolean>(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    const [totalPrice, setTotalPrice] = useState<number>(0);
    const [numberOfDays, setNumberOfDays] = useState<number>(0);
    const [isLiked, setIsLiked] = useState<boolean>(false);
    const [showShareMenu, setShowShareMenu] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<"details" | "features" | "reviews">("details");
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    const [fullscreenImage, setFullscreenImage] = useState<boolean>(false);

    useEffect(() => {
        // Vérifier l'utilisateur connecté
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                setCurrentUser(user);
                setIsAuthenticated(true);
            } catch (error) {
                console.error("Error parsing user:", error);
            }
        }

        // Charger les détails du véhicule
        const fetchVehicle = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/vehicules/${id}`);

                // Enrichir les données avec des informations supplémentaires
                const enhancedVehicle: Vehicle = {
                    ...res.data,
                    rating: res.data.reviews_avg_rating || 4.8,
                    available: res.data.available ?? true,
                    fuel_type: res.data.fuel_type || ["Essence", "Diesel", "Hybride", "Électrique"][Math.floor(Math.random() * 4)],
                    transmission: res.data.transmission || ["Manuelle", "Automatique"][Math.floor(Math.random() * 2)],
                    seats: res.data.seats || 5,
                    description: res.data.description || `Découvrez la ${res.data.brand} ${res.data.model}, un véhicule alliant confort, performance et élégance. Parfaite pour vos déplacements professionnels ou vos voyages en famille.`,
                    features: res.data.features || [
                        "Climatisation automatique",
                        "Régulateur de vitesse",
                        "Bluetooth",
                        "GPS",
                        "Caméra de recul",
                        "Sièges chauffants",
                        "Toit panoramique",
                        "Apple CarPlay / Android Auto",
                        "Aide au stationnement",
                        "Vitres électriques"
                    ].slice(0, Math.floor(Math.random() * 5) + 5),
                    location: res.data.location || "Paris 75001",
                    insurance_included: true,
                    unlimited_mileage: true,
                    license_plate: res.data.license_plate || `AB-${Math.floor(Math.random() * 1000)}-CD`,
                    color: res.data.color || ["Blanc", "Noir", "Gris", "Bleu", "Rouge"][Math.floor(Math.random() * 5)],
                    mileage: res.data.mileage || Math.floor(Math.random() * 50000),
                    specifications: res.data.specifications || {
                        engine: res.data.engine || ["1.2L", "1.6L", "2.0L", "Électrique"][Math.floor(Math.random() * 4)],
                        power: res.data.power || Math.floor(Math.random() * 100) + 80,
                        consumption: res.data.consumption || `${(Math.random() * 3 + 4).toFixed(1)}L/100km`,
                        co2: res.data.co2 || Math.floor(Math.random() * 50) + 100,
                        trunk: res.data.trunk || Math.floor(Math.random() * 200) + 300,
                        doors: res.data.doors || [3, 5][Math.floor(Math.random() * 2)],
                    },
                    user: res.data.user || {
                        id: 1,
                        name: "Jean Dupont",
                        email: "jean.dupont@example.com",
                        phone: "+33 6 12 34 56 78",
                        rating: 4.9,
                        total_vehicles: 12,
                        member_since: "2020",
                        avatar: null
                    },
                    images: res.data.images || []
                };

                setVehicle(enhancedVehicle);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching vehicle:", error);
                setLoading(false);
            }
        };

        if (id) {
            fetchVehicle();
        }
    }, [id]);

    // Calculer le prix total quand les dates changent
    useEffect(() => {
        if (startDate && endDate && vehicle) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                setNumberOfDays(diffDays);
                setTotalPrice(diffDays * vehicle.price_per_day);
            } else {
                setNumberOfDays(0);
                setTotalPrice(0);
            }
        }
    }, [startDate, endDate, vehicle]);

    const handlePrevImage = () => {
        if (!vehicle?.images?.length) return;
        setSelectedImageIndex((prev) =>
            prev === 0 ? vehicle.images!.length - 1 : prev - 1
        );
    };

    const handleNextImage = () => {
        if (!vehicle?.images?.length) return;
        setSelectedImageIndex((prev) =>
            prev === vehicle.images!.length - 1 ? 0 : prev + 1
        );
    };

    const handleBook = async () => {
        if (!isAuthenticated) {
            if (confirm("Vous devez être connecté pour effectuer une réservation. Voulez-vous vous connecter ?")) {
                router.push("/login");
            }
            return;
        }

        if (!startDate || !endDate) {
            alert("Veuillez sélectionner les dates de location");
            return;
        }

        if (numberOfDays <= 0) {
            alert("La date de fin doit être postérieure à la date de début");
            return;
        }

        if (currentUser?.role?.name === "owner") {
            alert("En tant que propriétaire, vous ne pouvez pas réserver de véhicules");
            return;
        }

        try {
            setBookingLoading(true);

            await api.post("/bookings", {
                vehicule_id: id,
                start_date: startDate,
                end_date: endDate,
                total_price: totalPrice
            });

            alert("✅ Réservation effectuée avec succès !");
            router.push("/bookings");

        } catch (error: any) {
            console.error("Booking error:", error);

            if (error.response?.status === 401) {
                alert("Session expirée. Veuillez vous reconnecter.");
                router.push("/login");
            } else if (error.response?.status === 403) {
                alert("Vous n'êtes pas autorisé à effectuer cette réservation");
            } else if (error.response?.status === 422) {
                alert("Erreur de validation : " + error.response.data.message);
            } else {
                alert("Erreur lors de la réservation. Veuillez réessayer.");
            }
        } finally {
            setBookingLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
    };

    const handleDashboard = () => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }

        if (currentUser?.role?.name === "owner") {
            router.push("/owner/dashboard");
        } else {
            router.push("/dashboard");
        }
    };

    const handleContactOwner = () => {
        if (!vehicle?.user?.email) return;
        window.location.href = `mailto:${vehicle.user.email}?subject=Question%20sur%20${vehicle.brand}%20${vehicle.model}`;
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${vehicle?.brand} ${vehicle?.model}`,
                    text: `Découvrez ce véhicule sur AutoRent !`,
                    url: window.location.href,
                });
            } catch (error) {
                console.error("Error sharing:", error);
            }
        } else {
            setShowShareMenu(!showShareMenu);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Lien copié dans le presse-papier !");
        setShowShareMenu(false);
    };

    // Obtenir les icônes des fonctionnalités
    const getFeatureIcon = (feature: string) => {
        const icons: { [key: string]: any } = {
            "Climatisation": Snowflake,
            "GPS": Navigation,
            "Bluetooth": Wifi,
            "Caméra": Camera,
            "Sièges chauffants": Thermometer,
            "Toit panoramique": Sun,
            "Apple CarPlay": Smartphone,
            "Android Auto": Smartphone,
            "Aide au stationnement": ParkingCircle,
            "Vitres électriques": Maximize2,
        };

        for (const [key, Icon] of Object.entries(icons)) {
            if (feature.includes(key)) return Icon;
        }
        return CheckCircle;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <Car className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                    <p className="mt-4 text-gray-600">Chargement du véhicule...</p>
                </div>
            </div>
        );
    }

    if (!vehicle) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Véhicule non trouvé</h2>
                    <p className="text-gray-600 mb-6">Le véhicule que vous recherchez n'existe pas ou a été supprimé.</p>
                    <button
                        onClick={() => router.back()}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200"
                    >
                        Retour à la liste
                    </button>
                </div>
            </div>
        );
    }

    const images = vehicle.images?.map(
        img => `http://127.0.0.1:8000/storage/${img.path}`
    ) || [];
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <nav className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.back()}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <Link href="/" className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Car className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-bold text-lg text-gray-800">AutoRent</span>
                            </Link>
                        </div>

                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => setIsLiked(!isLiked)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                            </button>
                            <div className="relative">
                                <button
                                    onClick={handleShare}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <Share2 className="w-5 h-5 text-gray-600" />
                                </button>

                                <AnimatePresence>
                                    {showShareMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border py-1 z-50"
                                        >
                                            <button
                                                onClick={copyToClipboard}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition flex items-center"
                                            >
                                                <Link href={""} className="w-4 h-4 mr-2" />
                                                Copier le lien
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <button
                                onClick={handleDashboard}
                                className="hidden md:block text-gray-600 hover:text-blue-600 transition-colors font-medium"
                            >
                                Dashboard
                            </button>
                            {!isAuthenticated && (
                                <button
                                    onClick={() => router.push("/login")}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200"
                                >
                                    Connexion
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Contenu principal */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Colonne gauche - Images et infos */}
                    <div className="lg:col-span-2">
                        {/* Galerie d'images avec navigation */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6"
                        >
                            <div className="relative h-96 bg-gradient-to-br from-blue-600 to-purple-600">
                                {images.length > 0 && images[selectedImageIndex] ? (
                                    <>
                                        <img
                                            src={images[selectedImageIndex]}
                                            alt={`${vehicle.brand} ${vehicle.model}`}
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => setFullscreenImage(true)}
                                        />

                                        {/* Boutons de navigation pour les images */}
                                        {images.length > 1 && (
                                            <>
                                                <button
                                                    onClick={handlePrevImage}
                                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                                                >
                                                    <ChevronLeftIcon className="w-6 h-6" />
                                                </button>
                                                <button
                                                    onClick={handleNextImage}
                                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                                                >
                                                    <ChevronRight className="w-6 h-6" />
                                                </button>

                                                {/* Indicateur de position */}
                                                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                                                    {selectedImageIndex + 1} / {images.length}
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Car className="w-32 h-32 text-white/50" />
                                    </div>
                                )}

                                {/* Badges */}
                                <div className="absolute top-4 left-4 flex gap-2">
                                    {vehicle.available ? (
                                        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            Disponible
                                        </span>
                                    ) : (
                                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                            <XCircle className="w-4 h-4 mr-1" />
                                            Indisponible
                                        </span>
                                    )}
                                    {vehicle.rating && (
                                        <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                            <Star className="w-4 h-4 mr-1 fill-current" />
                                            {vehicle.rating.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Miniatures */}
                            {images.length > 1 && (
                                <div className="p-4 border-t">
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {images.map((img, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setSelectedImageIndex(index)}
                                                className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${selectedImageIndex === index
                                                    ? 'border-blue-600 shadow-lg'
                                                    : 'border-gray-200 hover:border-blue-400'
                                                    }`}
                                            >
                                                <img
                                                    src={img}
                                                    alt={`${vehicle.brand} ${vehicle.model} - ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Modal plein écran */}
                        <AnimatePresence>
                            {fullscreenImage && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
                                    onClick={() => setFullscreenImage(false)}
                                >
                                    <button
                                        onClick={() => setFullscreenImage(false)}
                                        className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/70 transition"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>

                                    {images.length > 0 && (
                                        <>
                                            <img
                                                src={images[selectedImageIndex]}
                                                alt={`${vehicle.brand} ${vehicle.model}`}
                                                className="max-h-[90vh] max-w-[90vw] object-contain"
                                            />

                                            {images.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePrevImage();
                                                        }}
                                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition"
                                                    >
                                                        <ChevronLeftIcon className="w-6 h-6" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleNextImage();
                                                        }}
                                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition"
                                                    >
                                                        <ChevronRight className="w-6 h-6" />
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Tabs */}
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
                            <div className="flex border-b">
                                <button
                                    onClick={() => setActiveTab("details")}
                                    className={`flex-1 px-4 py-3 font-medium transition relative ${activeTab === "details"
                                        ? "text-blue-600"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    Détails
                                    {activeTab === "details" && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                                        />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab("features")}
                                    className={`flex-1 px-4 py-3 font-medium transition relative ${activeTab === "features"
                                        ? "text-blue-600"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    Équipements
                                    {activeTab === "features" && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                                        />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab("reviews")}
                                    className={`flex-1 px-4 py-3 font-medium transition relative ${activeTab === "reviews"
                                        ? "text-blue-600"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    Avis ({vehicle.reviews_count || 0})
                                    {activeTab === "reviews" && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                                        />
                                    )}
                                </button>
                            </div>

                            <div className="p-6">
                                {activeTab === "details" && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="space-y-6"
                                    >
                                        {/* Description */}
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-3">
                                                Description
                                            </h3>
                                            <p className="text-gray-600 leading-relaxed">
                                                {vehicle.description}
                                            </p>
                                        </div>

                                        {/* Fiche technique */}
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-3">
                                                Fiche technique
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-sm text-gray-500">Model</p>
                                                    <p className="font-medium">{vehicle.model}</p>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-sm text-gray-500">Puissance</p>
                                                    <p className="font-medium">{vehicle.puissance || 'N/A'} ch</p>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-sm text-gray-500">Brand</p>
                                                    <p className="font-medium">{vehicle.brand || 'N/A'}</p>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-sm text-gray-500">Fuel type</p>
                                                    <p className="font-medium">{vehicle.fuel_type || 'N/A'}</p>
                                                </div>

                                            </div>
                                        </div>

                                        {/* Informations supplémentaires */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center">
                                                <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                                                <div>
                                                    <p className="text-sm text-gray-500">Année</p>
                                                    <p className="font-medium">{vehicle.year}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <Fuel className="w-5 h-5 text-gray-400 mr-2" />
                                                <div>
                                                    <p className="text-sm text-gray-500">Carburant</p>
                                                    <p className="font-medium">{vehicle.fuel_type}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <Gauge className="w-5 h-5 text-gray-400 mr-2" />
                                                <div>
                                                    <p className="text-sm text-gray-500">Transmission</p>
                                                    <p className="font-medium">{vehicle.transmission}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <Users className="w-5 h-5 text-gray-400 mr-2" />
                                                <div>
                                                    <p className="text-sm text-gray-500">Places</p>
                                                    <p className="font-medium">{vehicle.seats}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <MapPin className="w-5 h-5 text-gray-400 mr-2" />
                                                <div>
                                                    <p className="text-sm text-gray-500">Localisation</p>
                                                    <p className="font-medium">{vehicle.city}</p>
                                                </div>
                                            </div>



                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === "features" && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                            Équipements et options
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {vehicle.features?.map((feature, index) => {
                                                const Icon = getFeatureIcon(feature);
                                                return (
                                                    <div key={index} className="flex items-center p-2 bg-gray-50 rounded-lg">
                                                        <Icon className="w-4 h-4 text-blue-600 mr-2" />
                                                        <span className="text-sm text-gray-700">{feature}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Inclusions */}
                                        <div className="mt-6 space-y-3">
                                            <div className="flex items-center p-3 bg-green-50 rounded-lg">
                                                <Shield className="w-5 h-5 text-green-600 mr-3" />
                                                <div>
                                                    <p className="font-medium text-gray-800">Assurance incluse</p>
                                                    <p className="text-sm text-gray-600">Protection complète sans franchise</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                                                <Award className="w-5 h-5 text-blue-600 mr-3" />
                                                <div>
                                                    <p className="font-medium text-gray-800">Kilométrage illimité</p>
                                                    <p className="text-sm text-gray-600">Pas de frais supplémentaires</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === "reviews" && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-8"
                                    >
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <MessageCircle className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-800 mb-2">
                                            Aucun avis pour le moment
                                        </h3>
                                        <p className="text-gray-500">
                                            Soyez le premier à donner votre avis sur ce véhicule
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Carte de localisation */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <Map className="w-5 h-5 mr-2 text-blue-600" />
                                Localisation du véhicule
                            </h3>
                            <div className="h-48 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
                                <p className="text-gray-500">Carte interactive (à implémenter)</p>
                            </div>
                            <p className="mt-3 text-sm text-gray-600 flex items-center">
                                <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                                {vehicle.address}
                            </p>
                        </div>
                    </div>

                    {/* Colonne droite - Informations pour le propriétaire */}
                    <div className="lg:col-span-1">
                        {/* Carte d'informations */}
                        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
                            {/* Prix et statut */}
                            <div className="flex items-baseline justify-between mb-6">
                                <div>
                                    <span className="text-3xl font-bold text-gray-800">{vehicle.price_per_day}€</span>
                                    <span className="text-gray-500">/jour</span>
                                </div>
                                {vehicle.available ? (
                                    <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Disponible
                                    </span>
                                ) : (
                                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Indisponible
                                    </span>
                                )}
                            </div>

                            {/* Statistiques rapides */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-blue-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-blue-600">12</p>
                                    <p className="text-xs text-gray-600">Réservations</p>
                                </div>
                                <div className="bg-green-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-green-600">4.8</p>
                                    <p className="text-xs text-gray-600">Note moyenne</p>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-purple-600">2</p>
                                    <p className="text-xs text-gray-600">En cours</p>
                                </div>
                                <div className="bg-yellow-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-yellow-600">845€</p>
                                    <p className="text-xs text-gray-600">Revenus</p>
                                </div>
                            </div>

                            {/* Périodes de disponibilité */}
                            <div className="mb-6">
                                <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                                    Prochaines réservations
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                                        <span className="text-gray-600">15-20 Mars 2024</span>
                                        <span className="font-medium text-blue-600">Confirmé</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                                        <span className="text-gray-600">25-28 Mars 2024</span>
                                        <span className="font-medium text-yellow-600">En attente</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                                        <span className="text-gray-600">1-5 Avril 2024</span>
                                        <span className="font-medium text-green-600">Disponible</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions pour le propriétaire */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => router.push(`/owner/vehicules/${vehicle.id}/edit`)}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                                >
                                    <Wrench className="w-4 h-4 mr-2" />
                                    Modifier le véhicule
                                </button>



                                <button
                                    onClick={() => {
                                        if (confirm("Voulez-vous rendre ce véhicule indisponible ?")) {
                                            // Logique pour changer le statut
                                        }
                                    }}
                                    className="w-full bg-white border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
                                >
                                    {vehicle.available ? (
                                        <>
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Rendre indisponible
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Rendre disponible
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Informations supplémentaires */}
                            <div className="mt-6 pt-4 border-t">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-gray-500">Date d'ajout</span>
                                    <span className="font-medium">15 Jan 2024</span>
                                </div>
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-gray-500">Dernière modification</span>
                                    <span className="font-medium">20 Fév 2024</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Vues</span>
                                    <span className="font-medium">245</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}