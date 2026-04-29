"use client";
import { useState, useEffect } from "react";
import { CreditCard, CheckCircle, XCircle, ChevronLeft } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-600",
};

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchSubs();
  }, [filter]);

  async function fetchSubs() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/subscriptions", {
        params: { status: filter },
      });
      setSubs(data.data);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  async function activate(id: number) {
    await api.patch(`/admin/subscriptions/${id}/activate`);
    fetchSubs();
  }

  async function reject(id: number) {
    if (!confirm("Rejeter cet abonnement ?")) return;
    await api.patch(`/admin/subscriptions/${id}/reject`);
    fetchSubs();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link
          href="/admin/dashboard"
          className="text-gray-400 hover:text-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <CreditCard className="w-5 h-5 text-purple-600" />
        <h1 className="font-bold text-gray-800">Gestion des abonnements</h1>
        <span className="ml-auto text-sm text-gray-500">
          {total} abonnement(s)
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Filtres */}
        <div className="flex gap-2 mb-6">
          {["pending", "active", "cancelled", "expired"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === s
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s === "pending"
                ? "En attente"
                : s === "active"
                  ? "Actifs"
                  : s === "cancelled"
                    ? "Annulés"
                    : "Expirés"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Chargement…</div>
          ) : subs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
              Aucun abonnement
            </div>
          ) : (
            subs.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-800">
                      {sub.owner.name}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[sub.status]}`}
                    >
                      {sub.status}
                    </span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-auto">
                      {sub.plan}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{sub.owner.email}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    {sub.payment_amount && (
                      <span>💰 {sub.payment_amount} MAD</span>
                    )}
                    <span>📅 {sub.created_at}</span>
                    {sub.expires_at && <span>⏰ Expire: {sub.expires_at}</span>}
                  </div>
                </div>

                {sub.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => activate(sub.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition"
                    >
                      <CheckCircle className="w-4 h-4" /> Activer
                    </button>
                    <button
                      onClick={() => reject(sub.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition"
                    >
                      <XCircle className="w-4 h-4" /> Rejeter
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
