"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  MapPin,
  Star,
  CheckCircle,
  Phone,
  ArrowLeft,
  AlertCircle,
  Clock,
  Scale,
  Ruler,
  Info,
  Building2,
} from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ChatbotWidget from "@/components/ChatbotWidget";

interface Owner {
  id: number;
  name: string;
  full_name: string;
  avatar: string | null;
  city: string;
  agency_description: string | null;
  bio: string;
  phone: string;
  email: string;
  base_price: number | null;
  is_agency: boolean;
  agency_name?: string;
  agency_logo_url?: string | null;
  display_name?: string;
  coverage_area: string | null;
  rating: number;
  reviews_count: number;
  requests_completed: number;
  verified: boolean;
  member_since: string;
  services: {
    type: string;
    base_price: number | null;
    description: string | null;
  }[];
}

const PARCEL_TYPES = [
  "Enveloppe / Documents",
  "Petit colis (< 5 kg)",
  "Colis moyen (5-20 kg)",
  "Gros colis (20-50 kg)",
  "Marchandises en vrac",
  "Produits fragiles",
  "Produits alimentaires",
];

export default function LivraisonDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form state
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [parcelType, setParcelType] = useState(PARCEL_TYPES[0]);
  const [weight, setWeight] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [isFragile, setIsFragile] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    setIsAuth(!!token);

    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {}
    }

    api
      .get(`/service-owners/${id}`)
      .then(({ data }) => {
        // Normaliser les données
        const normalized = {
          ...data,
          display_name: data.is_agency
            ? data.agency_name || data.name
            : data.name,
          full_name: data.display_name || data.name,
        };
        setOwner(normalized);
      })
      .catch(() => setError("Livreur introuvable"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit() {
    if (!isAuth) {
      router.push("/login");
      return;
    }
    if (!pickupAddress || !deliveryAddress || !scheduledDate) {
      setError("Veuillez remplir les champs obligatoires.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/service-requests", {
        owner_id: id,
        service_type: "livraison_colis",
        pickup_date: scheduledDate,
        pickup_time: scheduledTime || null,
        pickup_address: pickupAddress,
        delivery_city: deliveryCity,
        pickup_city: pickupCity,
        delivery_address: deliveryAddress,
        notes: [
          `Type: ${parcelType}`,
          weight ? `Poids: ${weight} kg` : null,
          dimensions ? `Dimensions: ${dimensions}` : null,
          isFragile ? "⚠️ Fragile" : null,
          contactPhone ? `Contact: ${contactPhone}` : null,
          notes || null,
        ]
          .filter(Boolean)
          .join(" | "),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erreur lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );

  if (!owner)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Livreur introuvable</p>
          <Link
            href="/livraison"
            className="text-orange-500 text-sm mt-2 inline-block"
          >
            ← Retour
          </Link>
        </div>
      </div>
    );

  if (success)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Demande envoyée !
          </h2>
          <p className="text-gray-500 mb-6">
            Le livreur va confirmer votre demande prochainement.
          </p>
          <button
            onClick={() => router.push("/Client/bookings")}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-xl font-medium"
          >
            Voir mes demandes
          </button>
        </motion.div>
      </div>
    );

  const displayName = owner.display_name || owner.full_name || "?";
  const initial = displayName[0].toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} setUser={setUser} />
      <ChatbotWidget />
      <div className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-5 gap-8">
        {/* Profil livreur avec header amélioré pour agences */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {/* ── Header amélioré pour agences ── */}
            <div className="flex items-start gap-4 mb-4">
              {owner.is_agency && owner.agency_logo_url ? (
                // Agence avec logo
                <div className="w-20 h-20 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={owner.agency_logo_url}
                    alt={owner.agency_name}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              ) : (
                // Particulier ou agence sans logo
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center overflow-hidden shrink-0">
                  {owner.avatar ? (
                    <img
                      src={owner.avatar}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-2xl font-bold">
                      {initial}
                    </span>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="font-bold text-xl text-gray-800 truncate">
                    {displayName}
                  </h2>
                  {owner.is_agency && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Agence
                    </span>
                  )}
                  {owner.verified && !owner.is_agency && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {owner.city || "Maroc"}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-semibold">{owner.rating}</span>
                  <span className="text-sm text-gray-400">
                    ({owner.reviews_count} avis)
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: "Livraisons", val: owner.requests_completed || 0 },
                { label: "Membre depuis", val: owner.member_since },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="bg-orange-50 rounded-xl p-3 text-center"
                >
                  <p className="font-bold text-gray-800">{val}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Description - selon type (agence ou particulier) */}
            {owner.is_agency
              ? owner.agency_description && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">
                      À propos de l'agence
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {owner.agency_description}
                    </p>
                  </div>
                )
              : owner.bio && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">
                      À propos
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {owner.bio}
                    </p>
                  </div>
                )}

            {/* Zone de livraison */}
            {owner.coverage_area && (
              <div className="mt-4 flex items-start gap-2 bg-orange-50 rounded-xl p-3">
                <MapPin className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-orange-700">
                    Zone de livraison
                  </p>
                  <p className="text-xs text-gray-600">{owner.coverage_area}</p>
                </div>
              </div>
            )}

            {/* Prix */}
            {owner.base_price && (
              <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl text-center">
                <p className="text-xs text-gray-500">À partir de</p>
                <p className="text-2xl font-bold text-orange-500">
                  {owner.base_price} MAD
                </p>
              </div>
            )}

            {/* Contact */}
            {owner.phone && (
              <a
                href={`tel:${owner.phone}`}
                className="mt-4 w-full flex items-center justify-center gap-2 border border-orange-300 text-orange-600 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-50 transition"
              >
                <Phone className="w-4 h-4" /> Appeler
              </a>
            )}
          </div>
        </div>

        {/* Formulaire demande (inchangé) */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" /> Détails du colis
            </h3>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {/* Adresses */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville de départ <span className="text-red-500">*</span>
                </label>
                <input
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                  placeholder="Ville de ramassage"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville d'arrivée <span className="text-red-500">*</span>
                </label>
                <input
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  placeholder="Ville de livraison"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse d'enlèvement <span className="text-red-500">*</span>
                </label>
                <input
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Adresse complète de ramassage"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse de livraison <span className="text-red-500">*</span>
                </label>
                <input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Adresse complète de livraison"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Type de colis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de colis
                </label>
                <select
                  value={parcelType}
                  onChange={(e) => setParcelType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {PARCEL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Poids & Dimensions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5" /> Poids estimé (kg)
                  </label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Ex: 2.5"
                    min="0.1"
                    step="0.1"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Ruler className="w-3.5 h-3.5" /> Dimensions (cm)
                  </label>
                  <input
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="Ex: 30x20x15"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Fragile */}
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                <input
                  type="checkbox"
                  checked={isFragile}
                  onChange={(e) => setIsFragile(e.target.checked)}
                  className="accent-orange-500 w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Colis fragile
                  </p>
                  <p className="text-xs text-gray-400">
                    Manipulation avec précaution requise
                  </p>
                </div>
              </label>

              {/* Date & Heure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-3.5 h-3.5 inline mr-1" /> Date souhaitée{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure souhaitée
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Contact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-3.5 h-3.5 inline mr-1" /> Téléphone de
                  contact
                </label>
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+212 6XX XXX XXX"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions supplémentaires
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Instructions spéciales, code d'accès, etc."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700">
                  Le prix final sera confirmé par le livreur après étude de
                  votre demande.
                </p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !isAuth}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                    Envoi...
                  </>
                ) : !isAuth ? (
                  "Connectez-vous pour envoyer"
                ) : (
                  <>
                    <Package className="w-4 h-4" /> Envoyer la demande
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
