"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  MapPin,
  DollarSign,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  ChevronDown,
  AlertCircle,
  Luggage,
  Package,
  Truck,
  Car,
  Bot,
  TrendingUp,
  Users,
  Zap,
  Settings,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customization {
  id: number;
  service_type: string;
  customization_type: string;
  label: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  payment_required: boolean;
  payment_amount: number | null;
  payment_status: string | null;
  created_at: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  location: "Location de véhicules",
  transport_bagages: "Transport de bagages",
  livraison_colis: "Livraison de colis",
  demenagement: "Déménagement",
};

const SERVICE_ICONS: Record<string, any> = {
  location: Car,
  transport_bagages: Luggage,
  livraison_colis: Package,
  demenagement: Truck,
};

const CUSTOMIZATION_OPTIONS = [
  {
    id: "chatbot_indexing",
    label: "Indexation Chatbot IA",
    icon: Bot,
    color: "text-purple-600",
    bg: "bg-purple-50",
    desc: "Vos services apparaîtront dans les réponses du chatbot IA de la plateforme.",
    category: "ia",
  },
  {
    id: "demand_prediction",
    label: "Prédiction de la demande",
    icon: TrendingUp,
    color: "text-blue-600",
    bg: "bg-blue-50",
    desc: "Analysez l'historique pour prévoir le taux d'occupation et ajuster vos disponibilités.",
    category: "ia",
  },
  {
    id: "recommendations",
    label: "Recommandations intelligentes",
    icon: Sparkles,
    color: "text-amber-600",
    bg: "bg-amber-50",
    desc: "Vos services sont recommandés aux clients selon leur historique.",
    category: "ia",
  },
  {
    id: "dynamic_pricing",
    label: "Tarification dynamique",
    icon: DollarSign,
    color: "text-green-600",
    bg: "bg-green-50",
    desc: "L'IA suggère des ajustements de prix selon la demande et la concurrence.",
    category: "ia",
  },
  {
    id: "zone_exclusive",
    label: "Zone d'intervention exclusive",
    icon: MapPin,
    color: "text-rose-600",
    bg: "bg-rose-50",
    desc: "Demandez à être le prestataire exclusif sur une zone géographique.",
    category: "service",
  },
  {
    id: "tarif_special",
    label: "Tarif spécial",
    icon: DollarSign,
    color: "text-teal-600",
    bg: "bg-teal-50",
    desc: "Demandez une tarification personnalisée validée par l'admin.",
    category: "service",
  },
  {
    id: "option_supplementaire",
    label: "Option supplémentaire",
    icon: Plus,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    desc: "Proposez une option ou service additionnel à vos clients.",
    category: "service",
  },
];

