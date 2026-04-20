"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Luggage,
  MapPin,
  Star,
  CheckCircle,
  ArrowRight,
  Car,
  ChevronLeft,
  Phone,
  Shield,
  Clock,
  Package,
  Briefcase,
  ShoppingBag,
  Navigation,
  Zap,
  User,
  Calendar,
  AlertCircle,
  X,
  Building2,
} from "lucide-react";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import ChatbotWidget from "@/components/ChatbotWidget";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Owner {
  id: number;
  full_name: string;
  name: string;
  avatar: string | null;
  city: string | null;
  bio: string | null;
  phone: string | null;
  email: string;
  rating: number;
  reviews_count: number;
  requests_completed: number;
  member_since: string;
  verified: boolean;
  services?: {
    type: string;
    label: string;
    base_price: number | null;
    description: string | null;
    coverage_area: string | null;
  }[];
  // ── Champs agence ─────────────────────────────────
  is_agency?: boolean;
  agency_name?: string;
  agency_logo_url?: string | null;
  display_name?: string;
}

// ─── Baggage options (local — pas en BDD) ─────────────────────────────────────

const BAGGAGE_TYPES = [
  {
    id: "small",
    label: "Petit bagage",
    price: 50,
    weight: "10 kg",
    icon: Briefcase,
  },
  {
    id: "medium",
    label: "Bagage moyen",
    price: 80,
    weight: "23 kg",
    icon: ShoppingBag,
  },
  {
    id: "large",
    label: "Grand bagage",
    price: 120,
    weight: "32 kg",
    icon: ShoppingBag,
  },
  {
    id: "extra",
    label: "Bagage XL",
    price: 180,
    weight: "50+ kg",
    icon: Package,
  },
];

