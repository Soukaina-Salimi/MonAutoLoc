"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Lock, UserPlus, LogIn,
  Car, Eye, EyeOff, CheckCircle, AlertCircle,
  Truck, Package, Luggage,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceType = "location" | "transport_bagages" | "livraison_colis" | "demenagement";

interface ServiceOption {
  id: ServiceType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface RegisterResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    profile_completed: boolean;
    role: { id: number; name: string };
    owner_services: { service_type: ServiceType }[];
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: "location",
    label: "Location de véhicules",
    icon: Car,
    description: "Voitures, motos, camions, scooters…",
  },
  {
    id: "transport_bagages",
    label: "Transport de bagages",
    icon: Luggage,
    description: "Aéroport, gare, hôtel…",
  },
  {
    id: "livraison_colis",
    label: "Livraison de colis",
    icon: Package,
    description: "E-commerce, particuliers…",
  },
  {
    id: "demenagement",
    label: "Déménagement",
    icon: Truck,
    description: "Meubles, cartons, distance…",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStrengthColor(s: number) {
  return ["bg-gray-200", "bg-red-500", "bg-yellow-500", "bg-green-500", "bg-green-600"][s];
}

function getStrengthLabel(s: number) {
  return ["", "Faible", "Moyen", "Fort", "Très fort"][s];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"client" | "owner">("client");

  // ✅ FIX: tableau multi-sélection, valeurs correspondant aux enums backend
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>(["location"]);

  // ui state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        redirectByRole(user.role.name, user.profile_completed);
      } catch {}
    }
  }, []);

  // password strength
  useEffect(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    setPasswordStrength(s);
  }, [password]);

  // reset services when switching role
  useEffect(() => {
if (role !== "owner") setSelectedServices(["location"]);
  }, [role]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function redirectByRole(role: string, profileCompleted: boolean) {
    if (role === "admin") { router.push("/admin/dashboard"); return; }
    // ✅ FIX: si profile non complété → page de complétion de profil
    if (!profileCompleted) { router.push("/complete-profile"); return; }
    if (role === "owner") { router.push("/owner/dashboard"); return; }
    router.push("/dashboard");
  }

  function toggleService(id: ServiceType) {
    setSelectedServices((prev) =>
      prev.includes(id)
        ? prev.length === 1
          ? prev                      // garde au moins 1 sélectionné
          : prev.filter((s) => s !== id)
        : [...prev, id]
    );
  }

  function validate(): boolean {
    if (!name || !email || !password || !confirmPassword) {
      setError("Veuillez remplir tous les champs"); return false;
    }
    if (name.trim().length < 2) {
      setError("Le nom doit contenir au moins 2 caractères"); return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Format d'email invalide"); return false;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères"); return false;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas"); return false;
    }
    if (!acceptTerms) {
      setError("Vous devez accepter les conditions d'utilisation"); return false;
    }
        if (role === "owner" && selectedServices.length === 0) 
{
      setError("Sélectionnez au moins un type de service"); return false;
    }
    return true;
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  async function handleRegister() {
    if (!validate()) return;
    setIsLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name,
        email,
        password,
        password_confirmation: confirmPassword,
         role: role ,
      };

      // ✅ FIX: envoyer services[] tableau — correspond exactement au AuthController
      if (role === "owner") {
        payload.services = selectedServices;
      }

      const { data } = await api.post("/register", payload);
      const { token, user } = data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // ✅ FIX: redirection correcte selon profile_completed
      redirectByRole(user.role.name, user.profile_completed);

    } catch (err: any) {
      const errors = err.response?.data?.errors as Record<string, string[]> | undefined;
      if (errors) {
        setError(Object.values(errors)[0]?.[0] ?? "Erreur de validation");
      } else if (err.response?.status === 409) {
        setError("Cet email est déjà utilisé");
      } else {
        setError(err.response?.data?.message ?? "Erreur lors de l'inscription. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Animation variants ──────────────────────────────────────────────────────

  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background blobs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity }}
        className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0] }}
        transition={{ duration: 25, repeat: Infinity }}
        className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 360 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30"
          >
            <Car className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-800 mb-1">Créer un compte</h2>
          <p className="text-gray-500 text-sm">Rejoignez notre communauté de services</p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">

          {/* Name */}
          <motion.div {...fadeUp} className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Nom complet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </motion.div>

          {/* Email */}
          <motion.div {...fadeUp} className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              placeholder="Adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </motion.div>

          {/* Password */}
          <motion.div {...fadeUp} className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </motion.div>

          {/* Confirm Password */}
          <motion.div {...fadeUp} className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </motion.div>

          {/* Password strength */}
          <AnimatePresence>
            {password && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Force du mot de passe</span>
                  <span className="text-xs font-medium text-gray-700">{getStrengthLabel(passwordStrength)}</span>
                </div>
                <div className="flex gap-1 h-1.5">
                  {[1, 2, 3, 4].map((l) => (
                    <div
                      key={l}
                      className={`flex-1 rounded-full transition-all duration-300 ${l <= passwordStrength ? getStrengthColor(passwordStrength) : "bg-gray-200"}`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                  {[
                    [password.length >= 8, "8+ caractères"],
                    [/[A-Z]/.test(password), "Majuscule"],
                    [/[0-9]/.test(password), "Chiffre"],
                    [/[^A-Za-z0-9]/.test(password), "Caractère spécial"],
                  ].map(([ok, label]) => (
                    <div key={label as string} className="flex items-center gap-1">
                      <CheckCircle className={`w-3 h-3 ${ok ? "text-green-500" : "text-gray-300"}`} />
                      {label}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Role selection */}
          <motion.div {...fadeUp} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Vous êtes ?</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                // Dans le mapping des boutons
{ id: "client" as const, emoji: "👤", label: "Client", desc: "Louez des véhicules et services" },
{ id: "owner" as const, emoji: "🚗", label: "Propriétaire", desc: "Proposez vos services" },
               
              ].map((r) => (
                <motion.button
                  key={r.id}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRole(r.id)}
                  disabled={isLoading}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    role === r.id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-1">{r.emoji}</div>
                  <div className={`text-sm font-medium ${role === r.id ? "text-blue-600" : "text-gray-600"}`}>
                    {r.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{r.desc}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* ✅ Service multi-selection (owner only) */}
          <AnimatePresence>
            {role === "owner" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Quels services proposez-vous ?
                  </label>
                  <span className="text-xs text-blue-600 font-medium">
                    {selectedServices.length} sélectionné{selectedServices.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-2">
                  {SERVICE_OPTIONS.map((svc) => {
                    const Icon = svc.icon;
                    const selected = selectedServices.includes(svc.id);
                    return (
                      <motion.button
                        key={svc.id}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => toggleService(svc.id)}
                        disabled={isLoading}
                        className={`w-full p-3 rounded-xl border-2 text-left flex items-center transition-all ${
                          selected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 shrink-0 transition-colors ${
                          selected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${selected ? "text-blue-700" : "text-gray-700"}`}>
                            {svc.label}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{svc.description}</div>
                        </div>
                        {/* Checkbox visuel */}
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                          selected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                        }`}>
                          {selected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <p className="text-xs text-blue-600 bg-blue-50 rounded-xl p-3 flex items-start gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Vous pouvez sélectionner plusieurs services. Vous pourrez les modifier depuis votre tableau de bord.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Terms */}
          <motion.div {...fadeUp} className="flex items-start gap-2">
            <input
              id="terms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-600 cursor-pointer"
            />
            <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
              J&apos;accepte les{" "}
              <Link href="/terms" className="text-blue-600 hover:underline">conditions d&apos;utilisation</Link>{" "}
              et la{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline">politique de confidentialité</Link>
            </label>
          </motion.div>

          {/* Submit */}
          <motion.button
            {...fadeUp}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRegister}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Inscription en cours…
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                S&apos;inscrire
              </>
            )}
          </motion.button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white/90 text-sm text-gray-500">Déjà inscrit ?</span>
            </div>
          </div>

          {/* Login */}
          <motion.button
            {...fadeUp}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/login")}
            disabled={isLoading}
            className="w-full bg-white border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Se connecter
          </motion.button>

        </div>
      </motion.div>
    </div>
  );
}