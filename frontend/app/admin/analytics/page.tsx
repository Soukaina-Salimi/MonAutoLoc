"use client";
import { useState, useEffect } from "react";
import {
  BarChart3,
  ChevronLeft,
  MessageCircle,
  Zap,
  Clock,
  ThumbsUp,
} from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/chat-analytics", {
        params: { days },
      });
      setData(data);
    } finally {
      setLoading(false);
    }
  }

  const INTENT_COLORS: Record<string, string> = {
    search_vehicle: "bg-blue-500",
    search_service: "bg-teal-500",
    check_availability: "bg-purple-500",
    get_price: "bg-amber-500",
    general_info: "bg-gray-400",
    greeting: "bg-pink-400",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link
          href="/admin/dashboard"
          className="text-gray-400 hover:text-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <BarChart3 className="w-5 h-5 text-indigo-600" />
        <h1 className="font-bold text-gray-800">Analytics Chatbot</h1>

        <div className="ml-auto flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                days === d
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              {d}j
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Chargement…</div>
        ) : (
          data && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {[
                  {
                    label: "Messages",
                    value: data.total_messages,
                    icon: MessageCircle,
                    color: "text-blue-600",
                  },
                  {
                    label: "Sessions",
                    value: data.unique_sessions,
                    icon: BarChart3,
                    color: "text-teal-600",
                  },
                  {
                    label: "Taux cache",
                    value: `${data.cache_rate}%`,
                    icon: Zap,
                    color: "text-amber-600",
                  },
                  {
                    label: "Temps moyen",
                    value: `${data.avg_response_ms}ms`,
                    icon: Clock,
                    color: "text-purple-600",
                  },
                  {
                    label: "Satisfaction",
                    value: data.satisfaction ? `${data.satisfaction}%` : "N/A",
                    icon: ThumbsUp,
                    color: "text-green-600",
                  },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div
                    key={label}
                    className="bg-white rounded-2xl border border-gray-100 p-4 text-center"
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                    <p className="text-2xl font-bold text-gray-800">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Top intents */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">
                    Intentions les plus fréquentes
                  </h3>
                  <div className="space-y-2">
                    {data.top_intents?.map((item: any) => {
                      const max = data.top_intents[0]?.count || 1;
                      const pct = Math.round((item.count / max) * 100);
                      const color = INTENT_COLORS[item.intent] || "bg-gray-400";
                      return (
                        <div key={item.intent}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">{item.intent}</span>
                            <span className="text-gray-500 font-medium">
                              {item.count}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${color} rounded-full transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Messages par jour */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">
                    Messages par jour
                  </h3>
                  <div className="space-y-2">
                    {data.messages_per_day?.map((day: any) => {
                      const max = Math.max(
                        ...data.messages_per_day.map((d: any) => d.count),
                      );
                      const pct = Math.round((day.count / max) * 100);
                      return (
                        <div key={day.date} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-20 shrink-0">
                            {new Date(day.date).toLocaleDateString("fr-FR", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 w-8 text-right">
                            {day.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pages les plus actives */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">
                    Pages les plus actives
                  </h3>
                  <div className="space-y-2">
                    {data.top_pages?.map((p: any) => (
                      <div
                        key={p.page_context}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-600 capitalize">
                          {p.page_context || "général"}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          {p.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
