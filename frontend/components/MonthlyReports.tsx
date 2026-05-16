"use client";
import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Loader2,
  Calendar,
  Zap,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ChevronDown,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

interface Report {
  filename: string;
  year: string;
  month: string;
  size_kb: number;
  created: string;
}

const MONTHS_FR = [
  "",
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export default function MonthlyReports({
  ownerId,
  ownerName,
  isActive,
}: {
  ownerId: number;
  ownerName: string;
  isActive: boolean;
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Mois/année pour génération manuelle
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() || 12);
  const [selYear, setSelYear] = useState(
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
  );

  useEffect(() => {
    if (isActive) fetchReports();
  }, [isActive]);

  async function fetchReports() {
    setLoading(true);
    try {
      const { data } = await api.get<Report[]>(`/agent/report/list/${ownerId}`);
      setReports(data);
    } catch {
      setError("Impossible de charger les rapports.");
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem("token");
      const { data } = await api.post("/agent/report/generate", {
        owner_id: ownerId,
        owner_name: ownerName,
        month: selMonth,
        year: selYear,
        token,
      });
      setSuccess(`✅ Rapport ${MONTHS_FR[selMonth]} ${selYear} généré !`);
      fetchReports();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Erreur lors de la génération.");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadReport(filename: string) {
    setDownloading(filename);
    try {
      const resp = await api.get(`/agent/report/download/${filename}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError("Impossible de télécharger le rapport.");
    } finally {
      setDownloading(null);
    }
  }

  if (!isActive) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <Lock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="font-semibold text-gray-600 mb-1">
          Module Rapport Mensuel
        </p>
        <p className="text-sm text-gray-400 mb-4">
          Souscrivez au module Rapport Mensuel pour accéder aux rapports PDF
          automatiques.
        </p>
        <a
          href="/owner/abonnement"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600
                               text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <Zap className="w-4 h-4" /> Activer — 49 MAD/mois
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Générateur */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">
              Générer un rapport
            </h3>
            <p className="text-xs text-gray-400">
              PDF complet — KPIs, analyse clients, prédictions IA
            </p>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Mois</label>
            <select
              value={selMonth}
              onChange={(e) => setSelMonth(Number(e.target.value))}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2
                                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {MONTHS_FR.slice(1).map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Année</label>
            <select
              value={selYear}
              onChange={(e) => setSelYear(Number(e.target.value))}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2
                                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white
                                       rounded-xl text-sm font-semibold hover:bg-indigo-700 transition
                                       disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Génération…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Générer
                </>
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-green-700 bg-green-50
                                       border border-green-200 rounded-xl p-3"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              {success}
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-red-600 bg-red-50
                                       border border-red-200 rounded-xl p-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {generating && (
          <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
            <p className="text-xs text-indigo-700 font-medium mb-1">
              Génération en cours…
            </p>
            <div className="space-y-1 text-xs text-indigo-600">
              {[
                "📊 Collecte des données réservations",
                "👥 Analyse comportementale RFM",
                "🔮 Calcul des prédictions Prophet",
                "🤖 Synthèse IA (Groq LLM)",
                "📄 Génération du PDF ReportLab",
              ].map((step, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.8 }}
                >
                  {step}
                </motion.p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Liste des rapports */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-sm">
            Mes rapports ({reports.length})
          </h3>
          <button
            onClick={fetchReports}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun rapport généré pour le moment</p>
            <p className="text-xs">
              Cliquez sur "Générer" pour créer votre premier rapport
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div
                key={r.filename}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl
                                           border border-gray-100 hover:border-indigo-200 transition"
              >
                <div
                  className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center
                                                 justify-center shrink-0"
                >
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    Rapport {MONTHS_FR[parseInt(r.month)]} {r.year}
                  </p>
                  <p className="text-xs text-gray-400">
                    {r.size_kb} KB · Généré le {r.created}
                  </p>
                </div>
                <button
                  onClick={() => downloadReport(r.filename)}
                  disabled={downloading === r.filename}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600
                                               text-white rounded-xl text-xs font-medium
                                               hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {downloading === r.filename ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
