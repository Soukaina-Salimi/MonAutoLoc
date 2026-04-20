"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import ChatbotWidget from "@/components/ChatbotWidget";

import {
  Car,
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
  ArrowRight,
  CheckCircle,
  Package,
  Truck,
  Luggage,
  Search,
  Smile,
  CreditCard,
  Headphones,
  Award,
  Zap,
  TrendingUp,
  Gift,
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

// Types de services
type ServiceType =
  | "location"
  | "transport_bagages"
  | "livraison_colis"
  | "demenagement";

interface ServiceCard {
  id: ServiceType;
  title: string;
  shortDesc: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  hoverGradient: string;
  iconBg: string;
  stats: { value: string; label: string }[];
  features: string[];
  route: string;
}

const serviceCards: ServiceCard[] = [
  {
    id: "location",
    title: "Location de véhicules",
    shortDesc: "La liberté sur roues",
    description:
      "Découvrez notre flotte de véhicules premium pour tous vos déplacements",
    icon: Car,
    color: "blue",
    bgGradient: "from-blue-500 to-indigo-600",
    hoverGradient: "from-blue-600 to-indigo-700",
    iconBg: "bg-blue-500",
    stats: [
      { value: "500+", label: "Véhicules" },
      { value: "4.9", label: "Note" },
      { value: "10k+", label: "Clients" },
    ],
    features: ["Assurance complète", "Kilométrage illimité", "Assistance 24/7"],
    route: "/vehicules",
  },
  {
    id: "transport_bagages",
    title: "Transport de bagages",
    shortDesc: "Voyagez léger",
    description:
      "Nous transportons vos bagages où vous voulez, quand vous voulez",
    icon: Luggage,
    color: "emerald",
    bgGradient: "from-emerald-500 to-teal-600",
    hoverGradient: "from-emerald-600 to-teal-700",
    iconBg: "bg-emerald-500",
    stats: [
      { value: "2h", label: "Express" },
      { value: "100%", label: "Satisfaction" },
      { value: "24/7", label: "Disponible" },
    ],
    features: ["Suivi en temps réel", "Assurance bagages", "Livraison express"],
    route: "/bagages",
  },
  {
    id: "livraison_colis",
    title: "Livraison de colis",
    shortDesc: "Rapide et fiable",
    description:
      "Solution de livraison professionnelle pour particuliers et entreprises",
    icon: Package,
    color: "purple",
    bgGradient: "from-purple-500 to-pink-600",
    hoverGradient: "from-purple-600 to-pink-700",
    iconBg: "bg-purple-500",
    stats: [
      { value: "99%", label: "À temps" },
      { value: "50k+", label: "Colis" },
      { value: "4.8", label: "Note" },
    ],
    features: ["Livraison J+1", "Assurance incluse", "Suivi en ligne"],
    route: "/livraison",
  },
  {
    id: "demenagement",
    title: "Déménagement",
    shortDesc: "Changez de vie en toute sérénité",
    description: "Service de déménagement complet, du devis à l'installation",
    icon: Truck,
    color: "orange",
    bgGradient: "from-orange-500 to-red-600",
    hoverGradient: "from-orange-600 to-red-700",
    iconBg: "bg-orange-500",
    stats: [
      { value: "2h", label: "Devis" },
      { value: "100%", label: "Satisfaction" },
      { value: "15+", label: "Expérience" },
    ],
    features: ["Devis gratuit", "Équipe pro", "Matériel inclus"],
    route: "/demenagement",
  },
];

export default function HomePage() {
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredCard, setHoveredCard] = useState<ServiceType | null>(null);
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
        setRecentVehicles(response.data || []);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        setLoading(false);
      }
    };

    fetchRecentVehicles();
  }, []);

  const handleVehicleClick = (id: number): void => {
    router.push(`/vehicules/${id}`);
  };

  const handleViewAllVehicles = (): void => {
    router.push("/vehicules");
  };

  const handleServiceClick = (route: string): void => {
    router.push(route);
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <ChatbotWidget />
      <Navbar user={user} setUser={setUser} />

      {/* Hero Section avec 4 grandes cartes de services */}
      <section className="pt-24 pb-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Titre et sous-titre */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Plus de 500 véhicules disponibles
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                Choisissez votre service
              </span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Location de véhicules, transport de bagages, livraison de colis ou
              déménagement — nous avons la solution parfaite pour vous.
            </p>
          </motion.div>

          {/* 4 grandes cartes de services */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {serviceCards.map((service, index) => {
              const Icon = service.icon;
              const isHovered = hoveredCard === service.id;
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  onMouseEnter={() => setHoveredCard(service.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => handleServiceClick(service.route)}
                  className="relative group cursor-pointer"
                >
                  <div
                    className={`
                    relative bg-white rounded-2xl p-6 shadow-lg transition-all duration-500 
                    hover:shadow-2xl hover:-translate-y-2 border border-gray-100
                    ${isHovered ? "shadow-2xl -translate-y-2" : ""}
                  `}
                  >
                    {/* Icône avec animation */}
                    <div
                      className={`
                      absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-16 
                      bg-gradient-to-r ${service.bgGradient} rounded-2xl 
                      flex items-center justify-center shadow-lg 
                      transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl
                    `}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    {/* Contenu */}
                    <div className="mt-8 text-center">
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {service.title}
                      </h3>
                      <p className="text-sm font-medium text-blue-600 mb-2">
                        {service.shortDesc}
                      </p>
                      <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                        {service.description}
                      </p>

                      {/* Stats rapides */}
                      <div className="flex justify-center gap-4 mb-4 pt-2 border-t border-gray-100">
                        {service.stats.map((stat, i) => (
                          <div key={i} className="text-center">
                            <p className="text-lg font-bold text-gray-800">
                              {stat.value}
                            </p>
                            <p className="text-xs text-gray-400">
                              {stat.label}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Features (2 premières) */}
                      <div className="space-y-1.5 mb-4 text-left">
                        {service.features.slice(0, 2).map((feature, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs text-gray-500"
                          >
                            <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Bouton CTA */}
                      <button
                        className={`
                          w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                          bg-gradient-to-r ${service.bgGradient} text-white
                          hover:shadow-lg flex items-center justify-center gap-2 group/btn
                        `}
                      >
                        Je découvre
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>

                    {/* Effet de brillance au hover */}
                    <div
                      className={`
                      absolute inset-0 rounded-2xl bg-gradient-to-r ${service.bgGradient} 
                      opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none
                    `}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Statistiques globales */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-gray-200"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">500+</p>
              <p className="text-sm text-gray-500">Véhicules</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">10k+</p>
              <p className="text-sm text-gray-500">Clients satisfaits</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">4.9</p>
              <p className="text-sm text-gray-500">Note moyenne</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">24/7</p>
              <p className="text-sm text-gray-500">Support client</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section "Pourquoi nous choisir" */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">
              Nos atouts
            </span>
            <h2 className="text-3xl font-bold mt-2 mb-4">
              Pourquoi nous choisir ?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Nous mettons tout en œuvre pour vous offrir la meilleure
              expérience possible
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "Assurance incluse",
                desc: "Protection complète sans franchise",
                color: "blue",
              },
              {
                icon: Clock,
                title: "Service 24/7",
                desc: "Support disponible à tout moment",
                color: "green",
              },
              {
                icon: CreditCard,
                title: "Paiement sécurisé",
                desc: "Transactions 100% sécurisées",
                color: "purple",
              },
              {
                icon: Headphones,
                title: "Assistance dédiée",
                desc: "Un conseiller à votre écoute",
                color: "pink",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-lg transition-all"
              >
                <div
                  className={`w-12 h-12 bg-${feature.color}-100 rounded-xl flex items-center justify-center mx-auto mb-3`}
                >
                  <feature.icon
                    className={`w-6 h-6 text-${feature.color}-600`}
                  />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section "Comment ça marche" */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">
              Processus simple
            </span>
            <h2 className="text-3xl font-bold mt-2 mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              En quelques étapes simples, profitez de nos services
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Choisissez",
                description: "Sélectionnez le service dont vous avez besoin",
                icon: Search,
              },
              {
                step: "02",
                title: "Réservez",
                description: "Réservez en ligne en quelques clics",
                icon: Calendar,
              },
              {
                step: "03",
                title: "Profitez",
                description: "Nous prenons le relais",
                icon: Smile,
              },
              {
                step: "04",
                title: "Payez",
                description: "Paiement sécurisé à la fin",
                icon: CreditCard,
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-2xl font-bold text-blue-600 mb-1">
                  {item.step}
                </p>
                <h3 className="font-semibold text-gray-800 mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section des véhicules populaires */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-between items-end mb-8"
          >
            <div>
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">
                Notre flotte
              </span>
              <h2 className="text-3xl font-bold mt-1">Véhicules populaires</h2>
            </div>
            <motion.button
              whileHover={{ x: 5 }}
              onClick={handleViewAllVehicles}
              className="text-blue-600 font-medium flex items-center gap-1 hover:text-purple-600 transition-colors text-sm"
            >
              Voir tout <ChevronRight className="w-4 h-4" />
            </motion.button>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {recentVehicles.slice(0, 4).map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  variants={fadeInUp}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer border border-gray-100"
                  onClick={() => handleVehicleClick(vehicle.id)}
                >
                  <div className="relative h-40 overflow-hidden">
                    {vehicle.image_url ? (
                      <img
                        src={vehicle.image_url}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Car className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20"></div>
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full">
                      <p className="text-xs font-bold text-blue-600">
                        {vehicle.price_per_day}€
                        <span className="text-[10px] font-normal">/jour</span>
                      </p>
                    </div>
                    {vehicle.rating && (
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 text-yellow-400 fill-current" />
                        <span className="text-xs font-medium">
                          {vehicle.rating}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-800 text-sm">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <p className="text-xs text-gray-500">{vehicle.year}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <Fuel className="w-2.5 h-2.5" />
                        {vehicle.fuel_type}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className="flex items-center gap-0.5">
                        <Gauge className="w-2.5 h-2.5" />
                        {vehicle.transmission}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className="flex items-center gap-0.5">
                        <Users className="w-2.5 h-2.5" />
                        {vehicle.seats} pl.
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500">
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Prêt à utiliser nos services ?
            </h2>
            <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
              Rejoignez des milliers de clients satisfaits et profitez de nos
              services dès aujourd'hui
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/register")}
                className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:shadow-xl transition-all inline-flex items-center gap-2"
              >
                Créer un compte gratuit <ArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleViewAllVehicles}
                className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-all"
              >
                Voir nos services
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white">AutoRent</span>
              </div>
              <p className="text-gray-400 text-sm mb-4 max-w-md">
                La solution idéale pour tous vos besoins de mobilité. Location
                de véhicules, transport, livraison et déménagement.
              </p>
              <div className="flex space-x-3">
                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, index) => (
                  <motion.a
                    key={index}
                    whileHover={{ y: -2 }}
                    href="#"
                    className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </motion.a>
                ))}
              </div>
            </div>

            {[
              {
                title: "Nos services",
                links: [
                  "Location véhicules",
                  "Transport bagages",
                  "Livraison colis",
                  "Déménagement",
                ],
              },
              {
                title: "Support",
                links: [
                  "FAQ",
                  "Centre d'aide",
                  "Conditions générales",
                  "Confidentialité",
                ],
              },
              {
                title: "Contact",
                links: [
                  "+212 5XX XX XX XX",
                  "contact@autorent.com",
                  "Casablanca, Maroc",
                  "Lun-Sam 9h-19h",
                ],
              },
            ].map((section) => (
              <div key={section.title}>
                <h3 className="text-white font-semibold mb-4 text-sm">
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="hover:text-white transition-colors text-gray-400 text-sm"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} AutoRent. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
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
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
