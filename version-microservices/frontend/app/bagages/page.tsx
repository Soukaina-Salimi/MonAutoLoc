"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Luggage,
  MapPin,
  Star,
  CheckCircle,
  Search,
  Car,
  Menu,
  X,
  ArrowRight,
  Shield,
  Clock,
  Zap,
  Award,
  ChevronRight,
  User,
  Phone,
  Navigation,
  Package,
  Filter,
  SlidersHorizontal,
  Building2,
} from "lucide-react";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import ChatbotWidget from "@/components/ChatbotWidget";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserType {
  id: number;
  name: string;
  email: string;
  role: { name: string };
}

interface Owner {
  id: number;
  full_name: string;
  name: string;
  avatar: string | null;
  city: string | null;
  bio: string | null;
  phone: string | null;
  base_price: number | null;
  coverage_area: string | null;
  description: string | null;
  rating: number;
  reviews_count: number;
  requests_completed: number;
  member_since: string;
  verified: boolean;
  services: { type: string; label: string; base_price: number | null }[];
  // ── Champs agence ─────────────────────────────────
  is_agency?: boolean;
  agency_name?: string;
  agency_logo_url?: string | null;
  display_name?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CITIES = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Fès",
  "Tanger",
  "Agadir",
  "Meknès",
  "Oujda",
  "Kenitra",
  "Tétouan",
];

const WHY_US = [
  { icon: Shield, text: "Prestataires vérifiés" },
  { icon: Clock, text: "Disponible 7j/7" },
  { icon: Navigation, text: "Suivi en temps réel" },
  { icon: Award, text: "Satisfaction garantie" },
];

// Fonction pour nettoyer l'URL de l'image
const getImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.includes("http://auth-service")) {
    return url.replace("http://auth-service", "http://localhost");
  }
  if (url.includes("http://vehicle-service")) {
    return url.replace("http://vehicle-service", "http://localhost");
  }
  return url;
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

