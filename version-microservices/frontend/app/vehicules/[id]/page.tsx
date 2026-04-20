"use client";

// ═══════════════════════════════════════════════════════════════════════
// Ce fichier remplace app/vehicules/[id]/page.tsx
// Modifications principales vs version précédente :
// 1. Interface Vehicle : adds offers_driver + driver_daily_rate
// 2. States : withDriver, nbDrivers
// 3. Calcul prix : inclut driver cost
// 4. UI : toggle chauffeur + slider nbDrivers
// 5. handleBook : envoie with_driver, nb_drivers, driver_price_per_day
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import Navbar from "@/components/Navbar";
import { AgencyBadge } from "@/components/AgencyBadge";
import { Building2 } from "lucide-react";
import ChatbotWidget from "@/components/ChatbotWidget";

import {
  Car,
  Calendar,
  Fuel,
  Gauge,
  Users,
  Star,
  ChevronLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  ArrowRight,
  CalendarDays,
  Award,
  Wrench,
  MessageCircle,
  ChevronRight,
  ChevronLeft as ChevronLeftIcon,
  FileText,
  Info,
  UserCheck,
  Minus,
  Plus,
} from "lucide-react";
import api from "@/lib/api";
import { fr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VehicleImage {
  id: number;
  path: string;
  url?: string;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  booking_id?: number;
  user: { id: number; name: string };
}

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  category: string;
  price_per_day: number;
  year: number;
  fuel_type: string;
  transmission: string;
  seats: number;
  status: string;
  description?: string;
  city?: string;
  address?: string;
  puissance?: number;
  immatriculation?: string;
  first_registration?: string;
  chassis?: string;
  genre?: string;
  cylindres?: number;
  ptac?: number;
  // ── Driver fields ─────────────────────────────────
  offers_driver: boolean;
  driver_daily_rate: number | null;
  // ── Relations ─────────────────────────────────────
  images?: VehicleImage[];
  reviews?: Review[];
  reviews_count?: number;
  reviews_avg_rating?: number;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    rating?: number;
    agency_rc?: string;
    agency_website?: string;
    agency_phone?: string;
    is_agency?: boolean;
    agency_name?: string;
    agency_logo_url?: string;
    avatar?: string;
  };
}

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: { name: string };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VehicleDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuth, setIsAuth] = useState(false);

  // Dates
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [nbDays, setNbDays] = useState(0);

  // ── Driver states ──────────────────────────────────────────────────────────
  const [withDriver, setWithDriver] = useState(false);
  const [nbDrivers, setNbDrivers] = useState(1);

  // Booking
  const [bookingLoading, setBookingLoading] = useState(false);

  // Images
  const [imgIndex, setImgIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  // Tab
  const [tab, setTab] = useState<"details" | "technique" | "reviews">(
    "details",
  );

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
        setIsAuth(true);
      } catch {}
    }

    if (!id) return;
    api
      .get(`/vehicules/${id}`)
      .then(({ data }) => {
        setVehicle(data);
        setReviews(data.reviews ?? []);
        setAvgRating(data.reviews_avg_rating ?? 0);
        setReviewCount(data.reviews_count ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    api
      .get(`/vehicules/${id}/booked-dates`)
      .then(({ data }) => setBookedDates(data))
      .catch(() => {});
  }, [id]);

  // ── Price calculation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (startDate && endDate && vehicle) {
      const days = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      setNbDays(days > 0 ? days : 0);
      // Reset driver si véhicule ne propose pas
      if (!vehicle.offers_driver) setWithDriver(false);
    }
  }, [startDate, endDate, vehicle]);

  // ── Derived price ──────────────────────────────────────────────────────────
  const vehiclePrice = nbDays * (vehicle?.price_per_day ?? 0);
  const driverPrice =
    withDriver && vehicle?.driver_daily_rate
      ? nbDays * vehicle.driver_daily_rate * nbDrivers
      : 0;
  const totalPrice = vehiclePrice + driverPrice;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isDateBooked = (d: Date) =>
    bookedDates.includes(d.toISOString().split("T")[0]);

  const images =
    vehicle?.images?.map(
      (img) => img.url || `http://localhost/storage/${img.path}`,
    ) ?? [];

  const handlePrev = () =>
    setImgIndex((p) => (p === 0 ? images.length - 1 : p - 1));
  const handleNext = () =>
    setImgIndex((p) => (p === images.length - 1 ? 0 : p + 1));

  // ── Book ──────────────────────────────────────────────────────────────────
  async function handleBook() {
    if (!isAuth) {
      if (confirm("Connexion requise. Aller à la page de connexion ?"))
        router.push("/login");
      return;
    }
    if (!startDate || !endDate || nbDays <= 0) {
      alert("Sélectionnez des dates valides.");
      return;
    }
    if (currentUser?.role.name === "owner") {
      alert("Les propriétaires ne peuvent pas réserver.");
      return;
    }
    // Vérifier conflits localement
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      if (isDateBooked(d)) {
        alert(`La date ${d.toLocaleDateString("fr-FR")} est déjà réservée.`);
        return;
      }
    }

    setBookingLoading(true);
    try {
      await api.post("/bookings", {
        vehicule_id: id,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        total_price: totalPrice,
        // ── Driver ────────────────────────────────
        with_driver: withDriver,
        nb_drivers: withDriver ? nbDrivers : 0,
        driver_price_per_day: withDriver ? vehicle?.driver_daily_rate : null,
      });
      alert("✅ Réservation effectuée !");
      router.push("/Client/bookings");
    } catch (err: any) {
      const msg =
        err.response?.data?.message ?? "Erreur lors de la réservation.";
      alert(msg);
    } finally {
      setBookingLoading(false);
    }
  }

  // ── Review ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuth || !vehicle || !id || currentUser?.role.name === "owner")
      return;
    api
      .get(
        `/bookings/check-reviewable?vehicule_id=${id}&user_id=${currentUser?.id}`,
      )
      .then(({ data }) => {
        if (data?.id && !reviews.some((r) => r.booking_id === data.id)) {
          setCanReview(true);
          setBookingId(data.id);
          setShowReviewForm(true);
        }
      })
      .catch(() => {});
  }, [isAuth, vehicle, id, reviews]);

  async function handleSubmitReview() {
    if (!userRating || !bookingId) return;
    setReviewLoading(true);
    try {
      await api.post("/reviews", {
        booking_id: bookingId,
        rating: userRating,
        comment: userComment,
        vehicule_id: id, // ← AJOUTER L'ID DU VÉHICULE
      });
      const { data } = await api.get(`/vehicules/${id}`);
      setReviews(data.reviews ?? []);
      setAvgRating(data.reviews_avg_rating ?? 0);
      setReviewCount(data.reviews_count ?? 0);
      setCanReview(false);
      setShowReviewForm(false);
      setUserRating(0);
      setUserComment("");
    } catch (err: any) {
      alert(err.response?.data?.message ?? "Erreur.");
    } finally {
      setReviewLoading(false);
    }
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Chargement…</p>
        </div>
      </div>
    );

  if (!vehicle)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Véhicule introuvable
          </h2>
          <button
            onClick={() => router.back()}
            className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
          >
            Retour
          </button>
        </div>
      </div>
    );

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct:
      reviewCount > 0
        ? (reviews.filter((r) => r.rating === star).length / reviewCount) * 100
        : 0,
  }));
  // Fonction pour nettoyer l'URL de l'image
  const getImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    // Remplacer l'URL interne par l'URL publique
    if (url.includes("http://auth-service")) {
      return url.replace("http://auth-service", "http://localhost");
    }
    if (url.includes("http://vehicle-service")) {
      return url.replace("http://vehicle-service", "http://localhost");
    }
    return url;
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <Navbar user={currentUser} setUser={setCurrentUser} />
      <ChatbotWidget
        context={{
          page: "vehicule",
          vehiculeId: vehicle.id,
          vehiculeName: `${vehicle.brand} ${vehicle.model}`,
        }}
      />{" "}
      <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Colonne principale ───────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="relative h-80 bg-gradient-to-br from-blue-600 to-purple-600">
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[imgIndex]}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setFullscreen(true)}
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={handlePrev}
                          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition"
                        >
                          <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleNext}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 text-white text-xs px-3 py-1 rounded-full">
                          {imgIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Car className="w-24 h-24 text-white/30" />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${vehicle.status !== "available" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
                  >
                    {vehicle.status === "available" ? (
                      <>
                        <CheckCircle className="w-3 h-3" /> Disponible
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" /> Indisponible
                      </>
                    )}
                  </span>
                  {/* ★ Badge chauffeur */}
                  {vehicle.offers_driver && (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-500 text-white">
                      <UserCheck className="w-3 h-3" /> Chauffeur disponible
                    </span>
                  )}
                </div>
              </div>
              {images.length > 1 && (
                <div className="p-3 border-t flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIndex(i)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition ${i === imgIndex ? "border-blue-600" : "border-gray-200"}`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <AnimatePresence>
              {fullscreen && images.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
                  onClick={() => setFullscreen(false)}
                >
                  <button
                    className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full"
                    onClick={() => setFullscreen(false)}
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                  <img
                    src={images[imgIndex]}
                    alt=""
                    className="max-h-[90vh] max-w-[90vw] object-contain"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrev();
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full"
                      >
                        <ChevronLeftIcon className="w-6 h-6" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNext();
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="flex border-b">
                {[
                  { id: "details", label: "Détails" },
                  { id: "technique", label: "Fiche technique" },
                  { id: "reviews", label: `Avis (${reviewCount})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id as any)}
                    className={`flex-1 py-3 text-sm font-medium relative transition ${tab === t.id ? "text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {t.label}
                    {tab === t.id && (
                      <motion.div
                        layoutId="vdetailTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* ── Tab Détails ── */}
                {tab === "details" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-5"
                  >
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-1">
                        {vehicle.brand} {vehicle.model}
                      </h2>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> {vehicle.year}
                        </span>
                        <span className="flex items-center gap-1">
                          <Fuel className="w-4 h-4" /> {vehicle.fuel_type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Gauge className="w-4 h-4" /> {vehicle.transmission}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" /> {vehicle.seats} places
                        </span>
                        {vehicle.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" /> {vehicle.city}
                          </span>
                        )}
                      </div>
                      {vehicle.description && (
                        <p className="text-gray-600 leading-relaxed">
                          {vehicle.description}
                        </p>
                      )}
                    </div>

                    {/* ★ Info chauffeur dans les détails */}
                    {vehicle.offers_driver && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
                            <UserCheck className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-amber-800 mb-1">
                              Chauffeur disponible
                            </h4>
                            <p className="text-sm text-amber-700">
                              Ce véhicule peut être loué avec chauffeur
                              professionnel. Tarif :{" "}
                              <span className="font-bold">
                                {vehicle.driver_daily_rate} MAD/jour
                              </span>{" "}
                              par chauffeur. Vous pouvez choisir 1 ou 2
                              chauffeurs (pour les longues distances ou travail
                              à la journée).
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Inclusions */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          icon: Shield,
                          label: "Assurance incluse",
                          sub: "Protection complète",
                        },
                        {
                          icon: Award,
                          label: "Kilométrage illimité",
                          sub: "Sans frais supp.",
                        },
                      ].map(({ icon: Icon, label, sub }) => (
                        <div
                          key={label}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                        >
                          <Icon className="w-5 h-5 text-blue-600 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {label}
                            </p>
                            <p className="text-xs text-gray-500">{sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── Tab Fiche technique ── */}
                {tab === "technique" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: "Marque", val: vehicle.brand },
                        { label: "Modèle", val: vehicle.model },
                        { label: "Catégorie", val: vehicle.category },
                        { label: "Année", val: vehicle.year },
                        { label: "Carburant", val: vehicle.fuel_type },
                        { label: "Transmission", val: vehicle.transmission },
                        {
                          label: "Places",
                          val: vehicle.seats ? `${vehicle.seats} places` : null,
                        },
                        {
                          label: "Puissance",
                          val: vehicle.puissance
                            ? `${vehicle.puissance} CV`
                            : null,
                        },
                        { label: "Cylindres", val: vehicle.cylindres },
                        {
                          label: "PTAC",
                          val: vehicle.ptac ? `${vehicle.ptac} kg` : null,
                        },
                        { label: "Genre", val: vehicle.genre },
                        { label: "1ère MC", val: vehicle.first_registration },
                      ]
                        .filter((r) => r.val)
                        .map(({ label, val }) => (
                          <div
                            key={label}
                            className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                          >
                            <p className="text-xs text-gray-400 mb-0.5">
                              {label}
                            </p>
                            <p className="font-medium text-gray-800 text-sm">
                              {val}
                            </p>
                          </div>
                        ))}
                      {vehicle.immatriculation && (
                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 sm:col-span-2">
                          <p className="text-xs text-blue-400 mb-0.5">
                            Immatriculation
                          </p>
                          <p className="font-mono font-bold text-blue-800 tracking-widest">
                            {vehicle.immatriculation}
                          </p>
                        </div>
                      )}
                      {vehicle.chassis && (
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 sm:col-span-3">
                          <p className="text-xs text-gray-400 mb-0.5">
                            N° Châssis (VIN)
                          </p>
                          <p className="font-mono text-gray-700 text-sm">
                            {vehicle.chassis.slice(0, 8)}
                            {"•".repeat(vehicle.chassis.length - 8)}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ── Tab Avis ── */}
                {tab === "reviews" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-5"
                  >
                    {/* Résumé */}
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="text-center">
                        <p className="text-5xl font-bold text-gray-800">
                          {avgRating.toFixed(1)}
                        </p>
                        <div className="flex justify-center gap-1 my-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-5 h-5 ${s <= Math.round(avgRating) ? "text-yellow-400 fill-current" : "text-gray-200"}`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-gray-500">
                          {reviewCount} avis
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {ratingDistribution.map(({ star, count, pct }) => (
                          <div
                            key={star}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="w-6 text-gray-500">{star}★</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5 }}
                                className="h-full bg-yellow-400 rounded-full"
                              />
                            </div>
                            <span className="w-4 text-gray-400">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Liste avis */}
                    {reviews.length > 0 ? (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {reviews.map((r) => (
                          <div
                            key={r.id}
                            className="border-b border-gray-100 pb-3 last:border-0"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    {r.user.name[0]}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">
                                    {r.user.name}
                                  </p>
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star
                                        key={s}
                                        className={`w-3 h-3 ${s <= r.rating ? "text-yellow-400 fill-current" : "text-gray-200"}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-gray-400">
                                {new Date(r.created_at).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                            </div>
                            {r.comment && (
                              <p className="text-sm text-gray-600 ml-9">
                                {r.comment}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Aucun avis pour le moment.</p>
                      </div>
                    )}

                    {/* Formulaire avis */}
                    {canReview && (
                      <div className="border-t pt-5">
                        <h4 className="font-semibold text-gray-800 mb-3">
                          Laisser un avis
                        </h4>
                        <div className="flex gap-2 mb-3">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button key={s} onClick={() => setUserRating(s)}>
                              <Star
                                className={`w-8 h-8 transition-colors ${s <= userRating ? "text-yellow-400 fill-current" : "text-gray-300 hover:text-yellow-200"}`}
                              />
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={userComment}
                          onChange={(e) => setUserComment(e.target.value)}
                          placeholder="Partagez votre expérience…"
                          rows={3}
                          className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-3"
                        />
                        <button
                          onClick={handleSubmitReview}
                          disabled={reviewLoading}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                        >
                          {reviewLoading ? "Publication…" : "Publier mon avis"}
                        </button>
                      </div>
                    )}
                    {isAuth &&
                      !canReview &&
                      currentUser?.role.name !== "owner" && (
                        <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-700">
                            Les avis sont possibles après une réservation
                            terminée.
                          </p>
                        </div>
                      )}
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* ── Colonne réservation ──────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-6 sticky top-20">
              {/* Prix */}
              <div className="flex items-baseline gap-2 mb-5">
                <span className="text-3xl font-bold text-gray-800">
                  {vehicle.price_per_day}
                </span>
                <span className="text-gray-500 text-sm">MAD/jour</span>
                {vehicle.offers_driver && vehicle.driver_daily_rate && (
                  <span className="ml-auto text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    +{vehicle.driver_daily_rate} MAD/chauffeur/jour
                  </span>
                )}
              </div>

              {!isAuth && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700">
                    Connexion requise pour réserver.
                  </p>
                </div>
              )}

              {/* Dates */}
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date de début
                  </label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                    <DatePicker
                      selected={startDate}
                      onChange={(d: Date | null) => setStartDate(d)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      minDate={new Date()}
                      filterDate={(d) => !isDateBooked(d)}
                      placeholderText="Sélectionner"
                      dateFormat="dd/MM/yyyy"
                      locale={fr}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      wrapperClassName="w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date de fin
                  </label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                    <DatePicker
                      selected={endDate}
                      onChange={(d: Date | null) => setEndDate(d)}
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate || new Date()}
                      filterDate={(d) => !isDateBooked(d)}
                      placeholderText="Sélectionner"
                      dateFormat="dd/MM/yyyy"
                      locale={fr}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      wrapperClassName="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* ★ Option chauffeur */}
              {vehicle.offers_driver && (
                <div
                  className={`mb-5 rounded-xl border-2 p-4 transition-all ${withDriver ? "border-amber-400 bg-amber-50" : "border-gray-200"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <UserCheck
                        className={`w-5 h-5 ${withDriver ? "text-amber-600" : "text-gray-400"}`}
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          Avec chauffeur
                        </p>
                        <p className="text-xs text-gray-500">
                          {vehicle.driver_daily_rate} MAD/chauffeur/jour
                        </p>
                      </div>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => setWithDriver((v) => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${withDriver ? "bg-amber-500" : "bg-gray-200"}`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${withDriver ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>

                  {/* Slider nb chauffeurs */}
                  <AnimatePresence>
                    {withDriver && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 border-t border-amber-200 mt-3">
                          <p className="text-xs font-medium text-amber-700 mb-2">
                            Nombre de chauffeurs
                          </p>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                setNbDrivers((n) => Math.max(1, n - 1))
                              }
                              disabled={nbDrivers <= 1}
                              className="w-8 h-8 rounded-full border-2 border-amber-300 flex items-center justify-center text-amber-600 hover:bg-amber-100 disabled:opacity-40 transition"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <div className="flex-1 text-center">
                              <span className="text-2xl font-bold text-amber-700">
                                {nbDrivers}
                              </span>
                              <p className="text-xs text-amber-600">
                                chauffeur{nbDrivers > 1 ? "s" : ""}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                setNbDrivers((n) => Math.min(2, n + 1))
                              }
                              disabled={nbDrivers >= 2}
                              className="w-8 h-8 rounded-full border-2 border-amber-300 flex items-center justify-center text-amber-600 hover:bg-amber-100 disabled:opacity-40 transition"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-amber-600 text-center mt-1">
                            Maximum 2 chauffeurs
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Récap prix */}
              {nbDays > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
                  <h4 className="font-medium text-gray-700 text-sm mb-2">
                    Détail du prix
                  </h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {nbDays} jour{nbDays > 1 ? "s" : ""} ×{" "}
                      {vehicle.price_per_day} MAD
                    </span>
                    <span className="font-medium">{vehiclePrice} MAD</span>
                  </div>
                  {withDriver && vehicle.driver_daily_rate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-600">
                        {nbDrivers} chauffeur{nbDrivers > 1 ? "s" : ""} ×{" "}
                        {nbDays}j × {vehicle.driver_daily_rate} MAD
                      </span>
                      <span className="font-medium text-amber-600">
                        +{driverPrice} MAD
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-blue-600 text-lg">
                      {totalPrice} MAD
                    </span>
                  </div>
                </div>
              )}

              {bookedDates.length > 0 && (
                <p className="text-xs text-gray-400 mb-3">
                  ⚠️ Les dates grisées dans le calendrier sont déjà réservées.
                </p>
              )}

              {/* CTA */}
              <button
                onClick={handleBook}
                disabled={bookingLoading || vehicle.status !== "available"}
                className={`w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all ${
                  bookingLoading || vehicle.status !== "available"
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/30"
                }`}
              >
                {bookingLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                    Réservation…
                  </>
                ) : !isAuth ? (
                  "Se connecter pour réserver"
                ) : (
                  <>
                    Réserver maintenant <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Propriétaire */}
              {vehicle.user && (
                <div className="mt-5 pt-5 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Propriétaire
                  </h4>

                  <Link
                    href={`/owners/${vehicle.user.id}`}
                    className="block cursor-pointer hover:bg-gray-50 rounded-xl transition-all duration-200"
                  >
                    {vehicle.user.is_agency ? (
                      // ✅ Affichage pour une AGENCE (cliquable)
                      <div className="flex items-center gap-3 p-2 -m-2">
                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                          {vehicle.user.agency_logo_url ? (
                            <img
                              src={getImageUrl(vehicle.user.agency_logo_url)}
                              alt={
                                vehicle.user.agency_name || vehicle.user.name
                              }
                              className="w-full h-full object-contain p-1.5"
                            />
                          ) : (
                            <Building2 className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                              {vehicle.user.agency_name || vehicle.user.name}
                            </p>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> Agence
                            </span>
                          </div>
                          {vehicle.user.agency_rc && (
                            <p className="text-xs text-gray-500">
                              RC: {vehicle.user.agency_rc}
                            </p>
                          )}
                          {vehicle.user.phone && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                              <Phone className="w-3 h-3" /> {vehicle.user.phone}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                      </div>
                    ) : (
                      // ✅ Affichage pour un PARTICULIER (cliquable)
                      <div className="flex items-center gap-3 p-2 -m-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          {vehicle.user.avatar ? (
                            <img
                              src={getImageUrl(vehicle.user.avatar)}
                              alt={vehicle.user.name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-white font-bold text-lg">
                              {vehicle.user.name?.[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                            {vehicle.user.name}
                          </p>
                          <p className="text-sm text-gray-500">Particulier</p>
                          {vehicle.user.phone && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                              <Phone className="w-3 h-3" /> {vehicle.user.phone}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                      </div>
                    )}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
