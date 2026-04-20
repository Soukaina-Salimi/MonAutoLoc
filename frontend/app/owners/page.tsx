"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Car,
    Menu,
    X,
    ChevronRight,
    Star,
    Phone,
    Mail,
    MapPin,
    Facebook,
    Twitter,
    Instagram,
    Linkedin,
    Calendar,
    Fuel,
    Gauge,
    Users,
    User,
    Award,
    Clock,
    ThumbsUp,
    Search,
    Filter,
    LayoutDashboard,
    LogOut,
    Settings,
    Bell
} from "lucide-react";
import api from "@/lib/api";

interface Owner {
    id: number;
    name: string;
    email: string;
    vehicules_count: number;
    rating?: number;
    member_since?: string;
    avatar?: string;
    location?: string;
    phone?: string;
    verified?: boolean;
}

export default function OwnersPage() {
    const router = useRouter();
    const [owners, setOwners] = useState<Owner[]>([]);
    const [filteredOwners, setFilteredOwners] = useState<Owner[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
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

        const fetchOwners = async () => {
            try {
                const res = await api.get("/owners");
                // Enrichir les données
                const enhancedOwners = res.data.map((owner: any) => ({
                    ...owner,
                    rating: owner.rating || (Math.random() * 1 + 4).toFixed(1),
                    member_since: owner.member_since || "2022",
                    location: owner.location || ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille"][Math.floor(Math.random() * 5)],
                    verified: Math.random() > 0.2,
                    avatar: owner.avatar || null
                }));
                setOwners(enhancedOwners);
                setFilteredOwners(enhancedOwners);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchOwners();
    }, []);

    // Filtrer les propriétaires
    useEffect(() => {
        let filtered = owners;

        if (searchTerm) {
            filtered = owners.filter(owner =>
                owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                owner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                owner.location?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredOwners(filtered);
    }, [searchTerm, owners]);

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
                    <p className="mt-4 text-gray-600">Chargement des propriétaires...</p>
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
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                <Car className="w-6 h-6 text-white" />
                            </div>
                            <span className="font-bold text-xl text-gray-800">AutoRent</span>
                        </Link>

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
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden text-gray-600 hover:text-gray-900"
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>

                    {/* Mobile Navigation */}
                    {isMenuOpen && (
                        <div className="md:hidden py-4 border-t">
                            <div className="flex flex-col space-y-3">
                                <Link
                                    href="/"
                                    className="text-gray-600 hover:text-blue-600 transition duration-200 font-medium px-2 py-1"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Accueil
                                </Link>
                                <Link
                                    href="/vehicules"
                                    className="text-gray-600 hover:text-blue-600 transition duration-200 font-medium px-2 py-1"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Véhicules
                                </Link>
                                <Link
                                    href="/owners"
                                    className="text-blue-600 font-medium px-2 py-1"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Propriétaires
                                </Link>
                                <Link
                                    href="/contact"
                                    className="text-gray-600 hover:text-blue-600 transition duration-200 font-medium px-2 py-1"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Contact
                                </Link>
                                {isAuthenticated ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                handleDashboard();
                                                setIsMenuOpen(false);
                                            }}
                                            className="text-gray-600 hover:text-blue-600 transition duration-200 font-medium text-left px-2 py-1"
                                        >
                                            Dashboard
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setIsMenuOpen(false);
                                            }}
                                            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition text-left"
                                        >
                                            Déconnexion
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                router.push("/login");
                                                setIsMenuOpen(false);
                                            }}
                                            className="text-gray-600 hover:text-blue-600 transition duration-200 font-medium text-left px-2 py-1"
                                        >
                                            Connexion
                                        </button>
                                        <button
                                            onClick={() => {
                                                router.push("/register");
                                                setIsMenuOpen(false);
                                            }}
                                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition text-left"
                                        >
                                            Inscription
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.nav>

            {/* Header avec titre et recherche */}
            <section className="pt-28 pb-12 px-4 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center text-white mb-8"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Nos propriétaires
                        </h1>
                        <p className="text-xl text-white/90 max-w-2xl mx-auto">
                            Découvrez les professionnels de confiance qui mettent leurs véhicules à votre disposition
                        </p>
                    </motion.div>

                    {/* Barre de recherche */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="max-w-xl mx-auto"
                    >
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Rechercher un propriétaire par nom, email ou ville..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </motion.div>

                    {/* Statistiques */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="flex justify-center gap-8 mt-8 text-white"
                    >
                        <div className="text-center">
                            <p className="text-3xl font-bold">{owners.length}</p>
                            <p className="text-sm opacity-80">Propriétaires</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold">
                                {owners.reduce((acc, owner) => acc + owner.vehicules_count, 0)}
                            </p>
                            <p className="text-sm opacity-80">Véhicules</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold">
                                {(owners.reduce((acc, owner) => acc + (owner.rating || 0), 0) / owners.length).toFixed(1)}
                            </p>
                            <p className="text-sm opacity-80">Note moyenne</p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Liste des propriétaires */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {filteredOwners.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-lg p-12 text-center"
                    >
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucun propriétaire trouvé</h3>
                        <p className="text-gray-500">
                            {searchTerm
                                ? "Aucun propriétaire ne correspond à votre recherche"
                                : "Aucun propriétaire n'est encore inscrit"}
                        </p>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Effacer la recherche
                            </button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {filteredOwners.map((owner, index) => (
                            <motion.div
                                key={owner.id}
                                variants={fadeInUp}
                                whileHover={{ y: -8 }}
                            >
                                <Link href={`/owners/${owner.id}`}>
                                    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                                        {/* En-tête avec avatar */}
                                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 relative">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 shadow-lg">
                                                    {owner.avatar ? (
                                                        <img src={owner.avatar} alt={owner.name} className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        owner.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex-1 text-white">
                                                    <h2 className="text-xl font-bold">{owner.name}</h2>
                                                    <p className="text-sm opacity-90 flex items-center mt-1">
                                                        <MapPin className="w-3 h-3 mr-1" />
                                                        {owner.location}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Badge vérifié */}
                                            {owner.verified && (
                                                <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                                                    <Award className="w-3 h-3 mr-1" />
                                                    Vérifié
                                                </div>
                                            )}
                                        </div>

                                        {/* Contenu */}
                                        <div className="p-6">
                                            {/* Note et stats */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center">
                                                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                                                    <span className="ml-1 font-semibold">{owner.rating}</span>
                                                </div>
                                                <div className="flex items-center text-gray-500 text-sm">
                                                    <Car className="w-4 h-4 mr-1" />
                                                    <span>{owner.vehicules_count} véhicules</span>
                                                </div>
                                            </div>

                                            {/* Email et contact */}
                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                                    <span className="truncate">{owner.email}</span>
                                                </div>
                                                {owner.phone && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                                        <span>{owner.phone}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                                    <span>Membre depuis {owner.member_since}</span>
                                                </div>
                                            </div>

                                            {/* Bouton */}
                                            <div className="flex items-center justify-between pt-4 border-t">
                                                <span className="text-sm font-medium text-blue-600 group-hover:text-purple-600 transition">
                                                    Voir le profil
                                                </span>
                                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </section>

            {/* Section CTA */}
            <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Vous avez des véhicules à louer ?
                    </h2>
                    <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                        Rejoignez notre communauté de propriétaires et commencez à générer des revenus dès aujourd'hui
                    </p>
                    <button
                        onClick={() => router.push("/register?role=owner")}
                        className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 inline-flex items-center"
                    >
                        Devenir propriétaire
                        <ChevronRight className="w-5 h-5 ml-2" />
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300">
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