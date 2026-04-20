"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Mail, Lock, LogIn, UserPlus, Car, Eye, EyeOff } from "lucide-react";

// Interface pour la réponse de login
interface LoginResponse {
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

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [rememberMe, setRememberMe] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

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

    const redirectBasedOnRole = (role: string) => {
        if (role === "admin") {
            router.push("/admin/dashboard");
        } else if (role === "owner") {
            router.push("/owner/dashboard");
        } else {
            router.push("/");
        }
    };

    const handleRegister = () => {
        router.push("/register");
    };

    const handleLogin = async () => {
        // Validation basique
        if (!email || !password) {
            setError("Veuillez remplir tous les champs");
            return;
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            setError("Format d'email invalide");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await api.post<LoginResponse>("/login", {
                email,
                password,
            });

            const { access_token, user } = res.data;

            // Stocker les informations
            localStorage.setItem("token", access_token);
            localStorage.setItem("user", JSON.stringify(user));

            // Stocker l'email si "Se souvenir de moi" est coché
            if (rememberMe) {
                localStorage.setItem("rememberedEmail", email);
            } else {
                localStorage.removeItem("rememberedEmail");
            }

            console.log("Login success:", res.data);

            // Rediriger en fonction du rôle
            redirectBasedOnRole(user.role.name);

        } catch (error: any) {
            console.error("Login error:", error);

            // Gestion des erreurs spécifiques
            if (error.response?.status === 401) {
                setError("Email ou mot de passe incorrect");
            } else if (error.response?.status === 422) {
                setError("Données de connexion invalides");
            } else if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError("Erreur de connexion. Veuillez réessayer.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Récupérer l'email sauvegardé
    useEffect(() => {
        const rememberedEmail = localStorage.getItem("rememberedEmail");
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRememberMe(true);
        }
    }, []);

    // Animation variants
    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Éléments d'arrière-plan animés */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                    x: [0, 100, 0],
                    y: [0, -100, 0]
                }}
                transition={{ duration: 20, repeat: Infinity }}
                className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"
            />
            <motion.div
                animate={{
                    scale: [1, 1.5, 1],
                    rotate: [0, -90, 0],
                    x: [0, -100, 0],
                    y: [0, 100, 0]
                }}
                transition={{ duration: 25, repeat: Infinity }}
                className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
            />


            {/* Login Card */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10"
            >
                {/* Header avec animation */}
                <motion.div
                    variants={fadeInUp}
                    initial="initial"
                    animate="animate"
                    className="text-center mb-8"
                >
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30"
                    >
                        <Car className="w-10 h-10 text-white" />
                    </motion.div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Content de vous revoir !</h2>
                    <p className="text-gray-500">Connectez-vous pour accéder à votre espace</p>
                </motion.div>

                {/* Message d'erreur */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Form */}
                <motion.div
                    variants={fadeInUp}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: 0.1 }}
                    className="space-y-5"
                >
                    {/* Email Field */}
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="email"
                            placeholder="Adresse email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Password Field avec toggle */}
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Options supplémentaires */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
                        </label>
                        <Link
                            href="/forgot-password"
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition duration-200"
                        >
                            Mot de passe oublié ?
                        </Link>
                    </div>

                    {/* Login Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? (
                            <div className="flex items-center">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Connexion en cours...
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <LogIn className="w-5 h-5 mr-2" />
                                Se connecter
                            </div>
                        )}
                    </motion.button>

                    {/* Séparateur */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Nouveau sur AutoRent ?</span>
                        </div>
                    </div>

                    {/* Register Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleRegister}
                        disabled={isLoading}
                        className="w-full bg-white border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        <UserPlus className="w-5 h-5 mr-2" />
                        Créer un compte
                    </motion.button>
                </motion.div>

                {/* Footer */}
                <motion.div
                    variants={fadeInUp}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: 0.2 }}
                    className="mt-6 text-center text-sm text-gray-500"
                >
                    En vous connectant, vous acceptez nos{" "}
                    <Link href="/terms" className="text-blue-600 hover:underline">
                        conditions d'utilisation
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}