"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  UserPlus,
  LogIn,
  Car,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Truck,
  Package,
  Luggage,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  ThumbsUp,
  Crown,
  Star,
  Briefcase,
  Users,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceType =
  | "location"
  | "transport_bagages"
  | "livraison_colis"
  | "demenagement";

interface ServiceOption {
  id: ServiceType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: "location",
    label: "Location de véhicules",
    icon: Car,
    description: "Voitures, motos, camions, scooters…",
    badge: "Populaire",
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
    badge: "Tendance",
  },
  {
    id: "demenagement",
    label: "Déménagement",
    icon: Truck,
    description: "Meubles, cartons, distance…",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"client" | "owner">("client");
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([
    "location",
  ]);
  const [currentStep, setCurrentStep] = useState(1);

  // ui state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
    if (role === "admin") {
      router.push("/admin/dashboard");
      return;
    }
    if (!profileCompleted) {
      router.push("/complete-profile");
      return;
    }
    if (role === "owner") {
      router.push("/owner/dashboard");
      return;
    }
    router.push("/dashboard");
  }

  function toggleService(id: ServiceType) {
    setSelectedServices((prev) =>
      prev.includes(id)
        ? prev.length === 1
          ? prev
          : prev.filter((s) => s !== id)
        : [...prev, id],
    );
  }

  function validate(): boolean {
    if (!name || !email || !password || !confirmPassword) {
      setError("Veuillez remplir tous les champs");
      return false;
    }
    if (name.trim().length < 2) {
      setError("Le nom doit contenir au moins 2 caractères");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Format d'email invalide");
      return false;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return false;
    }
    if (!acceptTerms) {
      setError("Vous devez accepter les conditions d'utilisation");
      return false;
    }
    if (role === "owner" && selectedServices.length === 0) {
      setError("Sélectionnez au moins un type de service");
      return false;
    }
    return true;
  }

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
        role: role,
      };

      if (role === "owner") {
        payload.services = selectedServices;
      }

      const { data } = await api.post("/register", payload);
      const { token, user } = data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      redirectByRole(user.role.name, user.profile_completed);
    } catch (err: any) {
      const errors = err.response?.data?.errors as
        | Record<string, string[]>
        | undefined;
      if (errors) {
        setError(Object.values(errors)[0]?.[0] ?? "Erreur de validation");
      } else if (err.response?.status === 409) {
        setError("Cet email est déjà utilisé");
      } else {
        setError(err.response?.data?.message ?? "Erreur lors de l'inscription");
      }
    } finally {
      setIsLoading(false);
    }
  }

  const getStrengthColor = (s: number) => {
    const colors = [
      "bg-gray-200",
      "bg-red-500",
      "bg-yellow-500",
      "bg-green-500",
      "bg-green-600",
    ];
    return colors[s];
  };

  const getStrengthLabel = (s: number) => {
    const labels = ["", "Faible", "Moyen", "Fort", "Très fort"];
    return labels[s];
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
      </div>

      {/* Main container */}
      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left side - Informations */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:flex flex-col justify-center text-white"
          >
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">AutoRent</span>
              </div>

              <h1 className="text-4xl font-bold mb-4">
                Rejoignez la révolution de la mobilité
              </h1>
              <p className="text-lg text-white/70 mb-8">
                La première plateforme qui connecte particuliers et
                professionnels pour tous vos besoins de transport.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  icon: Shield,
                  text: "Paiements 100% sécurisés",
                  color: "blue",
                },
                { icon: Clock, text: "Support client 24/7", color: "purple" },
                {
                  icon: ThumbsUp,
                  text: "Plus de 10 000 clients satisfaits",
                  color: "pink",
                },
                {
                  icon: Crown,
                  text: "Assurance incluse sur tous les services",
                  color: "yellow",
                },
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`w-10 h-10 bg-${feature.color}-500/20 rounded-lg flex items-center justify-center`}
                  >
                    <feature.icon
                      className={`w-5 h-5 text-${feature.color}-400`}
                    />
                  </div>
                  <span className="text-white/80">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Témoignage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10"
            >
              <div className="flex items-center gap-2 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-sm text-white/80 italic mb-3">
                "Grâce à AutoRent, j'ai développé mon activité de livraison et
                augmenté mon chiffre d'affaires de 45% en seulement 3 mois."
              </p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">AM</span>
                </div>
                <div>
                  <p className="text-xs font-semibold">Ahmed Mansouri</p>
                  <p className="text-xs text-white/50">Propriétaire premium</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right side - Registration Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Progress steps */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-white" />
                  <span className="text-white font-semibold">
                    Nouveau compte
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2].map((step) => (
                    <div
                      key={step}
                      className={`w-2 h-2 rounded-full transition-all ${
                        currentStep >= step ? "bg-white" : "bg-white/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 max-h-[85vh] overflow-y-auto">
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Créer un compte
                </h2>
                <p className="text-gray-500 text-sm">
                  Rejoignez notre communauté et profitez de nos services
                </p>
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form fields */}
              <div className="space-y-4">
                {/* Name */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom complet
                  </label>
                  <div className="relative">
                    <User
                      className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                        focusedField === "name"
                          ? "text-blue-500"
                          : "text-gray-400"
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="Jean Dupont"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocusedField("name")}
                      onBlur={() => setFocusedField(null)}
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail
                      className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                        focusedField === "email"
                          ? "text-blue-500"
                          : "text-gray-400"
                      }`}
                    />
                    <input
                      type="email"
                      placeholder="jean@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock
                      className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                        focusedField === "password"
                          ? "text-blue-500"
                          : "text-gray-400"
                      }`}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      disabled={isLoading}
                      className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Password strength */}
                  {password && (
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Force du mot de passe
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            passwordStrength === 1
                              ? "text-red-500"
                              : passwordStrength === 2
                                ? "text-yellow-500"
                                : passwordStrength === 3
                                  ? "text-green-500"
                                  : passwordStrength === 4
                                    ? "text-green-600"
                                    : "text-gray-500"
                          }`}
                        >
                          {getStrengthLabel(passwordStrength)}
                        </span>
                      </div>
                      <div className="flex gap-1 h-1.5">
                        {[1, 2, 3, 4].map((l) => (
                          <div
                            key={l}
                            className={`flex-1 rounded-full transition-all duration-300 ${
                              l <= passwordStrength
                                ? getStrengthColor(passwordStrength)
                                : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock
                      className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                        focusedField === "confirm"
                          ? "text-blue-500"
                          : "text-gray-400"
                      }`}
                    />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField("confirm")}
                      onBlur={() => setFocusedField(null)}
                      disabled={isLoading}
                      className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Role selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Je suis
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        id: "client",
                        icon: Users,
                        label: "Client",
                        desc: "Je souhaite louer des services",
                      },
                      {
                        id: "owner",
                        icon: Briefcase,
                        label: "Propriétaire",
                        desc: "Je souhaite proposer mes services",
                      },
                    ].map((r) => (
                      <motion.button
                        key={r.id}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setRole(r.id as typeof role)}
                        disabled={isLoading}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          role === r.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <r.icon
                          className={`w-6 h-6 mb-2 ${
                            role === r.id ? "text-blue-600" : "text-gray-400"
                          }`}
                        />
                        <div
                          className={`font-semibold text-sm ${
                            role === r.id ? "text-blue-700" : "text-gray-700"
                          }`}
                        >
                          {r.label}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {r.desc}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Services selection for owners */}
                <AnimatePresence>
                  {role === "owner" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Services proposés
                      </label>
                      <div className="space-y-2">
                        {SERVICE_OPTIONS.map((svc) => {
                          const Icon = svc.icon;
                          const isSelected = selectedServices.includes(svc.id);
                          return (
                            <motion.button
                              key={svc.id}
                              type="button"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => toggleService(svc.id)}
                              className={`w-full p-3 rounded-xl border-2 text-left flex items-center transition-all ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300 bg-white"
                              }`}
                            >
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                                  isSelected
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div
                                  className={`text-sm font-medium ${
                                    isSelected
                                      ? "text-blue-700"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {svc.label}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {svc.description}
                                </div>
                              </div>
                              {svc.badge && !isSelected && (
                                <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full">
                                  {svc.badge}
                                </span>
                              )}
                              {isSelected && (
                                <CheckCircle className="w-5 h-5 text-blue-600" />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Terms */}
                <div className="flex items-start gap-2">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    J'accepte les{" "}
                    <Link
                      href="/terms"
                      className="text-blue-600 hover:underline"
                    >
                      conditions générales
                    </Link>{" "}
                    et la{" "}
                    <Link
                      href="/privacy"
                      className="text-blue-600 hover:underline"
                    >
                      politique de confidentialité
                    </Link>
                  </label>
                </div>

                {/* Submit button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRegister}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Inscription en cours...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Créer mon compte
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white text-sm text-gray-500">
                      Déjà inscrit ?
                    </span>
                  </div>
                </div>

                {/* Login button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push("/login")}
                  disabled={isLoading}
                  className="w-full bg-gray-50 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  Se connecter
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
