"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Filter,
  RefreshCw,
  DollarSign,
  MessageSquare,
  AlertCircle,
  Sparkles,
  Users,
  TrendingUp,
  Bot,
  MapPin,
  Plus,
  Package,
  Luggage,
  Truck,
  Car,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customization {
  id: number;
  service_type: string;
  customization_type: string;
  label: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  payment_required: boolean;
  payment_amount: number | null;
  payment_status: string | null;
  created_at: string;
  owner: { id: number; name: string; email: string } | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending: {
    label: "En attente",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    icon: Clock,
  },
  approved: {
    label: "Approuvée",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: CheckCircle,
  },
  rejected: {
    label: "Refusée",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: XCircle,
  },
};

const FILTER_OPTIONS = [
  { key: "all", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "approved", label: "Approuvées" },
  { key: "rejected", label: "Refusées" },
] as const;

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function AdminDetailModal({
  c,
  onClose,
  onDecision,
}: {
  c: Customization;
  onClose: () => void;
  onDecision: (
    id: number,
    status: "approved" | "rejected",
    notes: string,
    paymentRequired: boolean,
    paymentAmount: number | null,
  ) => Promise<void>;
}) {
  const [notes, setNotes] = useState(c.admin_notes ?? "");
  const [paymentRequired, setPaymentRequired] = useState(c.payment_required);
  const [paymentAmount, setPaymentAmount] = useState<string>(
    c.payment_amount?.toString() ?? "",
  );
  const [loading, setLoading] = useState(false);

  async function decide(status: "approved" | "rejected") {
    setLoading(true);
    await onDecision(
      c.id,
      status,
      notes,
      paymentRequired,
      paymentRequired && paymentAmount ? Number(paymentAmount) : null,
    );
    setLoading(false);
    onClose();
  }

  const st = STATUS_CFG[c.status];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">Demande #{c.id}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Statut actuel */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${st.bg} ${st.text}`}
          >
            <st.icon className="w-3.5 h-3.5" /> {st.label}
          </span>

          {/* Owner */}
          {c.owner && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Propriétaire</p>
              <p className="font-semibold text-gray-800">{c.owner.name}</p>
              <p className="text-sm text-gray-500">{c.owner.email}</p>
            </div>
          )}

          {/* Détails demande */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Service</p>
                <p className="font-medium text-sm text-gray-800">
                  {c.service_type}
                </p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Personnalisation</p>
                <p className="font-medium text-sm text-gray-800">{c.label}</p>
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-blue-500 mb-1">Description</p>
              <p className="text-sm text-gray-700">{c.description}</p>
            </div>
          </div>

          {/* Seulement si encore pending */}
          {c.status === "pending" && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              {/* Notes admin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                  Note pour l'owner (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Explication, conditions, instructions..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Paiement requis */}
              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Paiement requis
                    </p>
                    <p className="text-xs text-gray-500">
                      Demander un paiement avant activation
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPaymentRequired((v) => !v)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${paymentRequired ? "bg-amber-500" : "bg-gray-200"}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${paymentRequired ? "translate-x-5" : "translate-x-1"}`}
                  />
                </button>
              </div>

              {paymentRequired && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant (MAD)
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Ex: 500"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Boutons décision */}
              <div className="flex gap-3">
                <button
                  onClick={() => decide("approved")}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 transition disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" /> Approuver
                </button>
                <button
                  onClick={() => decide("rejected")}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Refuser
                </button>
              </div>
            </div>
          )}

          {/* Si déjà traité */}
          {c.status !== "pending" && c.admin_notes && (
            <div
              className={`p-3 rounded-xl text-sm ${c.status === "approved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
            >
              <p className="font-semibold mb-1">Note admin :</p>
              <p>{c.admin_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCustomizationsPage() {
  const router = useRouter();
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [selected, setSelected] = useState<Customization | null>(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) {
      router.replace("/login");
      return;
    }
    try {
      const parsed = JSON.parse(u);
      if (parsed.role.name !== "admin") {
        router.replace("/");
        return;
      }
    } catch {
      router.replace("/login");
      return;
    }
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/customizations?status=${filter}`);
      setCustomizations(data);
    } catch {
      setCustomizations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, [filter]);

  async function handleDecision(
    id: number,
    status: "approved" | "rejected",
    notes: string,
    paymentRequired: boolean,
    paymentAmount: number | null,
  ) {
    try {
      await api.patch(`/admin/customizations/${id}`, {
        status,
        admin_notes: notes || null,
        payment_required: paymentRequired,
        payment_amount: paymentAmount,
      });
      setCustomizations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status, admin_notes: notes || null } : c,
        ),
      );
    } catch {
      alert("Erreur lors de la mise à jour.");
    }
  }

  const pending = customizations.filter((c) => c.status === "pending").length;
  const filtered = customizations.filter(
    (c) => filter === "all" || c.status === filter,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header admin */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Personnalisations des services
            </h1>
            <p className="text-xs text-gray-400">
              Demandes d'owners — valider ou refuser
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pending > 0 && (
              <span className="flex items-center gap-1.5 bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-full text-sm font-medium">
                <Clock className="w-3.5 h-3.5" /> {pending} en attente
              </span>
            )}
            <button
              onClick={fetchAll}
              className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-500"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            {
              label: "En attente",
              val: customizations.filter((c) => c.status === "pending").length,
              color: "border-yellow-400 bg-yellow-50 text-yellow-700",
            },
            {
              label: "Approuvées",
              val: customizations.filter((c) => c.status === "approved").length,
              color: "border-green-400 bg-green-50 text-green-700",
            },
            {
              label: "Refusées",
              val: customizations.filter((c) => c.status === "rejected").length,
              color: "border-red-400 bg-red-50 text-red-700",
            },
          ].map(({ label, val, color }) => (
            <div
              key={label}
              className={`rounded-xl border ${color} p-4 text-center`}
            >
              <p className="text-2xl font-bold text-gray-800">{val}</p>
              <p className="text-xs font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {FILTER_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                filter === key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {label}
              {key === "pending" && pending > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-white rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
            <Sparkles className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">
              Aucune demande {filter !== "all" ? `"${filter}"` : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const st = STATUS_CFG[c.status];
              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer"
                  onClick={() => setSelected(c)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-800 text-sm">
                          {c.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}
                        >
                          <st.icon className="w-3 h-3" /> {st.label}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {c.service_type}
                        </span>
                        {c.status === "pending" && (
                          <span className="text-xs text-orange-500 font-medium animate-pulse">
                            Action requise
                          </span>
                        )}
                      </div>
                      {c.owner && (
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">{c.owner.name}</span>
                          <span className="text-gray-400 ml-1">
                            · {c.owner.email}
                          </span>
                        </p>
                      )}
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {c.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {c.created_at}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition">
                        <Eye className="w-3.5 h-3.5" /> Détails
                      </button>
                      {c.status === "pending" && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDecision(c.id, "approved", "", false, null);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approuver
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(c);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Refuser
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal détail */}
      {selected && (
        <AdminDetailModal
          c={selected}
          onClose={() => setSelected(null)}
          onDecision={handleDecision}
        />
      )}
    </div>
  );
}
