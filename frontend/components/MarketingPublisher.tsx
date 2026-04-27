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
  TrendingUp,
  Globe,
  ChevronDown,
} from "lucide-react";
import api from "@/lib/api";

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  price_per_day: number;
  image_url: string | null;
}

interface Props {
  vehicle: Vehicle;
  ownerId: number;
}

const PLATFORM_CONFIG = {
  facebook: {
    label: "Facebook",
    icon: Facebook,
    color: "bg-blue-600",
    textColor: "text-blue-600",
    bgLight: "bg-blue-50",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    color: "bg-pink-600",
    textColor: "text-pink-600",
    bgLight: "bg-pink-50",
  },
  tiktok: {
    label: "TikTok",
    icon: Share2,
    color: "bg-black",
    textColor: "text-gray-900",
    bgLight: "bg-gray-50",
  },
};

export default function MarketingPublisher({ vehicle, ownerId }: Props) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "facebook",
  ]);
  const [tone, setTone] = useState("professionnel");
  const [language, setLanguage] = useState("fr");
  const [promoPrice, setPromoPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  async function handlePublish() {
    if (selectedPlatforms.length === 0) {
      setError("Sélectionnez au moins une plateforme.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data } = await api.post(
        "http://localhost/api/agent/marketing/publish",
        {
          owner_id: ownerId,
          vehicule_id: vehicle.id,
          platforms: selectedPlatforms,
          tone,
          language,
          promo_price: promoPrice ? parseFloat(promoPrice) : null,
        },
      );
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la publication.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">Publication automatique</h3>
          <p className="text-xs text-gray-500">
            Publiez {vehicle.brand} {vehicle.model} sur vos réseaux
          </p>
        </div>
        <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
          Premium IA
        </span>
      </div>

      {/* Plateformes */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Plateformes
        </label>
        <div className="flex gap-2">
          {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const selected = selectedPlatforms.includes(key);
            return (
              <button
                key={key}
                onClick={() => togglePlatform(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                  selected
                    ? `${cfg.color} text-white border-transparent`
                    : `border-gray-200 text-gray-600 hover:border-gray-300 ${cfg.bgLight}`
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
      <div className="grid grid-cols-3 gap-3 mb-5">
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
            <option value="urgence">Urgence / Promo</option>
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

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Bouton */}
      <button
        onClick={handlePublish}
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Publication en cours…
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" /> Publier maintenant
          </>
        )}
      </button>

      {/* Résultats */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 space-y-3"
          >
            {/* Résumé */}
            <div
              className={`p-4 rounded-xl border ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle
                  className={`w-5 h-5 ${result.success ? "text-green-500" : "text-red-500"}`}
                />
                <span
                  className={`font-semibold text-sm ${result.success ? "text-green-700" : "text-red-700"}`}
                >
                  {result.published_count} publication(s) réussie(s)
                  {result.failed_count > 0 &&
                    ` · ${result.failed_count} échouée(s)`}
                </span>
              </div>

              {/* Liens publications */}
              <div className="space-y-1.5">
                {result.publications?.map((pub: any, i: number) => {
                  const cfg =
                    PLATFORM_CONFIG[
                      pub.platform as keyof typeof PLATFORM_CONFIG
                    ];
                  const Icon = cfg?.icon || Globe;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="font-medium capitalize">
                        {pub.platform}
                      </span>
                      {pub.success ? (
                        <span className="text-green-600">✓ Publié</span>
                      ) : (
                        <span className="text-red-600">✗ {pub.error}</span>
                      )}
                      {pub.post_url && (
                        <a
                          href={pub.post_url}
                          target="_blank"
                          className="ml-auto text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Voir <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {pub.simulated && (
                        <span className="text-gray-400 italic">
                          (simulation)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preview contenu */}
            {result.contents_preview && (
              <div>
                <button
                  onClick={() => setShowPreview((v) => !v)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${showPreview ? "rotate-180" : ""}`}
                  />
                  Voir le contenu généré
                </button>
                {showPreview && (
                  <div className="mt-2 space-y-2">
                    {Object.entries(result.contents_preview).map(
                      ([platform, preview]) => (
                        <div
                          key={platform}
                          className="bg-gray-50 rounded-xl p-3"
                        >
                          <p className="text-xs font-semibold text-gray-500 capitalize mb-1">
                            {platform}
                          </p>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {preview as string}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
