"use client";
import { useState, useEffect } from "react";
import { Settings, CheckCircle, XCircle, ChevronLeft } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";

export default function AdminCustomizations() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [notes, setNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchItems();
  }, [filter]);

  async function fetchItems() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/customizations", {
        params: { status: filter },
      });
      setItems(data.data);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: number, status: "approved" | "rejected") {
    await api.patch(`/admin/customizations/${id}`, {
      status,
      admin_notes: notes[id] || null,
    });
    fetchItems();
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
        <Settings className="w-5 h-5 text-rose-600" />
        <h1 className="font-bold text-gray-800">
          Validation des customisations
        </h1>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          {["pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === s
                  ? "bg-rose-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {s === "pending"
                ? "En attente"
                : s === "approved"
                  ? "Approuvées"
                  : "Rejetées"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Chargement…</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Settings className="w-10 h-10 mx-auto mb-2 opacity-30" />
              Aucune customisation
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-800">
                        {item.owner.name}
                      </p>
                      <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
                        {item.service_type}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {item.customization_type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {item.owner.email} · {item.created_at}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      item.status === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : item.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {item.details && (
                  <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs text-gray-600">
                    <pre className="whitespace-pre-wrap font-mono">
                      {JSON.stringify(item.details, null, 2)}
                    </pre>
                  </div>
                )}

                {item.payment_required && (
                  <div className="flex items-center gap-2 mb-3 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                    💰 Paiement requis : {item.payment_amount} MAD — Statut:{" "}
                    {item.payment_status}
                  </div>
                )}

                {item.status === "pending" && (
                  <div className="space-y-2">
                    <textarea
                      value={notes[item.id] || ""}
                      onChange={(e) =>
                        setNotes((p) => ({ ...p, [item.id]: e.target.value }))
                      }
                      placeholder="Note admin (optionnel)…"
                      rows={2}
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(item.id, "approved")}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition"
                      >
                        <CheckCircle className="w-4 h-4" /> Approuver
                      </button>
                      <button
                        onClick={() => updateStatus(item.id, "rejected")}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition"
                      >
                        <XCircle className="w-4 h-4" /> Rejeter
                      </button>
                    </div>
                  </div>
                )}

                {item.admin_notes && (
                  <div className="mt-2 text-xs text-gray-500 italic bg-gray-50 px-3 py-2 rounded-lg">
                    Note: {item.admin_notes}
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
