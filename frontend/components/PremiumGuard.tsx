// components/PremiumGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Lock, ArrowRight } from "lucide-react";
import api from "@/lib/api";

interface PremiumGuardProps {
  children: React.ReactNode;
  featureKey: string; // 'demand_prediction', 'client_score', etc.
  fallbackPath?: string;
}

export default function PremiumGuard({
  children,
  featureKey,
  fallbackPath = "/owner/abonnement",
}: PremiumGuardProps) {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data } = await api.get("/ai-features");
        const feature = data.find((f: any) => f.feature_name === featureKey);
        setHasAccess(feature?.is_active === true);
      } catch (error) {
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [featureKey]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Fonctionnalité Premium
          </h2>
          <p className="text-gray-500 mb-6">
            Cette fonctionnalité nécessite un abonnement actif. Souscrivez pour
            y accéder et booster votre activité !
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(fallbackPath)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition"
            >
              Voir les abonnements <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.back()}
              className="block w-full text-sm text-gray-400 hover:text-gray-600"
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
