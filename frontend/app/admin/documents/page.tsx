"use client";
import { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  ChevronLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const DOC_LABELS: Record<string, string> = {
  cin: "CIN Recto",
  cin_verso: "CIN Verso",
  permis: "Permis Recto",
  permis_verso: "Permis Verso",
  carte_grise: "Carte Grise Recto",
  carte_grise_verso: "Carte Grise Verso",
};

export default function AdminDocuments() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchDocs();
  }, [filter, page]);

  async function fetchDocs() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/documents", {
        params: { status: filter, page },
      });
      setDocs(data.data);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  async function verify(id: number) {
    await api.patch(`/admin/documents/${id}/verify`);
    fetchDocs();
    setSelected(null);
  }

  async function reject(id: number) {
    await api.patch(`/admin/documents/${id}/reject`);
    fetchDocs();
    setSelected(null);
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
        <h1 className="font-bold text-gray-800">Validation des documents</h1>
        <span className="ml-auto text-sm text-gray-500">
          {total} document(s)
        </span>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filtres */}
        <div className="flex gap-2 mb-6">
          {["pending", "verified", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setFilter(s);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === s
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s === "pending"
                ? "En attente"
                : s === "verified"
                  ? "Vérifiés"
                  : "Rejetés"}
            </button>
          ))}
        </div>

        {/* Liste */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Chargement…</div>
          ) : docs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              Aucun document {filter === "pending" ? "en attente" : filter}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[
                    "Utilisateur",
                    "Type",
                    "Données extraites",
                    "Date",
                    "Statut",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">
                        {doc.user.name}
                      </p>
                      <p className="text-xs text-gray-400">{doc.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">
                        {DOC_LABELS[doc.type] || doc.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {doc.extracted_data ? (
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {Object.entries(doc.extracted_data)
                            .filter(([, v]) => v)
                            .slice(0, 3)
                            .map(([k, v]) => (
                              <p key={k}>
                                <span className="text-gray-400">{k}: </span>
                                {String(v)}
                              </p>
                            ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Non extrait
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {doc.created_at}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[doc.status]}`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {doc.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => verify(doc.id)}
                            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => reject(doc.id)}
                            className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50"
            >
              Précédent
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={docs.length < 20}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
