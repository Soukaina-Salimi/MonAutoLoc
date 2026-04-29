"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import SocialAccountsSetup from "@/components/SocialAccountsSetup";
import MarketingPublisher from "@/components/MarketingPublisher";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Car,
  PlusCircle,
  LayoutDashboard,
  Calendar,
  Settings,
  Bell,
  Zap,
  DollarSign,
  Menu,
  LogOut,
  X,
  Upload,
  ArrowLeft,
  Fuel,
  Gauge,
  Users,
  MapPin,
  Palette,
  Bike,
  Truck,
  Cpu,
  ScanLine,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  RotateCcw,
} from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
  role: { id: number; name: string };
}

// Champs pré-remplis par OCR
interface OcrPrefilled {
  brand?: boolean;
  model?: boolean;
  fuelType?: boolean;
  seats?: boolean;
  engineCc?: boolean;
  puissance?: boolean;
  category?: boolean;
  year?: boolean; // Ajout pour l'année
}
// ── AVANT export default function AddVehicle() { ──────────
// Ce composant doit être DEHORS du composant principal

const OcrInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  icon,
  isPrefilled,
  onClearPrefill,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: React.ReactNode;
  isPrefilled?: boolean;
  onClearPrefill?: () => void;
  min?: string;
  max?: string;
  step?: string;
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {icon && <span className="inline mr-1">{icon}</span>}
        {label} {required && <span className="text-red-500">*</span>}
        {isPrefilled && (
          <span className="ml-2 text-xs text-green-600 font-normal inline-flex items-center gap-1">
            <ScanLine className="w-3 h-3" /> OCR
          </span>
        )}
      </label>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (onClearPrefill) onClearPrefill();
          }}
          min={min}
          max={max}
          step={step}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none
                        ${
                          isPrefilled
                            ? "border-green-400 bg-green-50 text-green-800 pr-10"
                            : "border-gray-300 pr-4"
                        }`}
        />
        {isPrefilled && onClearPrefill && (
          <button
            type="button"
            onClick={onClearPrefill}
            title="Retirer le badge OCR"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500 hover:text-gray-400 transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
        )}
      </div>
      {isPrefilled && (
        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <ScanLine className="w-3 h-3" /> Pré-rempli depuis la carte grise
        </p>
      )}
    </div>
  );
};

// ── Maintenant le composant principal ─────────────────────
export default function AddVehicle() {
  const router = useRouter();
  const currentPath = "/owner/add-vehicule";

  // Champs formulaire
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("voiture");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [fuelType, setFuelType] = useState("Essence");
  const [transmission, setTransmission] = useState("Manuelle");
  const [seats, setSeats] = useState("5");
  const [engineCc, setEngineCc] = useState("");
  const [puissance, setPuissance] = useState("5");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [ocrPrefilled, setOcrPrefilled] = useState<OcrPrefilled>({});
  // Ajoute ces states avec les autres
  const [immatriculationAncienne, setImmatriculationAncienne] = useState("");
  const [firstRegistration, setFirstRegistration] = useState("");
  const [expiryDateCG, setExpiryDateCG] = useState("");
  const [chassis, setChassis] = useState("");
  const [ptac, setPtac] = useState("");
  const [cylindres, setCylindres] = useState("");
  const [genre, setGenre] = useState("");
  const [ownerNameCG, setOwnerNameCG] = useState("");
  // OCR states
  const [ocrSectionOpen, setOcrSectionOpen] = useState(false);
  const [ocrRectoFile, setOcrRectoFile] = useState<File | null>(null);
  const [ocrVersoFile, setOcrVersoFile] = useState<File | null>(null);
  const [ocrRectoLoading, setOcrRectoLoading] = useState(false);
  const [ocrVersoLoading, setOcrVersoLoading] = useState(false);
  const [ocrRectoResult, setOcrRectoResult] = useState<any>(null);
  const [ocrVersoResult, setOcrVersoResult] = useState<any>(null);
  const [ocrRectoPreview, setOcrRectoPreview] = useState<string | null>(null);
  const [ocrVersoPreview, setOcrVersoPreview] = useState<string | null>(null);
  const [immatriculation, setImmatriculation] = useState<string | null>(null);

  const [offersDriver, setOffersDriver] = useState(false);
  const [driverDailyRate, setDriverDailyRate] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    try {
      const parsedUser: User = JSON.parse(userData);
      if (parsedUser.role.name !== "owner") {
        router.push("/dashboard");
        return;
      }
      setUser(parsedUser);
    } catch {
      router.push("/login");
    }
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p));
    };
  }, []);

  // Dans add-vehicule, remplacez fetch par api

  // === OCR RECTO ===
  const handleOcrRecto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setOcrRectoFile(file);
    setOcrRectoPreview(URL.createObjectURL(file));
    setOcrRectoLoading(true);
    setOcrRectoResult(null);

    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("doc_type", "carte_grise");

      const { data } = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("OCR Recto response:", data);

      // ✅ L'API retourne extracted_data, pas data.data
      const d = data.extracted_data;
      setOcrRectoResult(d); // stocker extracted_data directement

      if (d) {
        const newPrefilled: OcrPrefilled = {};

        // Immatriculation
        if (d.immatriculation) setImmatriculation(d.immatriculation);
        if (d.immatriculation_ancienne)
          setImmatriculationAncienne(d.immatriculation_ancienne);
        if (d.first_registration) setFirstRegistration(d.first_registration);
        if (d.expiry_date) setExpiryDateCG(d.expiry_date);
        if (d.owner_name) setOwnerNameCG(d.owner_name);
        // Année depuis first_registration (format JJ/MM/AAAA)
        if (d.first_registration) {
          const yearMatch = d.first_registration.match(/(\d{4})$/);
          if (yearMatch) {
            setYear(yearMatch[1]);
            newPrefilled.year = true;
          }
        }

        // Usage pour catégorie
        if (d.usage) {
          const usageLower = d.usage.toLowerCase();
          if (
            usageLower.includes("particulier") ||
            usageLower.includes("sans chauffeur")
          ) {
            setCategory("voiture");
            newPrefilled.category = true;
          } else if (
            usageLower.includes("camion") ||
            usageLower.includes("utilitaire")
          ) {
            setCategory("utilitaire");
            newPrefilled.category = true;
          }
        }

        setOcrPrefilled((prev) => ({ ...prev, ...newPrefilled }));
      }
    } catch (err) {
      console.error("OCR recto error:", err);
    } finally {
      setOcrRectoLoading(false);
    }
  };

  // === OCR VERSO ===
  const handleOcrVerso = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setOcrVersoFile(file);
    setOcrVersoPreview(URL.createObjectURL(file));
    setOcrVersoLoading(true);
    setOcrVersoResult(null);

    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("doc_type", "carte_grise_verso");

      const { data } = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("OCR Verso response:", data);

      // ✅ L'API retourne extracted_data, pas data.data
      const d = data.extracted_data;
      setOcrVersoResult(d); // stocker extracted_data directement

      if (d) {
        const newPrefilled: OcrPrefilled = {};

        // Marque — clé correcte : "marque"
        if (d.marque) {
          setBrand(d.marque);
          newPrefilled.brand = true;
        }
        if (d.chassis) setChassis(d.chassis);
        if (d.ptac) setPtac(String(d.ptac));
        if (d.cylindres) setCylindres(String(d.cylindres));
        if (d.genre) setGenre(d.genre);
        // Carburant — clé correcte : "carburant"
        if (d.carburant) {
          const map: Record<string, string> = {
            diesel: "Diesel",
            essence: "Essence",
            hybride: "Hybride",
            electrique: "Électrique",
            électrique: "Électrique",
            gpl: "GPL",
          };
          const mapped = map[d.carburant.toLowerCase()];
          if (mapped) {
            setFuelType(mapped);
            newPrefilled.fuelType = true;
          } else {
            setFuelType(d.carburant);
            newPrefilled.fuelType = true;
          }
        }

        // Puissance fiscale — clé correcte : "puissance_fiscale"
        if (d.puissance_fiscale) {
          setPuissance(String(d.puissance_fiscale));
          newPrefilled.puissance = true;
        }

        // Nombre de places — clé correcte : "nb_places"
        if (d.nb_places && d.nb_places > 0) {
          setSeats(String(d.nb_places));
          newPrefilled.seats = true;
        }

        // Genre → catégorie — clé correcte : "genre"
        if (d.genre) {
          const g = d.genre.toLowerCase();
          if (g.includes("interieure") || g.includes("particulier")) {
            setCategory("voiture");
            newPrefilled.category = true;
          } else if (g.includes("camion")) {
            setCategory("camion");
            newPrefilled.category = true;
          } else if (g.includes("utilitaire")) {
            setCategory("utilitaire");
            newPrefilled.category = true;
          }
        }

        // VIN — clé correcte : "chassis"
        if (d.chassis) {
          console.log("VIN:", d.chassis);
        }

        setOcrPrefilled((prev) => ({ ...prev, ...newPrefilled }));
      }
    } catch (err) {
      console.error("OCR verso error:", err);
    } finally {
      setOcrVersoLoading(false);
    }
  };
  const handleAddVehicules = (): void => {
    router.push("/owner/add-vehicule");
  };
  const handleProfil = (): void => {
    router.push("/owner/profile");
  };
  // Réinitialiser un champ pré-rempli
  const clearOcrField = (field: keyof OcrPrefilled) => {
    setOcrPrefilled((prev) => ({ ...prev, [field]: false }));
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (images.length + files.length > 10) {
      alert("Maximum 10 images");
      return;
    }
    setImages((prev) => [...prev, ...files]);
    setPreviews((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!brand || !model || !year || !price) {
      alert("Champs obligatoires manquants");
      return;
    }
    if (images.length === 0) {
      alert("Ajoutez au moins une image");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("brand", brand);
      formData.append("model", model);
      formData.append("category", category);
      formData.append("year", year);
      formData.append("price_per_day", price);
      formData.append("fuel_type", fuelType);
      formData.append("transmission", transmission);
      if (seats) formData.append("seats", seats);
      if (engineCc) formData.append("engine_cc", engineCc);
      if (puissance) formData.append("puissance", puissance);
      if (city) formData.append("city", city);
      if (address) formData.append("address", address);
      if (description) formData.append("description", description);
      if (immatriculation) formData.append("immatriculation", immatriculation);
      if (immatriculationAncienne)
        formData.append("immatriculation_ancienne", immatriculationAncienne);
      if (firstRegistration)
        formData.append("first_registration", firstRegistration);
      if (expiryDateCG) formData.append("expiry_date_cg", expiryDateCG);
      if (ownerNameCG) formData.append("owner_name_cg", ownerNameCG);
      if (chassis) formData.append("chassis", chassis);
      if (genre) formData.append("genre", genre);
      if (ptac) formData.append("ptac", ptac);
      if (cylindres) formData.append("cylindres", cylindres);
      // Ajout des données chauffeur
      if (offersDriver) {
        formData.append("offers_driver", "1");
        if (driverDailyRate) {
          formData.append("driver_daily_rate", driverDailyRate);
        }
      } else {
        formData.append("offers_driver", "0");
      }
      images.forEach((img) => formData.append("images[]", img));
      await api.post("/vehicules", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("✅ Véhicule ajouté!");
      router.push("/owner/vehicules");
    } catch (error: any) {
      if (error.response?.status === 422) {
        const msgs = Object.values(error.response.data.errors || {})
          .flat()
          .join("\n");
        alert(`Erreur: ${msgs}`);
      } else {
        alert("Erreur serveur");
      }
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: "voiture", label: "Voiture", icon: Car },
    { value: "moto", label: "Moto", icon: Bike },
    { value: "scooter", label: "Scooter", icon: Bike },
    { value: "camion", label: "Camion", icon: Truck },
    { value: "utilitaire", label: "Utilitaire", icon: Truck },
    { value: "van", label: "Van", icon: Truck },
    { value: "velo", label: "Vélo", icon: Bike },
    { value: "trottinette", label: "Trottinette", icon: Bike },
    { value: "quad", label: "Quad", icon: Bike },
    { value: "bateau", label: "Bateau", icon: Car },
  ];
  const fuelTypes = ["Essence", "Diesel", "Électrique", "Hybride", "GPL"];
  const transmissionTypes = ["Manuelle", "Automatique"];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        user={user || undefined}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentPath={currentPath}
      />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden text-gray-600"
              >
                <Menu className="w-6 h-6" />
              </button>
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">
                Ajouter un véhicule
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative text-gray-600">
                <Bell className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </button>
              <button className="text-gray-600">
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* ===== SECTION OCR CARTE GRISE ===== */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-blue-100">
              {/* Header section OCR */}
              <button
                onClick={() => setOcrSectionOpen(!ocrSectionOpen)}
                className="w-full p-5 flex items-center justify-between hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                    <ScanLine className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-800">
                      Scanner la carte grise
                    </h3>
                    <p className="text-sm text-gray-500">
                      Pré-remplissage automatique des champs
                    </p>
                  </div>
                  {Object.values(ocrPrefilled).some(Boolean) && (
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      {Object.values(ocrPrefilled).filter(Boolean).length}{" "}
                      champ(s) rempli(s)
                    </span>
                  )}
                </div>
                {ocrSectionOpen ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Contenu section OCR */}
              {ocrSectionOpen && (
                <div className="border-t border-blue-100 p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Recto */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-700">
                          Recto
                        </span>
                        <span className="text-xs text-gray-400">
                          (immatriculation, usage)
                        </span>
                      </div>

                      {/* Zone upload recto */}
                      <label
                        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all
                                                ${ocrRectoPreview ? "border-green-300 bg-green-50" : "border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100"}`}
                        style={{ minHeight: "140px" }}
                      >
                        {ocrRectoPreview ? (
                          <div className="relative w-full h-full p-2">
                            <img
                              src={ocrRectoPreview}
                              alt="Recto"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setOcrRectoPreview(null);
                                setOcrRectoFile(null);
                                setOcrRectoResult(null);
                                setImmatriculation(null);
                              }}
                              className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow"
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                            <p className="text-sm text-blue-600 font-medium">
                              Uploader le recto
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              JPG, PNG jusqu'à 4MB
                            </p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleOcrRecto}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>

                      {/* Status recto */}
                      {ocrRectoLoading && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyse en cours...
                        </div>
                      )}
                      {/* Status recto */}
                      {ocrRectoResult && !ocrRectoLoading && (
                        <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                          {[
                            ["Immatriculation", immatriculation],
                            [
                              "1ère mise en circulation",
                              ocrRectoResult.first_registration,
                            ],
                            ["Propriétaire", ocrRectoResult.owner_name],
                            ["Usage", ocrRectoResult.usage],
                            [
                              "Immat. ancienne",
                              ocrRectoResult.immatriculation_ancienne,
                            ],
                            ["Expiration", ocrRectoResult.expiry_date],
                          ]
                            .filter(([, v]) => v)
                            .map(([label, value]) => (
                              <div
                                key={label as string}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="text-gray-500 shrink-0">
                                  {label}
                                </span>
                                <span className="text-gray-700 font-medium text-right">
                                  {value as string}
                                </span>
                              </div>
                            ))}
                          {!immatriculation &&
                            !ocrRectoResult.first_registration && (
                              <p className="text-gray-400 italic">
                                Données limitées sur cette image
                              </p>
                            )}
                        </div>
                      )}
                    </div>

                    {/* Verso */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-semibold text-gray-700">
                          Verso
                        </span>
                        <span className="text-xs text-gray-400">
                          (marque, cylindres, PTAC…)
                        </span>
                      </div>

                      {/* Zone upload verso */}
                      <label
                        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all
                                                ${ocrVersoPreview ? "border-green-300 bg-green-50" : "border-indigo-200 bg-indigo-50 hover:border-indigo-400 hover:bg-indigo-100"}`}
                        style={{ minHeight: "140px" }}
                      >
                        {ocrVersoPreview ? (
                          <div className="relative w-full h-full p-2">
                            <img
                              src={ocrVersoPreview}
                              alt="Verso"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setOcrVersoPreview(null);
                                setOcrVersoFile(null);
                                setOcrVersoResult(null);
                              }}
                              className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow"
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                            <p className="text-sm text-indigo-600 font-medium">
                              Uploader le verso
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              JPG, PNG jusqu'à 4MB
                            </p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleOcrVerso}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>

                      {/* Status verso */}
                      {ocrVersoLoading && (
                        <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyse en cours...
                        </div>
                      )}
                      {/* Status verso */}
                      {ocrVersoResult && !ocrVersoLoading && (
                        <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                          {[
                            ["Marque", ocrVersoResult.marque],
                            ["Carburant", ocrVersoResult.carburant],
                            [
                              "Puissance",
                              ocrVersoResult.puissance_fiscale
                                ? `${ocrVersoResult.puissance_fiscale} CV`
                                : null,
                            ],
                            ["Places", ocrVersoResult.nb_places],
                            ["Cylindres", ocrVersoResult.cylindres],
                            [
                              "PTAC",
                              ocrVersoResult.ptac
                                ? `${ocrVersoResult.ptac} kg`
                                : null,
                            ],
                            ["Genre", ocrVersoResult.genre],
                            ["VIN", ocrVersoResult.chassis],
                          ]
                            .filter(([, v]) => v)
                            .map(([label, value]) => (
                              <div
                                key={label as string}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="text-gray-500 shrink-0">
                                  {label}
                                </span>
                                <span className="text-gray-700 font-medium text-right">
                                  {value as string}
                                </span>
                              </div>
                            ))}
                          {!ocrVersoResult.marque &&
                            !ocrVersoResult.carburant && (
                              <p className="text-gray-400 italic">
                                Données non lisibles
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info champs pré-remplis */}
                  {Object.values(ocrPrefilled).some(Boolean) && (
                    <div className="mt-4 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-green-700">
                        Les champs marqués en vert ont été pré-remplis
                        automatiquement. Cliquez sur{" "}
                        <CheckCircle className="w-3 h-3 inline" /> pour les
                        modifier manuellement.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ===== FORMULAIRE ===== */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="hidden lg:block p-6 border-b">
                <button
                  onClick={() => router.back()}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Photos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photos du véhicule <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition p-4">
                    {previews.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {previews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={preview}
                                alt={`Aperçu ${index + 1}`}
                                className="h-24 w-full object-cover rounded-lg shadow-md"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-center">
                          <label className="relative cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
                            <span>Ajouter d'autres photos</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleImagesChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <div className="flex flex-col items-center text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mb-2">
                            <span>Choisir des photos</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleImagesChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </label>
                          <p className="text-xs text-gray-400 mt-2">
                            PNG, JPG jusqu'à 4MB (max 10 photos)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Infos générales ───────────────────────────── */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Informations générales
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Catégorie */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catégorie <span className="text-red-500">*</span>
                    {ocrPrefilled.category && (
                      <span className="ml-2 text-xs text-green-600 font-normal inline-flex items-center gap-1">
                        <ScanLine className="w-3 h-3" /> OCR
                      </span>
                    )}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      clearOcrField("category");
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${ocrPrefilled.category ? "border-green-400 bg-green-50" : "border-gray-300"}`}
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Marque & Modèle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <OcrInput
                    label="Marque"
                    value={brand}
                    onChange={setBrand}
                    placeholder="Ex: Dacia, Renault..."
                    required
                    isPrefilled={ocrPrefilled.brand}
                    onClearPrefill={() => clearOcrField("brand")}
                  />
                  <OcrInput
                    label="Modèle"
                    value={model}
                    onChange={setModel}
                    placeholder="Ex: Logan, Clio..."
                    required
                    isPrefilled={ocrPrefilled.model}
                    onClearPrefill={() => clearOcrField("model")}
                  />
                </div>

                {/* Année & Prix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <OcrInput
                    label="Année"
                    value={year}
                    onChange={setYear}
                    placeholder="Ex: 2018"
                    type="number"
                    required
                    min="1900"
                    max={String(new Date().getFullYear() + 1)}
                    isPrefilled={ocrPrefilled.year}
                    onClearPrefill={() => clearOcrField("year")}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prix par jour (MAD){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 300"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* ── Caractéristiques techniques ───────────────── */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Caractéristiques techniques
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Carburant & Transmission */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Fuel className="w-4 h-4 inline mr-1" /> Carburant
                      {ocrPrefilled.fuelType && (
                        <span className="ml-2 text-xs text-green-600 font-normal inline-flex items-center gap-1">
                          <ScanLine className="w-3 h-3" /> OCR
                        </span>
                      )}
                    </label>
                    <select
                      value={fuelType}
                      onChange={(e) => {
                        setFuelType(e.target.value);
                        clearOcrField("fuelType");
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${ocrPrefilled.fuelType ? "border-green-400 bg-green-50" : "border-gray-300"}`}
                    >
                      {fuelTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Gauge className="w-4 h-4 inline mr-1" /> Transmission
                    </label>
                    <select
                      value={transmission}
                      onChange={(e) => setTransmission(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {transmissionTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Places & Cylindrée & Puissance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(category === "voiture" ||
                    category === "utilitaire" ||
                    category === "van" ||
                    category === "camion") && (
                    <OcrInput
                      label="Nombre de places"
                      value={seats}
                      onChange={setSeats}
                      placeholder="Ex: 5"
                      type="number"
                      min="1"
                      max="50"
                      icon={<Users className="w-4 h-4 inline" />}
                      isPrefilled={ocrPrefilled.seats}
                      onClearPrefill={() => clearOcrField("seats")}
                    />
                  )}
                  {(category === "moto" ||
                    category === "scooter" ||
                    category === "quad") && (
                    <OcrInput
                      label="Cylindrée (cm³)"
                      value={engineCc}
                      onChange={setEngineCc}
                      placeholder="Ex: 125"
                      type="number"
                      min="50"
                      max="5000"
                      icon={<Cpu className="w-4 h-4 inline" />}
                      isPrefilled={ocrPrefilled.engineCc}
                      onClearPrefill={() => clearOcrField("engineCc")}
                    />
                  )}
                  <OcrInput
                    label="Puissance fiscale (CV)"
                    value={puissance}
                    onChange={setPuissance}
                    placeholder="Ex: 6"
                    type="number"
                    min="1"
                    icon={<Gauge className="w-4 h-4 inline" />}
                    isPrefilled={ocrPrefilled.puissance}
                    onClearPrefill={() => clearOcrField("puissance")}
                  />
                </div>

                {/* ── Données carte grise (toujours visibles) ──── */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <ScanLine className="w-3 h-3" /> Données carte grise
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Immatriculation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      Immatriculation
                      {immatriculation && (
                        <span className="text-xs text-green-600 inline-flex items-center gap-1">
                          <ScanLine className="w-3 h-3" /> OCR
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={immatriculation ?? ""}
                      onChange={(e) => setImmatriculation(e.target.value)}
                      placeholder="Ex: 12345-A-06"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none
                        ${immatriculation ? "border-green-400 bg-green-50 text-green-800" : "border-gray-300"}`}
                    />
                  </div>

                  {/* Immatriculation ancienne */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      Immatriculation ancienne
                      {immatriculationAncienne && (
                        <span className="text-xs text-green-600 inline-flex items-center gap-1">
                          <ScanLine className="w-3 h-3" /> OCR
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={immatriculationAncienne}
                      onChange={(e) =>
                        setImmatriculationAncienne(e.target.value)
                      }
                      placeholder="Ex: WW123456"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none
                        ${immatriculationAncienne ? "border-green-400 bg-green-50 text-green-800" : "border-gray-300"}`}
                    />
                  </div>

                  {/* 1ère mise en circulation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> 1ère mise en circulation
                      {firstRegistration && (
                        <span className="text-xs text-green-600 inline-flex items-center gap-1">
                          <ScanLine className="w-3 h-3" /> OCR
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={firstRegistration}
                      onChange={(e) => setFirstRegistration(e.target.value)}
                      placeholder="Ex: 25/04/2018"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none
                        ${firstRegistration ? "border-green-400 bg-green-50 text-green-800" : "border-gray-300"}`}
                    />
                  </div>

                  {/* Expiration carte grise */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> Expiration carte grise
                      {expiryDateCG && (
                        <span className="text-xs text-green-600 inline-flex items-center gap-1">
                          <ScanLine className="w-3 h-3" /> OCR
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={expiryDateCG}
                      onChange={(e) => setExpiryDateCG(e.target.value)}
                      placeholder="Ex: 25/06/2028"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none
                        ${expiryDateCG ? "border-green-400 bg-green-50 text-green-800" : "border-gray-300"}`}
                    />
                  </div>

                  {/* N° Châssis VIN */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Cpu className="w-4 h-4" /> N° Châssis (VIN)
                      {chassis && (
                        <span className="text-xs text-green-600 inline-flex items-center gap-1">
                          <ScanLine className="w-3 h-3" /> OCR
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={chassis}
                      onChange={(e) => setChassis(e.target.value)}
                      placeholder="Ex: VF1RFD00063254789"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm
                        ${chassis ? "border-green-400 bg-green-50 text-green-800" : "border-gray-300"}`}
                    />
                  </div>

                  {/* Genre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Car className="w-4 h-4" /> Genre véhicule
                      {genre && (
                        <span className="text-xs text-green-600 inline-flex items-center gap-1">
                          <ScanLine className="w-3 h-3" /> OCR
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      placeholder="Ex: CONDUITE INTERIEURE"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none
                        ${genre ? "border-green-400 bg-green-50 text-green-800" : "border-gray-300"}`}
                    />
                  </div>

                  {/* PTAC */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Truck className="w-4 h-4" /> PTAC (kg)
                      {ptac && (
                        <span className="text-xs text-green-600 inline-flex items-center gap-1">
                          <ScanLine className="w-3 h-3" /> OCR
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={ptac}
                      onChange={(e) => setPtac(e.target.value)}
                      placeholder="Ex: 1575"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none
                        ${ptac ? "border-green-400 bg-green-50 text-green-800" : "border-gray-300"}`}
                    />
                  </div>

                  {/* Cylindres */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Cpu className="w-4 h-4" /> Cylindres
                      {cylindres && (
                        <span className="text-xs text-green-600 inline-flex items-center gap-1">
                          <ScanLine className="w-3 h-3" /> OCR
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={cylindres}
                      onChange={(e) => setCylindres(e.target.value)}
                      placeholder="Ex: 4"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none
                        ${cylindres ? "border-green-400 bg-green-50 text-green-800" : "border-gray-300"}`}
                    />
                  </div>

                  {/* Propriétaire carte grise */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Users className="w-4 h-4" /> Propriétaire (carte grise)
                      {ownerNameCG && (
                        <span className="text-xs text-green-600 inline-flex items-center gap-1">
                          <ScanLine className="w-3 h-3" /> OCR
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={ownerNameCG}
                      onChange={(e) => setOwnerNameCG(e.target.value)}
                      placeholder="Nom du propriétaire"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none
                        ${ownerNameCG ? "border-green-400 bg-green-50 text-green-800" : "border-gray-300"}`}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Information extraite de la carte grise — à titre indicatif
                    </p>
                  </div>
                </div>

                {/* ── Service chauffeur ──────────────────────────────── */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <Users className="w-3 h-3" /> Service chauffeur
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <label className="font-semibold text-gray-800">
                          Proposer un chauffeur
                        </label>
                        <p className="text-xs text-gray-500">
                          Permettez aux clients de louer votre véhicule avec
                          chauffeur
                        </p>
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <button
                      type="button"
                      onClick={() => setOffersDriver(!offersDriver)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${offersDriver ? "bg-amber-500" : "bg-gray-300"}`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${offersDriver ? "translate-x-6" : "translate-x-0"}`}
                      />
                    </button>
                  </div>

                  {offersDriver && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 border-t border-amber-200 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-amber-600" />
                              Tarif journalier par chauffeur{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                MAD
                              </span>
                              <input
                                type="number"
                                value={driverDailyRate}
                                onChange={(e) =>
                                  setDriverDailyRate(e.target.value)
                                }
                                placeholder="Ex: 200"
                                min="0"
                                step="10"
                                className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              Prix par jour et par chauffeur (max 2 chauffeurs
                              par réservation)
                            </p>
                          </div>
                          <div className="bg-amber-100 rounded-lg p-3">
                            <p className="text-xs font-medium text-amber-800 mb-1">
                              📌 Information
                            </p>
                            <p className="text-xs text-amber-700">
                              Les clients pourront choisir 1 ou 2 chauffeurs
                              lors de leur réservation. Le montant total sera
                              automatiquement calculé en fonction du nombre de
                              jours et du nombre de chauffeurs.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* ── Localisation ──────────────────────────────── */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Localisation
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" /> Ville
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Casablanca, Rabat..."
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" /> Adresse de
                      retrait
                    </label>
                    <input
                      type="text"
                      placeholder="Adresse complète"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Décrivez votre véhicule, caractéristiques, options, état..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                {/* ── Marketing réseaux sociaux ──────────────────────── */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Marketing Premium
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm mb-1">
                      Vos comptes réseaux sociaux
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">
                      Connectez vos comptes pour publier automatiquement après
                      ajout du véhicule
                    </p>
                    <SocialAccountsSetup />
                  </div>
                </div>
                {/* Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                    <Car className="w-4 h-4 mr-2" /> Informations importantes
                  </h3>
                  <ul className="text-xs text-blue-600 space-y-1">
                    <li>• Les champs marqués d'une * sont obligatoires</li>
                    <li>• Vous pouvez ajouter jusqu'à 10 photos</li>
                    <li>
                      • Les champs en vert ont été pré-remplis par le scanner de
                      carte grise
                    </li>
                    <li>
                      • Tous les champs sont modifiables même après
                      pré-remplissage
                    </li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Ajout
                        en cours...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4 mr-2" /> Ajouter le
                        véhicule
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => router.back()}
                    disabled={loading}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
            {/* Aperçu */}
            {(brand || model || year || price) && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Aperçu
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Car className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">
                      {brand || "Marque"} {model || "Modèle"}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {year || "Année"} • {price || "0"} MAD/jour
                    </p>
                    {immatriculation && (
                      <p className="text-sm text-gray-500">
                        🪪 {immatriculation}
                      </p>
                    )}
                    {city && <p className="text-sm text-gray-500">📍 {city}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
