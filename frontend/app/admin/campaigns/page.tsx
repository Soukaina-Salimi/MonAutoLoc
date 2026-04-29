"use client";
import { useState, useEffect } from "react";
import {
  Megaphone,
  ExternalLink,
  ChevronLeft,
  Facebook,
  Instagram,
} from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";

const PLATFORM_ICONS: Record<string, any> = {
  facebook: { icon: Facebook, color: "text-blue-600 bg-blue-50" },
  instagram: { icon: Instagram, color: "text-pink-600 bg-pink-50" },
  tiktok: { icon: Megaphone, color: "text-gray-800 bg-gray-100" },
};

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/campaigns");
      setCampaigns(data.data);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
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
        <Megaphone className="w-5 h-5 text-pink-600" />
        <h1 className="font-bold text-gray-800">Campagnes marketing</h1>
        <span className="ml-auto text-sm text-gray-500">
          {total} campagne(s)
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Chargement…</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
              Aucune campagne publiée
            </div>
          ) : (
            campaigns.map((c) => {
              const platform =
                PLATFORM_ICONS[c.platform] || PLATFORM_ICONS.tiktok;
              const Icon = platform.icon;
              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${platform.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-800 text-sm">
                        {c.owner.name}
                      </p>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500 capitalize">
                        {c.platform}
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-auto">
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {c.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.created_at}
                    </p>
                  </div>
                  {c.post_url && (
                    <a
                      href={c.post_url}
                      target="_blank"
                      className="shrink-0 text-blue-600 hover:text-blue-700 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