const STATUS_CFG = {
  pending: {
    label: "En attente",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    icon: Clock,
  },
  approved: {
    label: "Approuvée",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: CheckCircle,
  },
  rejected: {
    label: "Refusée",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: XCircle,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function OwnerCustomizationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form state
  const [serviceType, setServiceType] = useState("");
  const [customType, setCustomType] = useState("");
  const [description, setDescription] = useState("");
  const [extraDetails, setExtraDetails] = useState<Record<string, string>>({});

  // Owner services (pour filtrer les options disponibles)
  const [ownerServices, setOwnerServices] = useState<string[]>([]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.replace("/login");
      return;
    }
    try {
      const u = JSON.parse(userStr);
      if (u.role.name !== "owner") {
        router.replace("/");
        return;
      }
      setUser(u);
      setOwnerServices(u.owner_services?.map((s: any) => s.service_type) ?? []);
    } catch {
      router.replace("/login");
      return;
    }

    fetchCustomizations();
  }, []);

  async function fetchCustomizations() {
    setLoading(true);
    try {
      const { data } = await api.get("/owner/customizations");
      setCustomizations(data);
    } catch {
      setCustomizations([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setFormError(null);
    if (!serviceType || !customType || !description.trim()) {
      setFormError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (description.trim().length < 20) {
      setFormError("La description doit faire au moins 20 caractères.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/owner/customizations", {
        service_type: serviceType,
        customization_type: customType,
        description,
        details: extraDetails,
      });
      setFormSuccess("Demande envoyée ! L'admin vous répondra sous 48h.");
      setShowForm(false);
      setServiceType("");
      setCustomType("");
      setDescription("");
      setExtraDetails({});
      await fetchCustomizations();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? "Erreur lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm("Annuler cette demande ?")) return;
    try {
      await api.delete(`/owner/customizations/${id}`);
      setCustomizations((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("Erreur lors de l'annulation.");
    }
  }

  const selectedOption = CUSTOMIZATION_OPTIONS.find((o) => o.id === customType);
  const availableTypes = serviceType ? CUSTOMIZATION_OPTIONS : [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        user={user}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentPath="/owner/customizations"
      />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen((v) => !v)}
                className="lg:hidden text-gray-600"
              >
                <Settings className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Personnalisation des services
                </h1>
                <p className="text-xs text-gray-400">
                  Demandez des fonctionnalités IA ou des options spéciales
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowForm((v) => !v);
                setFormError(null);
                setFormSuccess(null);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:shadow-md transition"
            >
              <Plus className="w-4 h-4" /> Nouvelle demande
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          {/* Success banner */}
          <AnimatePresence>
            {formSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-5 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm"
              >
                <CheckCircle className="w-4 h-4 shrink-0" /> {formSuccess}
                <button
                  onClick={() => setFormSuccess(null)}
                  className="ml-auto text-green-400 hover:text-green-600"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Formulaire nouvelle demande ─────────────────────── */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="bg-white rounded-2xl shadow-md p-6 border border-blue-100">
                  <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Nouvelle demande de personnalisation
                  </h2>

                  {formError && (
                    <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                    </div>
                  )}

                  <div className="space-y-5">
                    {/* Service concerné */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service concerné <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {ownerServices.map((svc) => {
                          const Icon = SERVICE_ICONS[svc] ?? Car;
                          return (
                            <button
                              key={svc}
                              type="button"
                              onClick={() => {
                                setServiceType(svc);
                                setCustomType("");
                              }}
                              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition ${
                                serviceType === svc
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-gray-200 text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                              {SERVICE_LABELS[svc]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Type de personnalisation */}
                    {serviceType && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type de personnalisation{" "}
                          <span className="text-red-500">*</span>
                        </label>

                        {/* Catégorie IA */}
                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2 mt-1">
                          Modules IA Premium
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                          {CUSTOMIZATION_OPTIONS.filter(
                            (o) => o.category === "ia",
                          ).map((opt) => {
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setCustomType(opt.id)}
                                className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition ${
                                  customType === opt.id
                                    ? "border-purple-400 bg-purple-50"
                                    : "border-gray-200 hover:border-purple-200"
                                }`}
                              >
                                <div
                                  className={`w-8 h-8 ${opt.bg} rounded-lg flex items-center justify-center shrink-0`}
                                >
                                  <Icon className={`w-4 h-4 ${opt.color}`} />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-800">
                                    {opt.label}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {opt.desc}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Catégorie Service */}
                        <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">
                          Options de service
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {CUSTOMIZATION_OPTIONS.filter(
                            (o) => o.category === "service",
                          ).map((opt) => {
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setCustomType(opt.id)}
                                className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition ${
                                  customType === opt.id
                                    ? "border-teal-400 bg-teal-50"
                                    : "border-gray-200 hover:border-teal-200"
                                }`}
                              >
                                <div
                                  className={`w-8 h-8 ${opt.bg} rounded-lg flex items-center justify-center shrink-0`}
                                >
                                  <Icon className={`w-4 h-4 ${opt.color}`} />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-800">
                                    {opt.label}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {opt.desc}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* Champs additionnels selon type */}
                    {customType === "zone_exclusive" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Zone souhaitée
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Casablanca — Mohammedia"
                          value={extraDetails.zone ?? ""}
                          onChange={(e) =>
                            setExtraDetails((p) => ({
                              ...p,
                              zone: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    )}
                    {customType === "tarif_special" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nouveau tarif demandé (MAD)
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 150"
                          value={extraDetails.new_price ?? ""}
                          onChange={(e) =>
                            setExtraDetails((p) => ({
                              ...p,
                              new_price: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    )}
                    {customType === "option_supplementaire" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Option proposée
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Livraison 24h/24"
                          value={extraDetails.option ?? ""}
                          onChange={(e) =>
                            setExtraDetails((p) => ({
                              ...p,
                              option: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    )}

                    {/* Description */}
                    {customType && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Décrivez votre demande{" "}
                          <span className="text-red-500">*</span>
                          <span className="text-gray-400 font-normal ml-1">
                            (min. 20 caractères)
                          </span>
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={4}
                          placeholder="Expliquez pourquoi vous souhaitez cette personnalisation, vos objectifs, contexte..."
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          {description.length} / 1000
                        </p>
                      </motion.div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                            Envoi...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" /> Envoyer la demande
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowForm(false)}
                        className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Liste des demandes ───────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Mes demandes</h2>
              <span className="text-sm text-gray-400">
                {customizations.length} demande
                {customizations.length > 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-white rounded-2xl shadow-sm animate-pulse"
                  />
                ))}
              </div>
            ) : customizations.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <Sparkles className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-700 mb-1">
                  Aucune demande
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Personnalisez vos services pour attirer plus de clients.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Créer une demande
                </button>
              </div>
            ) : (
              customizations.map((c) => {
                const st = STATUS_CFG[c.status];
                const opt = CUSTOMIZATION_OPTIONS.find(
                  (o) => o.id === c.customization_type,
                );
                const Icon = opt?.icon ?? Sparkles;
                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`w-10 h-10 ${opt?.bg ?? "bg-gray-50"} rounded-xl flex items-center justify-center shrink-0`}
                        >
                          <Icon
                            className={`w-5 h-5 ${opt?.color ?? "text-gray-500"}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-gray-800 text-sm">
                              {c.label}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}
                            >
                              <st.icon className="w-3 h-3" /> {st.label}
                            </span>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              {SERVICE_LABELS[c.service_type]}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {c.description}
                          </p>
                          {c.admin_notes && (
                            <div
                              className={`mt-2 p-2 rounded-lg text-xs ${c.status === "approved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                            >
                              <span className="font-semibold">
                                Note admin :
                              </span>{" "}
                              {c.admin_notes}
                            </div>
                          )}
                          {c.payment_required && c.status === "approved" && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                              Paiement requis :{" "}
                              <span className="font-bold">
                                {c.payment_amount} MAD
                              </span>
                              {c.payment_status === "pending" &&
                                " — En attente de paiement"}
                              {c.payment_status === "paid" && " — Payé ✓"}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {c.created_at}
                          </p>
                        </div>
                      </div>
                      {c.status === "pending" && (
                        <button
                          onClick={() => handleCancel(c.id)}
                          className="text-gray-400 hover:text-red-500 transition shrink-0 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
