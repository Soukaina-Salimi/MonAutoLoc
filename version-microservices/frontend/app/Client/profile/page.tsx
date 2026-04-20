"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  BadgeCheck,
  Phone,
  MapPin,
  Calendar,
  Car,
  Edit2,
  Save,
  X,
  Camera,
  CheckCircle,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Upload,
  FileText,
  CreditCard,
  Shield,
  Star,
  Clock,
  TrendingUp,
  ChevronRight,
  IdCard,
  Fingerprint,
} from "lucide-react";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import { useProfile } from "@/hooks/useProfile";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Booking {
  id: number;
  vehicule: {
    id: number;
    brand: string;
    model: string;
    image_url: string | null;
  };
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  vehicule?: {
    brand: string;
    model: string;
  };
}

interface Document {
  id: number;
  type: string;
  status: string;
  extracted_data?: any;
}

type Tab = "profile" | "security" | "documents" | "activity";

// ─── Document card ────────────────────────────────────────────────────────────
function DocCard({
  title,
  icon,
  color,
  uploaded,
  loading,
  fields,
  onUpload,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  uploaded: boolean;
  loading: boolean;
  fields: { label: string; value?: string }[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div
        className={`bg-gradient-to-r ${color} p-4 flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <span className="text-white font-semibold text-sm">{title}</span>
        </div>
        {uploaded && (
          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Vérifié
          </span>
        )}
      </div>
      <div className="p-4">
        <label
          className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
            uploaded
              ? "border-green-300 bg-green-50"
              : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
            disabled={loading}
          />
          {loading ? (
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-blue-600">Analyse IA en cours…</p>
            </div>
          ) : uploaded ? (
            <div className="flex flex-col items-center gap-1">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <p className="text-xs text-green-600">
                Analysé — cliquer pour remplacer
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload className="w-6 h-6 text-gray-400" />
              <p className="text-xs text-gray-500">Cliquer pour uploader</p>
            </div>
          )}
        </label>
        {uploaded && fields.some((f) => f.value) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 grid grid-cols-2 gap-2"
          >
            {fields
              .filter((f) => f.value)
              .map((f) => (
                <div key={f.label} className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">{f.label}</p>
                  <p className="text-sm font-medium text-gray-800">{f.value}</p>
                </div>
              ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Composant réservation ────────────────────────────────────────────────────
function BookingCard({ booking }: { booking: Booking }) {
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "En attente", color: "bg-yellow-100 text-yellow-700" };
      case "approved":
        return { label: "Confirmée", color: "bg-green-100 text-green-700" };
      case "completed":
        return { label: "Terminée", color: "bg-blue-100 text-blue-700" };
      case "cancelled":
        return { label: "Annulée", color: "bg-red-100 text-red-700" };
      default:
        return { label: status, color: "bg-gray-100 text-gray-700" };
    }
  };

  const status = getStatusBadge(booking.status);

  return (
    <div
      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer"
      onClick={() => router.push(`/bookings/${booking.id}`)}
    >
      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden">
        {booking.vehicule.image_url ? (
          <img
            src={booking.vehicule.image_url}
            alt={`${booking.vehicule.brand} ${booking.vehicule.model}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <Car className="w-6 h-6 text-white" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-800">
            {booking.vehicule.brand} {booking.vehicule.model}
          </p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
            {status.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Du {new Date(booking.start_date).toLocaleDateString("fr-FR")} au{" "}
          {new Date(booking.end_date).toLocaleDateString("fr-FR")}
        </p>
        <p className="text-sm font-semibold text-green-600 mt-1">
          {booking.total_price} MAD
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </div>
  );
}

// ─── Composant avis ───────────────────────────────────────────────────────────
function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3 h-3 ${s <= review.rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
              />
            ))}
          </div>
          {review.vehicule && (
            <span className="text-xs text-gray-500">
              {review.vehicule.brand} {review.vehicule.model}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {new Date(review.created_at).toLocaleDateString("fr-FR")}
        </span>
      </div>
      {review.comment && (
        <p className="text-sm text-gray-600">{review.comment}</p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ClientProfilePage() {
  const router = useRouter();
  const {
    user,
    loading,
    saving,
    msg,
    form,
    setUser,
    setForm,
    saveProfile,
    saveAvatar,
    changePassword,
    showMsg,
  } = useProfile();

  const [tab, setTab] = useState<Tab>("profile");
  const [editing, setEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // password
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPw, setChangingPw] = useState(false);

  // documents
  const [ocrLoading, setOcrLoading] = useState<Record<string, boolean>>({});
  const [docs, setDocs] = useState<
    Record<string, { uploaded: boolean; data: any }>
  >({
    cin: { uploaded: false, data: null },
    cin_verso: { uploaded: false, data: null },
    permis: { uploaded: false, data: null },
    permis_verso: { uploaded: false, data: null },
  });
  const [crossValidation, setCrossValidation] = useState<{
    success: boolean;
    message: string;
    fields: {
      last_name: { cin: string | null; permis: string | null; match: boolean };
      first_name: { cin: string | null; permis: string | null; match: boolean };
      birth_date: { cin: string | null; permis: string | null; match: boolean };
    };
  } | null>(null);

  // ── Charger les documents existants depuis l'API ──────────────────────────
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) return;
      try {
        const { data } = await api.get("/documents");
        const docsMap: Record<string, { uploaded: boolean; data: any }> = {
          cin: { uploaded: false, data: null },
          cin_verso: { uploaded: false, data: null },
          permis: { uploaded: false, data: null },
          permis_verso: { uploaded: false, data: null },
        };

        data.forEach((doc: Document) => {
          if (doc.type === "cin") {
            docsMap.cin = { uploaded: true, data: doc.extracted_data };
          } else if (doc.type === "cin_verso") {
            docsMap.cin_verso = { uploaded: true, data: doc.extracted_data };
          } else if (doc.type === "permis") {
            docsMap.permis = { uploaded: true, data: doc.extracted_data };
          } else if (doc.type === "permis_verso") {
            docsMap.permis_verso = { uploaded: true, data: doc.extracted_data };
          }
        });

        setDocs(docsMap);

        // Charger la validation croisée existante si CIN + Permis présents
        if (docsMap.cin.uploaded && docsMap.permis.uploaded) {
          try {
            const { data: crossData } = await api.post(
              "/documents/validate-cross",
            );
            if (crossData && crossData.success !== undefined) {
              setCrossValidation(crossData);
            }
          } catch {
            // Pas de validation existante — normal
          }
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    };

    fetchDocuments();
  }, [user]);

  // ── Charger les réservations ────────────────────────────────────────────────
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data } = await api.get("/bookings/my");
        setBookings(data.slice(0, 3));
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoadingBookings(false);
      }
    };

    const fetchReviews = async () => {
      try {
        const { data } = await api.get("/reviews/my");
        setReviews(data.slice(0, 3));
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoadingReviews(false);
      }
    };

    if (user) {
      fetchBookings();
      fetchReviews();
    }
  }, [user]);

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

  // ── Avatar ────────────────────────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    setUploadingAvatar(true);
    const url = await saveAvatar(file);
    if (url) setAvatarPreview(url);
    setUploadingAvatar(false);
  }

  // ── Save profile ──────────────────────────────────────────────────────────
  async function handleSave() {
    const ok = await saveProfile();
    if (ok) setEditing(false);
  }

  // ── Change password ───────────────────────────────────────────────────────
  async function handleChangePw() {
    const ok = await changePassword(pwCurrent, pwNew, pwConfirm);
    if (ok) {
      setChangingPw(false);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    }
  }

  // ── Document upload → OCR ─────────────────────────────────────────────────
  async function handleDocUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    type: string,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading((p) => ({ ...p, [type]: true }));
    try {
      const fd = new FormData();
      fd.append("document", file);
      fd.append("doc_type", type);
      const { data } = await api.post("/documents/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setDocs((p) => ({
        ...p,
        [type]: { uploaded: true, data: data.extracted_data },
      }));

      // ── Validation croisée ────────────────────────────────
      if (data.cross_validated) {
        setCrossValidation(data.cross_validated);
        if (data.cross_validated.success) {
          showMsg(
            "success",
            "✅ Documents validés — CIN et Permis correspondent !",
          );
        } else {
          showMsg(
            "error",
            "⚠️ Incohérence détectée entre CIN et Permis — vérifiez les champs.",
          );
        }
      }

      if (type === "cin" && data.extracted_data) {
        const d = data.extracted_data;
        setForm((f) => ({
          ...f,
          first_name: d.first_name ?? f.first_name,
          last_name: d.last_name ?? f.last_name,
          date_of_birth: d.birth_date ?? f.date_of_birth,
        }));
        showMsg("success", "CIN analysée — profil pré-rempli !");
        setEditing(true);
        setTab("profile");
      } else {
        showMsg("success", "Document analysé avec succès.");
      }
    } catch {
      showMsg("error", "Erreur lors de l'analyse du document.");
    } finally {
      setOcrLoading((p) => ({ ...p, [type]: false }));
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getInitial = () =>
    (form.first_name || user?.name || "U")[0].toUpperCase();

  const avatarSrc = avatarPreview ?? user?.avatar ?? null;

  // Stats
  const stats = {
    bookings_count: bookings.length,
    reviews_count: reviews.length,
    completed_bookings: bookings.filter((b) => b.status === "completed").length,
    total_spent: bookings
      .filter((b) => b.status === "completed" || b.status === "approved")
      .reduce((sum, b) => sum + b.total_price, 0),
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Chargement du profil…</p>
        </div>
      </div>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profil" },
    { id: "security", label: "Sécurité" },
    { id: "documents", label: "Documents" },
    { id: "activity", label: "Activité" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} setUser={setUser} />

      <div className="pt-20 pb-12 max-w-6xl mx-auto px-4">
        {/* Global message */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-6 p-3 rounded-xl flex items-center gap-2 text-sm ${
                msg.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {msg.type === "success" ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium relative transition ${
                tab === t.id
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              {tab === t.id && (
                <motion.div
                  layoutId="clientTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                />
              )}
            </button>
          ))}
        </div>

        {/* ── TAB PROFIL ──────────────────────────────────────────────────── */}
        {tab === "profile" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-md p-6 sticky top-20">
                {/* Avatar */}
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden mx-auto">
                      {avatarSrc ? (
                        <img
                          src={getImageUrl(avatarSrc)}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl font-bold text-white">
                          {getInitial()}
                        </span>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow-md transition">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      {uploadingAvatar ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-white" />
                      )}
                    </label>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 mt-3">
                    {form.first_name && form.last_name
                      ? `${form.first_name} ${form.last_name}`
                      : user?.name}
                  </h2>
                  <p className="text-sm text-gray-500">Client</p>
                  <div className="inline-flex items-center gap-1 bg-green-50 text-green-600 text-xs px-3 py-1 rounded-full mt-2">
                    <CheckCircle className="w-3 h-3" /> Compte actif
                  </div>
                </div>

                {/* Infos CIN & Permis */}
                <div className="space-y-3 mb-4">
                  {(user?.cin_number || user?.cin_expiry_date) && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <IdCard className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-semibold text-gray-600">
                          Carte d'Identité
                        </span>
                      </div>
                      {user?.cin_number && (
                        <p className="text-sm text-gray-800">
                          N°: {user.cin_number}
                        </p>
                      )}
                      {user?.cin_expiry_date && (
                        <p className="text-xs text-gray-500">
                          Expire le:{" "}
                          {new Date(user.cin_expiry_date).toLocaleDateString(
                            "fr-FR",
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {(user?.permis_number ||
                    user?.permis_categories ||
                    user?.permis_expiry_date) && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Fingerprint className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-semibold text-gray-600">
                          Permis de Conduire
                        </span>
                      </div>
                      {user?.permis_number && (
                        <p className="text-sm text-gray-800">
                          N°: {user.permis_number}
                        </p>
                      )}
                      {user?.permis_categories && (
                        <p className="text-xs text-gray-600">
                          Catégories: {user.permis_categories}
                        </p>
                      )}
                      {user?.permis_expiry_date && (
                        <p className="text-xs text-gray-500">
                          Expire le:{" "}
                          {new Date(user.permis_expiry_date).toLocaleDateString(
                            "fr-FR",
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  {[
                    { val: stats.bookings_count, label: "Réservations" },
                    { val: stats.reviews_count, label: "Avis" },
                    { val: stats.completed_bookings, label: "Terminées" },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-2">
                      <p className="text-lg font-bold text-gray-800">{s.val}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Total dépensé */}
                {stats.total_spent > 0 && (
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-3 mb-4 text-center">
                    <p className="text-white/80 text-xs">Total dépensé</p>
                    <p className="text-white text-xl font-bold">
                      {stats.total_spent} MAD
                    </p>
                  </div>
                )}

                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:shadow-md transition"
                  >
                    <Edit2 className="w-4 h-4" /> Modifier le profil
                  </button>
                )}
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-5">
                  {editing ? "Modifier le profil" : "Informations personnelles"}
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        label: "Prénom",
                        key: "first_name" as const,
                        icon: User,
                        placeholder: "Mohammed",
                      },
                      {
                        label: "Nom",
                        key: "last_name" as const,
                        icon: User,
                        placeholder: "Alami",
                      },
                    ].map(({ label, key, icon: Icon, placeholder }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {label}
                        </label>
                        {editing ? (
                          <div className="relative">
                            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              value={form[key]}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  [key]: e.target.value,
                                }))
                              }
                              placeholder={placeholder}
                              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        ) : (
                          <p className="text-gray-800 py-2 text-sm">
                            {form[key] || (
                              <span className="text-gray-400">
                                Non renseigné
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {[
                    {
                      label: "Email",
                      key: "email",
                      icon: Mail,
                      value: user?.email,
                      readOnly: true,
                    },
                  ].map(({ label, icon: Icon, value }) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {label}
                      </label>
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        {value}
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-auto">
                          Non modifiable
                        </span>
                      </div>
                    </div>
                  ))}

                  {[
                    {
                      label: "Téléphone",
                      key: "phone" as const,
                      icon: Phone,
                      placeholder: "+212 6XX XXX XXX",
                    },
                    {
                      label: "Ville",
                      key: "city" as const,
                      icon: MapPin,
                      placeholder: "Casablanca",
                    },
                    {
                      label: "Adresse",
                      key: "address" as const,
                      icon: MapPin,
                      placeholder: "123 Rue Hassan II",
                    },
                  ].map(({ label, key, icon: Icon, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {label}
                      </label>
                      {editing ? (
                        <div className="relative">
                          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            value={form[key]}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, [key]: e.target.value }))
                            }
                            placeholder={placeholder}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-800 py-2">
                          {form[key] || (
                            <span className="text-gray-400">Non renseigné</span>
                          )}
                        </p>
                      )}
                    </div>
                  ))}

                  {editing && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-md transition"
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                            Sauvegarde…
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" /> Enregistrer
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                      >
                        <X className="w-4 h-4" /> Annuler
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB SÉCURITÉ ────────────────────────────────────────────────── */}
        {tab === "security" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-5">
                Sécurité du compte
              </h3>
              {!changingPw ? (
                <div className="space-y-3">
                  {[
                    {
                      icon: Lock,
                      title: "Mot de passe",
                      sub: "Changer votre mot de passe",
                      action: () => setChangingPw(true),
                      label: "Changer",
                    },
                    {
                      icon: Mail,
                      title: "Email",
                      sub: user?.email ?? "",
                      action: () => {},
                      label: "Modifier",
                    },
                  ].map(({ icon: Icon, title, sub, action, label }) => (
                    <div
                      key={title}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {title}
                          </p>
                          <p className="text-xs text-gray-500">{sub}</p>
                        </div>
                      </div>
                      <button
                        onClick={action}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {label}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    {
                      label: "Mot de passe actuel",
                      val: pwCurrent,
                      set: setPwCurrent,
                      show: showPw.current,
                      toggle: () =>
                        setShowPw((p) => ({ ...p, current: !p.current })),
                    },
                    {
                      label: "Nouveau mot de passe",
                      val: pwNew,
                      set: setPwNew,
                      show: showPw.new,
                      toggle: () => setShowPw((p) => ({ ...p, new: !p.new })),
                    },
                    {
                      label: "Confirmer",
                      val: pwConfirm,
                      set: setPwConfirm,
                      show: showPw.confirm,
                      toggle: () =>
                        setShowPw((p) => ({ ...p, confirm: !p.confirm })),
                    },
                  ].map(({ label, val, set, show, toggle }) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {label}
                      </label>
                      <div className="relative">
                        <input
                          type={show ? "text" : "password"}
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={toggle}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {show ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleChangePw}
                      disabled={saving}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 hover:shadow-md transition"
                    >
                      {saving ? "Modification…" : "Changer le mot de passe"}
                    </button>
                    <button
                      onClick={() => setChangingPw(false)}
                      className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── TAB DOCUMENTS ───────────────────────────────────────────────── */}
        {tab === "documents" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-4"
          >
            {/* ── Résultat validation croisée ─────────────────── */}
            {crossValidation && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-4 ${
                  crossValidation.success
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {crossValidation.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                  <p
                    className={`text-sm font-semibold ${
                      crossValidation.success
                        ? "text-green-800"
                        : "text-red-700"
                    }`}
                  >
                    {crossValidation.message}
                  </p>
                </div>

                {/* Tableau des champs comparés */}
                <div className="space-y-2">
                  {Object.entries(crossValidation.fields).map(
                    ([field, val]) => {
                      const labels: Record<string, string> = {
                        last_name: "Nom de famille",
                        first_name: "Prénom",
                        birth_date: "Date de naissance",
                      };
                      return (
                        <div
                          key={field}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                            val.match ? "bg-green-100" : "bg-red-100"
                          }`}
                        >
                          <span className="font-medium text-gray-600 w-32">
                            {labels[field]}
                          </span>
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1 text-center">
                              <p className="text-gray-400 text-xs">CIN</p>
                              <p className="font-semibold text-gray-800">
                                {val.cin ?? "—"}
                              </p>
                            </div>
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                val.match ? "bg-green-500" : "bg-red-500"
                              }`}
                            >
                              {val.match ? (
                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 text-center">
                              <p className="text-gray-400 text-xs">Permis</p>
                              <p className="font-semibold text-gray-800">
                                {val.permis ?? "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                {/* Bouton relancer si échec */}
                {!crossValidation.success && (
                  <button
                    onClick={async () => {
                      try {
                        const { data } = await api.post(
                          "/documents/validate-cross",
                        );
                        setCrossValidation(data);
                      } catch {
                        showMsg("error", "Erreur lors de la validation.");
                      }
                    }}
                    className="mt-3 text-xs text-red-600 underline hover:text-red-800"
                  >
                    Relancer la validation
                  </button>
                )}
              </motion.div>
            )}

            {/* Badge "documents vérifiés" si tout est ok */}
            {crossValidation?.success && (
              <div className="flex items-center gap-2 bg-green-100 border border-green-300 rounded-xl px-4 py-2">
                <BadgeCheck className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-800">
                  Documents vérifiés — CIN et Permis correspondent
                </span>
                <span className="ml-auto text-xs text-green-600">
                  Profil de confiance ✓
                </span>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Documents analysés automatiquement par notre IA. Stockés de
                façon sécurisée.
              </p>
            </div>

            {/* CIN - Recto */}
            <DocCard
              title="Carte Nationale d'Identité (Recto)"
              icon={<CreditCard className="w-5 h-5 text-white" />}
              color="from-blue-500 to-blue-700"
              uploaded={docs.cin.uploaded}
              loading={ocrLoading["cin"] ?? false}
              onUpload={(e) => handleDocUpload(e, "cin")}
              fields={[
                { label: "N° CIN", value: docs.cin.data?.cin_number },
                { label: "Nom", value: docs.cin.data?.last_name },
                { label: "Prénom", value: docs.cin.data?.first_name },
                { label: "Date naissance", value: docs.cin.data?.birth_date },
                { label: "Expiration", value: docs.cin.data?.expiry_date },
              ]}
            />

            {/* CIN - Verso */}
            <DocCard
              title="Carte Nationale d'Identité (Verso)"
              icon={<CreditCard className="w-5 h-5 text-white" />}
              color="from-indigo-500 to-indigo-700"
              uploaded={docs.cin_verso.uploaded}
              loading={ocrLoading["cin_verso"] ?? false}
              onUpload={(e) => handleDocUpload(e, "cin_verso")}
              fields={[
                { label: "Adresse", value: docs.cin_verso.data?.address },
                {
                  label: "Genre",
                  value:
                    docs.cin_verso.data?.gender === "M"
                      ? "Masculin"
                      : docs.cin_verso.data?.gender === "F"
                        ? "Féminin"
                        : undefined,
                },
              ]}
            />

            {/* Permis - Recto */}
            <DocCard
              title="Permis de Conduire (Recto)"
              icon={<Car className="w-5 h-5 text-white" />}
              color="from-purple-500 to-purple-700"
              uploaded={docs.permis.uploaded}
              loading={ocrLoading["permis"] ?? false}
              onUpload={(e) => handleDocUpload(e, "permis")}
              fields={[
                { label: "N° Permis", value: docs.permis.data?.permis_number },
                { label: "Prénom", value: docs.permis.data?.first_name },
                { label: "Nom", value: docs.permis.data?.last_name },
                {
                  label: "Date naissance",
                  value: docs.permis.data?.birth_date,
                },
                { label: "Délivrance", value: docs.permis.data?.issue_date },
                { label: "Expiration", value: docs.permis.data?.expiry_date },
                {
                  label: "Catégories",
                  value: docs.permis.data?.categories?.join(", "),
                },
              ]}
            />

            {/* Permis - Verso */}
            <DocCard
              title="Permis de Conduire (Verso)"
              icon={<Car className="w-5 h-5 text-white" />}
              color="from-pink-500 to-rose-700"
              uploaded={docs.permis_verso.uploaded}
              loading={ocrLoading["permis_verso"] ?? false}
              onUpload={(e) => handleDocUpload(e, "permis_verso")}
              fields={[
                {
                  label: "N° Permis (complet)",
                  value: docs.permis_verso.data?.permis_number,
                },
                {
                  label: "Expiration",
                  value: docs.permis_verso.data?.expiry_date,
                },
                {
                  label: "Catégories",
                  value: docs.permis_verso.data?.categories?.join(", "),
                },
              ]}
            />
          </motion.div>
        )}

        {/* ── TAB ACTIVITÉ ────────────────────────────────────────────────── */}
        {tab === "activity" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Dernières réservations */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  Dernières réservations
                </h3>
                <Link
                  href="/Client/bookings"
                  className="text-sm text-blue-600 flex items-center gap-1"
                >
                  Voir tout <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              {loadingBookings ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Car className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Aucune réservation pour le moment</p>
                  <button
                    onClick={() => router.push("/vehicules")}
                    className="mt-4 text-sm text-blue-600 hover:underline"
                  >
                    Trouver un véhicule
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              )}
            </div>

            {/* Derniers avis */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  Mes derniers avis
                </h3>
                <Link
                  href="/Client/reviews"
                  className="text-sm text-blue-600 flex items-center gap-1"
                >
                  Voir tout <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              {loadingReviews ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Star className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Aucun avis pour le moment</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Les avis apparaissent après une réservation terminée
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