const EXTRAS = [
  { id: "insurance", label: "Assurance bagages", price: 20, icon: Shield },
  { id: "express", label: "Livraison express", price: 40, icon: Zap },
  { id: "tracking", label: "Suivi GPS", price: 15, icon: Navigation },
];

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function BaggageOwnerDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Form
  const [pickupCity, setPickupCity] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [selectedBaggage, setSelectedBaggage] = useState<
    Record<string, number>
  >({});
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {}
    }

    api
      .get(`/owners/${id}`)
      .then(({ data }) => {
        // Normaliser les données
        const normalized = {
          ...data,
          full_name: data.display_name || data.name,
          display_name: data.is_agency
            ? data.agency_name || data.name
            : data.name,
        };
        setOwner(normalized);
      })
      .catch(() => setOwner(null))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Price calculation ────────────────────────────────────────────────────
  const totalBaggage = Object.entries(selectedBaggage).reduce(
    (acc, [bagId, count]) => {
      const b = BAGGAGE_TYPES.find((x) => x.id === bagId);
      return acc + (b ? b.price * count : 0);
    },
    0,
  );

  const totalExtras = selectedExtras.reduce((acc, eId) => {
    const e = EXTRAS.find((x) => x.id === eId);
    return acc + (e ? e.price : 0);
  }, 0);

  const total = totalBaggage + totalExtras;

  function toggleBaggage(id: string, delta: number) {
    setSelectedBaggage((prev) => {
      const cur = prev[id] ?? 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  }

  function toggleExtra(id: string) {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setFormError(null);

    if (!user) {
      router.push("/login");
      return;
    }
    if (!pickupCity || !deliveryCity || !pickupDate) {
      setFormError("Veuillez remplir les champs obligatoires.");
      return;
    }
    if (Object.keys(selectedBaggage).length === 0) {
      setFormError("Sélectionnez au moins un type de bagage.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/service-requests", {
        owner_id: owner!.id,
        service_type: "transport_bagages",
        pickup_city: pickupCity,
        delivery_city: deliveryCity,
        pickup_address: pickupAddress || null,
        delivery_address: deliveryAddress || null,
        pickup_date: pickupDate,
        pickup_time: pickupTime || null,
        estimated_price: total,
        client_notes: notes || null,
        service_details: {
          bagages: Object.entries(selectedBaggage).map(([bagId, count]) => ({
            type: bagId,
            count,
            label: BAGGAGE_TYPES.find((b) => b.id === bagId)?.label,
          })),
          extras: selectedExtras,
        },
      });
      setSuccess(true);
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? "Erreur lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading / error ──────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );

  if (!owner)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">Prestataire introuvable.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-emerald-600 hover:underline text-sm"
          >
            Retour
          </button>
        </div>
      </div>
    );

  const displayName =
    owner.display_name || owner.full_name || owner.name || "?";
  const initial = displayName[0].toUpperCase();
  const baggageService = owner.services?.find(
    (s) => s.type === "transport_bagages",
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <Navbar user={user} setUser={setUser} />
      <ChatbotWidget />
      {/* Success modal */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Demande envoyée !
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {displayName} a reçu votre demande et vous contactera
                rapidement.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/Client/bookings")}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2.5 rounded-xl text-sm font-medium"
                >
                  Mes réservations
                </button>
                <button
                  onClick={() => {
                    setSuccess(false);
                    router.push("/bagages");
                  }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm"
                >
                  Retour
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-20 pb-12 max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Profil prestataire ───────────────────────────────── */}
          <div className="lg:col-span-1 space-y-5">
            {/* Card profil avec header amélioré pour agences */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="px-5 pb-5">
                <div className="relative -mt-10 mb-3">
                  {/* Header avec logo ou avatar */}
                  {owner.is_agency && owner.agency_logo_url ? (
                    // Agence avec logo
                    <div className="w-20 h-20 rounded-xl bg-white shadow-md border border-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={owner.agency_logo_url}
                        alt={owner.agency_name}
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                  ) : (
                    // Particulier ou agence sans logo
                    <div className="w-20 h-20 rounded-full border-4 border-white bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                      {owner.avatar ? (
                        <img
                          src={owner.avatar}
                          alt={displayName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-2xl">
                          {initial}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold text-gray-800">
                        {displayName}
                      </h1>
                      {owner.is_agency && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Agence
                        </span>
                      )}
                      {owner.verified && !owner.is_agency && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    {owner.city && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {owner.city}
                      </p>
                    )}
                  </div>
                  {owner.verified && owner.is_agency && (
                    <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Agence vérifiée
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 my-4">
                  {[
                    {
                      val: (owner.rating ?? 0).toFixed(1),
                      label: "Note",
                      icon: "⭐",
                    },
                    { val: owner.reviews_count, label: "Avis", icon: "💬" },
                    {
                      val: owner.requests_completed,
                      label: "Missions",
                      icon: "✅",
                    },
                  ].map(({ val, label, icon }) => (
                    <div
                      key={label}
                      className="bg-gray-50 rounded-xl p-2.5 text-center"
                    >
                      <p className="text-base font-bold text-gray-800">{val}</p>
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Bio */}
                {owner.bio && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    {owner.bio}
                  </p>
                )}

                {/* Contact */}
                <div className="space-y-2 text-sm">
                  {owner.phone && (
                    <a
                      href={`tel:${owner.phone}`}
                      className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition"
                    >
                      <Phone className="w-4 h-4 text-emerald-500" />{" "}
                      {owner.phone}
                    </a>
                  )}
                  <p className="text-gray-400 text-xs">
                    Membre depuis {owner.member_since}
                  </p>
                </div>
              </div>
            </div>

            {/* Service info */}
            {baggageService && (
              <div className="bg-white rounded-2xl shadow-md p-5">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Luggage className="w-4 h-4 text-emerald-600" /> Service
                  bagages
                </h3>
                {baggageService.description && (
                  <p className="text-sm text-gray-600 mb-3">
                    {baggageService.description}
                  </p>
                )}
                {baggageService.coverage_area && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                    Zone : {baggageService.coverage_area}
                  </div>
                )}
                {baggageService.base_price && (
                  <div className="mt-3 bg-emerald-50 rounded-xl px-4 py-2.5">
                    <p className="text-xs text-emerald-600">À partir de</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {baggageService.base_price} MAD
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Formulaire de réservation (inchangé) ───────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            <h2 className="text-2xl font-bold text-gray-800">
              Réserver avec {displayName}
            </h2>

            {/* Trajet */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" /> Trajet
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    label: "Ville de départ *",
                    val: pickupCity,
                    set: setPickupCity,
                  },
                  {
                    label: "Ville d'arrivée *",
                    val: deliveryCity,
                    set: setDeliveryCity,
                  },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {label}
                    </label>
                    <select
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Choisir…</option>
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {[
                  {
                    label: "Adresse de départ",
                    val: pickupAddress,
                    set: setPickupAddress,
                    ph: "123 Rue Hassan II",
                  },
                  {
                    label: "Adresse de livraison",
                    val: deliveryAddress,
                    set: setDeliveryAddress,
                    ph: "Hôtel / Gare / Aéroport…",
                  },
                ].map(({ label, val, set, ph }) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder={ph}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Date/heure */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" /> Date et heure
                de prise en charge
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={pickupDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Heure
                  </label>
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Types de bagages */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Luggage className="w-4 h-4 text-emerald-600" /> Vos bagages
              </h3>
              <div className="space-y-3">
                {BAGGAGE_TYPES.map(
                  ({ id, label, price, weight, icon: Icon }) => {
                    const count = selectedBaggage[id] ?? 0;
                    return (
                      <div
                        key={id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition ${count > 0 ? "border-emerald-400 bg-emerald-50" : "border-gray-200"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${count > 0 ? "bg-emerald-500" : "bg-gray-100"}`}
                          >
                            <Icon
                              className={`w-4 h-4 ${count > 0 ? "text-white" : "text-gray-500"}`}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {label}
                            </p>
                            <p className="text-xs text-gray-400">
                              max {weight}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-emerald-600">
                            {price} MAD
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleBaggage(id, -1)}
                              className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-sm font-medium">
                              {count}
                            </span>
                            <button
                              onClick={() => toggleBaggage(id, 1)}
                              className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            {/* Options */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" /> Options
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {EXTRAS.map(({ id, label, price, icon: Icon }) => {
                  const selected = selectedExtras.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleExtra(id)}
                      className={`p-3 rounded-xl border text-left transition ${selected ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:border-emerald-300"}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${selected ? "bg-emerald-500" : "bg-gray-100"}`}
                      >
                        <Icon
                          className={`w-4 h-4 ${selected ? "text-white" : "text-gray-500"}`}
                        />
                      </div>
                      <p className="text-xs font-medium text-gray-800">
                        {label}
                      </p>
                      <p className="text-xs text-emerald-600 font-bold mt-0.5">
                        +{price} MAD
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-semibold text-gray-800 mb-3">
                Instructions particulières
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Fragile, heure de vol, code d'accès immeuble…"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Récap prix + submit */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              {/* Récap */}
              {total > 0 && (
                <div className="mb-4 space-y-2">
                  {Object.entries(selectedBaggage).map(([bagId, count]) => {
                    const b = BAGGAGE_TYPES.find((x) => x.id === bagId);
                    return b ? (
                      <div
                        key={bagId}
                        className="flex justify-between text-sm text-gray-600"
                      >
                        <span>
                          {count}× {b.label}
                        </span>
                        <span>{b.price * count} MAD</span>
                      </div>
                    ) : null;
                  })}
                  {selectedExtras.map((eId) => {
                    const e = EXTRAS.find((x) => x.id === eId);
                    return e ? (
                      <div
                        key={eId}
                        className="flex justify-between text-sm text-gray-600"
                      >
                        <span>{e.label}</span>
                        <span>+{e.price} MAD</span>
                      </div>
                    ) : null;
                  })}
                  <div className="border-t pt-2 flex justify-between font-bold text-gray-800">
                    <span>Total estimé</span>
                    <span className="text-emerald-600">{total} MAD</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {formError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              {/* Auth warning */}
              {!user && (
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">
                  Vous devez être connecté pour envoyer une demande.
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                    Envoi…
                  </>
                ) : (
                  <>
                    <span>Envoyer la demande</span>{" "}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Le prestataire confirmera sous 24h. Aucun paiement immédiat.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
