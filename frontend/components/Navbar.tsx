// components/Navbar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Menu, X, User, LogOut } from "lucide-react";

interface NavbarProps {
    user?: any;
    setUser?: (user: any) => void;
}

const navItems = [
    { label: "Accueil", href: "/" },
    { label: "Location", href: "/vehicules" },
    { label: "Bagages", href: "/bagages" },
    { label: "Colis", href: "/livraison" },
    { label: "Déménagement", href: "/demenagement" },
];

export default function Navbar({ user, setUser }: NavbarProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();

    const handleLogin = () => router.push("/login");
    const handleRegister = () => router.push("/register");
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (setUser) setUser(null);
        router.push("/");
    };

    // 🔥 Déterminer la route du profil en fonction du rôle
    const getProfileRoute = () => {
        if (!user) return "/login";
        return user.role?.name === "owner" ? "/owner/profile" : "/Client/profile";
    };

    // 🔥 Déterminer la route des réservations en fonction du rôle
    const getBookingsRoute = () => {
        if (!user) return "/login";
        return user.role?.name === "owner" ? "/owner/bookings" : "/Client/bookings";
    };

    // 🔥 Déterminer le dashboard en fonction du rôle
    const getDashboardRoute = () => {
        if (!user) return "/";
        return user.role?.name === "owner" ? "/owner/dashboard" : "/";
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                                <Car className="w-7 h-7 text-white" />
                            </div>
                            <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                AutoRent
                            </span>
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
                                <span className="text-gray-700 font-medium">Bonjour, {user.name}</span>
                                
                                {/* Dashboard pour owner */}
                                {user.role?.name === "owner" && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        onClick={() => router.push("/owner/dashboard")}
                                        className="text-blue-600 font-medium"
                                    >
                                        Dashboard
                                    </motion.button>
                                )}
                                
                                {/* Profil - redirection selon le rôle */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => router.push(getProfileRoute())}
                                    className="text-blue-600 font-medium"
                                >
                                    Profil
                                </motion.button>
                                
                                {/* Réservations - redirection selon le rôle */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => router.push(getBookingsRoute())}
                                    className="text-blue-600 font-medium"
                                >
                                    Réservations
                                </motion.button>
                                
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    onClick={handleLogout}
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

                {/* Mobile Navigation */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="md:hidden overflow-hidden"
                        >
                            <div className="py-4 border-t border-gray-100">
                                <div className="flex flex-col space-y-3">
                                    {navItems.map((item) => (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            className="text-gray-600 hover:text-blue-600 transition duration-200 font-medium px-2 py-1"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                    {user ? (
                                        <>
                                            {/* Dashboard pour owner en mobile */}
                                            {user.role?.name === "owner" && (
                                                <button
                                                    onClick={() => {
                                                        router.push("/owner/dashboard");
                                                        setIsMenuOpen(false);
                                                    }}
                                                    className="text-blue-600 font-medium text-left px-2 py-1"
                                                >
                                                    Dashboard
                                                </button>
                                            )}
                                            
                                            {/* Profil - redirection selon le rôle */}
                                            <button
                                                onClick={() => {
                                                    router.push(getProfileRoute());
                                                    setIsMenuOpen(false);
                                                }}
                                                className="text-blue-600 font-medium text-left px-2 py-1"
                                            >
                                                Profil
                                            </button>
                                            
                                            {/* Réservations - redirection selon le rôle */}
                                            <button
                                                onClick={() => {
                                                    router.push(getBookingsRoute());
                                                    setIsMenuOpen(false);
                                                }}
                                                className="text-blue-600 font-medium text-left px-2 py-1"
                                            >
                                                Réservations
                                            </button>
                                            
                                            <button
                                                onClick={() => {
                                                    handleLogout();
                                                    setIsMenuOpen(false);
                                                }}
                                                className="text-red-500 font-medium text-left px-2 py-1"
                                            >
                                                Déconnexion
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    handleLogin();
                                                    setIsMenuOpen(false);
                                                }}
                                                className="text-gray-600 hover:text-blue-600 font-medium text-left px-2 py-1"
                                            >
                                                Connexion
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleRegister();
                                                    setIsMenuOpen(false);
                                                }}
                                                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium text-left"
                                            >
                                                Inscription
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.nav>
    );
}