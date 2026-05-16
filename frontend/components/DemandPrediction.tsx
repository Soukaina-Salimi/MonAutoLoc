"use client";
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Zap,
  Calendar,
  MapPin,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

interface Prediction {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
  weekday: string;
  is_weekend: boolean;
  is_ferie: boolean;
  level: string;
}

interface PricingReco {
  date: string;
  weekday: string;
  demand: number;
  demand_level: string;
  price_adjustment: string;
  advice: string;
  indicator: string;
}

interface DemandResult {
  city: string;
  category: string;
  model_used: string;
  data_source: string;
  real_data_points: number;
  summary: {
    avg_daily_demand: number;
    trend_direction: string;
    high_demand_days: number;
    peak_day: { date: string; predicted: number };
    weekend_avg: number;
  };
  insights: {
    market_analysis: string;
    demand_outlook: string;
    best_periods: { period: string; reason: string; recommendation: string }[];
    pricing_advice: string;
    availability_tip: string;
    risk_alert: string | null;
    confidence: string;
  };
  predictions: Prediction[];
  pricing_recommendations: PricingReco[];
}

const CITIES = [
  "Casablanca",
  "Marrakech",
  "Agadir",
  "Fès",
  "Rabat",
  "Tanger",
  "Meknès",
  "Oujda",
];
const CATEGORIES = [
  "citadine",
  "berline",
  "suv",
  "4x4",
  "utilitaire",
  "luxe",
  "minibus",
];

const LEVEL_COLORS: Record<string, string> = {
  "très haute": "bg-red-500",
  haute: "bg-orange-400",
  normale: "bg-blue-400",
  faible: "bg-gray-300",
  "très faible": "bg-gray-200",
};

const LEVEL_TEXT: Record<string, string> = {
  "très haute": "text-red-700 bg-red-50 border-red-200",
  haute: "text-orange-700 bg-orange-50 border-orange-200",
  normale: "text-blue-700 bg-blue-50 border-blue-200",
  faible: "text-gray-600 bg-gray-50 border-gray-200",
  "très faible": "text-gray-500 bg-gray-50 border-gray-100",
};

