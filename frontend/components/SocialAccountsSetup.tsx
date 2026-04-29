"use client";
import { useState, useEffect } from "react";
import {
  Facebook,
  Instagram,
  CheckCircle,
  Trash2,
  Loader2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";

interface SocialStatus {
  facebook?: { connected: boolean; page_name?: string; expired?: boolean };
  instagram?: { connected: boolean; page_name?: string; expired?: boolean };
  tiktok?: { connected: boolean };
}

export default function SocialAccountsSetup() {
  const [status, setStatus] = useState<SocialStatus>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // Charger le statut au montage
  useEffect(() => {
    checkAllStatuses().finally(() => setInitialLoad(false));
  }, []);

  // Écouter le postMessage du callback Facebook (popup → parent)
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const { type } = event.data || {};

      if (type === "SOCIAL_CONNECTED") {
        setLoading(null);
        setSuccess("Compte connecté avec succès !");
        setTimeout(() => setSuccess(null), 4000);
        checkAllStatuses();
      } else if (type === "SOCIAL_DENIED") {
        setLoading(null);
        setError("Connexion annulée.");
      } else if (type === "SOCIAL_NO_PAGES") {
        setLoading(null);
        setError(
          "Aucune page Facebook trouvée. Créez une page Facebook Business d'abord.",
        );
      } else if (type === "SOCIAL_ERROR") {
        setLoading(null);
        setError("Erreur lors de la connexion. Réessayez.");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function checkAllStatuses() {
    try {
      const { data } = await api.get("/social/facebook/status");
      setStatus(data);
    } catch {}
  }

  async function connectFacebook() {
    setLoading("facebook");
    setError(null);
    setSuccess(null);

    try {
      const { data } = await api.get("/social/facebook/connect");

      if (!data.url) {
        setError("Impossible de générer l'URL de connexion.");
        setLoading(null);
        return;
      }

      // Ouvrir la popup Facebook officielle
      const popup = window.open(
        data.url,
        "FacebookOAuth",
        "width=600,height=700,scrollbars=yes,resizable=yes,left=300,top=100",
      );

      if (!popup) {
        // Popup bloquée → même onglet
        window.location.href = data.url;
        return;
      }

      // Fallback si postMessage ne fonctionne pas
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          setLoading(null);
          setTimeout(() => checkAllStatuses(), 800);
        }
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la connexion.");
      setLoading(null);
    }
  }

  async function disconnect(platform: string) {
    if (!confirm(`Déconnecter votre compte ${platform} ?`)) return;
    setLoading(platform);
    setError(null);
    try {
      await api.delete(`/social/${platform}/disconnect`);
      setStatus((prev) => ({ ...prev, [platform]: { connected: false } }));
      setSuccess(`Compte ${platform} déconnecté.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Erreur lors de la déconnexion.");
    } finally {
      setLoading(null);
    }
  }

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <p className="font-semibold mb-1">Comment ça marche ?</p>
          <p>
            Cliquez sur "Connecter" — vous serez redirigé vers la page
            officielle Facebook pour autoriser AutoRent à publier sur votre
            page.
            <strong> Nous ne voyons jamais votre mot de passe.</strong>
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Facebook */}
      <div
        className={`flex items-center gap-3 p-4 border-2 rounded-xl transition ${
          status.facebook?.connected
            ? "border-green-200 bg-green-50"
            : "border-gray-200"
        }`}
      >
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Facebook className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">Facebook</p>
          {status.facebook?.connected ? (
            <p className="text-xs text-green-600 flex items-center gap-1 truncate">
              <CheckCircle className="w-3 h-3 shrink-0" />
              {status.facebook.page_name || "Page connectée"}
              {status.facebook.expired && (
                <span className="text-red-500 ml-1">(expiré)</span>
              )}
            </p>
          ) : (
            <p className="text-xs text-gray-400">Non connecté</p>
          )}
        </div>

        {status.facebook?.connected ? (
          <div className="flex gap-2 shrink-0">
            {status.facebook.expired && (
              <button
                onClick={connectFacebook}
                disabled={loading === "facebook"}
                className="text-xs text-blue-600 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reconnecter
              </button>
            )}
            <button
              onClick={() => disconnect("facebook")}
              disabled={!!loading}
              className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
            >
              {loading === "facebook" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={connectFacebook}
            disabled={!!loading}
            className="shrink-0 flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading === "facebook" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Connexion…
              </>
            ) : (
              <>
                <Facebook className="w-4 h-4" /> Connecter
              </>
            )}
          </button>
        )}
      </div>

      {/* Instagram — lié automatiquement via Facebook */}
      <div
        className={`flex items-center gap-3 p-4 border-2 rounded-xl transition ${
          status.instagram?.connected
            ? "border-green-200 bg-green-50"
            : "border-gray-200"
        }`}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shrink-0">
          <Instagram className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800 text-sm">
            Instagram Business
          </p>
          {status.instagram?.connected ? (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Connecté via votre page Facebook
            </p>
          ) : status.facebook?.connected ? (
            <p className="text-xs text-amber-600">
              Compte Instagram Business non lié à votre page Facebook
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              Connectez Facebook d'abord — Instagram sera lié automatiquement
            </p>
          )}
        </div>
        {!status.instagram?.connected && (
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg shrink-0">
            Automatique
          </span>
        )}
      </div>

      {/* TikTok */}
      <div className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl opacity-60">
        <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">TT</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800 text-sm">TikTok Business</p>
          <p className="text-xs text-gray-400">Bientôt disponible</p>
        </div>
        <span className="text-xs text-amber-600 bg-amber-100 px-3 py-1.5 rounded-lg font-medium shrink-0">
          Bientôt
        </span>
      </div>

      {/* Refresh + Note sécurité */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={checkAllStatuses}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition"
        >
          <RefreshCw className="w-3 h-3" /> Actualiser le statut
        </button>
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          Tokens chiffrés AES-256
        </div>
      </div>
    </div>
  );
}
