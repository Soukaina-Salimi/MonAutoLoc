"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Facebook,
  Instagram,
  Share2,
  Zap,
  CheckCircle,
  Loader2,
  ExternalLink,
  Eye,
  ChevronRight,
  RefreshCw,
  Send,
  X,
  ChevronDown,
} from "lucide-react";
import api from "@/lib/api";

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  price_per_day: number;
  image_url: string | null;
  city?: string;
  year?: number;
  fuel_type?: string;
}

interface PreviewData {
  facebook?: { content: string; base64?: string };
  instagram?: { content: string; base64?: string };
  tiktok?: { content: string };
}

const PLATFORMS = {
  facebook: {
    label: "Facebook",
    icon: Facebook,
    color: "bg-blue-600",
    light: "bg-blue-50 border-blue-300 text-blue-700",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    color: "bg-pink-600",
    light: "bg-pink-50 border-pink-300 text-pink-700",
  },
  tiktok: {
    label: "TikTok",
    icon: Share2,
    color: "bg-gray-900",
    light: "bg-gray-50 border-gray-300 text-gray-700",
  },
};

export default function MarketingPublisher({
  vehicle,
  ownerId,
}: {
  vehicle: Vehicle;
  ownerId: number;
}) {
  const [platforms, setPlatforms] = useState<string[]>(["facebook"]);
  const [tone, setTone] = useState("professionnel");
  const [language, setLanguage] = useState("fr");
  const [promoPrice, setPromoPrice] = useState("");
  const [step, setStep] = useState<
    "config" | "preview" | "publishing" | "done"
  >("config");
  const [preview, setPreview] = useState<PreviewData>({});
  const [editedContent, setEditedContent] = useState<Record<string, string>>(
    {},
  );
  const [activePreview, setActivePreview] = useState<string>("facebook");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  function togglePlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  // ── Étape 1 : Générer le preview ──────────────────────────────────────
  async function handleGeneratePreview() {
    if (!platforms.length) {
      setError("Sélectionnez au moins une plateforme");
      return;
    }
    setError(null);
    setStep("preview");

    try {
      const { data } = await api.post("/agent/marketing/preview", {
        owner_id: ownerId,
        vehicule_id: vehicle.id,
        platforms,
        tone,
        language,
        promo_price: promoPrice ? parseFloat(promoPrice) : null,
      });

      setPreview(data.contents || {});
      setEditedContent(
        Object.fromEntries(
          Object.entries(data.contents || {}).map(([p, d]: any) => [
            p,
            d.content,
          ]),
        ),
      );
      setActivePreview(platforms[0]);
    } catch (err: any) {
      setError("Erreur lors de la génération. Réessayez.");
      setStep("config");
    }
  }

  // ── Étape 2 : Publier avec le contenu édité ────────────────────────────
  async function handlePublish() {
    setStep("publishing");
    setError(null);

    try {
      const { data } = await api.post("/agent/marketing/publish", {
        owner_id: ownerId,
        vehicule_id: vehicle.id,
        platforms,
        tone,
        language,
        promo_price: promoPrice ? parseFloat(promoPrice) : null,
        custom_contents: editedContent, // ← contenu édité
      });
      setResult(data);
      setStep("done");
    } catch (err: any) {
      setError("Erreur lors de la publication.");
      setStep("preview");
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Marketing automatique</p>
          <p className="text-white/70 text-xs">
            {vehicle.brand} {vehicle.model}
          </p>
        </div>
        <span className="ml-auto text-xs bg-white/20 text-white px-2 py-1 rounded-full">
          Premium IA
        </span>
      </div>

      <div className="p-5">
        {/* ── ÉTAPE CONFIG ─────────────────────────────────────── */}
        {step === "config" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Plateformes */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Plateformes
              </label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(PLATFORMS).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const sel = platforms.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => togglePlatform(key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        sel
                          ? `${cfg.color} text-white border-transparent`
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Ton
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="professionnel">Professionnel</option>
                  <option value="casual">Casual</option>
                  <option value="urgence">Promo / Urgence</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Langue
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="fr">🇫🇷 Français</option>
                  <option value="ar">🇲🇦 Arabe</option>
                  <option value="en">🇬🇧 Anglais</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Prix promo (MAD)
                </label>
                <input
                  type="number"
                  value={promoPrice}
                  onChange={(e) => setPromoPrice(e.target.value)}
                  placeholder={String(vehicle.price_per_day)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              onClick={handleGeneratePreview}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition"
            >
              <Eye className="w-4 h-4" />
              Générer un aperçu
            </button>
          </motion.div>
        )}

        {/* ── ÉTAPE PREVIEW ─────────────────────────────────────── */}
        {step === "preview" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-800 text-sm">
                Aperçu & modification
              </h4>
              <button
                onClick={() => setStep("config")}
                className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-700"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reconfigurer
              </button>
            </div>

            {/* Onglets plateformes */}
            <div className="flex gap-1.5 border-b border-gray-100">
              {platforms.map((p) => {
                const cfg = PLATFORMS[p as keyof typeof PLATFORMS];
                const Icon = cfg.icon;
                return (
                  <button
                    key={p}
                    onClick={() => setActivePreview(p)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition border-b-2 ${
                      activePreview === p
                        ? `border-purple-600 text-purple-700 bg-purple-50`
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Preview simulé selon la plateforme */}
            {activePreview === "facebook" && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Header Facebook */}
                <div className="bg-gray-50 px-3 py-2 flex items-center gap-2 border-b">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">A</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">AutoRent</p>
                    <p className="text-xs text-gray-400">À l'instant · 🌍</p>
                  </div>
                </div>
                {/* Contenu éditable */}
                <div className="p-3">
                  <textarea
                    value={editedContent["facebook"] || ""}
                    onChange={(e) =>
                      setEditedContent((p) => ({
                        ...p,
                        facebook: e.target.value,
                      }))
                    }
                    rows={5}
                    className="w-full text-sm text-gray-700 resize-none focus:outline-none"
                    placeholder="Contenu Facebook..."
                  />
                </div>
                {/* Image */}
                {vehicle.image_url && (
                  <img
                    src={vehicle.image_url}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="px-3 py-2 border-t flex gap-3 text-xs text-gray-400">
                  <span>👍 J'aime</span>
                  <span>💬 Commenter</span>
                  <span>↗ Partager</span>
                </div>
              </div>
            )}

            {activePreview === "instagram" && (
              <div className="border border-gray-200 rounded-xl overflow-hidden max-w-xs mx-auto">
                <div className="bg-white px-3 py-2 flex items-center gap-2 border-b">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-pink-500" />
                  <p className="text-xs font-semibold">autorent.ma</p>
                </div>
                {vehicle.image_url && (
                  <div className="aspect-square">
                    <img
                      src={vehicle.image_url}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="px-3 py-2">
                  <div className="flex gap-3 mb-2 text-lg">❤️ 💬 ➤</div>
                  <textarea
                    value={editedContent["instagram"] || ""}
                    onChange={(e) =>
                      setEditedContent((p) => ({
                        ...p,
                        instagram: e.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full text-xs text-gray-700 resize-none focus:outline-none"
                    placeholder="Caption Instagram..."
                  />
                </div>
              </div>
            )}

            {activePreview === "tiktok" && (
              <div className="border border-gray-200 rounded-xl p-4 bg-black text-white max-w-xs mx-auto">
                <p className="text-xs font-bold mb-2">📱 Script TikTok</p>
                <textarea
                  value={editedContent["tiktok"] || ""}
                  onChange={(e) =>
                    setEditedContent((p) => ({ ...p, tiktok: e.target.value }))
                  }
                  rows={8}
                  className="w-full text-xs text-gray-300 bg-gray-900 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-pink-500"
                  placeholder="Script TikTok..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Publication manuelle requise via TikTok Business Center
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("config")}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Annuler
              </button>
              <button
                onClick={handlePublish}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition"
              >
                <Send className="w-4 h-4" /> Publier
              </button>
            </div>
          </motion.div>
        )}

        {/* ── PUBLISHING ─────────────────────────────────────────── */}
        {step === "publishing" && (
          <div className="text-center py-8">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">Publication en cours…</p>
            <p className="text-sm text-gray-500 mt-1">
              Nous publions sur {platforms.join(", ")}
            </p>
          </div>
        )}

        {/* ── DONE ───────────────────────────────────────────────── */}
        {step === "done" && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="font-bold text-gray-800">
                {result.published_count} publication(s) réussie(s) !
              </p>
            </div>

            {result.publications?.map((pub: any) => {
              const cfg = PLATFORMS[pub.platform as keyof typeof PLATFORMS];
              const Icon = cfg?.icon || Zap;
              return (
                <div
                  key={pub.platform}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <Icon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium capitalize">
                    {pub.platform}
                  </span>
                  {pub.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                  ) : (
                    <X className="w-4 h-4 text-red-500 ml-auto" />
                  )}
                  {pub.post_url && (
                    <a
                      href={pub.post_url}
                      target="_blank"
                      className="text-xs text-blue-600 flex items-center gap-1 hover:underline"
                    >
                      Voir <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => {
                setStep("config");
                setResult(null);
              }}
              className="w-full border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50 transition"
            >
              Nouvelle publication
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
