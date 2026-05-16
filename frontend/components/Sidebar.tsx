// components/Sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Sparkles,
  PlusCircle,
  Package,
  Settings,
  LogOut,
  Brain,
  Crown,
  FileText,
} from "lucide-react";
import api from "@/lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  role: { name: string };
}

interface SidebarProps {
  user?: User | null;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  currentPath?: string;
  stats?: {
    pending?: number;
  };
}

// Navigation items de base (toujours visibles)
const baseNavItems = [
  {
    label: "Tableau de bord",
    icon: LayoutDashboard,
    path: "/owner/dashboard",
    badge: false,
    isPremium: false,
  },
  {
    label: "Mes véhicules",
    icon: Car,
    path: "/owner/vehicules",
    badge: false,
    isPremium: false,
  },
  {
    label: "Ajouter véhicule",
    icon: PlusCircle,
    path: "/owner/add-vehicule",
    badge: false,
    isPremium: false,
  },
  {
    label: "Réservations",
    icon: Package,
    path: "/owner/services",
    badge: "pending",
    isPremium: false,
  },
  {
    label: "Abonnement",
    icon: Crown,
    path: "/owner/abonnement",
    badge: false,
    isPremium: false,
  },

  {
    label: "Mon profil",
    icon: Settings,
    path: "/owner/profile",
    badge: false,
    isPremium: false,
  },
];

// Navigation items premium (abonnement requis)
const premiumNavItems = [
  {
    label: "Prédiction IA",
    icon: Brain,
    path: "/owner/demand-prediction",
    badge: false,
    isPremium: true,
    featureKey: "demand_prediction",
  },
  {
    label: "Analyse Client",
    icon: Brain,
    path: "/owner/behavior-analytics",
    badge: false,
    isPremium: true,
    featureKey: "client_score",
  },
  {
    label: "Rapports Mensuels",
    icon: FileText,
    path: "/owner/reports",
    badge: false,
    isPremium: true,
    featureKey: "monthly_report",
  },
];

export default function Sidebar({
  user,
  isSidebarOpen,
  setIsSidebarOpen,
  currentPath = "",
  stats = {},
}: SidebarProps) {
  const router = useRouter();
  const [premiumFeatures, setPremiumFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Récupérer les fonctionnalités premium actives de l'owner
  useEffect(() => {
    const fetchPremiumFeatures = async () => {
      if (!user?.id) return;

      try {
        const { data } = await api.get("/ai-features");
        // Filtrer les features actives
        const activeFeatures = data
          .filter((f: any) => f.is_active)
          .map((f: any) => f.feature_name);
        setPremiumFeatures(activeFeatures);
      } catch (error) {
        console.error("Erreur chargement features premium:", error);
        setPremiumFeatures([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPremiumFeatures();
  }, [user?.id]);

  // Filtrer les items premium selon les abonnements actifs
  const visiblePremiumItems = premiumNavItems.filter((item) => {
    // Si la feature est active, on affiche
    return premiumFeatures.includes(item.featureKey);
  });

  // Construire la navigation finale
  const navItems = [...baseNavItems, ...visiblePremiumItems];

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
    setIsSidebarOpen(false);
  };

  // Pendant le chargement, afficher seulement les items de base
  const displayNavItems = loading ? baseNavItems : navItems;

  return (
    <>
      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:translate-x-0
          w-64 bg-white shadow-xl
          flex flex-col
        `}
      >
        {/* Profile Section */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-800 truncate text-sm">
                {user?.name || "Utilisateur"}
              </h3>
              <p className="text-xs text-gray-500">Propriétaire</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {displayNavItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${
                    currentPath === item.path
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`w-4 h-4 ${currentPath === item.path ? "text-white" : ""}`}
                  />
                  <span>{item.label}</span>
                  {item.isPremium && (
                    <span className="text-[9px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-bold">
                      PREMIUM
                    </span>
                  )}
                </div>
                {item.badge && stats[item.badge as keyof typeof stats] && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium
                    ${
                      currentPath === item.path
                        ? "bg-white text-blue-600"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {stats[item.badge as keyof typeof stats]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Footer avec déconnexion */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
}