function OwnerCard({
  owner,
  onSelect,
}: {
  owner: Owner;
  onSelect: (o: Owner) => void;
}) {
  const displayName =
    owner.display_name || owner.full_name || owner.name || "?";
  const initial = displayName[0].toUpperCase();

  // ✅ Valeurs par défaut pour éviter undefined
  const rating = owner.rating ?? 0;
  const reviewsCount = owner.reviews_count ?? 0;
  const requestsCompleted = owner.requests_completed ?? 0;
  const memberSince = owner.member_since || "Nouveau";
  const basePrice = owner.base_price ?? null;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={() => onSelect(owner)}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-gray-100"
    >
      {/* Top color band */}
      <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {owner.is_agency && owner.agency_logo_url ? (
            <div className="w-16 h-16 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={getImageUrl(owner.agency_logo_url)}
                alt={owner.agency_name || displayName}
                className="w-full h-full object-contain p-1.5"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement("div");
                    fallback.className =
                      "w-full h-full flex items-center justify-center";
                    fallback.innerHTML = `<span class="text-2xl font-bold text-gray-400">${initial}</span>`;
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center overflow-hidden shrink-0 relative">
              {owner.avatar ? (
                <img
                  src={getImageUrl(owner.avatar)}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xl font-bold">{initial}</span>
              )}
              {owner.verified && !owner.is_agency && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-gray-800 truncate">
                {displayName}
              </h3>
              {owner.is_agency && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Agence
                </span>
              )}
              {owner.verified && !owner.is_agency && (
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              )}
            </div>
            {owner.city && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {owner.city}
              </p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
              <span className="text-sm font-medium text-gray-700">
                {rating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-400">
                ({reviewsCount} avis)
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {owner.bio && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">{owner.bio}</p>
        )}

        {/* Coverage area */}
        {owner.coverage_area && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
            <Navigation className="w-3.5 h-3.5 text-emerald-500" />
            <span>Zone : {owner.coverage_area}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-gray-800">
              {requestsCompleted}
            </p>
            <p className="text-xs text-gray-400">Missions</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-gray-800">
              {rating.toFixed(1)}
            </p>
            <p className="text-xs text-gray-400">Note</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-gray-800">{memberSince}</p>
            <p className="text-xs text-gray-400">Depuis</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            {basePrice ? (
              <div>
                <span className="text-xs text-gray-400">À partir de</span>
                <p className="text-lg font-bold text-emerald-600">
                  {basePrice} MAD
                </p>
              </div>
            ) : (
              <span className="text-sm text-gray-400">Prix sur devis</span>
            )}
          </div>
          <button className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:shadow-md transition">
            Voir le profil <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TransportBagagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [filtered, setFiltered] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [city, setCity] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyVerif, setOnlyVerif] = useState(false);
  const [sortBy, setSortBy] = useState<"rating" | "price" | "missions">(
    "rating",
  );

  // Modal réservation
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);

  // ── Fetch owners ────────────────────────────────────────────────────────
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {}
    }

    api
      .get("/service-owners?service=transport_bagages")
      .then(({ data }) => {
        // Normaliser les données
        const normalized = data.map((owner: any) => ({
          ...owner,
          display_name: owner.is_agency
            ? owner.agency_name || owner.name
            : owner.name,
        }));
        setOwners(normalized);
        setFiltered(normalized);
      })
      .catch(() => setError("Impossible de charger les prestataires."))
      .finally(() => setLoading(false));
  }, []);

  // ── Filtrage + tri ──────────────────────────────────────────────────────
  useEffect(() => {
    let result = [...owners];
    if (city)
      result = result.filter((o) =>
        o.city?.toLowerCase().includes(city.toLowerCase()),
      );
    if (maxPrice)
      result = result.filter(
        (o) => !o.base_price || o.base_price <= Number(maxPrice),
      );
    if (onlyVerif) result = result.filter((o) => o.verified);

    result.sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "price")
        return (a.base_price ?? 9999) - (b.base_price ?? 9999);
      if (sortBy === "missions")
        return b.requests_completed - a.requests_completed;
      return 0;
    });
    setFiltered(result);
  }, [city, maxPrice, onlyVerif, sortBy, owners]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <Navbar user={user} setUser={setUser} />
      <ChatbotWidget
        context={{
          page: "bagages",
          serviceType: "transport_bagages",
        }}
      />
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-10 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600">
        <div className="max-w-7xl mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center bg-white/20 rounded-full px-4 py-1.5 mb-5 text-sm"
          >
            <Luggage className="w-4 h-4 mr-2" /> Transport de bagages
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mb-3"
          >
            Trouvez un transporteur
            <br />
            <span className="text-emerald-200">de confiance</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/80 text-lg max-w-2xl mx-auto mb-8"
          >
            Des professionnels vérifiés prennent soin de vos bagages. Aéroport,
            gare, hôtel — partout au Maroc.
          </motion.p>

          {/* Filtres hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-xl p-4 max-w-3xl mx-auto grid sm:grid-cols-3 gap-3"
          >
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700"
              >
                <option value="">Toutes les villes</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">
                MAD
              </span>
              <input
                type="number"
                placeholder="Prix max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full pl-12 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={() => {
                setCity("");
                setMaxPrice("");
                setOnlyVerif(false);
              }}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2.5 rounded-xl text-sm font-medium hover:shadow-md transition flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" /> Rechercher
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* ── Sidebar filtres ──────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-5 sticky top-24">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />{" "}
                Filtres
              </h3>

              <div className="space-y-5">
                {/* Ville */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Ville
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Toutes</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prix max */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Prix maximum (MAD)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 200"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Vérifié */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">
                    Vérifiés uniquement
                  </label>
                  <button
                    onClick={() => setOnlyVerif((v) => !v)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${onlyVerif ? "bg-emerald-500" : "bg-gray-200"}`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${onlyVerif ? "translate-x-5" : "translate-x-1"}`}
                    />
                  </button>
                </div>

                {/* Tri */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Trier par
                  </label>
                  <div className="space-y-1">
                    {[
                      { val: "rating", label: "Meilleure note" },
                      { val: "price", label: "Prix croissant" },
                      { val: "missions", label: "Plus expérimenté" },
                    ].map(({ val, label }) => (
                      <button
                        key={val}
                        onClick={() => setSortBy(val as any)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${sortBy === val ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset */}
                <button
                  onClick={() => {
                    setCity("");
                    setMaxPrice("");
                    setOnlyVerif(false);
                    setSortBy("rating");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>

          {/* ── Liste des prestataires ───────────────────────────── */}
          <div className="lg:col-span-3">
            {/* Header résultats */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {loading
                    ? "Chargement…"
                    : `${filtered.length} prestataire${filtered.length > 1 ? "s" : ""} disponible${filtered.length > 1 ? "s" : ""}`}
                </h2>
                {city && <p className="text-sm text-gray-500">à {city}</p>}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm mb-6">
                {error}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="grid sm:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl shadow-md p-5 animate-pulse"
                  >
                    <div className="flex gap-4 mb-4">
                      <div className="w-14 h-14 bg-gray-200 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl shadow-md">
                <Luggage className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Aucun prestataire trouvé
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  {owners.length === 0
                    ? "Aucun prestataire n'est encore inscrit pour ce service."
                    : "Essayez de modifier vos filtres."}
                </p>
                <button
                  onClick={() => {
                    setCity("");
                    setMaxPrice("");
                    setOnlyVerif(false);
                  }}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}

            {/* Grid prestataires */}
            {!loading && filtered.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-5">
                {filtered.map((owner) => (
                  <OwnerCard
                    key={owner.id}
                    owner={owner}
                    onSelect={(o) => router.push(`/bagages/${o.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Why us */}
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WHY_US.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="bg-white rounded-2xl p-5 shadow-md flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm">
          <p>
            &copy; {new Date().getFullYear()} AutoRent. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
