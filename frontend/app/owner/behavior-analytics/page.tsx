// app/owner/behavior-analytics/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Brain, TrendingUp, Users, Loader2 } from "lucide-react";
import api from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import BehaviorAnalytics from "@/components/BehaviorAnalytics";
import PremiumGuard from "@/components/PremiumGuard";

interface User {
  id: number;
  name: string;
  email: string;
  role: { id: number; name: string };
}

export default function BehaviorAnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const currentPath = "/owner/behavior-analytics";

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-gray-500">Chargement...</p>
        </div>
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
      <div className="flex-1">
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
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">
                    Analyse Comportementale
                  </h1>
                  <p className="text-sm text-gray-500">
                    RFM · Segmentation · Prédiction Churn · Insights IA
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Carte d'introduction */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 mb-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold mb-2">
                    Comprendre vos clients pour mieux les fidéliser
                  </h2>
                  <p className="text-purple-100 text-sm max-w-md">
                    Découvrez les segments de votre clientèle, identifiez les
                    clients à risque de départ et obtenez des recommandations
                    personnalisées par l'IA.
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-purple-300 opacity-50" />
              </div>

              {/* Stats rapides */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-purple-500/30">
                <div>
                  <p className="text-2xl font-bold">RFM</p>
                  <p className="text-xs text-purple-200">
                    Segmentation avancée
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">K-Means</p>
                  <p className="text-xs text-purple-200">Clustering client</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">ML</p>
                  <p className="text-xs text-purple-200">Prédiction churn</p>
                </div>
              </div>
            </div>

            {/* Composant d'analyse comportementale */}
            <PremiumGuard featureKey="client_score">
              <BehaviorAnalytics ownerId={user.id} />
            </PremiumGuard>
          </div>
        </main>
      </div>
    </div>
  );
}
