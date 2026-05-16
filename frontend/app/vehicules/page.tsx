"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import ChatbotWidget from "@/components/ChatbotWidget";
import Link from "next/link";

import {
  Car,
  Search,
  SlidersHorizontal,
  Grid3x3,
  List,
  Heart,
  Share2,
  Star,
  Fuel,
  Gauge,
  Users,
  MapPin,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  ArrowRight,
  CheckCircle,
  XCircle,
  Zap,
  TrendingUp,
  Calendar,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";

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
  city?: string;
  description?: string;
  status?: string;
}

export default function VehiculesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedFuel, setSelectedFuel] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [sortBy, setSortBy] = useState("popular");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));

    api
      .get<Vehicle[]>("/vehicules")
      .then((res) => {
        const data = res.data.map((v) => ({
          ...v,
          available: v.status === "available",
        }));
        setVehicles(data);
        setFilteredVehicles(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let filtered = [...vehicles];

    if (searchTerm) {
      filtered = filtered.filter(
        (v) =>
          v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.year.toString().includes(searchTerm),
      );
    }

    if (selectedBrand !== "all") {
      filtered = filtered.filter((v) => v.brand === selectedBrand);
    }

    if (selectedFuel !== "all") {
      filtered = filtered.filter((v) => v.fuel_type === selectedFuel);
    }

    filtered = filtered.filter(
      (v) =>
        v.price_per_day >= priceRange[0] && v.price_per_day <= priceRange[1],
    );

    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price_per_day - b.price_per_day);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price_per_day - a.price_per_day);
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
        filtered.sort((a, b) => b.year - a.year);
        break;
      default:
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    setFilteredVehicles(filtered);
  }, [searchTerm, selectedBrand, selectedFuel, priceRange, sortBy, vehicles]);

  const brands = ["all", ...new Set(vehicles.map((v) => v.brand))];
  const fuelTypes = ["all", "Essence", "Diesel", "Hybride", "Électrique"];

  const fadeInUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  return (
    <div className="min-h-screen bg-white">
      <ChatbotWidget />
      <Navbar user={user} setUser={setUser} />

      {/* Hero Section - comme la page d'accueil */}
      <section className="pt-28 pb-16 px-4 bg-gradient-to-br from-orange-50 via-violet-50 to-pink-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-violet-500 text-white px-4 py-2 rounded-full text-sm font-medium mb-5 shadow-md">
              <Zap className="w-4 h-4" />
              <span>Notre flotte de véhicules</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              Trouvez le véhicule idéal
              <span className="block bg-gradient-to-r from-orange-600 via-violet-600 to-pink-600 bg-clip-text text-transparent">
                pour vos déplacements
              </span>
            </h1>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Découvrez notre sélection de véhicules de qualité pour tous vos
              besoins
            </p>
          </motion.div>

          {/* Barre de recherche + filtres */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-4"
          >
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher par marque, modèle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="popular">⭐ Les plus populaires</option>
                  <option value="price-asc">💰 Prix croissant</option>
                  <option value="price-desc">💰 Prix décroissant</option>
                  <option value="rating">🏆 Mieux notés</option>
                  <option value="newest">✨ Plus récents</option>
                </select>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`px-4 py-3 border rounded-xl flex items-center gap-2 transition-all ${
                    isFilterOpen
                      ? "bg-orange-600 border-orange-600 text-white"
                      : "border-gray-200 hover:border-orange-500 hover:text-orange-600"
                  }`}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  <span className="hidden sm:inline">Filtres</span>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-t border-gray-100 mt-4 pt-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marque
                      </label>
                      <select
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="all">Toutes les marques</option>
                        {brands
                          .filter((b) => b !== "all")
                          .map((brand) => (
                            <option key={brand} value={brand}>
                              {brand}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Carburant
                      </label>
                      <select
                        value={selectedFuel}
                        onChange={(e) => setSelectedFuel(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="all">Tous types</option>
                        {fuelTypes
                          .filter((f) => f !== "all")
                          .map((fuel) => (
                            <option key={fuel} value={fuel}>
                              {fuel}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prix max: {priceRange[1]} MAD/jour
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        step="10"
                        value={priceRange[1]}
                        onChange={(e) =>
                          setPriceRange([
                            priceRange[0],
                            parseInt(e.target.value),
                          ])
                        }
                        className="w-full accent-orange-500"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Résultats */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header résultats */}
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">
              <span className="font-semibold text-gray-900">
                {filteredVehicles.length}
              </span>{" "}
              véhicules trouvés
            </p>
            <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition ${
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-orange-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition ${
                  viewMode === "list"
                    ? "bg-white shadow-sm text-orange-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                <Car className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-orange-600" />
              </div>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 bg-gray-50 rounded-2xl"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Aucun véhicule trouvé
              </h3>
              <p className="text-gray-500 mb-4">
                Essayez de modifier vos filtres de recherche
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedBrand("all");
                  setSelectedFuel("all");
                  setPriceRange([0, 500]);
                }}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Réinitialiser les filtres
              </button>
            </motion.div>
          ) : viewMode === "grid" ? (
            // Vue grille
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredVehicles.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => router.push(`/vehicules/${vehicle.id}`)}
                  className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100 group"
                >
                  <div className="relative h-44 overflow-hidden bg-gradient-to-br from-orange-200 to-violet-200">
                    {vehicle.image_url ? (
                      <img
                        src={vehicle.image_url}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-12 h-12 text-white/50" />
                      </div>
                    )}
                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow">
                      <span className="text-sm font-bold text-orange-600">
                        {vehicle.price_per_day} MAD
                      </span>
                      <span className="text-xs text-gray-400">/j</span>
                    </div>
                    {vehicle.rating && (
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 shadow">
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        <span className="text-xs font-semibold">
                          {vehicle.rating}
                        </span>
                      </div>
                    )}
                    {!vehicle.available && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                          Indisponible
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      {vehicle.city && (
                        <>
                          <MapPin className="w-3 h-3" />
                          <span>{vehicle.city}</span>
                          <span>·</span>
                        </>
                      )}
                      <span>{vehicle.year}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Fuel className="w-3 h-3" />
                        {vehicle.fuel_type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        {vehicle.transmission}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {vehicle.seats}pl
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            // Vue liste
            <div className="space-y-4">
              {filteredVehicles.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => router.push(`/vehicules/${vehicle.id}`)}
                  className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden cursor-pointer border border-gray-100"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-64 h-48 bg-gradient-to-br from-orange-200 to-violet-200 relative">
                      {vehicle.image_url ? (
                        <img
                          src={vehicle.image_url}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Car className="w-12 h-12 text-white/50" />
                        </div>
                      )}
                      {!vehicle.available && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                            Indisponible
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-5">
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">
                            {vehicle.brand} {vehicle.model}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {vehicle.year} • {vehicle.fuel_type} •{" "}
                            {vehicle.transmission}
                          </p>
                          {vehicle.city && (
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {vehicle.city}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-orange-600">
                            {vehicle.price_per_day} MAD
                          </p>
                          <p className="text-xs text-gray-400">par jour</p>
                        </div>
                      </div>

                      <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                        {vehicle.description ||
                          `Découvrez la ${vehicle.brand} ${vehicle.model}, un véhicule élégant et confortable parfait pour vos déplacements.`}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        {vehicle.rating && (
                          <div className="flex items-center gap-1">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i < Math.floor(vehicle.rating!)
                                      ? "text-yellow-400 fill-current"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-600">
                              {vehicle.rating}/5
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="w-3.5 h-3.5" />
                          {vehicle.seats} places
                        </div>
                        <div
                          className={`flex items-center gap-1 text-xs ${
                            vehicle.available
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {vehicle.available ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              Disponible
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              Indisponible
                            </>
                          )}
                        </div>
                      </div>

                      <button className="px-5 py-2 bg-gradient-to-r from-orange-500 to-violet-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all">
                        Voir les détails
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-orange-500 to-violet-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Vous ne trouvez pas votre bonheur ?
          </h2>
          <p className="text-orange-100 mb-6">
            Contactez-nous, nous vous aiderons à trouver le véhicule parfait
          </p>
          <button
            onClick={() => router.push("/contact")}
            className="inline-flex items-center gap-2 bg-white text-orange-600 font-semibold px-6 py-3 rounded-xl hover:shadow-lg transition"
          >
            Nous contacter <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-violet-600 rounded-xl flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <span className="font-extrabold text-xl text-white">
                  AutoRent
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4 max-w-xs">
                Location, transport, livraison, déménagement — la mobilité
                marocaine en un seul endroit.
              </p>
              <div className="flex gap-2">
                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gradient-to-br hover:from-orange-500 hover:to-violet-600 transition-all"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {[
              {
                title: "Services",
                links: [
                  "Location véhicules",
                  "Transport bagages",
                  "Livraison colis",
                  "Déménagement",
                ],
              },
              {
                title: "Propriétaires",
                links: [
                  "Créer un compte",
                  "Dashboard owner",
                  "Fonctionnalités IA",
                  "Aide",
                ],
              },
              {
                title: "Contact",
                links: [
                  "+212 5XX XX XX XX",
                  "contact@autorent.ma",
                  "Casablanca, Maroc",
                  "Lun-Sam 9h-19h",
                ],
              },
            ].map((s) => (
              <div key={s.title}>
                <h4 className="text-white text-sm font-semibold mb-4">
                  {s.title}
                </h4>
                <ul className="space-y-2">
                  {s.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="text-sm text-gray-500 hover:text-orange-400 transition-colors"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
            <p>
              &copy; {new Date().getFullYear()} AutoRent. Tous droits réservés.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-orange-400 transition">
                Conditions
              </a>
              <a href="#" className="hover:text-orange-400 transition">
                Confidentialité
              </a>
              <a href="#" className="hover:text-orange-400 transition">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
