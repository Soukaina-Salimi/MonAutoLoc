// app/owner/reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Calendar, Loader2 } from "lucide-react";
import api from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import MonthlyReports from "@/components/MonthlyReports";

interface User {
  id: number;
  name: string;
  email: string;
  role: { id: number; name: string };
}

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasMonthlyReport, setHasMonthlyReport] = useState(false);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const currentPath = "/owner/reports";

  useEffect(() => {
    const userData = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!userData || !token) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser: User = JSON.parse(userData);
      if (parsedUser.role.name !== "owner") {
        router.push("/dashboard");
        return;
      }
      setUser(parsedUser);
    } catch (error) {
      console.error("Error parsing user:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Vérifier si l'owner a le module Rapport Mensuel
  useEffect(() => {
    const checkFeatureAccess = async () => {
      if (!user?.id) return;

      try {
        const { data } = await api.get("/ai-features");
        const monthlyReportFeature = data.find(
          (f: any) => f.feature_name === "monthly_report",
        );
        setHasMonthlyReport(monthlyReportFeature?.is_active === true);
      } catch (error) {
        console.error("Erreur chargement features:", error);
        setHasMonthlyReport(false);
      } finally {
        setLoadingFeatures(false);
      }
    };

    checkFeatureAccess();
  }, [user?.id]);

  if (loading || loadingFeatures) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        user={user}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentPath={currentPath}
      />

      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">
                    Rapports Mensuels
                  </h1>
                  <p className="text-sm text-gray-500">
                    Rapports PDF générés par IA avec KPIs, analyses et
                    prédictions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            {/* Carte d'introduction */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold mb-2">
                    Rapports mensuels intelligents
                  </h2>
                  <p className="text-indigo-100 text-sm max-w-md">
                    Recevez un rapport PDF complet chaque mois avec : analyses
                    financières, comportement clients, prédictions de demande et
                    recommandations IA.
                  </p>
                </div>
                <FileText className="w-12 h-12 text-indigo-300 opacity-50" />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-indigo-500/30">
                <div>
                  <p className="text-2xl font-bold">📊 KPIs</p>
                  <p className="text-xs text-indigo-200">
                    Revenus, occupation, notes
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">👥 RFM</p>
                  <p className="text-xs text-indigo-200">
                    Segmentation clients
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">🔮 IA</p>
                  <p className="text-xs text-indigo-200">
                    Prédictions + insights
                  </p>
                </div>
              </div>
            </div>

            {/* Composant des rapports */}
            <MonthlyReports
              ownerId={user.id}
              ownerName={user.name}
              isActive={hasMonthlyReport}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