// Mini heatmap calendrier
function DemandHeatmap({ predictions }: { predictions: Prediction[] }) {
  const max = Math.max(...predictions.map((p) => p.predicted), 1);

  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {predictions.map((p, i) => {
          const intensity = p.predicted / max;
          const opacity = 0.15 + intensity * 0.85;
          const dt = new Date(p.date);
          const day = dt.getDate();
          const isStart = day === 1 || i === 0;

          return (
            <div key={p.date} className="relative group">
              {/* Tooltip */}
              <div
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2
                                            bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5
                                            opacity-0 group-hover:opacity-100 transition-opacity
                                            pointer-events-none whitespace-nowrap z-20 shadow-lg"
              >
                <p className="font-semibold">{p.date}</p>
                <p>
                  {p.weekday} · {p.predicted} rés.
                </p>
                <p className="text-gray-300 capitalize">{p.level}</p>
                {p.is_ferie && <p className="text-amber-300">🎉 Jour Férié</p>}
                {p.is_weekend && <p className="text-blue-300">📅 Week-end</p>}
              </div>

              <div
                className={`w-7 h-7 rounded-md cursor-pointer transition-transform
                                            hover:scale-110 border
                                            ${
                                              p.is_ferie
                                                ? "border-amber-400"
                                                : p.is_weekend
                                                  ? "border-blue-300"
                                                  : "border-transparent"
                                            }`}
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${opacity})`,
                }}
              >
                <span
                  className="text-xs font-medium flex items-center justify-center h-full"
                  style={{ color: intensity > 0.6 ? "white" : "#374151" }}
                >
                  {day}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-gray-400">Faible</span>
        <div className="flex gap-0.5">
          {[0.15, 0.35, 0.55, 0.75, 0.95].map((op, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: `rgba(59,130,246,${op})` }}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400">Forte</span>
        <div className="ml-3 flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm border border-amber-400 bg-transparent" />
          <span className="text-xs text-gray-400">Férié</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm border border-blue-300 bg-transparent" />
          <span className="text-xs text-gray-400">Week-end</span>
        </div>
      </div>
    </div>
  );
}

// Barre de demande
function DemandBar({
  value,
  max,
  level,
}: {
  value: number;
  max: number;
  level: string;
}) {
  const pct = Math.round((value / max) * 100);
  const col = LEVEL_COLORS[level] || "bg-blue-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${col} rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-6 text-right">{value}</span>
    </div>
  );
}

export default function DemandPrediction({
  defaultCity = "Casablanca",
  defaultCategory = "berline",
  ownerId,
}: {
  defaultCity?: string;
  defaultCategory?: string;
  ownerId?: number;
}) {
  const [city, setCity] = useState(defaultCity);
  const [category, setCategory] = useState(defaultCategory);
  const [days, setDays] = useState(30);
  const [result, setResult] = useState<DemandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"heatmap" | "list" | "pricing">(
    "heatmap",
  );
  const [showInsights, setShowInsights] = useState(true);

  async function predict() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<DemandResult>("/agent/demand/predict", {
        city,
        category,
        days_ahead: days,
        owner_id: ownerId,
      });
      setResult(data);
    } catch {
      setError(
        "Erreur lors de la prédiction. Vérifiez que le service est disponible.",
      );
    } finally {
      setLoading(false);
    }
  }

  const maxDemand = result
    ? Math.max(...result.predictions.map((p) => p.predicted), 1)
    : 1;

  const trendUp = result?.summary.trend_direction === "hausse";

  return (
    <div className="space-y-4">
      {/* Formulaire */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">
              Prédiction de Demande IA
            </h3>
            <p className="text-xs text-gray-400">
              Modèle Prophet (Meta) + Groq LLM
            </p>
          </div>
          <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
            Premium IA
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ville</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Catégorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Horizon</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>7 jours</option>
              <option value={14}>14 jours</option>
              <option value={30}>30 jours</option>
              <option value={60}>60 jours</option>
              <option value={90}>90 jours</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={predict}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 
                                       text-white rounded-xl text-sm font-semibold hover:bg-blue-700 
                                       transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyse…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Prédire
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Résultats */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Demande moy./jour",
                  value: `${result.summary.avg_daily_demand}`,
                  sub: "réservations",
                  icon: BarChart3,
                  color: "text-blue-600 bg-blue-50",
                },
                {
                  label: "Tendance",
                  value: result.summary.trend_direction,
                  sub: `sur ${days} jours`,
                  icon: trendUp ? TrendingUp : TrendingDown,
                  color: trendUp
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-red-500 bg-red-50",
                },
                {
                  label: "Jours forte demande",
                  value: `${result.summary.high_demand_days}`,
                  sub: `sur ${days} jours`,
                  icon: Calendar,
                  color: "text-amber-600 bg-amber-50",
                },
                {
                  label: "Pic prévu",
                  value: result.summary.peak_day?.date?.slice(5) ?? "N/A",
                  sub: `${result.summary.peak_day?.predicted} rés.`,
                  icon: TrendingUp,
                  color: "text-purple-600 bg-purple-50",
                },
              ].map(({ label, value, sub, icon: Icon, color }) => (
                <div
                  key={label}
                  className="bg-white rounded-2xl border border-gray-100 p-4"
                >
                  <div
                    className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center mb-3`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-gray-800 capitalize">
                    {value}
                  </p>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              ))}
            </div>

            {/* Insights LLM */}
            {result.insights && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setShowInsights(!showInsights)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-gray-800 text-sm">
                      Insights IA — {city} · {category}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        result.insights.confidence === "high"
                          ? "bg-green-100 text-green-700"
                          : result.insights.confidence === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      Confiance {result.insights.confidence}
                    </span>
                  </div>
                  {showInsights ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {showInsights && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-blue-700 mb-1">
                          📊 Analyse marché
                        </p>
                        <p className="text-xs text-blue-600 leading-relaxed">
                          {result.insights.market_analysis}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-purple-700 mb-1">
                          🔮 Perspectives
                        </p>
                        <p className="text-xs text-purple-600 leading-relaxed">
                          {result.insights.demand_outlook}
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-emerald-700 mb-1">
                          💰 Conseil pricing
                        </p>
                        <p className="text-xs text-emerald-600 leading-relaxed">
                          {result.insights.pricing_advice}
                        </p>
                      </div>
                      <div className="bg-teal-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-teal-700 mb-1">
                          🚗 Disponibilité
                        </p>
                        <p className="text-xs text-teal-600 leading-relaxed">
                          {result.insights.availability_tip}
                        </p>
                      </div>
                    </div>

                    {result.insights.risk_alert && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600">
                          {result.insights.risk_alert}
                        </p>
                      </div>
                    )}

                    {result.insights.best_periods?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          🎯 Meilleures périodes
                        </p>
                        <div className="space-y-2">
                          {result.insights.best_periods.map((bp, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 bg-gray-50 rounded-xl p-2.5"
                            >
                              <span className="text-sm">
                                {["🥇", "🥈", "🥉"][i] || "📌"}
                              </span>
                              <div>
                                <p className="text-xs font-medium text-gray-700">
                                  {bp.period}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {bp.reason}
                                </p>
                                <p className="text-xs text-blue-600 font-medium mt-0.5">
                                  → {bp.recommendation}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                      <Info className="w-3 h-3" />
                      <span>
                        Modèle : {result.model_used} · Source :{" "}
                        {result.real_data_points > 0
                          ? `${result.real_data_points} jours réels + synthétique`
                          : "données synthétiques Maroc"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Onglets visualisation */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex gap-2 mb-4">
                {[
                  { key: "heatmap", label: "Heatmap" },
                  { key: "list", label: "Détail" },
                  { key: "pricing", label: "Prix suggérés" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                      activeTab === tab.key
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                <button
                  onClick={predict}
                  disabled={loading}
                  className="ml-auto text-gray-400 hover:text-gray-600 transition"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              {/* Heatmap */}
              {activeTab === "heatmap" && (
                <DemandHeatmap predictions={result.predictions} />
              )}

              {/* Liste détaillée */}
              {activeTab === "list" && (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {result.predictions.map((p) => (
                    <div
                      key={p.date}
                      className={`flex items-center gap-3 py-2 px-3 rounded-xl
                                                        ${
                                                          p.is_ferie
                                                            ? "bg-amber-50"
                                                            : p.is_weekend
                                                              ? "bg-blue-50"
                                                              : "hover:bg-gray-50"
                                                        }`}
                    >
                      <div className="w-16 shrink-0">
                        <p className="text-xs font-semibold text-gray-700">
                          {p.weekday}
                        </p>
                        <p className="text-xs text-gray-400">
                          {p.date.slice(5)}
                        </p>
                      </div>
                      <div className="flex-1">
                        <DemandBar
                          value={p.predicted}
                          max={maxDemand}
                          level={p.level}
                        />
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border
                                                             font-medium capitalize w-24 text-center
                                                             ${LEVEL_TEXT[p.level] || ""}`}
                      >
                        {p.level}
                      </span>
                      <div className="flex gap-1">
                        {p.is_ferie && <span title="Jour Férié">🎉</span>}
                        {p.is_weekend && <span title="Week-end">📅</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommandations de prix */}
              {activeTab === "pricing" && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 mb-3">
                    Ajustements de prix recommandés selon la demande prévue
                  </p>
                  {result.pricing_recommendations.map((r) => (
                    <div
                      key={r.date}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <span className="text-lg">{r.indicator}</span>
                      <div className="w-16 shrink-0">
                        <p className="text-xs font-semibold">{r.weekday}</p>
                        <p className="text-xs text-gray-400">
                          {r.date.slice(5)}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-800">
                          {r.price_adjustment}
                        </p>
                        <p className="text-xs text-gray-500">{r.advice}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-lg font-medium capitalize
                                                             ${LEVEL_TEXT[r.demand_level] || ""}`}
                      >
                        {r.demand} rés.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
