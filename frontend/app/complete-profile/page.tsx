"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Phone,
  MapPin,
  Car,
  X,
  CheckCircle,
  AlertCircle,
  Camera,
  ChevronRight,
  Truck,
  Package,
  Luggage,
  FileText,
  Upload,
  ArrowRight,
  Sparkles,
  ScanLine,
} from "lucide-react";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceType =
  | "location"
  | "transport_bagages"
  | "livraison_colis"
  | "demenagement";
type DocType = "cin" | "cin_verso" | "permis" | "permis_verso";

interface StoredUser {
  id: number;
  name: string;
  email: string;
  profile_completed: boolean;
  role: { id: number; name: string };
  owner_services: { service_type: ServiceType }[];
}

interface ServiceOption {
  id: ServiceType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: "location",
    label: "Location de véhicules",
    icon: Car,
    description: "Voitures, motos, camions…",
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
    description: "Meubles, cartons…",
  },
];

const STEPS_CLIENT = ["Informations", "Avatar", "Documents"];
const STEPS_OWNER = ["Informations", "Avatar", "Services"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompleteProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<StoredUser | null>(null);
  const [step, setStep] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Step 0 — infos
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [bio, setBio] = useState("");

  // Step 1 — avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Step 2 owner — services
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);

  // Step 2 client — documents (uniquement permis)
  const [ocrLoading, setOcrLoading] = useState<Record<string, boolean>>({});
  const [docs, setDocs] = useState<
    Record<"permis" | "permis_verso", { uploaded: boolean; data: any }>
  >({
    permis: { uploaded: false, data: null },
    permis_verso: { uploaded: false, data: null },
  });

  // ─── OCR CIN (Step 0) ──────────────────────────────────────────────────────
  const [cinRectoFile, setCinRectoFile] = useState<File | null>(null);
  const [cinRectoPreview, setCinRectoPreview] = useState<string | null>(null);
  const [cinVersoFile, setCinVersoFile] = useState<File | null>(null);
  const [cinVersoPreview, setCinVersoPreview] = useState<string | null>(null);
  const [cinRectoProcessing, setCinRectoProcessing] = useState(false);
  const [cinVersoProcessing, setCinVersoProcessing] = useState(false);
  const [ocrPrefilled, setOcrPrefilled] = useState({
    first_name: false,
    last_name: false,
    birth_date: false,
    address: false,
    gender: false,
  });

  // ─── Init ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) {
      router.push("/login");
      return;
    }

    try {
      const u: StoredUser = JSON.parse(userStr);
      if (u.profile_completed) {
        router.push(
          u.role.name === "owner" ? "/owner/dashboard" : "/dashboard",
        );
        return;
      }
      setUser(u);
      const owner = u.role.name === "owner";
      setIsOwner(owner);
      if (owner && u.owner_services?.length) {
        setSelectedServices(u.owner_services.map((s) => s.service_type));
      } else if (owner) {
        setSelectedServices(["location"]);
      }
    } catch {
      router.push("/login");
    }
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const STEPS = isOwner ? STEPS_OWNER : STEPS_CLIENT;
  const totalSteps = STEPS.length;

  function showMsg(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
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

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadAvatar(): Promise<boolean> {
    if (!avatarFile) return true;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("avatar", avatarFile);
      await api.post("/profile/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return true;
    } catch {
      showMsg("error", "Erreur lors de l'upload de l'avatar.");
      return false;
    } finally {
      setUploadingAvatar(false);
    }
  }

  // OCR CIN Recto
  async function handleCinRectoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCinRectoFile(file);
    setCinRectoPreview(URL.createObjectURL(file));
    setCinRectoProcessing(true);

    try {
      const fd = new FormData();
      fd.append("document", file);
      fd.append("doc_type", "cin");

      const { data } = await api.post("/documents/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.extracted_data) {
        const d = data.extracted_data;

        if (d.first_name) {
          setFirstName(d.first_name);
          setOcrPrefilled((prev) => ({ ...prev, first_name: true }));
        }
        if (d.last_name) {
          setLastName(d.last_name);
          setOcrPrefilled((prev) => ({ ...prev, last_name: true }));
        }
        if (d.birth_date) {
          setDob(d.birth_date);
          setOcrPrefilled((prev) => ({ ...prev, birth_date: true }));
        }

        showMsg("success", "CIN recto analysé ! Champs pré-remplis.");
      }
    } catch (error) {
      showMsg("error", "Erreur lors de l'analyse du recto.");
    } finally {
      setCinRectoProcessing(false);
    }
  }

  // OCR CIN Verso
  async function handleCinVersoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCinVersoFile(file);
    setCinVersoPreview(URL.createObjectURL(file));
    setCinVersoProcessing(true);

    try {
      const fd = new FormData();
      fd.append("document", file);
      fd.append("doc_type", "cin_verso");

      const { data } = await api.post("/documents/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.extracted_data) {
        const d = data.extracted_data;

        if (d.address) {
          setAddress(d.address);
          setOcrPrefilled((prev) => ({ ...prev, address: true }));
        }
        if (d.gender) {
          const genderMap: Record<string, "male" | "female"> = {
            M: "male",
            F: "female",
          };
          if (genderMap[d.gender]) {
            setGender(genderMap[d.gender]);
            setOcrPrefilled((prev) => ({ ...prev, gender: true }));
          }
        }

        showMsg("success", "CIN verso analysé ! Adresse et genre pré-remplis.");
      }
    } catch (error) {
      showMsg("error", "Erreur lors de l'analyse du verso.");
    } finally {
      setCinVersoProcessing(false);
    }
  }

  // Upload document dans step 2 client (uniquement permis)
  async function handleDocUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "permis" | "permis_verso",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading((p) => ({ ...p, [type]: true }));
    try {
      const fd = new FormData();
      fd.append("document", file);
      fd.append("doc_type", type);
      const { data } = await api.post("/documents/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocs((p) => ({
        ...p,
        [type]: { uploaded: true, data: data.extracted_data },
      }));
      showMsg("success", "Document analysé avec succès.");
    } catch {
      showMsg("error", "Erreur lors de l'analyse du document.");
    } finally {
      setOcrLoading((p) => ({ ...p, [type]: false }));
    }
  }

  // ─── Submit final ─────────────────────────────────────────────────────────

  async function handleFinish() {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !phone.trim() ||
      !city.trim()
    ) {
      showMsg("error", "Prénom, nom, téléphone et ville sont obligatoires.");
      setStep(0);
      return;
    }

    setSaving(true);
    try {
      if (avatarFile) {
        const ok = await uploadAvatar();
        if (!ok) {
          setSaving(false);
          return;
        }
      }

      const payload: Record<string, unknown> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        address: address.trim(),
        bio: bio.trim(),
        ...(dob ? { date_of_birth: dob } : {}),
        ...(gender ? { gender } : {}),
        ...(isOwner && selectedServices.length
          ? { services: selectedServices }
          : {}),
      };

      const { data } = await api.put("/profile", payload);

      const updatedUser = { ...user, ...data.user, profile_completed: true };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      showMsg("success", "Profil complété ! Redirection…");

      setTimeout(() => {
        router.push(isOwner ? "/owner/dashboard" : "/");
      }, 1200);
    } catch (err: any) {
      const errors = err.response?.data?.errors as
        | Record<string, string[]>
        | undefined;
      showMsg(
        "error",
        errors
          ? (Object.values(errors)[0]?.[0] ?? "Erreur de validation")
          : (err.response?.data?.message ?? "Erreur lors de la sauvegarde."),
      );
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (step === 0) {
      if (
        !firstName.trim() ||
        !lastName.trim() ||
        !phone.trim() ||
        !city.trim()
      ) {
        showMsg("error", "Prénom, nom, téléphone et ville sont obligatoires.");
        return;
      }
    }
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  }

  const getInitial = () =>
    firstName
      ? firstName[0].toUpperCase()
      : (user?.name?.[0]?.toUpperCase() ?? "U");

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[95vh] overflow-y-auto"
      >
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 pt-8 pb-6 sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">
                Complétez votre profil
              </h1>
              <p className="text-white/70 text-sm">
                {isOwner ? "Propriétaire" : "Client"} · {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      i < step
                        ? "bg-white text-blue-600"
                        : i === step
                          ? "bg-white/30 text-white ring-2 ring-white"
                          : "bg-white/10 text-white/50"
                    }`}
                  >
                    {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span
                    className={`text-xs whitespace-nowrap ${i === step ? "text-white" : "text-white/50"}`}
                  >
                    {label}
                  </span>
                </div>
                {i < totalSteps - 1 && (
                  <div
                    className={`flex-1 h-0.5 mb-4 transition-all ${i < step ? "bg-white" : "bg-white/20"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          <AnimatePresence>
            {msg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm ${
                  msg.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {msg.type === "success" ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {msg.text}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* ── STEP 0 : Informations avec OCR CIN (Recto + Verso) ────── */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Section OCR CIN - Recto */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ScanLine className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-800 text-sm">
                        CIN - Recto
                      </span>
                    </div>
                    <span className="text-xs text-blue-600">
                      Identité & date de naissance
                    </span>
                  </div>

                  <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-xl cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-100/50 py-3">
                    {cinRectoPreview ? (
                      <div className="relative w-full p-2">
                        <img
                          src={cinRectoPreview}
                          alt="CIN Recto"
                          className="h-20 mx-auto rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setCinRectoPreview(null);
                            setCinRectoFile(null);
                          }}
                          className="absolute top-0 right-2 bg-white rounded-full p-0.5 shadow"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 text-center">
                        <Upload className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                        <p className="text-xs text-blue-600 font-medium">
                          Uploader le recto
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCinRectoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={cinRectoProcessing}
                    />
                  </label>

                  {cinRectoProcessing && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Analyse en cours...
                    </div>
                  )}
                </div>

                {/* Section OCR CIN - Verso */}
                <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ScanLine className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-gray-800 text-sm">
                        CIN - Verso
                      </span>
                    </div>
                    <span className="text-xs text-green-600">
                      Adresse & genre
                    </span>
                  </div>

                  <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-green-300 rounded-xl cursor-pointer transition-all hover:border-green-500 hover:bg-green-100/50 py-3">
                    {cinVersoPreview ? (
                      <div className="relative w-full p-2">
                        <img
                          src={cinVersoPreview}
                          alt="CIN Verso"
                          className="h-20 mx-auto rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setCinVersoPreview(null);
                            setCinVersoFile(null);
                          }}
                          className="absolute top-0 right-2 bg-white rounded-full p-0.5 shadow"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 text-center">
                        <Upload className="w-6 h-6 text-green-400 mx-auto mb-1" />
                        <p className="text-xs text-green-600 font-medium">
                          Uploader le verso
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCinVersoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={cinVersoProcessing}
                    />
                  </label>

                  {cinVersoProcessing && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-green-600">
                      <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      Analyse en cours...
                    </div>
                  )}
                </div>

                {/* Indicateur pré-remplissage */}
                {Object.values(ocrPrefilled).some((v) => v) && (
                  <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2 flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" />
                    <span>
                      {Object.entries(ocrPrefilled)
                        .filter(([, v]) => v)
                        .map(([k]) => {
                          const labels: Record<string, string> = {
                            first_name: "Prénom",
                            last_name: "Nom",
                            birth_date: "Date naissance",
                            address: "Adresse",
                            gender: "Genre",
                          };
                          return labels[k];
                        })
                        .join(", ")}{" "}
                      pré-rempli(s) automatiquement
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Prénom *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Mohammed"
                        className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          ocrPrefilled.first_name
                            ? "border-green-400 bg-green-50"
                            : "border-gray-200"
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Nom *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Alami"
                        className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          ocrPrefilled.last_name
                            ? "border-green-400 bg-green-50"
                            : "border-gray-200"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Téléphone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+212 6XX XXX XXX"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Ville *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Casablanca"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Date de naissance
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        ocrPrefilled.birth_date
                          ? "border-green-400 bg-green-50"
                          : "border-gray-200"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Adresse
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Rue Hassan II"
                      className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        ocrPrefilled.address
                          ? "border-green-400 bg-green-50"
                          : "border-gray-200"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Genre
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["male", "female", "other"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                          gender === g
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {g === "male"
                          ? "Homme"
                          : g === "female"
                            ? "Femme"
                            : "Autre"}
                      </button>
                    ))}
                  </div>
                </div>

                {isOwner && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Bio <span className="text-gray-400">(présentation)</span>
                    </label>
                    <textarea
                      rows={3}
                      onChange={(e) => setBio(e.target.value)}
                      value={bio}
                      placeholder="Décrivez-vous en quelques mots : votre expérience, vos services…"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* ── STEP 1 : Avatar ───────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center gap-6 py-4"
              >
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden shadow-xl">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl font-bold text-white">
                        {getInitial()}
                      </span>
                    )}
                  </div>
                  <label className="absolute bottom-1 right-1 w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow-lg transition">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <Camera className="w-4 h-4 text-white" />
                  </label>
                </div>

                <div className="text-center">
                  <p className="font-semibold text-gray-800 text-lg">
                    {firstName} {lastName}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">
                    {user.role.name}
                  </p>
                </div>

                <label className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    Choisir une photo de profil
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG, WEBP — max 2MB
                  </p>
                </label>

                <p className="text-xs text-gray-400 text-center">
                  Optionnel — vous pouvez le faire plus tard depuis votre
                  profil.
                </p>
              </motion.div>
            )}

            {/* ── STEP 2 owner : Services ───────────────────────────── */}
            {step === 2 && isOwner && (
              <motion.div
                key="step2-owner"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-700">
                    Services proposés
                  </p>
                  <span className="text-xs text-blue-600 font-medium">
                    {selectedServices.length} sélectionné
                    {selectedServices.length > 1 ? "s" : ""}
                  </span>
                </div>

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
                      className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
                        selected
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          selected
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${selected ? "text-blue-700" : "text-gray-700"}`}
                        >
                          {svc.label}
                        </p>
                        <p className="text-xs text-gray-400">
                          {svc.description}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                          selected
                            ? "border-blue-600 bg-blue-600"
                            : "border-gray-300"
                        }`}
                      >
                        {selected && (
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}

                <p className="text-xs text-gray-400 pt-1">
                  Vous pouvez modifier vos services à tout moment depuis votre
                  tableau de bord.
                </p>
              </motion.div>
            )}

            {/* ── STEP 2 client : Documents (uniquement PERMIS) ─────────────── */}
            {step === 2 && !isOwner && (
              <motion.div
                key="step2-client"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Optionnel — uploadez votre permis de conduire (recto et
                    verso). La CIN a déjà été analysée précédemment.
                  </p>
                </div>

                {/* Permis Recto */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-700 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">
                        Permis de Conduire (Recto)
                      </span>
                    </div>
                    {docs.permis.uploaded && (
                      <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Analysé
                      </span>
                    )}
                  </div>
                  <label
                    className={`block p-4 text-center cursor-pointer transition ${
                      docs.permis.uploaded ? "bg-green-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleDocUpload(e, "permis")}
                      disabled={ocrLoading["permis"]}
                    />
                    {ocrLoading["permis"] ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-blue-600">
                          Analyse IA en cours…
                        </p>
                      </div>
                    ) : docs.permis.uploaded ? (
                      <div className="flex flex-col items-center gap-1">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        <p className="text-xs text-green-600 font-medium">
                          Document analysé — cliquer pour remplacer
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="w-6 h-6 text-gray-400" />
                        <p className="text-xs text-gray-500">
                          Cliquer pour uploader
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                {/* Permis Verso */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-500 to-rose-700 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">
                        Permis de Conduire (Verso)
                      </span>
                    </div>
                    {docs.permis_verso.uploaded && (
                      <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Analysé
                      </span>
                    )}
                  </div>
                  <label
                    className={`block p-4 text-center cursor-pointer transition ${
                      docs.permis_verso.uploaded
                        ? "bg-green-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleDocUpload(e, "permis_verso")}
                      disabled={ocrLoading["permis_verso"]}
                    />
                    {ocrLoading["permis_verso"] ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-blue-600">
                          Analyse IA en cours…
                        </p>
                      </div>
                    ) : docs.permis_verso.uploaded ? (
                      <div className="flex flex-col items-center gap-1">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        <p className="text-xs text-green-600 font-medium">
                          Document analysé — cliquer pour remplacer
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="w-6 h-6 text-gray-400" />
                        <p className="text-xs text-gray-500">
                          Cliquer pour uploader
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Ces documents permettent de renforcer la confiance avec les
                  propriétaires.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <div className="px-8 pb-8 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition"
            >
              Retour
            </button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={saving || uploadingAvatar}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving || uploadingAvatar ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sauvegarde…
              </>
            ) : step === totalSteps - 1 ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Terminer
              </>
            ) : (
              <>
                Suivant
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>

        {step === 2 && (
          <div className="text-center pb-6">
            <button
              type="button"
              onClick={() => handleFinish()}
              className="text-xs text-gray-400 hover:text-gray-600 transition underline"
            >
              Passer cette étape
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
