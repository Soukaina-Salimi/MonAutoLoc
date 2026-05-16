"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  TrendingUp,
  DollarSign,
  Users,
  Sparkles,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  Loader2,
  AlertCircle,
  CreditCard,
  Crown,
  ArrowRight,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Info,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import Sidebar from "@/components/Sidebar";

// ── Config features ────────────────────────────────────────────────────────────

const FEATURE_CONFIG: Record<
  string,
  {
    label: string;
    icon: any;
    gradient: string;
    bg: string;
    textColor: string;
    description: string;
    benefits: string[];
    example: string;
    badge?: string;
  }
> = {
  chatbot_indexing: {
    label: "Chatbot IA",
    icon: MessageCircle,
    gradient: "from-purple-500 to-violet-600",
    bg: "bg-purple-50",
    textColor: "text-purple-600",
    description: "Vos véhicules apparaissent dans le chatbot AutoRent",
    benefits: [
      "Indexation automatique de vos annonces",
      "Clients dirigés vers vos véhicules en priorité",
      "Mise à jour en temps réel",
    ],
    example: "Client demande SUV Casa → votre Toyota RAV4 cité en premier",
    badge: "Gratuit",
  },
  demand_prediction: {
    label: "Prédiction Demande",
    icon: TrendingUp,
    gradient: "from-blue-500 to-cyan-600",
    bg: "bg-blue-50",
    textColor: "text-blue-600",
    description: "Anticipez la demande par ville et catégorie",
    benefits: [
      "Modèle Prophet (Meta) sur 30-90 jours",
      "Heatmap des jours à forte demande",
      "Fériés et saisonnalité Maroc inclus",
    ],
    example: "Alerte : Forte demande Agadir Août → Augmentez prix +20%",
  },
  dynamic_pricing: {
    label: "Tarification Dynamique",
    icon: DollarSign,
    gradient: "from-green-500 to-emerald-600",
    bg: "bg-green-50",
    textColor: "text-green-600",
    description: "Prix optimal selon offre, demande et concurrence",
    benefits: [
      "Suggestion prix à l'ajout d'un véhicule",
      "Analyse concurrents dans la même ville",
      "Coefficient saison / fériés / week-end",
    ],
    example: "Votre SUV Marrakech Juillet → Prix suggéré 580 MAD (+18%)",
  },
  client_score: {
    label: "Analyse Clients",
    icon: Users,
    gradient: "from-rose-500 to-pink-600",
    bg: "bg-rose-50",
    textColor: "text-rose-600",
    description: "Segmentation RFM + détection churn",
    benefits: [
      "Segmentation RFM (Champions, Fidèles, À risque...)",
      "K-Means Clustering comportemental",
      "Prédiction churn + recommandations actions",
    ],
    example: "3 clients à risque identifiés → Action : offre -15%",
  },
  recommendations: {
    label: "Recommandations",
    icon: Sparkles,
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    textColor: "text-amber-600",
    description: "Vos véhicules recommandés aux bons clients",
    benefits: [
      "Collaborative Filtering basé sur historique",
      "Score de pertinence calculé automatiquement",
      "Affichage prioritaire aux clients similaires",
    ],
    example: "Client habituel SUV → votre Land Cruiser recommandé",
  },
  monthly_report: {
    label: "Rapport Mensuel",
    icon: FileText,
    gradient: "from-indigo-500 to-blue-700",
    bg: "bg-indigo-50",
    textColor: "text-indigo-600",
    description: "Rapport PDF automatique avec KPIs et insights IA",
    benefits: [
      "Généré automatiquement le 1er de chaque mois",
      "KPIs : revenus, occupation, satisfaction, churn",
      "Recommandations IA pour le mois suivant",
    ],
    example: "Rapport Mai → Revenus +12%, 5 actions prioritaires",
  },
  marketing_ia: {
    label: "Marketing avec IA",
    icon: FileText,
    gradient: "from-indigo-500 to-blue-700",
    bg: "bg-indigo-50",
    textColor: "text-indigo-600",
    description:
      "Publication automatique sur Facebook et Instagram avec contenu généré par IA",
    benefits: [
      "Généré automatiquement le contenu à publier",
      "Publie sur les réseux sociaux",
    ],
    example: "",
  },
};

