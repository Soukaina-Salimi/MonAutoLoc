"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import SocialAccountsSetup from "@/components/SocialAccountsSetup";

import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Car,
  Edit2,
  Save,
  X,
  Camera,
  CheckCircle,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Truck,
  Package,
  Luggage,
  LayoutDashboard,
  FileText,
  ChevronRight,
  Star,
  TrendingUp,
  Clock,
  Menu,
  Bell,
  Building2,
  CreditCard,
  Shield,
  Upload,
  IdCard,
  Fingerprint,
} from "lucide-react";
import { useProfile, ServiceType } from "@/hooks/useProfile";
import Sidebar from "@/components/Sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Document {
  id: number;
  type: string;
  status: string;
  extracted_data?: any;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SERVICE_OPTIONS = [
  {
    id: "location" as ServiceType,
    label: "Location de véhicules",
    icon: Car,
    description: "Voitures, motos, camions…",
  },
  {
    id: "transport_bagages" as ServiceType,
    label: "Transport de bagages",
    icon: Luggage,
    description: "Aéroport, gare, hôtel…",
  },
  {
    id: "livraison_colis" as ServiceType,
    label: "Livraison de colis",
    icon: Package,
    description: "E-commerce, particuliers…",
  },
  {
    id: "demenagement" as ServiceType,
    label: "Déménagement",
    icon: Truck,
    description: "Meubles, cartons…",
  },
];

type Tab =
  | "profile"
  | "services"
  | "security"
  | "activity"
  | "agency"
  | "documents"
  | "social";

