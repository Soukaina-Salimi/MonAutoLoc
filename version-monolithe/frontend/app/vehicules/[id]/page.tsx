"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    Car,
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
    Shield,
    CreditCard,
    Info,
    ArrowRight,
    CalendarDays,
    Award,
    Wrench,
    MessageCircle,
    ThumbsUp,
    Filter,
    ChevronDown,
    ChevronRight,
    ChevronLeft as ChevronLeftIcon
} from "lucide-react";
import api from "@/lib/api";
import { fr } from 'date-fns/locale'; // Pour la locale française

// Interface pour les images
interface VehicleImage {
    id: number;
    path: string;
    url?: string;
}

// interface pour review
interface Review {
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    user: {
        id: number;
        name: string;
    };
}

// Interface pour le type Vehicle
interface Vehicle {
    id: number;
    brand: string;
    model: string;
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
    user?: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        rating?: number;
        total_vehicles?: number;
        member_since?: string;
    };
    features?: string[];
    location?: string;
    insurance_included?: boolean;
    unlimited_mileage?: boolean;
    images?: VehicleImage[];
    reviews?: Review[];
    reviews_count?: number;
    reviews_avg_rating?: number;
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

export default function VehicleDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Remplacer les string dates par des Date objects pour react-datepicker
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [bookingLoading, setBookingLoading] = useState<boolean>(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    const [totalPrice, setTotalPrice] = useState<number>(0);
    const [numberOfDays, setNumberOfDays] = useState<number>(0);
    const [fullscreenImage, setFullscreenImage] = useState<boolean>(false);

    // Ajoutez cet état avec les autres useState
    const [bookedDates, setBookedDates] = useState<string[]>([]);

    // États pour les reviews
    const [reviews, setReviews] = useState<Review[]>([]);
    const [averageRating, setAverageRating] = useState<number>(0);
    const [reviewCount, setReviewCount] = useState<number>(0);
    const [userRating, setUserRating] = useState<number>(0);
    const [userComment, setUserComment] = useState<string>("");
    const [canReview, setCanReview] = useState<boolean>(false);
    const [reviewLoading, setReviewLoading] = useState<boolean>(false);
    const [bookingId, setBookingId] = useState<number | null>(null);
    const [checkingReview, setCheckingReview] = useState<boolean>(false);
    const [showReviewForm, setShowReviewForm] = useState<boolean>(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

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

                setVehicle(res.data);
                setReviews(res.data.reviews || []);
                setAverageRating(res.data.reviews_avg_rating || 0);
                setReviewCount(res.data.reviews_count || 0);

                // 🔥 Récupérer les dates réservées
                await fetchBookedDates();

                setLoading(false);
            } catch (error) {
                console.error("Error fetching vehicle:", error);
                setLoading(false);
            }
        };

        // Fonction pour récupérer les dates réservées
        const fetchBookedDates = async () => {
            try {
                const res = await api.get(`/vehicles/${id}/booked-dates`);
                setBookedDates(res.data);
            } catch (error) {
                console.error("Error fetching booked dates:", error);
            }
        };

        if (id) {
            fetchVehicle();
        }
    }, [id]);

    // Vérifier si l'utilisateur peut laisser un avis
    useEffect(() => {
        const checkCanReview = async () => {
            if (!isAuthenticated || !vehicle || !id) {
                setCanReview(false);
                return;
            }

            if (currentUser?.role?.name === "owner") {
                setCanReview(false);
                return;
            }

            try {
                setCheckingReview(true);
                const res = await api.get(`/bookings/can-review/${id}`);

                setCanReview(res.data.canReview);
                setBookingId(res.data.booking_id || null);

                if (res.data.canReview) {
                    setShowReviewForm(true);
                }
            } catch (error) {
                console.error("canReview error:", error);
                setCanReview(false);
                setBookingId(null);
            } finally {
                setCheckingReview(false);
            }
        };

        checkCanReview();
    }, [isAuthenticated, vehicle, id, currentUser?.role?.name]);

    // Calculer le prix total quand les dates changent
    useEffect(() => {
        if (startDate && endDate && vehicle) {
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
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

    // Fonction pour filtrer les dates (désactiver les dates réservées)
    const isDateBooked = (date: Date): boolean => {
        const dateStr = date.toISOString().split('T')[0];
        return bookedDates.includes(dateStr);
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

        // 🔥 Vérifier si les dates sont disponibles
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if (bookedDates.includes(dateStr)) {
                alert(`La date ${new Date(dateStr).toLocaleDateString('fr-FR')} est déjà réservée. Veuillez choisir d'autres dates.`);
                return;
            }
        }

        try {
            setBookingLoading(true);

            // Convertir les dates au format YYYY-MM-DD pour l'API
            const formattedStartDate = startDate.toISOString().split('T')[0];
            const formattedEndDate = endDate.toISOString().split('T')[0];

            await api.post("/bookings", {
                vehicule_id: id,
                start_date: formattedStartDate,
                end_date: formattedEndDate,
                total_price: totalPrice
            });

            alert("✅ Réservation effectuée avec succès !");
            router.push("/Client/bookings");

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

    const handleSubmitReview = async () => {
        if (userRating === 0) {
            alert("Veuillez sélectionner une note");
            return;
        }

        if (!bookingId) {
            alert("Impossible de publier l'avis");
            return;
        }

        try {
            setReviewLoading(true);

            await api.post("/reviews", {
                booking_id: bookingId,
                rating: userRating,
                comment: userComment
            });

            alert("✅ Avis publié avec succès !");

            const res = await api.get(`/vehicules/${id}`);
            setVehicle(res.data);
            setReviews(res.data.reviews || []);
            setAverageRating(res.data.reviews_avg_rating || 0);
            setReviewCount(res.data.reviews_count || 0);

            setCanReview(false);
            setShowReviewForm(false);
            setUserRating(0);
            setUserComment("");

        } catch (error: any) {
            console.error(error);

            if (error.response?.status === 400) {
                alert(error.response.data.message);
            } else if (error.response?.status === 403) {
                alert("Non autorisé");
            } else {
                alert("Erreur lors de la publication");
            }
        } finally {
            setReviewLoading(false);
        }
    };

    const handleDashboard = () => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }

        if (currentUser?.role?.name === "owner") {
            router.push("/owner/dashboard");
        } else {
            router.push("/");
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

    const handleGoBack = () => {
        router.back();
    };

    const handleContactOwner = () => {
        if (!vehicle?.user?.email) return;
        window.location.href = `mailto:${vehicle.user.email}?subject=Question%20sur%20${vehicle.brand}%20${vehicle.model}`;
    };

    // Récupérer les URLs des images
    const getImageUrls = (): string[] => {
        if (!vehicle?.images || vehicle.images.length === 0) {
            return [];
        }
        return vehicle.images.map(img => img.url || `/storage/${img.path}`);
    };

    const imageUrls = getImageUrls();

    // Calculer la distribution des notes
    const getRatingDistribution = () => {
        const distribution = [0, 0, 0, 0, 0];
        reviews.forEach(review => {
            if (review.rating >= 1 && review.rating <= 5) {
                distribution[review.rating - 1]++;
            }
        });
        return distribution;
    };

    const ratingDistribution = getRatingDistribution();

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
                        onClick={handleGoBack}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200"
                    >
                        Retour à la liste
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <nav className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleGoBack}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </motion.button>
                            <Link href="/" className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Car className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-bold text-lg text-gray-800">AutoRent</span>
                            </Link>
                        </div>

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
                    </div>
                </div>
            </nav>

            {/* Contenu principal */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Colonne gauche - Images et infos */}
                    <div className="lg:col-span-2">
                        {/* Galerie d'images */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6"
                        >
                            <div className="relative h-96 bg-gradient-to-br from-blue-600 to-purple-600">
                                {imageUrls.length > 0 && imageUrls[selectedImageIndex] ? (
                                    <>
                                        <img
                                            src={imageUrls[selectedImageIndex]}
                                            alt={`${vehicle.brand} ${vehicle.model}`}
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => setFullscreenImage(true)}
                                        />

                                        {/* Boutons de navigation */}
                                        {imageUrls.length > 1 && (
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
                                                    {selectedImageIndex + 1} / {imageUrls.length}
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
                                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Disponible
                                    </span>
                                    {vehicle.rating && (
                                        <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                            <Star className="w-4 h-4 mr-1 fill-current" />
                                            {vehicle.rating}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Miniatures */}
                            {imageUrls.length > 1 && (
                                <div className="p-4 border-t">
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {imageUrls.map((url, index) => (
                                            <motion.button
                                                key={index}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setSelectedImageIndex(index)}
                                                className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${selectedImageIndex === index
                                                    ? 'border-blue-600 shadow-lg'
                                                    : 'border-gray-200 hover:border-blue-400'
                                                    }`}
                                            >
                                                <img
                                                    src={url}
                                                    alt={`${vehicle.brand} ${vehicle.model} - ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </motion.button>
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

                                    {imageUrls.length > 0 && (
                                        <>
                                            <img
                                                src={imageUrls[selectedImageIndex]}
                                                alt={`${vehicle.brand} ${vehicle.model}`}
                                                className="max-h-[90vh] max-w-[90vw] object-contain"
                                            />

                                            {imageUrls.length > 1 && (
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

                        {/* Informations détaillées */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-2xl shadow-lg p-6"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                                        {vehicle.brand} {vehicle.model}
                                    </h1>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center">
                                            <Calendar className="w-4 h-4 mr-1" />
                                            {vehicle.year}
                                        </span>
                                        <span className="flex items-center">
                                            <Fuel className="w-4 h-4 mr-1" />
                                            {vehicle.fuel_type}
                                        </span>
                                        <span className="flex items-center">
                                            <Gauge className="w-4 h-4 mr-1" />
                                            {vehicle.transmission}
                                        </span>
                                        <span className="flex items-center">
                                            <Users className="w-4 h-4 mr-1" />
                                            {vehicle.seats} places
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-4xl font-bold text-blue-600">{vehicle.price_per_day}€</p>
                                    <p className="text-sm text-gray-500">par jour</p>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Description</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {vehicle.description}
                                </p>
                            </div>

                            {/* Section Avis */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white rounded-2xl shadow-lg p-6 mt-6 border border-gray-100"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-semibold flex items-center">
                                        <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
                                        Avis clients
                                    </h3>
                                    <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                                        {reviewCount} avis
                                    </span>
                                </div>

                                {/* Résumé des notes */}
                                <div className="grid md:grid-cols-2 gap-6 mb-8">
                                    {/* Note moyenne */}
                                    <div className="text-center md:text-left">
                                        <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                            <span className="text-5xl font-bold text-gray-800">
                                                {typeof averageRating === 'number' ? averageRating.toFixed(1) : '0.0'}
                                            </span>
                                            <div className="text-yellow-400">
                                                <Star className="w-8 h-8 fill-current" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center md:justify-start gap-1 mb-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-5 h-5 ${star <= Math.round(averageRating)
                                                        ? "text-yellow-400 fill-current"
                                                        : "text-gray-300"
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            Basé sur {reviewCount} avis
                                        </p>
                                    </div>

                                    {/* Distribution des notes */}
                                    <div className="space-y-2">
                                        {[5, 4, 3, 2, 1].map((star) => {
                                            const count = ratingDistribution[star - 1] || 0;
                                            const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                                            return (
                                                <div key={star} className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-600 w-8">{star}★</span>
                                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${percentage}%` }}
                                                            transition={{ duration: 0.5 }}
                                                            className="h-full bg-yellow-400 rounded-full"
                                                        />
                                                    </div>
                                                    <span className="text-sm text-gray-500 w-12">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Liste des avis */}
                                {reviews.length > 0 ? (
                                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                        {reviews.map((review, index) => (
                                            <motion.div
                                                key={review.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="border-b border-gray-100 pb-4 last:border-0"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                                                            <span className="text-white text-sm font-bold">
                                                                {review.user.name.charAt(0)}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-800">{review.user.name}</p>
                                                            <div className="flex items-center gap-1">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star
                                                                        key={star}
                                                                        className={`w-3 h-3 ${star <= review.rating
                                                                            ? "text-yellow-400 fill-current"
                                                                            : "text-gray-300"
                                                                            }`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(review.created_at).toLocaleDateString('fr-FR', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                                <p className="text-gray-600 text-sm ml-10">{review.comment}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <MessageCircle className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500">Aucun avis pour le moment</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Soyez le premier à donner votre avis sur ce véhicule
                                        </p>
                                    </div>
                                )}

                                {/* Formulaire d'avis */}
                                {canReview && (
                                    <div className="mt-6 border-t border-gray-100 pt-6">
                                        <button
                                            onClick={() => setShowReviewForm(!showReviewForm)}
                                            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                        >
                                            <span className="font-medium text-gray-700">Laisser un avis</span>
                                            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showReviewForm ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {showReviewForm && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-4">
                                                        <h4 className="font-semibold mb-3">Votre note</h4>
                                                        <div className="flex gap-2 mb-4">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <motion.button
                                                                    key={star}
                                                                    whileHover={{ scale: 1.1 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => setUserRating(star)}
                                                                    className="focus:outline-none"
                                                                >
                                                                    <Star
                                                                        className={`w-8 h-8 transition-colors ${star <= userRating
                                                                            ? "text-yellow-400 fill-current"
                                                                            : "text-gray-300 hover:text-yellow-200"
                                                                            }`}
                                                                    />
                                                                </motion.button>
                                                            ))}
                                                        </div>

                                                        <textarea
                                                            value={userComment}
                                                            onChange={(e) => setUserComment(e.target.value)}
                                                            placeholder="Partagez votre expérience avec ce véhicule..."
                                                            rows={4}
                                                            className="w-full border border-gray-200 rounded-xl p-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                        />

                                                        <button
                                                            onClick={handleSubmitReview}
                                                            disabled={reviewLoading}
                                                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center"
                                                        >
                                                            {reviewLoading ? (
                                                                <>
                                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                                                    Publication...
                                                                </>
                                                            ) : (
                                                                'Publier mon avis'
                                                            )}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Messages informatifs */}
                                {isAuthenticated && !canReview && currentUser?.role?.name !== "owner" && !checkingReview && (
                                    <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-blue-800">
                                                    Vous ne pouvez pas encore laisser d'avis
                                                </p>
                                                <p className="text-xs text-blue-600 mt-1">
                                                    Les avis sont possibles après une réservation terminée.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentUser?.role?.name === "owner" && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <Info className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">
                                                    Mode propriétaire
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    En tant que propriétaire, vous ne pouvez pas laisser d'avis sur vos propres véhicules.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>

                            {/* Caractéristiques */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Caractéristiques</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {vehicle.features?.map((feature, index) => (
                                        <div key={index} className="flex items-center text-gray-600">
                                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                            <span className="text-sm">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Équipements inclus */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center">
                                    <Shield className="w-5 h-5 text-blue-600 mr-2" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">Assurance incluse</p>
                                        <p className="text-xs text-gray-500">Protection complète</p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <Award className="w-5 h-5 text-blue-600 mr-2" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">Kilométrage illimité</p>
                                        <p className="text-xs text-gray-500">Sans frais supplémentaires</p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <Wrench className="w-5 h-5 text-blue-600 mr-2" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">Assistance 24/7</p>
                                        <p className="text-xs text-gray-500">Dépannage inclus</p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">Livraison possible</p>
                                        <p className="text-xs text-gray-500">À votre adresse</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Colonne droite - Réservation et propriétaire */}
                    <div className="lg:col-span-1">
                        {/* Carte de réservation */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-2xl shadow-lg p-6 sticky top-24"
                        >
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Réserver ce véhicule</h3>

                            {!isAuthenticated && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                                    <div className="flex items-start">
                                        <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-yellow-700 font-medium">Connexion requise</p>
                                            <p className="text-xs text-yellow-600 mt-1">
                                                Vous devez être connecté pour effectuer une réservation.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sélection des dates avec react-datepicker */}
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Date de début
                                    </label>
                                    <div className="relative">
                                        <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                                        <DatePicker
                                            selected={startDate}
                                            onChange={(date: Date | null) => setStartDate(date)}
                                            selectsStart
                                            startDate={startDate}
                                            endDate={endDate}
                                            minDate={new Date()}
                                            filterDate={(date) => !isDateBooked(date)}
                                            placeholderText="Sélectionnez une date"
                                            dateFormat="dd/MM/yyyy"
                                            locale={fr}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            wrapperClassName="w-full"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Date de fin
                                    </label>
                                    <div className="relative">
                                        <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                                        <DatePicker
                                            selected={endDate}
                                            onChange={(date: Date | null) => setEndDate(date)}
                                            selectsEnd
                                            startDate={startDate}
                                            endDate={endDate}
                                            minDate={startDate || new Date()}
                                            filterDate={(date) => !isDateBooked(date)}
                                            placeholderText="Sélectionnez une date"
                                            dateFormat="dd/MM/yyyy"
                                            locale={fr}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            wrapperClassName="w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Message d'info pour les dates réservées */}
                            {bookedDates.length > 0 && (
                                <p className="text-xs text-gray-500 mb-4">
                                    ⚠️ Les dates en gris dans le calendrier sont déjà réservées
                                </p>
                            )}

                            {/* Détail du prix */}
                            {numberOfDays > 0 && (
                                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                    <h4 className="font-medium text-gray-800 mb-3">Détail du prix</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">{numberOfDays} jour(s) × {vehicle.price_per_day}€</span>
                                            <span className="font-medium">{vehicle.price_per_day * numberOfDays}€</span>
                                        </div>
                                        <div className="flex justify-between text-green-600">
                                            <span>Assurance incluse</span>
                                            <span>Gratuit</span>
                                        </div>
                                        <div className="border-t pt-2 mt-2">
                                            <div className="flex justify-between font-semibold">
                                                <span>Total</span>
                                                <span className="text-blue-600">{totalPrice}€</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Bouton de réservation */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleBook}
                                disabled={bookingLoading || !vehicle.available}
                                className={`w-full py-4 rounded-xl font-semibold text-lg mb-4 flex items-center justify-center ${bookingLoading || !vehicle.available
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/30'
                                    } transition-all duration-200`}
                            >
                                {bookingLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Réservation en cours...
                                    </>
                                ) : !isAuthenticated ? (
                                    'Se connecter pour réserver'
                                ) : (
                                    <>
                                        Réserver maintenant
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </motion.button>

                            {/* Informations sur le propriétaire */}
                            {vehicle.user && (
                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-gray-800 mb-3">Propriétaire</h4>
                                    <div className="flex items-start space-x-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                            <User className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-800">{vehicle.user.name}</p>
                                            <div className="flex items-center text-sm text-gray-500 mt-1">
                                                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                                                <span>{vehicle.user.rating || 4.9} · {vehicle.user.total_vehicles || 12} véhicules</span>
                                            </div>
                                            <button
                                                onClick={handleContactOwner}
                                                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                Contacter le propriétaire
                                            </button>
                                        </div>
                                    </div>

                                    {/* Contact info */}
                                    <div className="mt-3 space-y-2 text-sm">
                                        <div className="flex items-center text-gray-600">
                                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                            <a href={`mailto:${vehicle.user.email}`} className="hover:text-blue-600">
                                                {vehicle.user.email}
                                            </a>
                                        </div>
                                        {vehicle.user.phone && (
                                            <div className="flex items-center text-gray-600">
                                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                                <span>{vehicle.user.phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center text-gray-600">
                                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                            <span>Membre depuis {vehicle.user.member_since || "2020"}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>

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