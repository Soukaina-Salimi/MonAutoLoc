"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Car,
  FileText,
  CreditCard,
  MessageCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  BarChart3,
  Megaphone,
  Settings,
  LogOut,
  Shield,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import Link from "next/link";

interface Stats {
  total_users: number;
  total_owners: number;
  total_clients: number;
  new_users_this_month: number;
  total_vehicules: number;
  total_bookings: number;
  pending_documents: number;
  verified_documents: number;
  active_subscriptions: number;
  pending_subscriptions: number;
  pending_requests: number;
  pending_customizations: number;
  total_chat_messages: number;
  chat_cache_rate: number;
  total_campaigns: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role?.name !== "admin") {
      router.push("/");
      return;
    }
    setAdmin(user);
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const { data } = await api.get("/admin/stats");
      setStats(data);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.clear();
    router.push("/login");
  }

  const STAT_CARDS = [
    {
      label: "Utilisateurs totaux",
      value: stats?.total_users,
      sub: `${stats?.total_owners} owners · ${stats?.total_clients} clients`,
      icon: Users,
      color: "from-blue-500 to-blue-700",
      href: "/admin/users",
    },
    {
      label: "Documents en attente",
      value: stats?.pending_documents,
      sub: `${stats?.verified_documents} vérifiés`,
      icon: FileText,
      color: "from-amber-500 to-orange-600",
      href: "/admin/documents",
      alert: (stats?.pending_documents ?? 0) > 0,
    },
    {
      label: "Abonnements Premium",
      value: stats?.active_subscriptions,
      sub: `${stats?.pending_subscriptions} en attente`,
      icon: CreditCard,
      color: "from-purple-500 to-purple-700",
      href: "/admin/subscriptions",
      alert: (stats?.pending_subscriptions ?? 0) > 0,
    },
    {
      label: "Véhicules",
      value: stats?.total_vehicules,
      sub: `${stats?.total_bookings} réservations`,
      icon: Car,
      color: "from-teal-500 to-teal-700",
      href: "/admin/users",
    },
    {
      label: "Messages chatbot (aujourd'hui)",
      value: stats?.total_chat_messages,
      sub: `${stats?.chat_cache_rate}% depuis cache`,
      icon: MessageCircle,
      color: "from-indigo-500 to-indigo-700",
      href: "/admin/analytics",
    },
    {
      label: "Customisations",
      value: stats?.pending_customizations,
      sub: "en attente de validation",
      icon: Settings,
      color: "from-rose-500 to-rose-700",
      href: "/admin/customizations",
      alert: (stats?.pending_customizations ?? 0) > 0,
    },
    {
      label: "Demandes services",
      value: stats?.pending_requests,
      sub: "en attente",
      icon: Clock,
      color: "from-green-500 to-green-700",
      href: "/admin/users",
    },
    {
      label: "Campagnes publiées",
      value: stats?.total_campaigns,
      sub: "sur les réseaux sociaux",
      icon: Megaphone,
      color: "from-pink-500 to-pink-700",
      href: "/admin/campaigns",
    },
  ];

  const QUICK_LINKS = [
    {
      label: "Valider des documents",
      href: "/admin/documents",
      icon: FileText,
      color: "text-amber-600  bg-amber-50",
    },
    {
      label: "Gérer les abonnements",
      href: "/admin/subscriptions",
      icon: CreditCard,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Valider les custom.",
      href: "/admin/customizations",
      icon: Settings,
      color: "text-rose-600   bg-rose-50",
    },
    {
      label: "Analytics chatbot",
      href: "/admin/analytics",
      icon: BarChart3,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Gérer les utilisateurs",
      href: "/admin/users",
      icon: Users,
      color: "text-blue-600   bg-blue-50",
    },
    {
      label: "Campagnes marketing",
      href: "/admin/campaigns",
      icon: Megaphone,
      color: "text-pink-600   bg-pink-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm leading-none">
                AutoRent Admin
              </p>
              <p className="text-xs text-gray-400">Panel d'administration</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{admin?.name}</span>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-500 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alertes */}
        {((stats?.pending_documents ?? 0) > 0 ||
          (stats?.pending_subscriptions ?? 0) > 0) && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800 text-sm">
                Actions requises
              </p>
              <div className="flex flex-wrap gap-3 mt-1">
                {(stats?.pending_documents ?? 0) > 0 && (
                  <Link
                    href="/admin/documents"
                    className="text-xs text-amber-700 hover:underline"
                  >
                    {stats?.pending_documents} document(s) à vérifier →
                  </Link>
                )}
                {(stats?.pending_subscriptions ?? 0) > 0 && (
                  <Link
                    href="/admin/subscriptions"
                    className="text-xs text-amber-700 hover:underline"
                  >
                    {stats?.pending_subscriptions} abonnement(s) en attente →
                  </Link>
                )}
                {(stats?.pending_customizations ?? 0) > 0 && (
                  <Link
                    href="/admin/customizations"
                    className="text-xs text-amber-700 hover:underline"
                  >
                    {stats?.pending_customizations} customisation(s) à valider →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={card.href}
                  className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition relative overflow-hidden"
                >
                  {card.alert && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                  <div
                    className={`w-10 h-10 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center mb-3`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    {loading ? "—" : (card.value ?? 0)}
                  </p>
                  <p className="text-xs font-medium text-gray-600 mt-0.5">
                    {card.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-800 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {QUICK_LINKS.map(({ label, href, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition border border-gray-100"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {label}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