// ─── Document card ────────────────────────────────────────────────────────────
function DocCard({
  title,
  icon,
  color,
  uploaded,
  loading,
  fields,
  onUpload,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  uploaded: boolean;
  loading: boolean;
  fields: { label: string; value?: string }[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div
        className={`bg-gradient-to-r ${color} p-4 flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <span className="text-white font-semibold text-sm">{title}</span>
        </div>
        {uploaded && (
          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Vérifié
          </span>
        )}
      </div>
      <div className="p-4">
        <label
          className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
            uploaded
              ? "border-green-300 bg-green-50"
              : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
            disabled={loading}
          />
          {loading ? (
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-blue-600">Analyse IA en cours…</p>
            </div>
          ) : uploaded ? (
            <div className="flex flex-col items-center gap-1">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <p className="text-xs text-green-600">
                Analysé — cliquer pour remplacer
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload className="w-6 h-6 text-gray-400" />
              <p className="text-xs text-gray-500">Cliquer pour uploader</p>
            </div>
          )}
        </label>
        {uploaded && fields.some((f) => f.value) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 grid grid-cols-2 gap-2"
          >
            {fields
              .filter((f) => f.value)
              .map((f) => (
                <div key={f.label} className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">{f.label}</p>
                  <p className="text-sm font-medium text-gray-800">{f.value}</p>
                </div>
              ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OwnerProfilePage() {
  const router = useRouter();
  const {
    user,
    loading,
    saving,
    msg,
    form,
    setForm,
    saveProfile,
    saveAvatar,
    changePassword,
    showMsg,
  } = useProfile();

  const [tab, setTab] = useState<Tab>("profile");
  const [editing, setEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // password
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPw, setChangingPw] = useState(false);

  // documents
  const [ocrLoading, setOcrLoading] = useState<Record<string, boolean>>({});
  const [docs, setDocs] = useState<
    Record<string, { uploaded: boolean; data: any }>
  >({
    cin: { uploaded: false, data: null },
    cin_verso: { uploaded: false, data: null },
    permis: { uploaded: false, data: null },
    permis_verso: { uploaded: false, data: null },
  });

  // États agence
  const [isAgency, setIsAgency] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [agencyDescription, setAgencyDescription] = useState("");
  const [agencyRc, setAgencyRc] = useState("");
  const [agencyPhone, setAgencyPhone] = useState("");
  const [agencyWebsite, setAgencyWebsite] = useState("");
  const [agencyLogoUrl, setAgencyLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingAgency, setSavingAgency] = useState(false);
  const [agencyMsg, setAgencyMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const currentPath = "/owner/profile";

  // Charger les documents existants
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) return;
      try {
        const { data } = await api.get("/documents");
        const docsMap: Record<string, { uploaded: boolean; data: any }> = {
          cin: { uploaded: false, data: null },
          cin_verso: { uploaded: false, data: null },
          permis: { uploaded: false, data: null },
          permis_verso: { uploaded: false, data: null },
        };

        data.forEach((doc: Document) => {
          if (doc.type === "cin") {
            docsMap.cin = { uploaded: true, data: doc.extracted_data };
          } else if (doc.type === "cin_verso") {
            docsMap.cin_verso = { uploaded: true, data: doc.extracted_data };
          } else if (doc.type === "permis") {
            docsMap.permis = { uploaded: true, data: doc.extracted_data };
          } else if (doc.type === "permis_verso") {
            docsMap.permis_verso = { uploaded: true, data: doc.extracted_data };
          }
        });

        setDocs(docsMap);
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    };

    fetchDocuments();
  }, [user]);

  // Charger les données agence
  useEffect(() => {
    if (user) {
      setIsAgency(user.is_agency ?? false);
      setAgencyName(user.agency_name ?? "");
      setAgencyDescription(user.agency_description ?? "");
      setAgencyRc(user.agency_rc ?? "");
      setAgencyPhone(user.agency_phone ?? "");
      setAgencyWebsite(user.agency_website ?? "");
      setAgencyLogoUrl(user.agency_logo_url ?? null);
    }
  }, [user]);

  // Document upload
  async function handleDocUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    type: string,
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
      if (type === "cin" && data.extracted_data) {
        const d = data.extracted_data;
        setForm((f) => ({
          ...f,
          first_name: d.first_name ?? f.first_name,
          last_name: d.last_name ?? f.last_name,
          date_of_birth: d.birth_date ?? f.date_of_birth,
        }));
        showMsg("success", "CIN analysée — profil pré-rempli !");
        setEditing(true);
        setTab("profile");
      } else {
        showMsg("success", "Document analysé avec succès.");
      }
    } catch {
      showMsg("error", "Erreur lors de l'analyse du document.");
    } finally {
      setOcrLoading((p) => ({ ...p, [type]: false }));
    }
  }

  function showAgencyMsg(type: "success" | "error", text: string) {
    setAgencyMsg({ type, text });
    setTimeout(() => setAgencyMsg(null), 4000);
  }

  async function handleAgencyLogoUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const { data } = await api.post("/profile/agency-logo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAgencyLogoUrl(data.logo_url);
      showAgencyMsg("success", "Logo uploadé avec succès !");
    } catch {
      showAgencyMsg("error", "Erreur lors de l'upload du logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleDeleteLogo() {
    try {
      await api.delete("/profile/agency-logo");
      setAgencyLogoUrl(null);
      showAgencyMsg("success", "Logo supprimé.");
    } catch {
      showAgencyMsg("error", "Erreur lors de la suppression.");
    }
  }

  async function handleSaveAgency() {
    setSavingAgency(true);
    try {
      await api.put("/profile", {
        is_agency: isAgency,
        agency_name: agencyName,
        agency_description: agencyDescription,
        agency_rc: agencyRc,
        agency_phone: agencyPhone,
        agency_website: agencyWebsite,
      });
      showAgencyMsg("success", "Informations agence sauvegardées !");
    } catch {
      showAgencyMsg("error", "Erreur lors de la sauvegarde.");
    } finally {
      setSavingAgency(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    setUploadingAvatar(true);
    const url = await saveAvatar(file);
    if (url) setAvatarPreview(url);
    setUploadingAvatar(false);
  }

  async function handleSave() {
    const ok = await saveProfile();
    if (ok) setEditing(false);
  }

  function toggleService(id: ServiceType) {
    setForm((f) => ({
      ...f,
      services: f.services.includes(id)
        ? f.services.length === 1
          ? f.services
          : f.services.filter((s) => s !== id)
        : [...f.services, id],
    }));
  }

  async function handleSaveServices() {
    await saveProfile({ services: form.services });
  }

  async function handleChangePw() {
    const ok = await changePassword(pwCurrent, pwNew, pwConfirm);
    if (ok) {
      setChangingPw(false);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    }
  }

  const getInitial = () =>
    (form.first_name || user?.name || "O")[0].toUpperCase();
  const avatarSrc = avatarPreview ?? user?.avatar ?? null;

  const fullName =
    form.first_name && form.last_name
      ? `${form.first_name} ${form.last_name}`
      : (user?.name ?? "");

  const stats = {
    pending: 0,
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profil" },
    { id: "services", label: "Services" },
    { id: "security", label: "Sécurité" },
    { id: "activity", label: "Activité" },
    { id: "agency", label: "Mon agence" },
    { id: "documents", label: "Documents" },
    { id: "social", label: "Réseaux sociaux" }, // ← ajouter
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        user={user || undefined}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentPath={currentPath}
        stats={stats}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden text-gray-600"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Mon profil</h1>
                <p className="text-xs text-gray-400">
                  Gérez vos informations personnelles
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative text-gray-500">
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <AnimatePresence>
            {msg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mb-6 p-3 rounded-xl flex items-center gap-2 text-sm ${
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

          <div className="flex gap-1 mb-8 border-b border-gray-200">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-medium relative transition ${
                  tab === t.id
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <motion.div
                    layoutId="ownerTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                  />
                )}
              </button>
            ))}
          </div>

          {/* ── TAB PROFIL ──────────────────────────────────────────────────── */}
          {tab === "profile" && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-md p-6 sticky top-20">
                  <div className="text-center mb-5">
                    <div className="relative inline-block">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden mx-auto">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl font-bold text-white">
                            {getInitial()}
                          </span>
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow-md transition">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                        {uploadingAvatar ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 text-white" />
                        )}
                      </label>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 mt-3">
                      {fullName}
                    </h2>
                    <p className="text-sm text-gray-500">Propriétaire</p>

                    <div className="flex flex-wrap justify-center gap-1 mt-3">
                      {form.services.map((s) => {
                        const opt = SERVICE_OPTIONS.find((o) => o.id === s);
                        return opt ? (
                          <span
                            key={s}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                          >
                            {opt.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                    {[
                      { val: form.services.length, label: "Services" },
                      { val: "—", label: "Réservations" },
                      { val: "—", label: "Véhicules" },
                      { val: "—", label: "Note" },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-2">
                        <p className="text-lg font-bold text-gray-800">
                          {s.val}
                        </p>
                        <p className="text-xs text-gray-500">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:shadow-md transition"
                    >
                      <Edit2 className="w-4 h-4" /> Modifier le profil
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-5">
                    {editing
                      ? "Modifier le profil"
                      : "Informations personnelles"}
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {(["first_name", "last_name"] as const).map((key) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {key === "first_name" ? "Prénom" : "Nom"}
                          </label>
                          {editing ? (
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input
                                type="text"
                                value={form[key]}
                                onChange={(e) =>
                                  setForm((f) => ({
                                    ...f,
                                    [key]: e.target.value,
                                  }))
                                }
                                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          ) : (
                            <p className="text-sm text-gray-800 py-2">
                              {form[key] || (
                                <span className="text-gray-400">
                                  Non renseigné
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Email
                      </label>
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {user?.email}
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-auto">
                          Non modifiable
                        </span>
                      </div>
                    </div>

                    {[
                      {
                        label: "Téléphone",
                        key: "phone" as const,
                        icon: Phone,
                        placeholder: "+212 6XX XXX XXX",
                      },
                      {
                        label: "Ville",
                        key: "city" as const,
                        icon: MapPin,
                        placeholder: "Casablanca",
                      },
                      {
                        label: "Adresse",
                        key: "address" as const,
                        icon: MapPin,
                        placeholder: "123 Rue Hassan II",
                      },
                    ].map(({ label, key, icon: Icon, placeholder }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {label}
                        </label>
                        {editing ? (
                          <div className="relative">
                            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              value={form[key]}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  [key]: e.target.value,
                                }))
                              }
                              placeholder={placeholder}
                              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-gray-800 py-2">
                            {form[key] || (
                              <span className="text-gray-400">
                                Non renseigné
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    ))}

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Bio{" "}
                        <span className="text-gray-400">
                          (présentation publique)
                        </span>
                      </label>
                      {editing ? (
                        <textarea
                          rows={3}
                          value={form.bio}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, bio: e.target.value }))
                          }
                          placeholder="Décrivez-vous : votre expérience, vos services, votre zone…"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      ) : (
                        <p className="text-sm text-gray-800 py-2 whitespace-pre-wrap">
                          {form.bio || (
                            <span className="text-gray-400">
                              Aucune bio renseignée
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {editing && (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-md transition"
                        >
                          {saving ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                              Sauvegarde…
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" /> Enregistrer
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setEditing(false)}
                          className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                        >
                          <X className="w-4 h-4" /> Annuler
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB SERVICES ────────────────────────────────────────────────── */}
          {tab === "services" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-800">
                    Mes services
                  </h3>
                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
                    {form.services.length} actif
                    {form.services.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  {SERVICE_OPTIONS.map((svc) => {
                    const Icon = svc.icon;
                    const selected = form.services.includes(svc.id);
                    return (
                      <motion.button
                        key={svc.id}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => toggleService(svc.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
                          selected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            selected
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
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
                </div>

                <button
                  onClick={handleSaveServices}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-md transition"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                      Sauvegarde…
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Enregistrer les services
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── TAB SÉCURITÉ ────────────────────────────────────────────────── */}
          {tab === "security" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-5">
                  Sécurité du compte
                </h3>
                {!changingPw ? (
                  <div className="space-y-3">
                    {[
                      {
                        icon: Lock,
                        title: "Mot de passe",
                        sub: "Modifier votre mot de passe",
                        action: () => setChangingPw(true),
                        label: "Changer",
                      },
                      {
                        icon: Mail,
                        title: "Email",
                        sub: user?.email ?? "",
                        action: () => {},
                        label: "Modifier",
                      },
                    ].map(({ icon: Icon, title, sub, action, label }) => (
                      <div
                        key={title}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {title}
                            </p>
                            <p className="text-xs text-gray-500">{sub}</p>
                          </div>
                        </div>
                        <button
                          onClick={action}
                          className="text-sm text-blue-600 font-medium"
                        >
                          {label}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      {
                        label: "Mot de passe actuel",
                        val: pwCurrent,
                        set: setPwCurrent,
                        show: showPw.current,
                        toggle: () =>
                          setShowPw((p) => ({ ...p, current: !p.current })),
                      },
                      {
                        label: "Nouveau",
                        val: pwNew,
                        set: setPwNew,
                        show: showPw.new,
                        toggle: () => setShowPw((p) => ({ ...p, new: !p.new })),
                      },
                      {
                        label: "Confirmer",
                        val: pwConfirm,
                        set: setPwConfirm,
                        show: showPw.confirm,
                        toggle: () =>
                          setShowPw((p) => ({ ...p, confirm: !p.confirm })),
                      },
                    ].map(({ label, val, set, show, toggle }) => (
                      <div key={label}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {label}
                        </label>
                        <div className="relative">
                          <input
                            type={show ? "text" : "password"}
                            value={val}
                            onChange={(e) => set(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={toggle}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          >
                            {show ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleChangePw}
                        disabled={saving}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 hover:shadow-md transition"
                      >
                        {saving ? "Modification…" : "Changer le mot de passe"}
                      </button>
                      <button
                        onClick={() => setChangingPw(false)}
                        className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── TAB ACTIVITÉ ────────────────────────────────────────────────── */}
          {tab === "activity" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {[
                  {
                    icon: TrendingUp,
                    label: "Revenus",
                    val: "—",
                    color: "text-green-600",
                  },
                  {
                    icon: Car,
                    label: "Véhicules",
                    val: "—",
                    color: "text-blue-600",
                  },
                  {
                    icon: Star,
                    label: "Note moyenne",
                    val: "—",
                    color: "text-amber-500",
                  },
                ].map(({ icon: Icon, label, val, color }) => (
                  <div
                    key={label}
                    className="bg-white rounded-2xl shadow-md p-5 flex items-center gap-4"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center ${color}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{val}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">
                    Dernières réservations reçues
                  </h3>
                  <Link
                    href="/owner/bookings"
                    className="text-sm text-blue-600 flex items-center gap-1"
                  >
                    Voir tout <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="text-center py-12 text-gray-400">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    Aucune réservation reçue pour le moment
                  </p>
                  <button
                    onClick={() => router.push("/owner/vehicules/add")}
                    className="mt-4 text-sm text-blue-600 hover:underline"
                  >
                    Ajouter un véhicule
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── TAB AGENCE ──────────────────────────────────────── */}
          {tab === "agency" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Compte professionnel
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Activez cette option si vous êtes une agence de location
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAgency(!isAgency)}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                      isAgency ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        isAgency ? "translate-x-8" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {agencyMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm ${
                      agencyMsg.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {agencyMsg.type === "success" ? (
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    {agencyMsg.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {isAgency && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-5"
                >
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      Logo de l'agence
                    </h4>

                    <div className="flex items-start gap-5">
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                        {agencyLogoUrl ? (
                          <img
                            src={agencyLogoUrl}
                            alt="Logo agence"
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <Building2 className="w-10 h-10 text-gray-300" />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-3">
                          Formats acceptés : JPG, PNG, WebP — Max 2 MB
                        </p>
                        <div className="flex gap-2">
                          <label className="relative cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
                            {uploadingLogo ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              "Uploader un logo"
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleAgencyLogoUpload}
                              disabled={uploadingLogo}
                            />
                          </label>
                          {agencyLogoUrl && (
                            <button
                              onClick={handleDeleteLogo}
                              className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-sm hover:bg-red-50 transition"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-4">
                    <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      Informations commerciales
                    </h4>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Nom commercial <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        placeholder="Ex: AutoRent Casablanca"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Description de l'agence
                      </label>
                      <textarea
                        value={agencyDescription}
                        onChange={(e) => setAgencyDescription(e.target.value)}
                        placeholder="Décrivez votre agence, vos services, votre expérience..."
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          N° Registre de Commerce
                        </label>
                        <input
                          type="text"
                          value={agencyRc}
                          onChange={(e) => setAgencyRc(e.target.value)}
                          placeholder="Ex: RC-123456"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Téléphone agence
                        </label>
                        <input
                          type="text"
                          value={agencyPhone}
                          onChange={(e) => setAgencyPhone(e.target.value)}
                          placeholder="+212 5XX XXX XXX"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Site web
                      </label>
                      <input
                        type="url"
                        value={agencyWebsite}
                        onChange={(e) => setAgencyWebsite(e.target.value)}
                        placeholder="https://www.votre-agence.ma"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={handleSaveAgency}
                      disabled={savingAgency || !agencyName}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg transition"
                    >
                      {savingAgency ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                          Sauvegarde...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" /> Sauvegarder l'agence
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">
                      Aperçu — tel qu'affiché sur les pages publiques
                    </h4>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-gray-100">
                        {agencyLogoUrl ? (
                          <img
                            src={agencyLogoUrl}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Building2 className="w-7 h-7 text-gray-300" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">
                            {agencyName || "Nom de l'agence"}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> Agence
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {agencyRc && `RC: ${agencyRc} · `}
                          {agencyPhone || "Téléphone agence"}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {!isAgency && (
                <button
                  onClick={handleSaveAgency}
                  disabled={savingAgency}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  Enregistrer
                </button>
              )}
            </motion.div>
          )}

          {/* ── TAB DOCUMENTS ───────────────────────────────────────────────── */}
          {tab === "documents" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto space-y-4"
            >
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Documents analysés automatiquement par notre IA. Stockés de
                  façon sécurisée.
                </p>
              </div>

              {/* Infos CIN & Permis existantes */}
              {(user?.cin_number || user?.permis_number) && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-blue-500" />
                    Informations vérifiées
                  </h4>
                  {user?.cin_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">CIN N°</span>
                      <span className="font-medium">{user.cin_number}</span>
                    </div>
                  )}
                  {user?.permis_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Permis N°</span>
                      <span className="font-medium">{user.permis_number}</span>
                    </div>
                  )}
                  {user?.permis_categories && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Catégories</span>
                      <span className="font-medium">
                        {user.permis_categories}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* CIN - Recto */}
              <DocCard
                title="Carte Nationale d'Identité (Recto)"
                icon={<CreditCard className="w-5 h-5 text-white" />}
                color="from-blue-500 to-blue-700"
                uploaded={docs.cin.uploaded}
                loading={ocrLoading["cin"] ?? false}
                onUpload={(e) => handleDocUpload(e, "cin")}
                fields={[
                  { label: "N° CIN", value: docs.cin.data?.cin_number },
                  { label: "Nom", value: docs.cin.data?.last_name },
                  { label: "Prénom", value: docs.cin.data?.first_name },
                  { label: "Date naissance", value: docs.cin.data?.birth_date },
                  { label: "Expiration", value: docs.cin.data?.expiry_date },
                ]}
              />

              {/* CIN - Verso */}
              <DocCard
                title="Carte Nationale d'Identité (Verso)"
                icon={<CreditCard className="w-5 h-5 text-white" />}
                color="from-indigo-500 to-indigo-700"
                uploaded={docs.cin_verso.uploaded}
                loading={ocrLoading["cin_verso"] ?? false}
                onUpload={(e) => handleDocUpload(e, "cin_verso")}
                fields={[
                  { label: "Adresse", value: docs.cin_verso.data?.address },
                  {
                    label: "Genre",
                    value:
                      docs.cin_verso.data?.gender === "M"
                        ? "Masculin"
                        : docs.cin_verso.data?.gender === "F"
                          ? "Féminin"
                          : undefined,
                  },
                ]}
              />

              {/* Permis - Recto */}
              <DocCard
                title="Permis de Conduire (Recto)"
                icon={<Car className="w-5 h-5 text-white" />}
                color="from-purple-500 to-purple-700"
                uploaded={docs.permis.uploaded}
                loading={ocrLoading["permis"] ?? false}
                onUpload={(e) => handleDocUpload(e, "permis")}
                fields={[
                  {
                    label: "N° Permis",
                    value: docs.permis.data?.permis_number,
                  },
                  { label: "Prénom", value: docs.permis.data?.first_name },
                  { label: "Nom", value: docs.permis.data?.last_name },
                  {
                    label: "Date naissance",
                    value: docs.permis.data?.birth_date,
                  },
                  { label: "Délivrance", value: docs.permis.data?.issue_date },
                  { label: "Expiration", value: docs.permis.data?.expiry_date },
                  {
                    label: "Catégories",
                    value: docs.permis.data?.categories?.join(", "),
                  },
                ]}
              />

              {/* Permis - Verso */}
              <DocCard
                title="Permis de Conduire (Verso)"
                icon={<Car className="w-5 h-5 text-white" />}
                color="from-pink-500 to-rose-700"
                uploaded={docs.permis_verso.uploaded}
                loading={ocrLoading["permis_verso"] ?? false}
                onUpload={(e) => handleDocUpload(e, "permis_verso")}
                fields={[
                  {
                    label: "N° Permis (complet)",
                    value: docs.permis_verso.data?.permis_number,
                  },
                  {
                    label: "Expiration",
                    value: docs.permis_verso.data?.expiry_date,
                  },
                  {
                    label: "Catégories",
                    value: docs.permis_verso.data?.categories?.join(", "),
                  },
                ]}
              />
            </motion.div>
          )}
          {/* ── TAB RÉSEAUX SOCIAUX ──────────────────────────────────────── */}
          {tab === "social" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              {/* Header */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      Réseaux sociaux
                    </h3>
                    <p className="text-sm text-gray-500">
                      Connectez vos pages pour publier automatiquement vos
                      annonces
                    </p>
                  </div>
                  <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                    Premium IA
                  </span>
                </div>
              </div>

              {/* Composant de connexion */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <SocialAccountsSetup />
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
