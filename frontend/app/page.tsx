"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

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
  Sparkles,
  Shield,
  Clock,
  TrendingUp,
  ArrowRight,
  CheckCircle
} from "lucide-react";

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
}

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const fetchRecentVehicles = async (): Promise<void> => {
      try {
        const response = await api.get<Vehicle[]>("/vehicules");

        console.log("API DATA:", response.data);

        setRecentVehicles(response.data || response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        setLoading(false);
      }
    };

    fetchRecentVehicles();


    // Auto-rotation pour le hero (optionnel)
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 3);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleVehicleClick = (id: number): void => {
    router.push(`/vehicules/${id}`);
  };

  const handleViewAllVehicles = (): void => {
    router.push("/vehicules");
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

  // Animations variants
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
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
    <div className="min-h-screen bg-white">
      {/* Navigation avec effet de verre */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo avec animation */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
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

          {/* Mobile Navigation avec animation */}
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
                    {['Accueil', 'Véhicules', 'Comment ça marche', 'Contact'].map((item) => (
                      <motion.div
                        key={item}
                        whileHover={{ x: 10 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Link
                          href={item === "Accueil" ? "/" : item === "Véhicules" ? "/vehicules" : "#"}
                          className="text-gray-600 hover:text-blue-600 transition duration-200 font-medium px-2 py-1 block"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {item}
                        </Link>
                      </motion.div>
                    ))}
                    <motion.button
                      whileHover={{ x: 10 }}
                      onClick={() => {
                        handleLogin();
                        setIsMenuOpen(false);
                      }}
                      className="text-gray-600 hover:text-blue-600 transition duration-200 font-medium text-left px-2 py-1"
                    >
                      Connexion
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        handleRegister();
                        setIsMenuOpen(false);
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition duration-200 text-left"
                    >
                      Inscription
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>

      {/* Hero Section avec animation de fond */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-flex items-center bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-medium mb-6"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Plus de 500 véhicules disponibles
              </motion.div>

              <h1 className="text-5xl lg:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                  Louez votre
                </span>
                <br />
                voiture idéale
              </h1>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Découvrez notre large sélection de véhicules premium pour tous vos déplacements.
                Location flexible, simple et sécurisée.
              </p>

              <div className="flex flex-wrap gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleViewAllVehicles}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 inline-flex items-center group"
                >
                  Explorer les véhicules
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold border-2 border-gray-200 hover:border-blue-600 hover:text-blue-600 transition-all duration-200"
                >
                  En savoir plus
                </motion.button>
              </div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="grid grid-cols-3 gap-8 mt-12"
              >
                <div>
                  <p className="text-3xl font-bold text-gray-800">500+</p>
                  <p className="text-sm text-gray-500">Véhicules</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-800">10k+</p>
                  <p className="text-sm text-gray-500">Clients satisfaits</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-800">4.9</p>
                  <p className="text-sm text-gray-500">Note moyenne</p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative h-[500px] w-full">
                <motion.div

                  className="relative h-full rounded-3xl overflow-hidden shadow-2xl"
                >
                  <img
                    src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800"
                    alt="Car"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                  {/* Texte superposé */}
                  <div className="absolute bottom-8 left-8 text-white">
                    <button className="mt-4 bg-white text-gray-900 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
                      Réserver maintenant
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section avec design moderne */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Pourquoi nous choisir</span>
            <h2 className="text-4xl font-bold mt-2 mb-4">Une expérience de location unique</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Nous mettons tout en œuvre pour vous offrir le meilleur service de location de véhicules
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Calendar, title: "Réservation facile", desc: "En quelques clics seulement", color: "blue" },
              { icon: Car, title: "Large choix", desc: "Plus de 500 véhicules", color: "green" },
              { icon: Shield, title: "Assurance incluse", desc: "Protection complète", color: "purple" },
              { icon: Clock, title: "Support 24/7", desc: "À votre écoute", color: "pink" }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -10 }}
                className="bg-gray-50 rounded-2xl p-8 text-center group cursor-pointer"
              >
                <div className={`w-16 h-16 bg-${feature.color}-100 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-8 h-8 text-${feature.color}-600`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-gray-500">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Vehicles Section avec design premium */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-between items-end mb-12"
          >
            <div>
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Notre flotte</span>
              <h2 className="text-4xl font-bold mt-2">Véhicules populaires</h2>
            </div>
            <motion.button
              whileHover={{ x: 5 }}
              onClick={handleViewAllVehicles}
              className="text-blue-600 font-semibold flex items-center hover:text-purple-600 transition-colors"
            >
              Voir tout
              <ChevronRight className="w-5 h-5 ml-1" />
            </motion.button>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {recentVehicles.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  variants={fadeInUp}
                  whileHover={{ y: -10 }}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
                  onClick={() => handleVehicleClick(vehicle.id)}
                >
                  <div className="relative h-48 overflow-hidden">
                    {vehicle.image_url ? (
                      <img
                        src={vehicle.image_url}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Car className="w-16 h-16 text-gray-400" />
                      </div>
                    )}

                    {/* Overlay sombre */}
                    <div className="absolute inset-0 bg-black/20"></div>

                    {/* Prix */}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full">
                      <p className="text-sm font-bold text-blue-600">
                        {vehicle.price_per_day}€
                        <span className="text-xs font-normal text-gray-500">/jour</span>
                      </p>
                    </div>
                    {vehicle.rating && (
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center">
                        <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                        <span className="text-sm font-medium">{vehicle.rating}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="font-bold text-xl text-gray-800 mb-1">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">{vehicle.year}</p>

                    <div className="grid grid-cols-3 gap-2 mb-6">
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

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200"
                    >
                      Voir détails
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section avec design spectaculaire */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-20 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute bottom-20 right-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          </div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl font-bold text-white mb-6">
              Prêt à prendre la route ?
            </h2>
            <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
              Rejoignez des milliers de conducteurs satisfaits et commencez votre aventure dès aujourd'hui
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRegister}
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:shadow-2xl transition-all duration-200 inline-flex items-center group text-lg"
              >
                Créer un compte gratuit
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleViewAllVehicles}
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all duration-200 text-lg"
              >
                Voir les véhicules
              </motion.button>
            </div>

            <div className="grid grid-cols-3 gap-8 mt-16 text-white">
              <div>
                <p className="text-3xl font-bold">10k+</p>
                <p className="text-sm opacity-80">Clients</p>
              </div>
              <div>
                <p className="text-3xl font-bold">500+</p>
                <p className="text-sm opacity-80">Véhicules</p>
              </div>
              <div>
                <p className="text-3xl font-bold">24/7</p>
                <p className="text-sm opacity-80">Support</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer moderne */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Car className="w-7 h-7 text-white" />
                </div>
                <span className="font-bold text-2xl text-white">AutoRent</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                La solution idéale pour la location de véhicules en toute simplicité.
                Des milliers de conducteurs nous font confiance.
              </p>
              <div className="flex space-x-4">
                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, index) => (
                  <motion.a
                    key={index}
                    whileHover={{ y: -3 }}
                    href="#"
                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                  </motion.a>
                ))}
              </div>
            </div>

            {[
              {
                title: "Liens rapides",
                links: ["Accueil", "Véhicules", "Comment ça marche", "Contact"]
              },
              {
                title: "Support",
                links: ["FAQ", "Centre d'aide", "Conditions", "Confidentialité"]
              },
              {
                title: "Contact",
                links: ["+33 1 23 45 67 89", "contact@autorent.com", "Paris, France", "Lun-Sam 9h-19h"]
              }
            ].map((section) => (
              <div key={section.title}>
                <h3 className="text-white font-semibold mb-6">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="hover:text-white transition-colors text-gray-400">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} AutoRent. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

      {/* Ajout des styles pour les animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}