"use client";
import { useState } from "react";
import {
  Users,
  TrendingDown,
  Star,
  BarChart3,
  Zap,
  Loader2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Target,
  Award,
  Heart,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

interface SegmentData {
  count: number;
  percentage: number;
  avg_spend: number;
  avg_frequency: number;
  avg_recency_days: number;
  avg_rfm_score: number;
}

interface ClusterProfile {
  cluster_id: number;
  name: string;
  color: string;
  count: number;
  pct: number;
  avg_monetary: number;
  avg_frequency: number;
  characteristics: string[];
}

interface BehaviorResult {
  total_clients: number;
  data_source: string;
  summary: {
    champion_count: number;
    at_risk_count: number;
    high_risk_count: number;
    churn_rate_pct: number;
    avg_rfm_score: number;
    n_clusters: number;
    silhouette_score: number;
    model_quality: string;
  };
  rfm: {
    segment_stats: Record<string, SegmentData>;
    segment_config: Record<
      string,
      { color: string; icon: string; action: string }
    >;
    top_clients: any[];
  };
  clustering: {
    profiles: ClusterProfile[];
    silhouette_score: number;
    scatter_points: {
      client_id: number;
      cluster: number;
      x: number;
      y: number;
      name: string;
    }[];
  };
  churn: {
    rate: number;
    auc_score: number;
    at_risk_count: number;
    high_risk_count: number;
    at_risk_clients: any[];
    feature_importance: { feature: string; importance: number }[];
  };
  insights: {
    executive_summary: string;
    key_finding: string;
    segments_strategy: {
      segment: string;
      strategy: string;
      expected_roi: string;
    }[];
    churn_strategy: {
      urgency: string;
      main_cause: string;
      action_plan: string[];
    };
    growth_opportunity: string;
    kpi_to_track: string[];
    next_30_days: string;
  };
}

// Scatter Plot PCA simple SVG
function ScatterPlot({
  points,
  profiles,
}: {
  points: { x: number; y: number; cluster: number; name: string }[];
  profiles: ClusterProfile[];
}) {
  if (!points.length) return null;

  const W = 320,
    H = 220,
    PAD = 30;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs),
    xMax = Math.max(...xs);
  const yMin = Math.min(...ys),
    yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const toSvgX = (x: number) => PAD + ((x - xMin) / xRange) * (W - 2 * PAD);
  const toSvgY = (y: number) => H - PAD - ((y - yMin) / yRange) * (H - 2 * PAD);

  const colorMap = profiles.reduce(
    (acc, p) => {
      acc[p.cluster_id] = p.color;
      return acc;
    },
    {} as Record<number, string>,
  );

  return (
    <div>
      <svg width={W} height={H} className="w-full">
        {/* Axes */}
        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
          stroke="#E5E7EB"
          strokeWidth="1"
        />
        <line
          x1={PAD}
          y1={PAD}
          x2={PAD}
          y2={H - PAD}
          stroke="#E5E7EB"
          strokeWidth="1"
        />

        {/* Labels axes */}
        <text
          x={W / 2}
          y={H - 5}
          textAnchor="middle"
          fontSize="10"
          fill="#9CA3AF"
        >
          PCA Composante 1
        </text>
        <text
          x={12}
          y={H / 2}
          textAnchor="middle"
          fontSize="10"
          fill="#9CA3AF"
          transform={`rotate(-90, 12, ${H / 2})`}
        >
          PCA 2
        </text>

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={toSvgX(p.x)}
            cy={toSvgY(p.y)}
            r={4}
            fill={colorMap[p.cluster] || "#6B7280"}
            fillOpacity={0.7}
            stroke="white"
            strokeWidth="0.5"
          >
            <title>{p.name}</title>
          </circle>
        ))}
      </svg>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 mt-2">
        {profiles.map((p) => (
          <div key={p.cluster_id} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-xs text-gray-500">
              {p.name} ({p.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// RFM Segment Bar
function SegmentBar({
  name,
  data,
  config,
}: {
  name: string;
  data: SegmentData;
  config: { color: string; icon: string; action: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition"
      >
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">{name}</span>
            <span className="text-sm font-bold" style={{ color: config.color }}>
              {data.count}{" "}
              <span className="text-xs font-normal text-gray-400">
                ({data.percentage}%)
              </span>
            </span>
          </div>
          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${data.percentage}%`,
                backgroundColor: config.color,
              }}
            />
          </div>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-2 mt-2 mb-2">
            {[
              {
                label: "Dépense moy.",
                value: `${Math.round(data.avg_spend)} MAD`,
              },
              { label: "Fréquence", value: `${data.avg_frequency}x` },
              { label: "Score RFM", value: `${data.avg_rfm_score}/100` },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="text-center bg-white rounded-lg p-1.5"
              >
                <p className="text-xs font-semibold text-gray-700">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 bg-white rounded-lg p-2">
            <span className="font-medium">Action : </span>
            {config.action}
          </p>
        </div>
      )}
    </div>
  );
}

// Feature Importance Bar
function FeatureBar({
  feature,
  importance,
  max,
}: {
  feature: string;
  importance: number;
  max: number;
}) {
  const pct = Math.round((importance / max) * 100);
  const labels: Record<string, string> = {
    recency: "Récence",
    frequency: "Fréquence",
    monetary: "Montant",
    rfm_score: "Score RFM",
    spend_trend: "Tendance dépenses",
    booking_regularity: "Régularité",
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-32 shrink-0">
        {labels[feature] || feature}
      </span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-10 text-right">
        {(importance * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export default function BehaviorAnalytics({ ownerId }: { ownerId: number }) {
  const [result, setResult] = useState<BehaviorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "rfm" | "clusters" | "churn" | "insights"
  >("rfm");

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<BehaviorResult>(
        "/agent/behavior/analyze",
        {
          owner_id: ownerId,
          mode: "full",
        },
      );
      setResult(data);
      setActiveTab("rfm");
    } catch {
      setError(
        "Erreur lors de l'analyse. Vérifiez que le service est disponible.",
      );
    } finally {
      setLoading(false);
    }
  }

  const urgencyColor = {
    élevé: "text-red-600 bg-red-50 border-red-200",
    moyen: "text-amber-600 bg-amber-50 border-amber-200",
    faible: "text-green-600 bg-green-50 border-green-200",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">
              Analyse Comportement Client
            </h3>
            <p className="text-xs text-gray-400">
              RFM · K-Means Clustering · Prédiction Churn · Recommandations
            </p>
          </div>
          <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
            Premium IA
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs text-gray-500">
          {[
            {
              icon: "📊",
              label: "RFM Analysis",
              desc: "Recency · Frequency · Monetary",
            },
            {
              icon: "🔵",
              label: "K-Means Clustering",
              desc: "Groupes comportementaux",
            },
            {
              icon: "⚠️",
              label: "Churn Prediction",
              desc: "Régression Logistique",
            },
            {
              icon: "💡",
              label: "LLM Insights",
              desc: "Recommandations actionnables",
            },
          ].map((m) => (
            <div
              key={m.label}
              className="bg-gray-50 rounded-xl p-2.5 text-center"
            >
              <div className="text-lg mb-1">{m.icon}</div>
              <p className="font-semibold text-gray-700 text-xs">{m.label}</p>
              <p className="text-gray-400" style={{ fontSize: "10px" }}>
                {m.desc}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={analyze}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 
                               text-white rounded-xl text-sm font-semibold hover:bg-purple-700 
                               transition disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours…
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" /> Lancer l'analyse comportementale
            </>
          )}
        </button>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mt-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
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
            {/* KPIs Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Clients analysés",
                  value: result.total_clients,
                  icon: Users,
                  color: "text-blue-600 bg-blue-50",
                  sub:
                    result.data_source === "synthetic"
                      ? "données synthétiques"
                      : "données réelles",
                },
                {
                  label: "Champions",
                  value: result.summary.champion_count,
                  icon: Award,
                  color: "text-emerald-600 bg-emerald-50",
                  sub: "clients top",
                },
                {
                  label: "À risque churn",
                  value: result.summary.at_risk_count,
                  icon: AlertCircle,
                  color: "text-red-600 bg-red-50",
                  sub: `taux ${result.summary.churn_rate_pct}%`,
                },
                {
                  label: "Score RFM moyen",
                  value: `${result.summary.avg_rfm_score}/100`,
                  icon: Star,
                  color: "text-amber-600 bg-amber-50",
                  sub: `qualité modèle : ${result.summary.model_quality}`,
                },
              ].map(({ label, value, icon: Icon, color, sub }) => (
                <div
                  key={label}
                  className="bg-white rounded-2xl border border-gray-100 p-4"
                >
                  <div
                    className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center mb-2`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-gray-800">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              ))}
            </div>

            {/* Onglets */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex gap-1 p-3 border-b border-gray-50">
                {[
                  { key: "rfm", label: "📊 RFM" },
                  { key: "clusters", label: "🔵 Clusters" },
                  { key: "churn", label: "⚠️ Churn" },
                  { key: "insights", label: "💡 Insights" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex-1 px-2 py-1.5 rounded-xl text-xs font-medium transition ${
                      activeTab === tab.key
                        ? "bg-purple-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {/* ── Onglet RFM ───────────────────────────── */}
                {activeTab === "rfm" && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 mb-3">
                      Segmentation RFM —{" "}
                      {Object.keys(result.rfm.segment_stats).length} segments
                      identifiés
                    </p>
                    {Object.entries(result.rfm.segment_stats)
                      .sort((a, b) => b[1].count - a[1].count)
                      .map(([name, data]) => (
                        <SegmentBar
                          key={name}
                          name={name}
                          data={data}
                          config={
                            result.rfm.segment_config[name] || {
                              color: "#6B7280",
                              icon: "👤",
                              action: "Engagement standard",
                            }
                          }
                        />
                      ))}
                  </div>
                )}

                {/* ── Onglet Clusters ───────────────────────── */}
                {activeTab === "clusters" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        {result.clustering.profiles.length} clusters ·
                        Silhouette = {result.clustering.silhouette_score}(
                        {result.summary.model_quality})
                      </p>
                    </div>

                    {/* Scatter Plot PCA */}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-600 mb-2">
                        Visualisation PCA (réduction 2D)
                      </p>
                      <ScatterPlot
                        points={result.clustering.scatter_points}
                        profiles={result.clustering.profiles}
                      />
                    </div>

                    {/* Profils */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {result.clustering.profiles.map((p) => (
                        <div
                          key={p.cluster_id}
                          className="border border-gray-100 rounded-xl p-3"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: p.color }}
                            />
                            <span className="text-sm font-semibold text-gray-800">
                              {p.name}
                            </span>
                            <span className="ml-auto text-xs text-gray-500">
                              {p.count} clients ({p.pct}%)
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {p.characteristics.map((c, i) => (
                              <span
                                key={i}
                                className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-1 mt-2 text-center">
                            <div className="bg-gray-50 rounded-lg p-1">
                              <p className="text-xs font-bold text-gray-700">
                                {Math.round(p.avg_monetary)} MAD
                              </p>
                              <p className="text-xs text-gray-400">Dépenses</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-1">
                              <p className="text-xs font-bold text-gray-700">
                                {p.avg_frequency.toFixed(1)}x
                              </p>
                              <p className="text-xs text-gray-400">Fréquence</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-1">
                              <p className="text-xs font-bold text-gray-700">
                                {p.avg_frequency?.toFixed(0) ?? "?"} j
                              </p>
                              <p className="text-xs text-gray-400">Récence</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Onglet Churn ──────────────────────────── */}
                {activeTab === "churn" && (
                  <div className="space-y-4">
                    {/* Métriques modèle */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "AUC-ROC",
                          value: result.churn.auc_score,
                          good: 0.7,
                          info: "Qualité du modèle",
                        },
                        {
                          label: "Taux churn",
                          value: `${Math.round(result.churn.rate * 100)}%`,
                          good: null,
                          info: "% clients perdus",
                        },
                        {
                          label: "À risque élevé",
                          value: result.churn.high_risk_count,
                          good: null,
                          info: "Prob > 75%",
                        },
                      ].map(({ label, value, good, info }) => (
                        <div
                          key={label}
                          className="bg-gray-50 rounded-xl p-3 text-center"
                        >
                          <p
                            className={`text-xl font-bold ${
                              good && typeof value === "number" && value >= good
                                ? "text-green-600"
                                : "text-gray-800"
                            }`}
                          >
                            {value}
                          </p>
                          <p className="text-xs font-medium text-gray-600">
                            {label}
                          </p>
                          <p className="text-xs text-gray-400">{info}</p>
                        </div>
                      ))}
                    </div>

                    {/* Feature Importance */}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-3">
                        Facteurs prédictifs du churn
                      </p>
                      <div className="space-y-2">
                        {result.churn.feature_importance.map((fi) => (
                          <FeatureBar
                            key={fi.feature}
                            feature={fi.feature}
                            importance={fi.importance}
                            max={
                              result.churn.feature_importance[0]?.importance ||
                              1
                            }
                          />
                        ))}
                      </div>
                    </div>

                    {/* Clients à risque */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        Top clients à risque de départ
                      </p>
                      <div className="space-y-2">
                        {result.churn.at_risk_clients
                          .slice(0, 5)
                          .map((c: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-2.5 bg-red-50 rounded-xl border border-red-100"
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                  c.churn_probability >= 0.75
                                    ? "bg-red-500"
                                    : "bg-amber-400"
                                }`}
                              >
                                {Math.round(c.churn_probability * 100)}%
                              </div>
                              <div className="flex-1 text-xs">
                                <p className="font-medium text-gray-700">
                                  Client #{c.client_id}
                                </p>
                                <p className="text-gray-500">
                                  Inactif {c.recency} jours · {c.frequency}{" "}
                                  réservations
                                </p>
                              </div>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  c.churn_risk_level === "élevé"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {c.churn_risk_level}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Onglet Insights ───────────────────────── */}
                {activeTab === "insights" && result.insights && (
                  <div className="space-y-4">
                    {/* Executive summary */}
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-purple-700 mb-1">
                        📋 Synthèse Exécutive
                      </p>
                      <p className="text-sm text-purple-800 leading-relaxed">
                        {result.insights.executive_summary}
                      </p>
                    </div>

                    {/* Key finding */}
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                      <span className="text-lg shrink-0">🔑</span>
                      <div>
                        <p className="text-xs font-semibold text-amber-700 mb-1">
                          Découverte clé
                        </p>
                        <p className="text-xs text-amber-700">
                          {result.insights.key_finding}
                        </p>
                      </div>
                    </div>

                    {/* Stratégie churn */}
                    {result.insights.churn_strategy && (
                      <div
                        className={`border rounded-xl p-3 ${
                          urgencyColor[
                            result.insights.churn_strategy
                              .urgency as keyof typeof urgencyColor
                          ] || urgencyColor.moyen
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <p className="text-xs font-semibold">
                            Stratégie anti-churn — Urgence{" "}
                            {result.insights.churn_strategy.urgency}
                          </p>
                        </div>
                        <p className="text-xs mb-2">
                          Cause : {result.insights.churn_strategy.main_cause}
                        </p>
                        <div className="space-y-1">
                          {result.insights.churn_strategy.action_plan.map(
                            (a, i) => (
                              <p
                                key={i}
                                className="text-xs flex items-start gap-1"
                              >
                                <span className="font-bold shrink-0">
                                  {i + 1}.
                                </span>
                                {a}
                              </p>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stratégies par segment */}
                    {result.insights.segments_strategy?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          Stratégie par segment
                        </p>
                        <div className="space-y-2">
                          {result.insights.segments_strategy.map((s, i) => (
                            <div
                              key={i}
                              className="bg-gray-50 rounded-xl p-2.5"
                            >
                              <p className="text-xs font-semibold text-gray-800">
                                {s.segment}
                              </p>
                              <p className="text-xs text-gray-600">
                                {s.strategy}
                              </p>
                              <p className="text-xs text-green-600 font-medium mt-0.5">
                                ROI attendu : {s.expected_roi}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Plan 30 jours */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">
                        📅 Plan d'action — 30 prochains jours
                      </p>
                      <p className="text-xs text-blue-700">
                        {result.insights.next_30_days}
                      </p>
                    </div>

                    {/* KPIs à surveiller */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        📊 KPIs à surveiller
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.insights.kpi_to_track.map((kpi, i) => (
                          <span
                            key={i}
                            className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200"
                          >
                            {kpi}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Opportunité de croissance */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2">
                      <Target className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 mb-0.5">
                          Opportunité de croissance
                        </p>
                        <p className="text-xs text-emerald-700">
                          {result.insights.growth_opportunity}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
