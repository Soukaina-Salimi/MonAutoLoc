"use client";
import { useState } from "react";
import {
  Zap,
  Loader2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Info,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

interface SuggestionResult {
  suggested_price: number;
  min_price: number;
  max_price: number;
  explanation: string;
  reasoning: {
    market_position: string;
    key_factors: string[];
  };
  market_data: {
    avg_price: number;
    min_price: number;
    max_price: number;
    count: number;
  };
  season: string;
}

interface Props {
  category: string;
  city: string;
  brand: string;
  model: string;
  year: number;
  fuelType?: string;
  transmission?: string;
  seats?: number;
  offersDriver?: boolean;
  onApply: (price: number) => void;
}

const POSITION_COLORS: Record<string, string> = {
  compétitif: "bg-green-100 text-green-700",
  premium: "bg-purple-100 text-purple-700",
  économique: "bg-blue-100 text-blue-700",
};

export default function PricingSuggestion({
  category,
  city,
  brand,
  model,
  year,
  fuelType,
  transmission,
  seats,
  offersDriver,
  onApply,
}: Props) {
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [applied, setApplied] = useState(false);

  // Vérifier si on a assez d'infos pour demander
  const canSuggest = !!(category && city && brand && model && year);

  async function getSuggestion() {
    if (!canSuggest) return;
    setLoading(true);
    setError(null);
    setApplied(false);

    try {
      const { data } = await api.post<SuggestionResult>(
        "/agent/pricing/suggest",
        {
          category,
          city,
          brand,
          model,
          year,
          fuel_type: fuelType || "essence",
          transmission: transmission || "manuelle",
          seats: seats || 5,
          offers_driver: offersDriver || false,
        },
      );
      setResult(data);
    } catch {
      setError("Impossible d'obtenir une suggestion pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!result) return;
    onApply(result.suggested_price);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50/50 overflow-hidden">
      {/* Bouton principal */}
      {!result && (
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Suggestion de prix IA
              </p>
              <p className="text-xs text-blue-600">
                {canSuggest
                  ? "Analyser le marché local pour suggérer un prix optimal"
                  : "Remplissez d'abord : catégorie, ville, marque, modèle, année"}
              </p>
            </div>
          </div>

          <button
            onClick={getSuggestion}
            disabled={!canSuggest || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analyse…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> Suggérer un prix
              </>
            )}
          </button>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border-t border-red-100">
          {error}
        </div>
      )}

      {/* Résultat */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 space-y-4"
          >
            {/* Header résultat */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-blue-800">
                  Suggestion IA — {result.season}
                </p>
              </div>
              <button
                onClick={getSuggestion}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Recalculer
              </button>
            </div>

            {/* Prix suggéré */}
            <div className="bg-white rounded-2xl p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Prix recommandé</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-800">
                      {result.suggested_price}
                    </span>
                    <span className="text-gray-500 text-sm">MAD / jour</span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  {result.reasoning?.market_position && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium block ${
                        POSITION_COLORS[result.reasoning.market_position] ||
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {result.reasoning.market_position}
                    </span>
                  )}
                  <p className="text-xs text-gray-400">
                    Marché : {result.market_data.avg_price} MAD moy.
                  </p>
                </div>
              </div>

              {/* Fourchette */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Min: {result.min_price} MAD</span>
                  <span>Max: {result.max_price} MAD</span>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full">
                  <div
                    className="absolute h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full"
                    style={{
                      left: `${
                        ((result.min_price - result.market_data.min_price) /
                          (result.market_data.max_price -
                            result.market_data.min_price)) *
                        100
                      }%`,
                      width: `${
                        ((result.max_price - result.min_price) /
                          (result.market_data.max_price -
                            result.market_data.min_price)) *
                        100
                      }%`,
                    }}
                  />
                  {/* Indicateur prix suggéré */}
                  <div
                    className="absolute w-3 h-3 bg-blue-600 rounded-full -top-0.5 border-2 border-white shadow"
                    style={{
                      left: `${
                        ((result.suggested_price -
                          result.market_data.min_price) /
                          (result.market_data.max_price -
                            result.market_data.min_price)) *
                        100
                      }%`,
                      transform: "translateX(-50%)",
                    }}
                  />
                </div>
                <p className="text-center text-xs text-blue-600 mt-1 font-medium">
                  ▲ Prix recommandé
                </p>
              </div>

              {/* Bouton appliquer */}
              <button
                onClick={handleApply}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${
                  applied
                    ? "bg-green-600 text-white"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-md"
                }`}
              >
                {applied ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Appliqué !
                  </>
                ) : (
                  <>Appliquer ce prix ({result.suggested_price} MAD/jour)</>
                )}
              </button>
            </div>

            {/* Explication */}
            <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 leading-relaxed">
                {result.explanation}
              </p>
            </div>

            {/* Données marché — accordéon */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 font-medium text-xs">
                    Données du marché à {city}
                    {result.market_data.count > 0
                      ? ` (${result.market_data.count} véhicules similaires)`
                      : " (données par défaut)"}
                  </span>
                </div>
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3 border-t border-gray-50">
                      {/* Stats marché */}
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        {[
                          {
                            label: "Prix min",
                            value: `${result.market_data.min_price} MAD`,
                          },
                          {
                            label: "Prix moyen",
                            value: `${result.market_data.avg_price} MAD`,
                          },
                          {
                            label: "Prix max",
                            value: `${result.market_data.max_price} MAD`,
                          },
                        ].map(({ label, value }) => (
                          <div
                            key={label}
                            className="text-center bg-gray-50 rounded-lg p-2"
                          >
                            <p className="text-xs text-gray-400">{label}</p>
                            <p className="text-sm font-semibold text-gray-700">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Facteurs clés */}
                      {result.reasoning?.key_factors?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Facteurs pris en compte
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {result.reasoning.key_factors.map((f, i) => (
                              <span
                                key={i}
                                className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
