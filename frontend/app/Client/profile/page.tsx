"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Car,
    CreditCard,
    Shield,
    Award,
    Star,
    Edit2,
    Save,
    X,
    Camera,
    LogOut,
    Settings,
    Bell,
    Menu,
    ChevronRight,
    CheckCircle,
    AlertCircle,
    Lock,
    Eye,
    EyeOff,
    Upload,
    Home,
    Clock,
    TrendingUp,
    Heart,
    Download,
    FileText,
} from "lucide-react";
import api from "@/lib/api";

// Interface pour l'utilisateur
interface User {
    id: number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    postal_code?: string;
    profile_image?: string | null;
    role: {
        id: number;
        name: string;
    };
    created_at: string;
    verified?: boolean;
    member_since?: string;
}

// Interface pour les statistiques
interface UserStats {
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    totalSpent: number;
    memberSince: string;
    favoriteVehicles?: number;
    reviews?: number;
    rating?: number;
}

// Interface pour les réservations récentes
interface RecentBooking {
    id: number;
    vehicule: {
        id: number;
        brand: string;
        model: string;
        image_url: string | null;
    };
    start_date: string;
    end_date: string;
    status: string;
    total_price: number;
}
function DocumentCard({ title, docType, icon, color, document, loading, onUpload, fields }: {
    title: string;
    docType: "cin" | "permis" | "carte_grise";
    icon: React.ReactNode;
    color: string;
    document: { uploaded: boolean; data: any };
    loading: boolean;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>, type: "cin" | "permis" | "carte_grise") => void;
    fields: { label: string; value?: string }[];
}) {
    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className={`bg-gradient-to-r ${color} p-4 flex items-center justify-between`}>
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        {icon}
                    </div>
                    <h3 className="text-white font-semibold">{title}</h3>
                </div>
                {document.uploaded && (
                    <div className="flex items-center bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Vérifié
                    </div>
                )}
            </div>

            <div className="p-6">
                {/* Zone upload */}
                <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
                    ${document.uploaded
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                >
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onUpload(e, docType)}
                        disabled={loading}
                    />
                    {loading ? (
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <p className="text-sm text-blue-600 font-medium">Analyse en cours...</p>
                            <p className="text-xs text-gray-500 mt-1">Notre IA extrait les données</p>
                        </div>
                    ) : document.uploaded ? (
                        <div className="flex flex-col items-center">
                            <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                            <p className="text-sm text-green-600 font-medium">Document analysé !</p>
                            <p className="text-xs text-gray-500 mt-1">Cliquer pour remplacer</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-sm font-medium text-gray-700">Cliquer pour uploader</p>
                            <p className="text-xs text-gray-500 mt-1">JPG, PNG — max 5MB</p>
                        </div>
                    )}
                </label>

                {/* Données extraites */}
                {document.uploaded && document.data && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 grid grid-cols-2 gap-3"
                    >
                        {fields.map((field) => field.value && (
                            <div key={field.label} className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500">{field.label}</p>
                                <p className="font-medium text-gray-800 text-sm mt-0.5">{field.value}</p>
                            </div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const router = useRouter();

    // États
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<string>("profile");

    // Formulaire d'édition
    const [editForm, setEditForm] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        country: "",
        postal_code: ""
    });

    // Changement de mot de passe
    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: ""
    });
    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [changingPassword, setChangingPassword] = useState<boolean>(false);

    // Upload de photo
    const [uploadingImage, setUploadingImage] = useState<boolean>(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Messages
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");

        if (!token) {
            router.push("/login");
            return;
        }

        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                setUser(userData);
                setEditForm({
                    name: userData.name || "",
                    email: userData.email || "",
                    phone: userData.phone || "",
                    address: userData.address || "",
                    city: userData.city || "",
                    country: userData.country || "",
                    postal_code: userData.postal_code || ""
                });

                // Charger les statistiques et réservations récentes
                fetchUserData();

            } catch (error) {
                console.error("Error parsing user:", error);
            }
        }
    }, []);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            // Simuler un délai
            await new Promise(resolve => setTimeout(resolve, 800));

            // Statistiques simulées
            const mockStats: UserStats = {
                totalBookings: 24,
                activeBookings: 2,
                completedBookings: 18,
                totalSpent: 3450,
                memberSince: "2022",
                favoriteVehicles: 6,
                reviews: 8,
                rating: 4.8
            };
            setStats(mockStats);

            // Réservations récentes simulées
            const mockBookings: RecentBooking[] = [
                {
                    id: 1,
                    vehicule: {
                        id: 1,
                        brand: "Tesla",
                        model: "Model 3",
                        image_url: null
                    },
                    start_date: "2024-03-15",
                    end_date: "2024-03-20",
                    status: "completed",
                    total_price: 445
                },
                {
                    id: 2,
                    vehicule: {
                        id: 2,
                        brand: "Renault",
                        model: "Clio",
                        image_url: null
                    },
                    start_date: "2024-03-25",
                    end_date: "2024-03-28",
                    status: "approved",
                    total_price: 135
                },
                {
                    id: 3,
                    vehicule: {
                        id: 3,
                        brand: "Peugeot",
                        model: "308",
                        image_url: null
                    },
                    start_date: "2024-04-01",
                    end_date: "2024-04-05",
                    status: "pending",
                    total_price: 220
                }
            ];
            setRecentBookings(mockBookings);

            setLoading(false);
        } catch (error) {
            console.error("Error fetching user data:", error);
            setLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            // Simuler l'upload
            setUploadingImage(true);
            setTimeout(() => {
                setUploadingImage(false);
                setSaveMessage({ type: 'success', text: 'Photo de profil mise à jour' });
            }, 1500);
        }
    };

    const handleSaveProfile = async () => {
        try {
            setLoading(true);
            // Simuler un appel API
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mettre à jour l'utilisateur localement
            const updatedUser = {
                ...user!,
                ...editForm
            };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));

            setSaveMessage({ type: 'success', text: 'Profil mis à jour avec succès' });
            setIsEditing(false);

            // Effacer le message après 3 secondes
            setTimeout(() => setSaveMessage(null), 3000);

        } catch (error) {
            console.error("Error saving profile:", error);
            setSaveMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        // Validation
        if (passwordData.new_password !== passwordData.confirm_password) {
            setSaveMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
            return;
        }

        if (passwordData.new_password.length < 6) {
            setSaveMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' });
            return;
        }

        try {
            setLoading(true);
            // Simuler un appel API
            await new Promise(resolve => setTimeout(resolve, 1000));

            setSaveMessage({ type: 'success', text: 'Mot de passe modifié avec succès' });
            setChangingPassword(false);
            setPasswordData({
                current_password: "",
                new_password: "",
                confirm_password: ""
            });

            setTimeout(() => setSaveMessage(null), 3000);

        } catch (error) {
            console.error("Error changing password:", error);
            setSaveMessage({ type: 'error', text: 'Erreur lors du changement de mot de passe' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
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
    const handleViewBooking = (id: number) => {
        router.push(`/Client/bookings/${id}`);
    };

    // OCR states
    const [ocrLoading, setOcrLoading] = useState<{ [key: string]: boolean }>({});
    const [documents, setDocuments] = useState<{
        cin: { uploaded: boolean; data: any; file_path?: string };
        permis: { uploaded: boolean; data: any; file_path?: string };
        carte_grise: { uploaded: boolean; data: any; file_path?: string };
    }>({
        cin: { uploaded: false, data: null },
        permis: { uploaded: false, data: null },
        carte_grise: { uploaded: false, data: null },
    });
    const handleDocumentUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        docType: "cin" | "permis" | "carte_grise"
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setOcrLoading(prev => ({ ...prev, [docType]: true }));

        try {
            // 1. Envoyer au microservice OCR Python
            const formData = new FormData();
            formData.append("file", file);
            formData.append("doc_type", docType);
            // a verifier aprés  const res = await api.post("/documents/upload", formData);
            const ocrResponse = await fetch("http://localhost:8001/ocr/extract", {
                method: "POST",
                body: formData,
            });
            const ocrResult = await ocrResponse.json();

            // 2. Sauvegarder dans Laravel via ton API
            const laravelFormData = new FormData();
            laravelFormData.append("document", file);
            laravelFormData.append("doc_type", docType);

            const saveResponse = await api.post("/documents/upload", laravelFormData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            // 3. Mettre à jour l'état local
            setDocuments(prev => ({
                ...prev,
                [docType]: {
                    uploaded: true,
                    data: ocrResult.data,
                    file_path: saveResponse.data.path
                }
            }));

            // 4. Pré-remplir le profil si CIN
            if (docType === "cin" && ocrResult.data) {
                const d = ocrResult.data;
                setEditForm(prev => ({
                    ...prev,
                    name: d.last_name && d.first_name
                        ? `${d.first_name} ${d.last_name}`
                        : prev.name,
                }));
                setSaveMessage({
                    type: 'success',
                    text: '✅ Document analysé ! Profil pré-rempli automatiquement.'
                });
                setIsEditing(true); // Ouvrir le formulaire pour que l'user valide
            } else {
                setSaveMessage({ type: 'success', text: '✅ Document uploadé avec succès !' });
            }

        } catch (error) {
            setSaveMessage({ type: 'error', text: 'Erreur lors de l\'analyse du document' });
        } finally {
            setOcrLoading(prev => ({ ...prev, [docType]: false }));
        }
    };

    const handleDashboard = () => {
        if (user?.role?.name === "owner") {
            router.push("/owner/dashboard");
        } else {
            router.push("/dashboard");
        }
    };


    // Obtenir l'initiale du nom
    const getInitial = () => {
        return user?.name?.charAt(0).toUpperCase() || "U";
    };

    // Formater la date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Obtenir le badge de statut
    const getStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { bg: "bg-yellow-100", text: "text-yellow-600", label: "En attente" },
            approved: { bg: "bg-green-100", text: "text-green-600", label: "Confirmée" },
            completed: { bg: "bg-blue-100", text: "text-blue-600", label: "Terminée" },
            cancelled: { bg: "bg-gray-100", text: "text-gray-600", label: "Annulée" }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

        return (
            <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    if (loading && !user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <User className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                    <p className="mt-4 text-gray-600">Chargement de votre profil...</p>
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

            {/* Contenu principal */}
            <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Message de succès/erreur */}
                <AnimatePresence>
                    {saveMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`mb-6 p-4 rounded-xl flex items-center ${saveMessage.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                }`}
                        >
                            {saveMessage.type === 'success' ? (
                                <CheckCircle className="w-5 h-5 mr-2" />
                            ) : (
                                <AlertCircle className="w-5 h-5 mr-2" />
                            )}
                            {saveMessage.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tabs de navigation */}
                <div className="flex space-x-4 mb-8 border-b">
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={`px-4 py-2 font-medium transition relative ${activeTab === "profile"
                            ? "text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Profil
                        {activeTab === "profile" && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("security")}
                        className={`px-4 py-2 font-medium transition relative ${activeTab === "security"
                            ? "text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Sécurité
                        {activeTab === "security" && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("documents")}
                        className={`px-4 py-2 font-medium transition relative ${activeTab === "documents"
                            ? "text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Documents
                        {activeTab === "documents" && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("activity")}
                        className={`px-4 py-2 font-medium transition relative ${activeTab === "activity"
                            ? "text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Activité
                        {activeTab === "activity" && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                            />
                        )}
                    </button>
                </div>

                {/* Tab Profil */}
                {activeTab === "profile" && (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Colonne gauche - Photo et infos */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:col-span-1"
                        >
                            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
                                {/* Photo de profil */}
                                <div className="text-center mb-6">
                                    <div className="relative inline-block">
                                        <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center mx-auto overflow-hidden">
                                            {imagePreview || user?.profile_image ? (
                                                <img
                                                    src={imagePreview || user?.profile_image || ''}
                                                    alt={user?.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-4xl font-bold text-white">{getInitial()}</span>
                                            )}
                                        </div>

                                        {/* Bouton upload photo */}
                                        <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition shadow-lg">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />
                                            <Camera className="w-4 h-4 text-white" />
                                        </label>

                                        {uploadingImage && (
                                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>

                                    <h2 className="text-xl font-bold text-gray-800 mt-4">{user?.name}</h2>
                                    <p className="text-sm text-gray-500 capitalize">{user?.role?.name}</p>

                                    {/* Badge vérifié */}
                                    <div className="inline-flex items-center bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs mt-2">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Compte vérifié
                                    </div>
                                </div>

                                {/* Statistiques rapides */}
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                                        <p className="text-2xl font-bold text-gray-800">{stats?.totalBookings || 0}</p>
                                        <p className="text-xs text-gray-500">Réservations</p>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                                        <p className="text-2xl font-bold text-gray-800">{stats?.activeBookings || 0}</p>
                                        <p className="text-xs text-gray-500">Actives</p>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                                        <p className="text-2xl font-bold text-gray-800">{stats?.rating || 0}</p>
                                        <p className="text-xs text-gray-500">Note</p>
                                    </div>
                                </div>

                                {/* Informations complémentaires */}
                                <div className="space-y-3">
                                    <div className="flex items-center text-sm">
                                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                        <span className="text-gray-600">Membre depuis {stats?.memberSince || "2024"}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <Award className="w-4 h-4 text-gray-400 mr-2" />
                                        <span className="text-gray-600">{stats?.favoriteVehicles || 0} favoris</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <Star className="w-4 h-4 text-gray-400 mr-2" />
                                        <span className="text-gray-600">{stats?.reviews || 0} avis</span>
                                    </div>
                                </div>

                                {/* Bouton d'édition */}
                                {!isEditing && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setIsEditing(true)}
                                        className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center"
                                    >
                                        <Edit2 className="w-4 h-4 mr-2" />
                                        Modifier le profil
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>

                        {/* Colonne droite - Formulaire */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:col-span-2"
                        >
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-6">
                                    {isEditing ? "Modifier le profil" : "Informations personnelles"}
                                </h3>

                                <div className="space-y-4">
                                    {/* Nom */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nom complet
                                        </label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <p className="text-gray-800 py-2">{user?.name}</p>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email
                                        </label>
                                        {isEditing ? (
                                            <input
                                                type="email"
                                                value={editForm.email}
                                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <p className="text-gray-800 py-2">{user?.email}</p>
                                        )}
                                    </div>

                                    {/* Téléphone */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Téléphone
                                        </label>
                                        {isEditing ? (
                                            <input
                                                type="tel"
                                                value={editForm.phone}
                                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="+33 6 12 34 56 78"
                                            />
                                        ) : (
                                            <p className="text-gray-800 py-2">{user?.phone || "Non renseigné"}</p>
                                        )}
                                    </div>

                                    {/* Adresse */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Adresse
                                        </label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editForm.address}
                                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="123 Rue Example"
                                            />
                                        ) : (
                                            <p className="text-gray-800 py-2">{user?.address || "Non renseigné"}</p>
                                        )}
                                    </div>

                                    {/* Ville et Code postal */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Ville
                                            </label>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editForm.city}
                                                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Paris"
                                                />
                                            ) : (
                                                <p className="text-gray-800 py-2">{user?.city || "Non renseigné"}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Code postal
                                            </label>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editForm.postal_code}
                                                    onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="75001"
                                                />
                                            ) : (
                                                <p className="text-gray-800 py-2">{user?.postal_code || "Non renseigné"}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pays */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Pays
                                        </label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editForm.country}
                                                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="France"
                                            />
                                        ) : (
                                            <p className="text-gray-800 py-2">{user?.country || "Non renseigné"}</p>
                                        )}
                                    </div>

                                    {/* Boutons d'action */}
                                    {isEditing && (
                                        <div className="flex space-x-4 pt-4">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleSaveProfile}
                                                disabled={loading}
                                                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center"
                                            >
                                                {loading ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                                        Sauvegarde...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4 mr-2" />
                                                        Enregistrer
                                                    </>
                                                )}
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setIsEditing(false)}
                                                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition flex items-center justify-center"
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Annuler
                                            </motion.button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Tab Sécurité */}
                {activeTab === "security" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto"
                    >
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-6">Sécurité du compte</h3>

                            {!changingPassword ? (
                                <>
                                    {/* Informations de sécurité */}
                                    <div className="space-y-4 mb-6">
                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <div className="flex items-center">
                                                <Lock className="w-5 h-5 text-gray-400 mr-3" />
                                                <div>
                                                    <p className="font-medium text-gray-800">Mot de passe</p>
                                                    <p className="text-sm text-gray-500">Dernière modification il y a 3 mois</p>
                                                </div>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setChangingPassword(true)}
                                                className="text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                Changer
                                            </motion.button>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <div className="flex items-center">
                                                <Shield className="w-5 h-5 text-gray-400 mr-3" />
                                                <div>
                                                    <p className="font-medium text-gray-800">Authentification à deux facteurs</p>
                                                    <p className="text-sm text-gray-500">Non activée</p>
                                                </div>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                Activer
                                            </motion.button>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <div className="flex items-center">
                                                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                                                <div>
                                                    <p className="font-medium text-gray-800">Email de récupération</p>
                                                    <p className="text-sm text-gray-500">{user?.email}</p>
                                                </div>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                Modifier
                                            </motion.button>
                                        </div>
                                    </div>

                                    {/* Sessions actives */}
                                    <div className="border-t pt-6">
                                        <h4 className="font-semibold text-gray-800 mb-4">Sessions actives</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                                    <div>
                                                        <p className="font-medium text-gray-800">Paris, France · Chrome</p>
                                                        <p className="text-sm text-gray-500">Session actuelle</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
                                                    <div>
                                                        <p className="font-medium text-gray-800">Lyon, France · Safari</p>
                                                        <p className="text-sm text-gray-500">Il y a 2 jours</p>
                                                    </div>
                                                </div>
                                                <button className="text-sm text-red-600 hover:text-red-700">
                                                    Déconnecter
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Formulaire changement de mot de passe */
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Mot de passe actuel
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.current ? "text" : "password"}
                                                value={passwordData.current_password}
                                                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                            >
                                                {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nouveau mot de passe
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.new ? "text" : "password"}
                                                value={passwordData.new_password}
                                                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                            >
                                                {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Confirmer le mot de passe
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.confirm ? "text" : "password"}
                                                value={passwordData.confirm_password}
                                                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                            >
                                                {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Indicateurs de force du mot de passe */}
                                    {passwordData.new_password && (
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <p className="text-sm font-medium text-gray-700 mb-2">Force du mot de passe :</p>
                                            <div className="flex space-x-1 mb-2">
                                                <div className={`h-1 flex-1 rounded ${passwordData.new_password.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                <div className={`h-1 flex-1 rounded ${/[A-Z]/.test(passwordData.new_password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                <div className={`h-1 flex-1 rounded ${/[0-9]/.test(passwordData.new_password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                <div className={`h-1 flex-1 rounded ${/[!@#$%^&*]/.test(passwordData.new_password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            </div>
                                            <ul className="text-xs text-gray-500 space-y-1">
                                                <li className="flex items-center">
                                                    {passwordData.new_password.length >= 6 ? <CheckCircle className="w-3 h-3 text-green-500 mr-1" /> : <X className="w-3 h-3 text-red-500 mr-1" />}
                                                    Au moins 6 caractères
                                                </li>
                                                <li className="flex items-center">
                                                    {/[A-Z]/.test(passwordData.new_password) ? <CheckCircle className="w-3 h-3 text-green-500 mr-1" /> : <X className="w-3 h-3 text-red-500 mr-1" />}
                                                    Une majuscule
                                                </li>
                                                <li className="flex items-center">
                                                    {/[0-9]/.test(passwordData.new_password) ? <CheckCircle className="w-3 h-3 text-green-500 mr-1" /> : <X className="w-3 h-3 text-red-500 mr-1" />}
                                                    Un chiffre
                                                </li>
                                                <li className="flex items-center">
                                                    {/[!@#$%^&*]/.test(passwordData.new_password) ? <CheckCircle className="w-3 h-3 text-green-500 mr-1" /> : <X className="w-3 h-3 text-red-500 mr-1" />}
                                                    Un caractère spécial
                                                </li>
                                            </ul>
                                        </div>
                                    )}

                                    <div className="flex space-x-4 pt-4">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleChangePassword}
                                            disabled={loading}
                                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all"
                                        >
                                            {loading ? "Modification..." : "Changer le mot de passe"}
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setChangingPassword(false)}
                                            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition"
                                        >
                                            Annuler
                                        </motion.button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === "documents" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto space-y-6"
                    >
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start">
                            <Shield className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-700">
                                Vos documents sont analysés automatiquement par notre IA pour pré-remplir votre profil.
                                Ils sont stockés de façon sécurisée et chiffrée.
                            </p>
                        </div>

                        {/* CIN */}
                        <DocumentCard
                            title="Carte Nationale d'Identité"
                            docType="cin"
                            icon={<CreditCard className="w-6 h-6 text-white" />}
                            color="from-blue-500 to-blue-700"
                            document={documents.cin}
                            loading={ocrLoading["cin"]}
                            onUpload={handleDocumentUpload}
                            fields={[
                                { label: "N° CIN", value: documents.cin.data?.cin_number },
                                { label: "Nom", value: documents.cin.data?.last_name },
                                { label: "Prénom", value: documents.cin.data?.first_name },
                                { label: "Date naissance", value: documents.cin.data?.birth_date },
                                { label: "Expiration", value: documents.cin.data?.expiry_date },
                            ]}
                        />

                        <DocumentCard
                            title="Permis de Conduire"
                            docType="permis"
                            icon={<Car className="w-6 h-6 text-white" />}
                            color="from-purple-500 to-purple-700"
                            document={documents.permis}
                            loading={ocrLoading["permis"]}
                            onUpload={handleDocumentUpload}
                            fields={[
                                { label: "N° Permis", value: documents.permis.data?.permis_number },
                                { label: "Prénom", value: documents.permis.data?.first_name },
                                { label: "Nom", value: documents.permis.data?.last_name },
                                { label: "Date naissance", value: documents.permis.data?.birth_date },
                                { label: "Date délivrance", value: documents.permis.data?.issue_date },
                                { label: "Expiration", value: documents.permis.data?.expiry_date },
                                {
                                    label: "Catégories", value: documents.permis.data?.categories?.length > 0
                                        ? documents.permis.data.categories.join(", ")
                                        : undefined
                                },
                            ]}
                        />
                        {/* Carte Grise */}
                        <DocumentCard
                            title="Carte Grise (Véhicule)"
                            docType="carte_grise"
                            icon={<FileText className="w-6 h-6 text-white" />}
                            color="from-emerald-500 to-emerald-700"
                            document={documents.carte_grise}
                            loading={ocrLoading["carte_grise"]}
                            onUpload={handleDocumentUpload}
                            fields={[
                                { label: "Immatriculation", value: documents.carte_grise.data?.immatriculation },
                                { label: "Ancienne immat.", value: documents.carte_grise.data?.immatriculation_ancienne },
                                { label: "Propriétaire", value: documents.carte_grise.data?.owner_name },
                                { label: "1ère MC", value: documents.carte_grise.data?.first_registration },
                                { label: "MC au Maroc", value: documents.carte_grise.data?.maroc_registration },
                                { label: "Fin de validité", value: documents.carte_grise.data?.expiry_date },
                                { label: "Usage", value: documents.carte_grise.data?.usage },
                            ]}
                        />
                    </motion.div>
                )}

                {/* Tab Activité */}
                {activeTab === "activity" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {/* Graphique d'activité */}
                        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Activité récente</h3>
                            <div className="h-64 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl flex items-center justify-center">
                                <p className="text-gray-500">Graphique d'activité (à implémenter)</p>
                            </div>
                        </div>

                        {/* Réservations récentes */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800">Dernières réservations</h3>
                                <Link
                                    href="/Client/bookings"
                                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
                                >
                                    Voir tout
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Link>
                            </div>

                            <div className="space-y-4">
                                {recentBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                                        onClick={() => handleViewBooking(booking.id)}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                                <Car className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">
                                                    {booking.vehicule.brand} {booking.vehicule.model}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-800">{booking.total_price}€</p>
                                            {getStatusBadge(booking.status)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Statistiques détaillées */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-gray-800">Jours de location</h4>
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                </div>
                                <p className="text-3xl font-bold text-gray-800">45</p>
                                <p className="text-sm text-gray-500 mt-1">Total des jours loués</p>
                            </div>

                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-gray-800">Économies</h4>
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                </div>
                                <p className="text-3xl font-bold text-gray-800">230€</p>
                                <p className="text-sm text-gray-500 mt-1">Grâce au programme fidélité</p>
                            </div>

                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-gray-800">Favoris</h4>
                                    <Heart className="w-5 h-5 text-red-600" />
                                </div>
                                <p className="text-3xl font-bold text-gray-800">6</p>
                                <p className="text-sm text-gray-500 mt-1">Véhicules enregistrés</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}