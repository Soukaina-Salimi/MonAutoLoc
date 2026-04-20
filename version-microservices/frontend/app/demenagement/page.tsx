"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Truck,
  MapPin,
  Star,
  CheckCircle,
  Search,
  ArrowRight,
  Clock,
  Users,
  Building2,
} from "lucide-react";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import ChatbotWidget from "@/components/ChatbotWidget";

interface Owner {
  id: number;
  name: string;
  full_name: string;
  avatar: string | null;
  city: string;
  bio: string;
  base_price: number | null;
  coverage_area: string | null;
  rating: number;
  reviews_count: number;
  requests_completed: number;
  verified: boolean;
  member_since: string;
  phone: string;
  // ── Champs agence ─────────────────────────────────
  is_agency?: boolean;
  agency_name?: string;
  agency_logo_url?: string | null;
  display_name?: string;
}

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

export default function DemenagementPage() {
  const router = useRouter();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {}
    }

    api
      .get("/service-owners?service=demenagement")
      .then(({ data }) => {
        // Normaliser les données
        const normalized = data.map((owner: any) => ({
          ...owner,
          display_name: owner.is_agency
            ? owner.agency_name || owner.name
            : owner.name,
        }));
        setOwners(normalized);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = owners.filter((o) => {
    const matchSearch =
      !search || o.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchCity =
      !cityFilter || o.city?.toLowerCase().includes(cityFilter.toLowerCase());
    return matchSearch && matchCity && (!verifiedOnly || o.verified);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} setUser={setUser} />
      <ChatbotWidget
        context={{
          page: "demenagement",
          serviceType: "demenagement",
        }}
      />{" "}
      {/* Hero */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Truck className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl font-bold mb-3">Service Déménagement</h1>
            <p className="text-rose-100 text-lg mb-8">
              Des professionnels pour votre déménagement au Maroc
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              {[
                ["Locaux", "Nationaux"],
                ["Avec équipe", "Camion fourni"],
                ["Emballage", "Montage"],
              ].map(([a, b]) => (
                <div key={a} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {a} & {b}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
      {/* Filtres */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un déménageur..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="relative min-w-40">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Ville..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="accent-rose-500"
            />
            Vérifiés uniquement
          </label>
          <span className="ml-auto text-sm text-gray-500 font-medium">
            {filtered.length} déménageur(s)
          </span>
        </div>
      </div>
      {/* Liste */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-sm p-6 animate-pulse"
              >
                <div className="flex gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-10 bg-gray-200 rounded mt-4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Truck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">
              Aucun déménageur disponible
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Essayez une autre ville
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((owner) => (
              <motion.div
                key={owner.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group"
              >
                <div className="p-6">
                  {/* ── Header de la card (amélioré pour agences) ── */}
                  <div className="flex items-start gap-4 mb-4">
                    {/* Avatar / Logo */}
                    {owner.is_agency && owner.agency_logo_url ? (
                      // Agence avec logo
                      <div className="w-16 h-16 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={getImageUrl(owner.agency_logo_url)}
                          alt={owner.agency_name || owner.display_name}
                          className="w-full h-full object-contain p-1.5"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const fallback = document.createElement("div");
                              fallback.className =
                                "w-full h-full flex items-center justify-center";
                              fallback.innerHTML = `<span class="text-2xl font-bold text-gray-400">${owner.agency_name?.[0] || owner.display_name?.[0] || "?"}</span>`;
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      // Particulier ou agence sans logo
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center overflow-hidden shrink-0 relative">
                        {owner.avatar ? (
                          <img
                            src={getImageUrl(owner.avatar)}
                            alt={owner.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-xl font-bold">
                            {owner.display_name?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                        {owner.verified && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-semibold text-gray-800 truncate">
                          {owner.display_name}
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
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{owner.city || "Maroc"}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-medium">
                          {owner.rating?.toFixed(1) || "0"}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({owner.reviews_count || 0})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {owner.bio && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {owner.bio}
                    </p>
                  )}

                  {/* Infos agence (RC, etc.) */}
                  {owner.is_agency && (owner as any).agency_rc && (
                    <div className="mb-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
                      RC: {(owner as any).agency_rc}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-rose-50 rounded-xl p-2 text-center">
                      <Truck className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-gray-800">
                        {owner.requests_completed || 0}
                      </p>
                      <p className="text-xs text-gray-400">Déménagements</p>
                    </div>
                    <div className="bg-rose-50 rounded-xl p-2 text-center">
                      <Clock className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-gray-800">
                        {owner.member_since || "2024"}
                      </p>
                      <p className="text-xs text-gray-400">Membre depuis</p>
                    </div>
                  </div>

                  {/* Prix */}
                  {owner.base_price && (
                    <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm text-gray-600">À partir de</span>
                      <span className="text-lg font-bold text-rose-500">
                        {owner.base_price} MAD
                      </span>
                    </div>
                  )}

                  {/* Bouton */}
                  <button
                    onClick={() => router.push(`/demenagement/${owner.id}`)}
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:shadow-md transition"
                  >
                    Demander un devis <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
