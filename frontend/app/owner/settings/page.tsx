"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function OAuthCallbackPage() {
  const params = useSearchParams();

  useEffect(() => {
    const social = params.get("social");
    const platform = params.get("platform");

    // Notifier la fenêtre parente (popup)
    if (window.opener) {
      const messageMap: Record<string, string> = {
        connected: "SOCIAL_CONNECTED",
        denied: "SOCIAL_DENIED",
        no_pages: "SOCIAL_NO_PAGES",
        error: "SOCIAL_ERROR",
      };
      const type = messageMap[social || ""] || "SOCIAL_ERROR";
      window.opener.postMessage({ type, platform }, window.location.origin);
      window.close();
    } else {
      // Ouvert dans le même onglet → rediriger vers le profil
      window.location.href = "/owner/profile?tab=social";
    }
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Finalisation de la connexion…</p>
      </div>
    </div>
  );
}
