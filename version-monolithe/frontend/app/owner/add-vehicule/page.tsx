"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import {
    Car, PlusCircle, LayoutDashboard, Calendar, Settings, Bell,
    Menu, LogOut, X, Upload, ArrowLeft, Fuel, Gauge, Users,
    MapPin, Palette, Bike, Truck, Cpu, ScanLine, CheckCircle,
    ChevronDown, ChevronUp, Loader2, FileText, RotateCcw
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
}

export default function AddVehicle() {
    const router = useRouter();

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

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (!userData) { router.push("/login"); return; }
        try {
            const parsedUser: User = JSON.parse(userData);
            if (parsedUser.role.name !== "owner") { router.push("/dashboard"); return; }
            setUser(parsedUser);
        } catch { router.push("/login"); }
        return () => { previews.forEach(p => URL.revokeObjectURL(p)); };
    }, []);

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
            formData.append("file", file);
            formData.append("doc_type", "carte_grise");

            const res = await fetch("http://localhost:8001/ocr/extract", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            setOcrRectoResult(data);

            if (data.success && data.data) {
                const d = data.data;
                const newPrefilled: OcrPrefilled = {};

                // Immatriculation (affiché mais pas dans le form)
                if (d.immatriculation) setImmatriculation(d.immatriculation);

                // Déduire catégorie depuis l'usage
                if (d.usage) {
                    const usageLower = d.usage.toLowerCase();
                    if (usageLower.includes("particulier")) {
                        setCategory("voiture");
                        newPrefilled.category = true;
                    } else if (usageLower.includes("camion") || usageLower.includes("utilitaire")) {
                        setCategory("utilitaire");
                        newPrefilled.category = true;
                    }
                }

                setOcrPrefilled(prev => ({ ...prev, ...newPrefilled }));
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
            formData.append("file", file);
            formData.append("doc_type", "carte_grise_verso");

            const res = await fetch("http://localhost:8001/ocr/extract", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            setOcrVersoResult(data);

            if (data.success && data.data) {
                const d = data.data;
                const newPrefilled: OcrPrefilled = {};

                // Marque
                if (d.marque) {
                    setBrand(d.marque);
                    newPrefilled.brand = true;
                }

                // Modèle
                if (d.modele) {
                    setModel(d.modele);
                    newPrefilled.model = true;
                }

                // Carburant
                if (d.carburant) {
                    const map: Record<string, string> = {
                        "diesel": "Diesel",
                        "essence": "Essence",
                        "hybride": "Hybride",
                        "electrique": "Électrique",
                        "gpl": "GPL",
                        "gnv": "GPL",
                    };
                    const mapped = map[d.carburant.toLowerCase()];
                    if (mapped) { setFuelType(mapped); newPrefilled.fuelType = true; }
                }

                // Puissance fiscale
                if (d.puissance_fiscale) {
                    setPuissance(String(d.puissance_fiscale));
                    newPrefilled.puissance = true;
                }

                // Nombre de places
                if (d.nb_places && d.nb_places > 0) {
                    setSeats(String(d.nb_places));
                    newPrefilled.seats = true;
                }

                // Cylindres -> engineCc (approximation: cylindres * 250cc)
                if (d.cylindres && d.cylindres > 0 && !d.nb_places) {
                    setEngineCc(String(d.cylindres * 250));
                    newPrefilled.engineCc = true;
                }

                // Genre -> catégorie
                if (d.genre) {
                    const g = d.genre.toLowerCase();
                    if (g.includes("particulier")) { setCategory("voiture"); newPrefilled.category = true; }
                    else if (g.includes("camion")) { setCategory("camion"); newPrefilled.category = true; }
                    else if (g.includes("utilitaire")) { setCategory("utilitaire"); newPrefilled.category = true; }
                }

                setOcrPrefilled(prev => ({ ...prev, ...newPrefilled }));
            }
        } catch (err) {
            console.error("OCR verso error:", err);
        } finally {
            setOcrVersoLoading(false);
        }
    };

    // Réinitialiser un champ pré-rempli
    const clearOcrField = (field: keyof OcrPrefilled) => {
        setOcrPrefilled(prev => ({ ...prev, [field]: false }));
    };

    const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        if (images.length + files.length > 10) { alert("Maximum 10 images"); return; }
        setImages(prev => [...prev, ...files]);
        setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    };

    const removeImage = (index: number) => {
        URL.revokeObjectURL(previews[index]);
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!brand || !model || !year || !price) { alert("Champs obligatoires manquants"); return; }
        if (images.length === 0) { alert("Ajoutez au moins une image"); return; }
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
            images.forEach(img => formData.append("images[]", img));
            await api.post("/vehicules", formData, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
            });
            alert("✅ Véhicule ajouté!");
            router.push("/owner/vehicules");
        } catch (error: any) {
            if (error.response?.status === 422) {
                const msgs = Object.values(error.response.data.errors || {}).flat().join("\n");
                alert(`Erreur: ${msgs}`);
            } else { alert("Erreur serveur"); }
        } finally { setLoading(false); }
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

    // Composant input avec badge OCR
    const OcrInput = ({
        label, value, onChange, placeholder, type = "text", required, icon, fieldKey, min, max, step
    }: {
        label: string; value: string; onChange: (v: string) => void; placeholder?: string;
        type?: string; required?: boolean; icon?: React.ReactNode; fieldKey?: keyof OcrPrefilled;
        min?: string; max?: string; step?: string;
    }) => {
        const isPrefilled = fieldKey && ocrPrefilled[fieldKey];
        return (
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {icon && <span className="inline mr-1">{icon}</span>}
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                    <input
                        type={type}
                        placeholder={placeholder}
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        min={min} max={max} step={step}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none pr-${isPrefilled ? '10' : '4'}
                            ${isPrefilled ? 'border-green-400 bg-green-50 text-green-800' : 'border-gray-300'}`}
                    />
                    {isPrefilled && fieldKey && (
                        <button
                            type="button"
                            onClick={() => clearOcrField(fieldKey)}
                            title="Effacer la valeur OCR"
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

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 transition duration-200 ease-in-out w-64 bg-white shadow-lg z-30`}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-xl">{user?.name?.charAt(0).toUpperCase() || "O"}</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-800 truncate">{user?.name}</h3>
                                <p className="text-sm text-gray-500">Propriétaire</p>
                            </div>
                        </div>
                    </div>
                    <nav className="flex-1 p-4">
                        <div className="space-y-2">
                            {[
                                { label: "Tableau de bord", icon: LayoutDashboard, onClick: () => router.push("/owner/dashboard") },
                                { label: "Réservations", icon: Calendar, onClick: () => router.push("/owner/bookings") },
                                { label: "Mes véhicules", icon: Car, onClick: () => router.push("/owner/vehicules") },
                            ].map(item => (
                                <button key={item.label} onClick={item.onClick} className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg">
                                    <item.icon className="w-5 h-5" /><span>{item.label}</span>
                                </button>
                            ))}
                            <button className="w-full flex items-center space-x-3 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg font-medium">
                                <PlusCircle className="w-5 h-5" /><span>Ajouter véhicule</span>
                            </button>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                            <button onClick={() => { localStorage.clear(); router.push("/"); }} className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg">
                                <LogOut className="w-5 h-5" /><span>Déconnexion</span>
                            </button>
                        </div>
                    </nav>
                </div>
            </div>

            {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

            {/* Main Content */}
            <div className="flex-1">
                <header className="bg-white shadow-sm sticky top-0 z-10">
                    <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden text-gray-600">
                                <Menu className="w-6 h-6" />
                            </button>
                            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg lg:hidden">
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <h1 className="text-2xl font-bold text-gray-800">Ajouter un véhicule</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button className="relative text-gray-600">
                                <Bell className="w-6 h-6" />
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">3</span>
                            </button>
                            <button className="text-gray-600"><Settings className="w-6 h-6" /></button>
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
                                        <h3 className="font-semibold text-gray-800">Scanner la carte grise</h3>
                                        <p className="text-sm text-gray-500">Pré-remplissage automatique des champs</p>
                                    </div>
                                    {Object.values(ocrPrefilled).some(Boolean) && (
                                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                            {Object.values(ocrPrefilled).filter(Boolean).length} champ(s) rempli(s)
                                        </span>
                                    )}
                                </div>
                                {ocrSectionOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                            </button>

                            {/* Contenu section OCR */}
                            {ocrSectionOpen && (
                                <div className="border-t border-blue-100 p-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                                        {/* Recto */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileText className="w-4 h-4 text-blue-600" />
                                                <span className="text-sm font-semibold text-gray-700">Recto</span>
                                                <span className="text-xs text-gray-400">(immatriculation, usage)</span>
                                            </div>

                                            {/* Zone upload recto */}
                                            <label className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all
                                                ${ocrRectoPreview ? 'border-green-300 bg-green-50' : 'border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100'}`}
                                                style={{ minHeight: '140px' }}>
                                                {ocrRectoPreview ? (
                                                    <div className="relative w-full h-full p-2">
                                                        <img src={ocrRectoPreview} alt="Recto" className="w-full h-32 object-cover rounded-lg" />
                                                        <button type="button" onClick={e => { e.preventDefault(); setOcrRectoPreview(null); setOcrRectoFile(null); setOcrRectoResult(null); setImmatriculation(null); }}
                                                            className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow">
                                                            <X className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 text-center">
                                                        <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                                                        <p className="text-sm text-blue-600 font-medium">Uploader le recto</p>
                                                        <p className="text-xs text-gray-400 mt-1">JPG, PNG jusqu'à 4MB</p>
                                                    </div>
                                                )}
                                                <input type="file" accept="image/*" onChange={handleOcrRecto} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </label>

                                            {/* Status recto */}
                                            {ocrRectoLoading && (
                                                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Analyse en cours...
                                                </div>
                                            )}
                                            {ocrRectoResult && !ocrRectoLoading && (
                                                <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                                                    {immatriculation && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-500">Immatriculation</span>
                                                            <span className="font-bold text-gray-800 bg-yellow-100 px-2 py-0.5 rounded">{immatriculation}</span>
                                                        </div>
                                                    )}
                                                    {ocrRectoResult.data?.first_registration && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-500">1ère MC</span>
                                                            <span className="text-gray-700">{ocrRectoResult.data.first_registration}</span>
                                                        </div>
                                                    )}
                                                    {!immatriculation && !ocrRectoResult.data?.first_registration && (
                                                        <p className="text-gray-400 italic">Données limitées sur cette image</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Verso */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileText className="w-4 h-4 text-indigo-600" />
                                                <span className="text-sm font-semibold text-gray-700">Verso</span>
                                                <span className="text-xs text-gray-400">(marque, cylindres, PTAC…)</span>
                                            </div>

                                            {/* Zone upload verso */}
                                            <label className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all
                                                ${ocrVersoPreview ? 'border-green-300 bg-green-50' : 'border-indigo-200 bg-indigo-50 hover:border-indigo-400 hover:bg-indigo-100'}`}
                                                style={{ minHeight: '140px' }}>
                                                {ocrVersoPreview ? (
                                                    <div className="relative w-full h-full p-2">
                                                        <img src={ocrVersoPreview} alt="Verso" className="w-full h-32 object-cover rounded-lg" />
                                                        <button type="button" onClick={e => { e.preventDefault(); setOcrVersoPreview(null); setOcrVersoFile(null); setOcrVersoResult(null); }}
                                                            className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow">
                                                            <X className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 text-center">
                                                        <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                                                        <p className="text-sm text-indigo-600 font-medium">Uploader le verso</p>
                                                        <p className="text-xs text-gray-400 mt-1">JPG, PNG jusqu'à 4MB</p>
                                                    </div>
                                                )}
                                                <input type="file" accept="image/*" onChange={handleOcrVerso} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </label>

                                            {/* Status verso */}
                                            {ocrVersoLoading && (
                                                <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Analyse en cours...
                                                </div>
                                            )}
                                            {ocrVersoResult && !ocrVersoLoading && (
                                                <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                                                    {[
                                                        ["Marque", ocrVersoResult.data?.marque],
                                                        ["Carburant", ocrVersoResult.data?.carburant],
                                                        ["Puissance", ocrVersoResult.data?.puissance_fiscale ? `${ocrVersoResult.data.puissance_fiscale} CV` : null],
                                                        ["Cylindres", ocrVersoResult.data?.cylindres],
                                                        ["Places", ocrVersoResult.data?.nb_places],
                                                        ["PTAC", ocrVersoResult.data?.ptac],
                                                        ["Poids vide", ocrVersoResult.data?.poids_vide],
                                                        ["N° véhicule", ocrVersoResult.data?.numero_vehicule],
                                                    ].filter(([, v]) => v).map(([label, value]) => (
                                                        <div key={label as string} className="flex items-center justify-between">
                                                            <span className="text-gray-500">{label}</span>
                                                            <span className="text-gray-700 font-medium">{value as string}</span>
                                                        </div>
                                                    ))}
                                                    {!ocrVersoResult.data?.marque && !ocrVersoResult.data?.carburant && (
                                                        <p className="text-gray-400 italic">Données non lisibles</p>
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
                                                Les champs marqués en vert ont été pré-remplis automatiquement.
                                                Cliquez sur <CheckCircle className="w-3 h-3 inline" /> pour les modifier manuellement.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ===== FORMULAIRE ===== */}
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="hidden lg:block p-6 border-b">
                                <button onClick={() => router.back()} className="flex items-center text-gray-600 hover:text-gray-900">
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
                                                            <img src={preview} alt={`Aperçu ${index + 1}`} className="h-24 w-full object-cover rounded-lg shadow-md" />
                                                            <button type="button" onClick={() => removeImage(index)}
                                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-center">
                                                    <label className="relative cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
                                                        <span>Ajouter d'autres photos</span>
                                                        <input type="file" multiple accept="image/*" onChange={handleImagesChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                    </label>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                                <div className="flex flex-col items-center text-sm text-gray-600">
                                                    <label className="relative cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mb-2">
                                                        <span>Choisir des photos</span>
                                                        <input type="file" multiple accept="image/*" onChange={handleImagesChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                    </label>
                                                    <p className="text-xs text-gray-400 mt-2">PNG, JPG jusqu'à 4MB (max 10 photos)</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
                                    <select value={category} onChange={e => setCategory(e.target.value)}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                                            ${ocrPrefilled.category ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
                                        {categories.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Marque & Modèle */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <OcrInput label="Marque" value={brand} onChange={setBrand}
                                        placeholder="Ex: Renault, Peugeot..." required fieldKey="brand" />
                                    <OcrInput label="Modèle" value={model} onChange={setModel}
                                        placeholder="Ex: Clio, 308..." required fieldKey="model" />
                                </div>

                                {/* Année & Prix */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Année <span className="text-red-500">*</span>
                                        </label>
                                        <input type="number" placeholder="Ex: 2022" value={year} onChange={e => setYear(e.target.value)}
                                            min="1900" max={String(new Date().getFullYear() + 1)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Prix par jour (MAD) <span className="text-red-500">*</span>
                                        </label>
                                        <input type="number" placeholder="Ex: 300" value={price} onChange={e => setPrice(e.target.value)}
                                            min="0" step="0.01"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                    </div>
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
                                        <select value={fuelType} onChange={e => setFuelType(e.target.value)}
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                                                ${ocrPrefilled.fuelType ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
                                            {fuelTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <Gauge className="w-4 h-4 inline mr-1" /> Transmission
                                        </label>
                                        <select value={transmission} onChange={e => setTransmission(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            {transmissionTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Places & Cylindrée & Puissance */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {(category === "voiture" || category === "utilitaire" || category === "van") && (
                                        <OcrInput label="Nombre de places" value={seats} onChange={setSeats}
                                            placeholder="Ex: 5" type="number" min="1" max="50"
                                            icon={<Users className="w-4 h-4 inline" />} fieldKey="seats" />
                                    )}
                                    {(category === "moto" || category === "scooter" || category === "quad") && (
                                        <OcrInput label="Cylindrée (cm³)" value={engineCc} onChange={setEngineCc}
                                            placeholder="Ex: 125" type="number" min="50" max="5000"
                                            icon={<Cpu className="w-4 h-4 inline" />} fieldKey="engineCc" />
                                    )}
                                    <OcrInput label="Puissance (CV)" value={puissance} onChange={setPuissance}
                                        placeholder="Ex: 100" type="number"
                                        icon={<Palette className="w-4 h-4 inline" />} fieldKey="puissance" />
                                </div>

                                {/* Localisation */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <MapPin className="w-4 h-4 inline mr-1" /> Ville
                                        </label>
                                        <input type="text" placeholder="Ex: Casablanca, Rabat..." value={city} onChange={e => setCity(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <MapPin className="w-4 h-4 inline mr-1" /> Adresse complète
                                        </label>
                                        <input type="text" placeholder="Adresse de retrait" value={address} onChange={e => setAddress(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea placeholder="Décrivez votre véhicule, ses caractéristiques, options, etc."
                                        value={description} onChange={e => setDescription(e.target.value)}
                                        rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                </div>

                                {/* Info */}
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                                        <Car className="w-4 h-4 mr-2" /> Informations importantes
                                    </h3>
                                    <ul className="text-xs text-blue-600 space-y-1">
                                        <li>• Les champs marqués d'une * sont obligatoires</li>
                                        <li>• Vous pouvez ajouter jusqu'à 10 photos</li>
                                        <li>• Utilisez le scanner de carte grise pour pré-remplir automatiquement</li>
                                        <li>• Vous pourrez modifier ces informations plus tard</li>
                                    </ul>
                                </div>

                                {/* Actions */}
                                <div className="flex space-x-4 pt-4">
                                    <button onClick={handleSubmit} disabled={loading}
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center">
                                        {loading ? (
                                            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Ajout en cours...</>
                                        ) : (
                                            <><PlusCircle className="w-4 h-4 mr-2" /> Ajouter le véhicule</>
                                        )}
                                    </button>
                                    <button onClick={() => router.back()} disabled={loading}
                                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Aperçu */}
                        {(brand || model || year || price) && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Aperçu</h3>
                                <div className="flex items-center space-x-4">
                                    <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                        <Car className="w-10 h-10 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">{brand || "Marque"} {model || "Modèle"}</h4>
                                        <p className="text-sm text-gray-500">{year || "Année"} • {price || "0"} MAD/jour</p>
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