const PAYMENT_METHODS = [
  { key: "virement", label: "Virement bancaire", icon: "🏦" },
  { key: "cih", label: "CIH Bank", icon: "💳" },
  { key: "attijari", label: "Attijariwafa Bank", icon: "💳" },
  { key: "bmce", label: "BMCE Bank of Africa", icon: "💳" },
  { key: "cash", label: "Espèces (agence)", icon: "💵" },
];

const BANK_INFO = {
  beneficiary: "AutoRent Maroc SARL",
  bank: "Attijariwafa Bank",
  rib: "007 780 0002110000012345 26",
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface Feature {
  id: number;
  feature_name: string;
  description: string;
  monthly_price: number;
  is_free: boolean;
  is_active: boolean;
  is_pending: boolean;
  expires_at: string | null;
  started_at: string | null;
  subscription_id: number | null;
}

// ── Modal de souscription ──────────────────────────────────────────────────────

function SubscribeModal({
  feature,
  onClose,
  onSuccess,
}: {
  feature: Feature;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const cfg = FEATURE_CONFIG[feature.feature_name];
  const Icon = cfg?.icon ?? Sparkles;

  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!method) {
      setError("Choisissez un mode de paiement.");
      return;
    }
    if (!file) {
      setError("Uploadez la preuve de paiement.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("feature_id", String(feature.id));
      fd.append("payment_method", method);
      fd.append("payment_reference", reference);
      fd.append("payment_proof", file);

      await api.post("/subscriptions", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center
                        p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div
          className={`bg-gradient-to-r ${cfg?.gradient ?? "from-blue-500 to-purple-600"} p-5`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold">{cfg?.label}</h2>
                <p className="text-white/80 text-sm font-semibold">
                  {feature.monthly_price} MAD / mois
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Coordonnées bancaires */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" />
              Effectuez le virement à :
            </p>
            <div className="space-y-1 text-xs">
              {[
                ["Bénéficiaire", BANK_INFO.beneficiary],
                ["Banque", BANK_INFO.bank],
                ["RIB", BANK_INFO.rib],
                ["Montant", `${feature.monthly_price} MAD`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-blue-600 font-medium">{label} :</span>
                  <span className="text-blue-800 font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mode de paiement */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Mode de paiement <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs
                                                text-left transition font-medium
                                                ${
                                                  method === m.key
                                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                                                }`}
                >
                  <span>{m.icon}</span> {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Référence */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Référence du virement
              <span className="text-gray-400 font-normal ml-1">
                (optionnel)
              </span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex: VIR-2024-001"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm
                                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preuve de paiement */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Preuve de paiement <span className="text-red-500">*</span>
            </label>
            <label
              className={`block border-2 border-dashed rounded-xl p-4 text-center
                                          cursor-pointer transition
                                          ${
                                            file
                                              ? "border-green-400 bg-green-50"
                                              : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                                          }`}
            >
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">{file.name}</span>
                </div>
              ) : (
                <div className="text-gray-400">
                  <Upload className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-xs">Capture d'écran, reçu ou PDF</p>
                  <p className="text-xs text-gray-300">Max 5 MB</p>
                </div>
              )}
            </label>
          </div>

          {/* Délai */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Validation sous <strong>24h ouvrées</strong>. La fonctionnalité
              sera activée automatiquement dès confirmation.
            </p>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 text-xs text-red-600 bg-red-50
                                        border border-red-200 rounded-xl p-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600
                                   rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={loading || !method || !file}
            className={`flex-1 py-2.5 bg-gradient-to-r ${cfg?.gradient ?? "from-blue-500 to-purple-600"}
                                    text-white rounded-xl text-sm font-bold hover:shadow-md transition
                                    disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Envoi…
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" /> Envoyer
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Feature Card ───────────────────────────────────────────────────────────────

function FeatureCard({
  feature,
  onSubscribe,
  onCancel,
  cancelling,
}: {
  feature: Feature;
  onSubscribe: (f: Feature) => void;
  onCancel: (id: number) => void;
  cancelling: number | null;
}) {
  const cfg = FEATURE_CONFIG[feature.feature_name];
  const Icon = cfg?.icon ?? Sparkles;
  const [detail, setDetail] = useState(false);

  return (
    <motion.div
      layout
      className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-200
                        ${
                          feature.is_active
                            ? "border-green-300 shadow-md shadow-green-50"
                            : feature.is_pending
                              ? "border-amber-300"
                              : "border-gray-100 hover:border-gray-200"
                        }`}
    >
      {/* Barre de couleur si actif */}
      {feature.is_active && (
        <div
          className={`h-1 bg-gradient-to-r ${cfg?.gradient ?? "from-blue-500 to-purple-500"}`}
        />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Icon + Titre */}
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 bg-gradient-to-br ${cfg?.gradient ?? "from-gray-400 to-gray-600"}
                                         rounded-2xl flex items-center justify-center shadow-sm shrink-0`}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">{cfg?.label}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{cfg?.description}</p>
            </div>
          </div>

          {/* Prix */}
          <div className="text-right shrink-0">
            {feature.is_free ? (
              <span
                className="text-xs font-bold text-green-600 bg-green-50
                                             border border-green-200 px-2 py-1 rounded-full"
              >
                Gratuit
              </span>
            ) : (
              <div>
                <p className="text-lg font-black text-gray-800">
                  {feature.monthly_price}
                </p>
                <p className="text-xs text-gray-400">MAD/mois</p>
              </div>
            )}
          </div>
        </div>

        {/* Statut */}
        <div className="mb-3">
          {feature.is_active ? (
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              Actif
              {feature.expires_at && (
                <span className="text-gray-400 font-normal ml-1">
                  · expire{" "}
                  {new Date(feature.expires_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              )}
            </div>
          ) : feature.is_pending ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              En attente de validation
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Lock className="w-3.5 h-3.5" />
              Non souscrit
            </div>
          )}
        </div>

        {/* Bénéfices — accordéon */}
        <button
          onClick={() => setDetail(!detail)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 mb-3 transition"
        >
          <Info className="w-3 h-3" />
          {detail ? "Masquer les détails" : "Voir les bénéfices"}
        </button>

        <AnimatePresence>
          {detail && cfg && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="space-y-1.5 mb-2">
                {cfg.benefits.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs text-gray-600"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    {b}
                  </div>
                ))}
              </div>
              <div className={`${cfg.bg} rounded-xl p-2.5`}>
                <p className={`text-xs font-semibold ${cfg.textColor} mb-0.5`}>
                  Exemple
                </p>
                <p className={`text-xs ${cfg.textColor}`}>{cfg.example}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {feature.is_active ? (
          <button
            onClick={() =>
              feature.subscription_id && onCancel(feature.subscription_id)
            }
            disabled={cancelling === feature.subscription_id}
            className="w-full py-2 border border-red-200 text-red-500 rounded-xl
                                   text-xs font-medium hover:bg-red-50 transition disabled:opacity-50
                                   flex items-center justify-center gap-1.5"
          >
            {cancelling === feature.subscription_id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            Résilier
          </button>
        ) : feature.is_pending ? (
          <div
            className="w-full py-2 bg-amber-50 border border-amber-200 text-amber-700
                                    rounded-xl text-xs font-semibold text-center"
          >
            ⏳ En cours de validation
          </div>
        ) : (
          <button
            onClick={() => onSubscribe(feature)}
            className={`w-full py-2.5 bg-gradient-to-r ${cfg?.gradient ?? "from-blue-500 to-purple-600"}
                                    text-white rounded-xl text-xs font-bold hover:shadow-md transition
                                    flex items-center justify-center gap-1.5`}
          >
            {feature.is_free ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" /> Activer gratuitement
              </>
            ) : (
              <>
                <CreditCard className="w-3.5 h-3.5" /> Souscrire —{" "}
                {feature.monthly_price} MAD/mois
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function AiFeaturesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [modalFeature, setModalFeature] = useState<Feature | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "available">(
    "all",
  );

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.replace("/login");
      return;
    }
    const u = JSON.parse(userData);
    setUser(u);
    fetchFeatures();
  }, []);

  async function fetchFeatures() {
    setLoading(true);
    try {
      const { data } = await api.get<Feature[]>("/ai-features");
      setFeatures(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribeFree(feature: Feature) {
    try {
      const fd = new FormData();
      fd.append("feature_id", String(feature.id));
      const { data: resp } = await api.post("/subscriptions", fd);
      showToast(resp.message, true);
      fetchFeatures();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? "Erreur", false);
    }
  }

  function handleSubscribe(feature: Feature) {
    if (feature.is_free) {
      handleSubscribeFree(feature);
    } else {
      setModalFeature(feature);
    }
  }

  async function handleCancel(subscriptionId: number) {
    if (
      !confirm("Résilier cet abonnement ? La fonctionnalité sera désactivée.")
    )
      return;
    setCancelling(subscriptionId);
    try {
      await api.patch(`/subscriptions/${subscriptionId}/cancel`);
      showToast("Abonnement résilié.", true);
      fetchFeatures();
    } catch {
      showToast("Erreur lors de la résiliation.", false);
    } finally {
      setCancelling(null);
    }
  }

  function handlePaymentSuccess() {
    setModalFeature(null);
    showToast("Demande envoyée ! Validation sous 24h ouvrées.", true);
    fetchFeatures();
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  // Stats
  const activeCount = features.filter((f) => f.is_active).length;
  const pendingCount = features.filter((f) => f.is_pending).length;
  const totalMonthly = features
    .filter((f) => f.is_active && !f.is_free)
    .reduce((s, f) => s + f.monthly_price, 0);

  // Filtres
  const filtered = features.filter((f) => {
    if (filterTab === "active") return f.is_active;
    if (filterTab === "available") return !f.is_active && !f.is_pending;
    return true;
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        user={user}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentPath="/owner/ai-features"
      />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-800">
                Fonctionnalités IA
              </h1>
              <p className="text-xs text-gray-400">
                Souscrivez uniquement aux modules dont vous avez besoin
              </p>
            </div>
            <button
              onClick={fetchFeatures}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-2xl text-sm
                                            font-medium shadow-lg flex items-center gap-2
                                            ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
              >
                {toast.ok ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {toast.msg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* KPIs */}
          {!loading && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                {
                  label: "Modules actifs",
                  value: `${activeCount}/${features.length}`,
                  icon: CheckCircle,
                  color: "text-green-600 bg-green-50",
                },
                {
                  label: "En attente",
                  value: pendingCount,
                  icon: Clock,
                  color: "text-amber-600 bg-amber-50",
                },
                {
                  label: "Coût mensuel",
                  value: totalMonthly > 0 ? `${totalMonthly} MAD` : "0 MAD",
                  icon: CreditCard,
                  color: "text-blue-600 bg-blue-50",
                },
              ].map(({ label, value, icon: Ico, color }) => (
                <div
                  key={label}
                  className="bg-white rounded-2xl border border-gray-100 p-4"
                >
                  <div
                    className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center mb-2`}
                  >
                    <Ico className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-gray-800">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Info à la carte */}
          <div className="mb-5 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Abonnement à la carte — payez uniquement ce que vous utilisez
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                Chaque module IA est indépendant. Souscrivez à un ou plusieurs
                selon vos besoins. Résiliation à tout moment.
              </p>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex gap-2 mb-5">
            {[
              { key: "all", label: "Tous" },
              { key: "active", label: `Actifs (${activeCount})` },
              { key: "available", label: "Disponibles" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  filterTab === tab.key
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grille */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-100
                                                         h-64 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <motion.div
              layout
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filtered.map((f) => (
                <FeatureCard
                  key={f.feature_name}
                  feature={f}
                  onSubscribe={handleSubscribe}
                  onCancel={handleCancel}
                  cancelling={cancelling}
                />
              ))}
            </motion.div>
          )}
        </main>
      </div>

      {/* Modal paiement */}
      <AnimatePresence>
        {modalFeature && (
          <SubscribeModal
            feature={modalFeature}
            onClose={() => setModalFeature(null)}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
