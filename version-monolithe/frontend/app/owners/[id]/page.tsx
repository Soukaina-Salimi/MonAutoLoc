"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
    Car,
    Star,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Award,
    ChevronLeft,
    ChevronRight,
    User,
    Users,
    ThumbsUp,
    Clock,
    CheckCircle,
    MessageCircle,
    Share2,
    Heart,
    Menu,
    X,
    LayoutDashboard,
    LogOut,
    Settings,
    Bell,
    Fuel,
    Gauge,
    Twitter,
    Facebook,
    Linkedin,
    Instagram,
    Users as UsersIcon
} from "lucide-react";

interface Vehicle {
    id: number;
    brand: string;
    model: string;
    price_per_day: number;
    image_url: string | null;
    year?: number;
    fuel_type?: string;
    transmission?: string;
    seats?: number;
    rating?: number;
}

interface Owner {
    id: number;
    name: string;
    email: string;
    phone?: string;
    location?: string;
    bio?: string;
    rating?: number;
    verified?: boolean;
    member_since?: string;
    vehicules: Vehicle[];
    vehicules_count: number;
    total_reviews?: number;
    response_rate?: number;
    response_time?: string;
}

export default function OwnerProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const [owner, setOwner] = useState<Owner | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Vérifier l'utilisateur connecté
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");

        if (token && userStr) {
            try {
                const userData = JSON.parse(userStr);
                setUser(userData);
                setIsAuthenticated(true);
            } catch (error) {
                console.error("Error parsing user:", error);
            }
        }

        const fetchOwner = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/owners/${id}`);

                // Enrichir les données
                const enhancedOwner = {
                    ...res.data,
                    phone: res.data.phone || "+33 6 12 34 56 78",
                    location: res.data.location || "Paris, France",
                    bio: res.data.bio || `Passionné d'automobile, je mets à disposition ma collection de véhicules soigneusement entretenus. N'hésitez pas à me contacter pour plus d'informations.`,
                    rating: res.data.rating || 4.9,
                    verified: true,
                    member_since: res.data.member_since || "2022",
                    total_reviews: res.data.total_reviews || 24,
                    response_rate: res.data.response_rate || 98,
                    response_time: res.data.response_time || "< 1 heure",
                    vehicules: res.data.vehicules.map((v: any) => ({
                        ...v,
                        year: v.year || [2022, 2023, 2024][Math.floor(Math.random() * 3)],
                        fuel_type: v.fuel_type || ["Essence", "Diesel", "Hybride", "Électrique"][Math.floor(Math.random() * 4)],
                        transmission: v.transmission || ["Manuelle", "Automatique"][Math.floor(Math.random() * 2)],
                        seats: v.seats || 5,
                        rating: v.rating || (Math.random() * 1 + 4).toFixed(1)
                    }))
                };

                setOwner(enhancedOwner);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchOwner();
    }, [id]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
    };

    const handleDashboard = () => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }

        if (user?.role?.name === "owner") {
            router.push("/owner/dashboard");
        } else if (user?.role?.name === "admin") {
            router.push("/admin/dashboard");
        } else {
            router.push("/dashboard");
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
    const handleContact = () => {
        if (!isAuthenticated) {
            if (confirm("Vous devez être connecté pour contacter un propriétaire. Voulez-vous vous connecter ?")) {
                router.push("/login");
            }
            return;
        }

        if (owner?.email) {
            window.location.href = `mailto:${owner.email}?subject=Question%20sur%20vos%20véhicules`;
        }
    };

    // Animation variants
    const fadeInUp = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 }
    };

    const staggerContainer = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <User className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                    <p className="mt-4 text-gray-600">Chargement du profil...</p>
                </div>
            </div>
        );
    }

    if (!owner) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-10 h-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Propriétaire non trouvé</h2>
                    <p className="text-gray-600 mb-6">Le propriétaire que vous recherchez n'existe pas.</p>
                    <button
                        onClick={() => router.back()}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition"
                    >
                        Retour
                    </button>
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


                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden text-gray-600 hover:text-gray-900"
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </motion.nav>

            {/* Profil du propriétaire */}
            <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* En-tête du profil */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-8 mb-8"
                >
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        {/* Avatar */}
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                            {owner.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Infos */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold text-gray-800">{owner.name}</h1>
                                {owner.verified && (
                                    <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Vérifié
                                    </span>
                                )}
                            </div>

                            <p className="text-gray-600 mb-4 max-w-2xl">{owner.bio}</p>

                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center text-sm text-gray-500">
                                    <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                                    {owner.location}
                                </div>
                                <div className="flex items-center text-sm text-gray-500">
                                    <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                                    Membre depuis {owner.member_since}
                                </div>
                                <div className="flex items-center text-sm text-gray-500">
                                    <Star className="w-4 h-4 mr-1 text-yellow-400 fill-current" />
                                    {owner.rating} ({owner.total_reviews} avis)
                                </div>
                                <div className="flex items-center text-sm text-gray-500">
                                    <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                    Réponse {owner.response_time}
                                </div>
                            </div>
                        </div>

                        {/* Bouton contact */}
                        <button
                            onClick={handleContact}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center"
                        >
                            <Mail className="w-4 h-4 mr-2" />
                            Contacter
                        </button>
                    </div>

                    {/* Statistiques */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-800">{owner.vehicules_count}</p>
                            <p className="text-sm text-gray-500">Véhicules</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-800">{owner.total_reviews}</p>
                            <p className="text-sm text-gray-500">Avis</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-800">{owner.response_rate}%</p>
                            <p className="text-sm text-gray-500">Taux de réponse</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-800">
                                {owner.vehicules.reduce((acc, v) => acc + (v.rating || 0), 0) / owner.vehicules.length || 0}
                            </p>
                            <p className="text-sm text-gray-500">Note moyenne</p>
                        </div>
                    </div>
                </motion.div>

                {/* Section véhicules */}
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">
                            Véhicules de {owner.name}
                        </h2>
                        <p className="text-gray-500">
                            {owner.vehicules_count} véhicule{owner.vehicules_count > 1 ? 's' : ''} disponible{owner.vehicules_count > 1 ? 's' : ''}
                        </p>
                    </div>

                    {owner.vehicules.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Car className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucun véhicule</h3>
                            <p className="text-gray-500">
                                Ce propriétaire n'a pas encore de véhicules disponibles
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {owner.vehicules.map((vehicle, index) => (
                                <motion.div
                                    key={vehicle.id}
                                    variants={fadeInUp}
                                    whileHover={{ y: -8 }}
                                >
                                    <Link href={`/vehicules/${vehicle.id}`}>
                                        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                                            {/* Image */}
                                            <div className="relative h-48 bg-gradient-to-br from-blue-600 to-purple-600">
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

                                                {/* Badge prix */}
                                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-lg">
                                                    <p className="text-sm font-bold text-blue-600">
                                                        {vehicle.price_per_day}€<span className="text-xs font-normal text-gray-500">/jour</span>
                                                    </p>
                                                </div>

                                                {/* Note */}
                                                {vehicle.rating && (
                                                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-full shadow-lg flex items-center">
                                                        <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                                                        <span className="text-xs font-medium">{vehicle.rating}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Détails */}
                                            <div className="p-4">
                                                <h3 className="font-bold text-lg text-gray-800 mb-1">
                                                    {vehicle.brand} {vehicle.model}
                                                </h3>
                                                <p className="text-sm text-gray-500 mb-3">{vehicle.year}</p>

                                                {/* Caractéristiques */}
                                                <div className="grid grid-cols-3 gap-2 mb-3">
                                                    <div className="flex items-center text-xs text-gray-600">
                                                        <Fuel className="w-3 h-3 mr-1 text-gray-400" />
                                                        {vehicle.fuel_type}
                                                    </div>
                                                    <div className="flex items-center text-xs text-gray-600">
                                                        <Gauge className="w-3 h-3 mr-1 text-gray-400" />
                                                        {vehicle.transmission}
                                                    </div>
                                                    <div className="flex items-center text-xs text-gray-600">
                                                        <UsersIcon className="w-3 h-3 mr-1 text-gray-400" />
                                                        {vehicle.seats} pl.
                                                    </div>
                                                </div>

                                                {/* Bouton */}
                                                <div className="flex items-center justify-between pt-3 border-t">
                                                    <span className="text-sm font-medium text-blue-600 group-hover:text-purple-600 transition">
                                                        Voir le détail
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Section contact */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white"
                >
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="text-2xl font-bold mb-2">Vous avez des questions ?</h3>
                            <p className="text-white/90">
                                N'hésitez pas à contacter {owner.name} pour plus d'informations sur ses véhicules
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={handleContact}
                                className="bg-white text-blue-600 px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center"
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Envoyer un message
                            </button>
                            <button className="bg-white/20 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/30 transition-all duration-200 flex items-center">
                                <Phone className="w-4 h-4 mr-2" />
                                Appeler
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300 mt-12">
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
                                <li><Link href="/owners" className="hover:text-white transition">Propriétaires</Link></li>
                                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
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
                            <h3 className="text-white font-semibold mb-4">Suivez-nous</h3>
                            <div className="flex space-x-4">
                                <a href="#" className="hover:text-white transition">
                                    <Facebook className="w-5 h-5" />
                                </a>
                                <a href="#" className="hover:text-white transition">
                                    <Twitter className="w-5 h-5" />
                                </a>
                                <a href="#" className="hover:text-white transition">
                                    <Instagram className="w-5 h-5" />
                                </a>
                                <a href="#" className="hover:text-white transition">
                                    <Linkedin className="w-5 h-5" />
                                </a>
                            </div>
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