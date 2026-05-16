"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Menu,
  Bell,
  TrendingUp,
  Calendar,
  BarChart3,
  Zap,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Brain,
  Sparkles,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import DemandPrediction from "@/components/DemandPrediction";
import PremiumGuard from "@/components/PremiumGuard";

interface UserOwner {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: { name: string };
  owner_services: { service_type: string; is_active: boolean }[];
  is_agency: boolean;
  agency_name: string | null;
}

export default function DemandPredictionPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserOwner | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [greeting, setGreeting] = useState("Bonjour");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Salutation selon l'heure
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Bonjour");
    else if (h < 18) setGreeting("Bon après-midi");
    else setGreeting("Bonsoir");
  }, []);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.replace("/login");
      return;
    }
    try {
      const parsed: UserOwner = JSON.parse(userData);
      if (parsed.role.name !== "owner") {
        router.replace("/");
        return;
      }
      setUser(parsed);
      setIsChecking(false);
    } catch {
      localStorage.clear();
      router.replace("/login");
    }
  }, []);

  // Rafraîchir l'heure de dernière mise à jour
  const handleRefresh = () => {
    setLastRefresh(new Date());
    // Forcer le rechargement du composant enfant via une clé
    // On peut aussi utiliser un state pour trigger
  };

  if (isChecking) return null;

  const displayName = user?.is_agency
    ? (user.agency_name ?? user.name)
    : (user?.name ?? "");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        user={user || undefined}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentPath="/owner/demand-prediction"
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link
                href="/owner/dashboard"
                className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">Retour</span>
              </Link>
              <div className="h-6 w-px bg-gray-200 hidden sm:block" />
              <div>
                <p className="text-xs text-gray-400 font-medium">
                  {greeting} 👋
                </p>
                <h1 className="text-lg font-bold text-gray-800 leading-tight">
                  Prédiction de Demande
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                <RefreshCw className="w-3 h-3" />
                <span>
                  Dernière MAJ: {lastRefresh.toLocaleTimeString("fr-FR")}
                </span>
              </div>
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition">
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* Bannière d'information IA */}
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">IA Prédictive Avancée</h2>
                  <p className="text-blue-100 text-sm mt-0.5">
                    Modèle Prophet (Meta) + LLM Groq pour des prévisions
                    précises
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="text-sm font-medium">Premium IA</span>
              </div>
            </div>
          </div>
          <PremiumGuard featureKey="demand_prediction">
            <DemandPrediction
              defaultCity="Casablanca"
              defaultCategory="berline"
              ownerId={user?.id}
            />
          </PremiumGuard>
          {/* Composant de prédiction */}

          {/* Section d'aide / conseils */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">
                Pourquoi prédire la demande ?
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Anticipez les pics d'activité pour optimiser votre flotte et
                maximiser vos revenus.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center mb-3">
                <Zap className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">
                Pricing dynamique
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Ajustez vos prix selon la demande prévue pour rester compétitif.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center mb-3">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">
                Planification
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Organisez la maintenance pendant les périodes de faible demande.
              </p>
            </div>
          </div>

          {/* Lien vers les autres outils */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-blue-500 rounded-full" />
                <p className="text-sm text-gray-500">
                  Besoin d'analyser vos performances ?
                </p>
              </div>
              <Link
                href="/owner/dashboard"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
              >
                Retour au tableau de bord
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
