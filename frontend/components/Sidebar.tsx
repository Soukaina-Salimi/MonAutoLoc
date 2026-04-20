// components/Sidebar.tsx
"use client";

import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Car,
  Sparkles,
  PlusCircle,
  Package,
  Settings,
  User,
  LogOut,
  Bell,
  Menu,
  X,
} from "lucide-react";

interface SidebarProps {
  user?: {
    name?: string;
    role?: { name: string };
  };
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  currentPath?: string;
  stats?: {
    pending?: number;
  };
}

const ownerNavItems = [
  {
    label: "Tableau de bord",
    icon: LayoutDashboard,
    path: "/owner/dashboard",
    badge: false,
  },
  { label: "Mes véhicules", icon: Car, path: "/owner/vehicules", badge: false },
  {
    label: "Ajouter véhicule",
    icon: PlusCircle,
    path: "/owner/add-vehicule",
    badge: false,
  },
  {
    label: "Réservations",
    icon: Package,
    path: "/owner/services",
    badge: "pending",
  },
  { label: "Personnalisations", icon: Sparkles, path: "/owner/customizations" },
  { label: "Mon profil", icon: Settings, path: "/owner/profile", badge: false },
];

const clientNavItems = [
  {
    label: "Tableau de bord",
    icon: LayoutDashboard,
    path: "/client/dashboard",
    badge: false,
  },
  {
    label: "Mes véhicules",
    icon: Car,
    path: "/client/vehicules",
    badge: false,
  },
  {
    label: "Réservations",
    icon: Package,
    path: "/client/services",
    badge: false,
  },
  {
    label: "Mon profil",
    icon: Settings,
    path: "/client/profile",
    badge: false,
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
  const isOwner = user?.role?.name === "owner";
  const navItems = isOwner ? ownerNavItems : clientNavItems;

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

  return (
    <>
      {/* Sidebar pour desktop */}
      <div
        className={`
                fixed inset-y-0 left-0 transform 
                ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
                lg:relative lg:translate-x-0 transition duration-200 ease-in-out
                w-64 bg-white shadow-lg z-30
            `}
      >
        <div className="h-full flex flex-col">
          {/* Profile Section */}
          <div className="p-6 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 truncate">
                  {user?.name || "Utilisateur"}
                </h3>
                <p className="text-sm text-gray-500">
                  {isOwner ? "Propriétaire" : "Client"}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                                        ${
                                          currentPath === item.path
                                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"
                                        }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`w-5 h-5 ${currentPath === item.path ? "text-white" : ""}`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && stats[item.badge as keyof typeof stats] && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium
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
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
}
