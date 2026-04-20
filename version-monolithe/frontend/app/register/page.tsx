"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, UserPlus, LogIn, Car, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

// Interface pour la réponse d'inscription
interface RegisterResponse {
    access_token: string;
    user: {
        id: number;
        name: string;
        email: string;
        role: {
            id: number;
            name: string;
        };
    };
}

// Interface pour les erreurs
interface ApiError {
    response?: {
        data?: {
            message?: string;
            errors?: Record<string, string[]>;
        };
        status?: number;
    };
}

export default function RegisterPage() {
    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [roleId, setRoleId] = useState<number>(3);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [acceptTerms, setAcceptTerms] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [passwordStrength, setPasswordStrength] = useState<number>(0);

    const router = useRouter();

    // Vérifier si l'utilisateur est déjà connecté
    useEffect(() => {
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                redirectBasedOnRole(user.role.name);
            } catch (error) {
                console.error("Error parsing user:", error);
            }
        }
    }, []);

    // Calculer la force du mot de passe
    useEffect(() => {
        let strength = 0;
        if (password.length >= 8) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        setPasswordStrength(strength);
    }, [password]);

    const redirectBasedOnRole = (role: string) => {
        if (role === "admin") {
            router.push("/admin/dashboard");
        } else if (role === "owner") {
            router.push("/owner/dashboard");
        } else {
            router.push("/dashboard");
        }
    };

    const handleLogin = () => {
        router.push("/login");
    };

    const validateForm = (): boolean => {
        if (!name || !email || !password || !confirmPassword) {
            setError("Veuillez remplir tous les champs");
            return false;
        }

        if (name.length < 2) {
            setError("Le nom doit contenir au moins 2 caractères");
            return false;
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            setError("Format d'email invalide");
            return false;
        }

        if (password.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères");
            return false;
        }

        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas");
            return false;
        }

        if (!acceptTerms) {
            setError("Vous devez accepter les conditions d'utilisation");
            return false;
        }

        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await api.post<RegisterResponse>("/register", {
                name,
                email,
                password,
                password_confirmation: confirmPassword,
                role_id: roleId,
            });

            console.log("Registration success:", res.data);

            const { access_token, user } = res.data;

            // Stocker les informations
            localStorage.setItem("token", access_token);
            localStorage.setItem("user", JSON.stringify(user));

            alert("✅ Inscription réussie !");

            // Rediriger en fonction du rôle
            redirectBasedOnRole(user.role.name);

        } catch (error: any) {
            console.error("Registration error:", error.response?.data);

            // Gestion des erreurs spécifiques
            if (error.response?.status === 422) {
                const errors = error.response.data?.errors as Record<string, string[]>;

                if (errors) {
                    const firstError = Object.values(errors)[0]?.[0];
                    setError(firstError || "Erreur de validation");
                } else {
                    setError("Données d'inscription invalides");
                }

            } else if (error.response?.status === 409) {
                setError("Cet email est déjà utilisé");
            } else if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError("Erreur lors de l'inscription. Veuillez réessayer.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Obtenir la couleur de la force du mot de passe
    const getPasswordStrengthColor = () => {
        switch (passwordStrength) {
            case 0: return "bg-gray-200";
            case 1: return "bg-red-500";
            case 2: return "bg-yellow-500";
            case 3: return "bg-green-500";
            case 4: return "bg-green-600";
            default: return "bg-gray-200";
        }
    };

    const getPasswordStrengthText = () => {
        switch (passwordStrength) {
            case 0: return "Très faible";
            case 1: return "Faible";
            case 2: return "Moyen";
            case 3: return "Fort";
            case 4: return "Très fort";
            default: return "";
        }
    };

    // Animation variants
    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Éléments d'arrière-plan animés */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                }}
                transition={{ duration: 20, repeat: Infinity }}
                className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"
            />
            <motion.div
                animate={{
                    scale: [1, 1.5, 1],
                    rotate: [0, -90, 0],
                }}
                transition={{ duration: 25, repeat: Infinity }}
                className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
            />


            {/* Register Card */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10 max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <motion.div
                    variants={fadeInUp}
                    initial="initial"
                    animate="animate"
                    className="text-center mb-6"
                >
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30"
                    >
                        <Car className="w-10 h-10 text-white" />
                    </motion.div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Créer un compte</h2>
                    <p className="text-gray-500">Rejoignez notre communauté de location de véhicules</p>
                </motion.div>

                {/* Message d'erreur */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center"
                        >
                            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Form */}
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="space-y-4"
                >
                    {/* Name Field */}
                    <motion.div variants={fadeInUp} className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Nom complet"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            disabled={isLoading}
                        />
                    </motion.div>

                    {/* Email Field */}
                    <motion.div variants={fadeInUp} className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="email"
                            placeholder="Adresse email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            disabled={isLoading}
                        />
                    </motion.div>

                    {/* Password Field */}
                    <motion.div variants={fadeInUp} className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                            className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </motion.div>

                    {/* Confirm Password Field */}
                    <motion.div variants={fadeInUp} className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirmer le mot de passe"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                            className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </motion.div>

                    {/* Indicateur de force du mot de passe */}
                    {password && (
                        <motion.div
                            variants={fadeInUp}
                            className="space-y-2"
                        >
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">Force du mot de passe :</span>
                                <span className="text-xs font-medium">{getPasswordStrengthText()}</span>
                            </div>
                            <div className="flex gap-1 h-1">
                                {[1, 2, 3, 4].map((level) => (
                                    <div
                                        key={level}
                                        className={`flex-1 rounded-full transition-all duration-300 ${level <= passwordStrength ? getPasswordStrengthColor() : 'bg-gray-200'
                                            }`}
                                    />
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                <div className="flex items-center">
                                    {password.length >= 6 ? (
                                        <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                                    ) : (
                                        <div className="w-3 h-3 mr-1" />
                                    )}
                                    6+ caractères
                                </div>
                                <div className="flex items-center">
                                    {/[A-Z]/.test(password) ? (
                                        <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                                    ) : (
                                        <div className="w-3 h-3 mr-1" />
                                    )}
                                    Majuscule
                                </div>
                                <div className="flex items-center">
                                    {/[0-9]/.test(password) ? (
                                        <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                                    ) : (
                                        <div className="w-3 h-3 mr-1" />
                                    )}
                                    Chiffre
                                </div>
                                <div className="flex items-center">
                                    {/[^A-Za-z0-9]/.test(password) ? (
                                        <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                                    ) : (
                                        <div className="w-3 h-3 mr-1" />
                                    )}
                                    Spécial
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Role Selection */}
                    <motion.div variants={fadeInUp} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Vous êtes ?
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 3, label: "Client", icon: "👤" },
                                { id: 2, label: "Owner", icon: "🚗" },
                                { id: 1, label: "Admin", icon: "👑" }
                            ].map((role) => (
                                <motion.button
                                    key={role.id}
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setRoleId(role.id)}
                                    className={`py-2 px-2 rounded-xl border-2 transition-all duration-200 ${roleId === role.id
                                        ? "border-blue-600 bg-blue-50 text-blue-600"
                                        : "border-gray-200 hover:border-gray-300 text-gray-600"
                                        }`}
                                    disabled={isLoading}
                                >
                                    <div className="text-sm font-medium">{role.icon} {role.label}</div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Role Info */}
                    <motion.div
                        variants={fadeInUp}
                        className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-xl"
                    >
                        <p className="text-sm text-blue-600">
                            {roleId === 1 && "👑 Administrateur : Accès complet à la gestion de la plateforme"}
                            {roleId === 2 && "🚗 Propriétaire : Gérez vos véhicules et vos réservations"}
                            {roleId === 3 && "👤 Client : Louez des véhicules et suivez vos réservations"}
                        </p>
                    </motion.div>

                    {/* Terms and Conditions */}
                    <motion.div variants={fadeInUp} className="flex items-start">
                        <input
                            type="checkbox"
                            id="terms"
                            checked={acceptTerms}
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                            J'accepte les{" "}
                            <Link href="/terms" className="text-blue-600 hover:underline">
                                conditions d'utilisation
                            </Link>{" "}
                            et la{" "}
                            <Link href="/privacy" className="text-blue-600 hover:underline">
                                politique de confidentialité
                            </Link>
                        </label>
                    </motion.div>

                    {/* Register Button */}
                    <motion.button
                        variants={fadeInUp}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleRegister}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? (
                            <div className="flex items-center">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Inscription en cours...
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <UserPlus className="w-5 h-5 mr-2" />
                                S'inscrire
                            </div>
                        )}
                    </motion.button>

                    {/* Séparateur */}
                    <motion.div variants={fadeInUp} className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Déjà inscrit ?</span>
                        </div>
                    </motion.div>

                    {/* Login Button */}
                    <motion.button
                        variants={fadeInUp}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="w-full bg-white border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        <LogIn className="w-5 h-5 mr-2" />
                        Se connecter
                    </motion.button>
                </motion.div>
            </motion.div>
        </div>
    );
}