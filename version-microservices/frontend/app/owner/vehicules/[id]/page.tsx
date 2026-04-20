"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import Sidebar from "@/components/Sidebar";

import {
    Car, Calendar, Fuel, Gauge, Users, Star, ChevronLeft,
    Heart, Share2, CheckCircle, XCircle, AlertCircle, User,
    Mail, Phone, MapPin, Clock, Shield, Info, ArrowRight,
    CalendarDays, Award, Wrench, MessageCircle, ChevronRight,
    ChevronLeft as ChevronLeftIcon, FileText, Hash, Cpu,
    Truck, LayoutDashboard, PlusCircle, LogOut, Menu, Bell, Settings,
    UserCheck, DollarSign
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VehicleImage {
    id: number;
    path: string;
    url?: string;
    vehicule_id: number;
}

interface Vehicle {
    id: number;
    user_id: number;
    brand: string;
    model: string;
    category: string;
    year: number;
    price_per_day: number;
    fuel_type: string;
    transmission: string;
    seats?: number;
    engine_cc?: number;
    puissance?: number;
    city?: string;
    address?: string;
    description?: string;
    available?: boolean;
    // ── Carte grise recto ─────────────────────────────
    immatriculation?: string;
    immatriculation_ancienne?: string;
    first_registration?: string;
    expiry_date_cg?: string;
    owner_name_cg?: string;
    // ── Carte grise verso ─────────────────────────────
    chassis?: string;
    genre?: string;
    ptac?: number;
    cylindres?: number;
    // ── Driver fields ─────────────────────────────────
    offers_driver?: boolean;
    driver_daily_rate?: number | null;
    // ── Relations ─────────────────────────────────────
    images?: VehicleImage[];
    reviews_count?: number;
    reviews_avg_rating?: number;
    created_at?: string;
    updated_at?: string;
}

interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: { id: number; name: string };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
    if (!value && value !== 0) return null;
    return (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className={`font-medium text-gray-800 text-sm ${mono ? "font-mono tracking-wider" : ""}`}>
                {value}
            </p>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OwnerVehicleDetailsPage() {
    const { id } = useParams();
    const router = useRouter();

    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [fullscreenImage, setFullscreenImage] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"infos" | "cg" | "photos">("infos");

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        if (!token || !userStr) { router.push("/login"); return; }
        try {
            const u: AuthUser = JSON.parse(userStr);
            if (u.role.name !== "owner") { router.push("/dashboard"); return; }
            setUser(u);
        } catch { router.push("/login"); return; }

        api.get(`/owner/vehicules/${id}`)
            .then(({ data }) => setVehicle(data))
            .catch(() => setVehicle(null))
            .finally(() => setLoading(false));
    }, [id]);

    const images = vehicle?.images?.map(
        img => img.url || `http://localhost/storage/${img.path}`
    ) ?? [];

    const handlePrev = () => setSelectedImageIndex(p => p === 0 ? images.length - 1 : p - 1);
    const handleNext = () => setSelectedImageIndex(p => p === images.length - 1 ? 0 : p + 1);

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                <p className="mt-4 text-gray-500 text-sm">Chargement…</p>
            </div>
        </div>
    );

    if (!vehicle) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Véhicule introuvable</h2>
                <button onClick={() => router.back()} className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium">
                    Retour
                </button>
            </div>
        </div>
    );

    const TABS = [
        { id: "infos" as const, label: "Informations" },
        { id: "cg" as const, label: "Carte grise" },
        { id: "photos" as const, label: `Photos (${images.length})` },
    ];
    const currentPath = "/owner/vehicules";

    return (
        <div className="min-h-screen bg-gray-50 flex">

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <Sidebar
                user={user || undefined}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                currentPath={currentPath}
            />
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

            {/* ── Main ────────────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">

                {/* Header */}
                <header className="bg-white shadow-sm sticky top-0 z-10">
                    <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setIsSidebarOpen(v => !v)} className="lg:hidden text-gray-600">
                                <Menu className="w-6 h-6" />
                            </button>
                            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-800">
                                    {vehicle.brand} {vehicle.model}
                                </h1>
                                <p className="text-xs text-gray-500">{vehicle.year} · {vehicle.category}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => router.push(`/owner/vehicules/${vehicle.id}/edit`)}
                                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:shadow-md transition">
                                <Wrench className="w-4 h-4" /> Modifier
                            </button>
                        </div>
                    </div>
                </header>

                <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
                    <div className="grid lg:grid-cols-3 gap-6">

                        {/* ── Colonne gauche ───────────────────────────── */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Image principale */}
                            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                                <div className="relative h-72 bg-gradient-to-br from-blue-600 to-purple-600">
                                    {images.length > 0 ? (
                                        <>
                                            <img src={images[selectedImageIndex]} alt={`${vehicle.brand} ${vehicle.model}`}
                                                className="w-full h-full object-cover cursor-pointer"
                                                onClick={() => setFullscreenImage(true)} />
                                            {images.length > 1 && (
                                                <>
                                                    <button onClick={handlePrev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition">
                                                        <ChevronLeftIcon className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={handleNext} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition">
                                                        <ChevronRight className="w-5 h-5" />
                                                    </button>
                                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 text-white text-xs px-3 py-1 rounded-full">
                                                        {selectedImageIndex + 1} / {images.length}
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <Car className="w-24 h-24 text-white/30" />
                                        </div>
                                    )}
                                    {/* Badge statut */}
                                    <div className="absolute top-3 left-3">
                                        <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${vehicle.available !== false ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                                            {vehicle.available !== false
                                                ? <><CheckCircle className="w-3 h-3" /> Disponible</>
                                                : <><XCircle className="w-3 h-3" /> Indisponible</>
                                            }
                                        </span>
                                    </div>
                                </div>

                                {/* Miniatures */}
                                {images.length > 1 && (
                                    <div className="p-3 border-t flex gap-2 overflow-x-auto">
                                        {images.map((img, i) => (
                                            <button key={i} onClick={() => setSelectedImageIndex(i)}
                                                className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition ${i === selectedImageIndex ? "border-blue-600" : "border-gray-200"}`}>
                                                <img src={img} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tabs */}
                            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                                <div className="flex border-b">
                                    {TABS.map(t => (
                                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                                            className={`flex-1 py-3 text-sm font-medium relative transition ${activeTab === t.id ? "text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
                                            {t.label}
                                            {activeTab === t.id && (
                                                <motion.div layoutId="ownerDetailTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-5">

                                    {/* ── Tab Informations ──────────────── */}
                                    {activeTab === "infos" && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

                                            {/* Description */}
                                            {vehicle.description && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Description</h4>
                                                    <p className="text-gray-700 text-sm leading-relaxed">{vehicle.description}</p>
                                                </div>
                                            )}

                                            {/* Caractéristiques principales */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Caractéristiques</h4>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    <InfoRow label="Marque" value={vehicle.brand} />
                                                    <InfoRow label="Modèle" value={vehicle.model} />
                                                    <InfoRow label="Catégorie" value={vehicle.category} />
                                                    <InfoRow label="Année" value={vehicle.year} />
                                                    <InfoRow label="Carburant" value={vehicle.fuel_type} />
                                                    <InfoRow label="Transmission" value={vehicle.transmission} />
                                                    {vehicle.seats && <InfoRow label="Places" value={`${vehicle.seats} places`} />}
                                                    {vehicle.puissance && <InfoRow label="Puissance" value={`${vehicle.puissance} CV`} />}
                                                    {vehicle.engine_cc && <InfoRow label="Cylindrée" value={`${vehicle.engine_cc} cm³`} />}
                                                    {vehicle.cylindres && <InfoRow label="Cylindres" value={vehicle.cylindres} />}
                                                    {vehicle.ptac && <InfoRow label="PTAC" value={`${vehicle.ptac} kg`} />}
                                                    {vehicle.genre && <InfoRow label="Genre" value={vehicle.genre} />}
                                                </div>
                                            </div>

                                            {/* ── Service chauffeur ──────────────────────────────── */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide flex items-center gap-1">
                                                    <UserCheck className="w-3.5 h-3.5" /> Service chauffeur
                                                </h4>
                                                {vehicle.offers_driver ? (
                                                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                                                                <UserCheck className="w-5 h-5 text-white" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-amber-800">Chauffeur disponible</p>
                                                                <p className="text-xs text-amber-700">
                                                                    Tarif : <span className="font-bold">{vehicle.driver_daily_rate} MAD/jour</span> par chauffeur
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-amber-700 mt-2">
                                                            Les clients peuvent choisir 1 ou 2 chauffeurs lors de leur réservation.
                                                            Le tarif est multiplié par le nombre de jours et le nombre de chauffeurs.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center">
                                                        <UserCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                        <p className="text-sm text-gray-500">Service chauffeur non proposé</p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            Vous pouvez activer cette option en modifiant le véhicule.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Localisation */}
                                            {(vehicle.city || vehicle.address) && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Localisation</h4>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {vehicle.city && <InfoRow label="Ville" value={vehicle.city} />}
                                                        {vehicle.address && <InfoRow label="Adresse" value={vehicle.address} />}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {/* ── Tab Carte grise ───────────────── */}
                                    {activeTab === "cg" && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

                                            {/* Vérifie si au moins un champ CG est présent */}
                                            {!vehicle.immatriculation && !vehicle.chassis && !vehicle.first_registration ? (
                                                <div className="text-center py-10 text-gray-400">
                                                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                                    <p className="text-sm">Aucune donnée carte grise enregistrée.</p>
                                                    <p className="text-xs mt-1">Modifiez le véhicule et scannez la carte grise.</p>
                                                    <button onClick={() => router.push(`/owner/vehicules/${vehicle.id}/edit`)}
                                                        className="mt-4 text-sm text-blue-600 hover:underline flex items-center gap-1 mx-auto">
                                                        <Wrench className="w-3.5 h-3.5" /> Modifier et scanner
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Recto */}
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide flex items-center gap-1">
                                                            <FileText className="w-3.5 h-3.5" /> Recto
                                                        </h4>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                            {vehicle.immatriculation && (
                                                                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 sm:col-span-1">
                                                                    <p className="text-xs text-blue-400 mb-0.5">Immatriculation</p>
                                                                    <p className="font-mono font-bold text-blue-800 tracking-widest text-sm">
                                                                        {vehicle.immatriculation}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {vehicle.immatriculation_ancienne && (
                                                                <InfoRow label="Ancienne immat." value={vehicle.immatriculation_ancienne} mono />
                                                            )}
                                                            {vehicle.first_registration && (
                                                                <InfoRow label="1ère mise en circulation" value={vehicle.first_registration} />
                                                            )}
                                                            {vehicle.expiry_date_cg && (
                                                                <InfoRow label="Expiration CG" value={vehicle.expiry_date_cg} />
                                                            )}
                                                            {vehicle.owner_name_cg && (
                                                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 sm:col-span-2">
                                                                    <p className="text-xs text-gray-400 mb-0.5">Propriétaire (carte grise)</p>
                                                                    <p className="font-medium text-gray-800 text-sm">{vehicle.owner_name_cg}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Verso */}
                                                    {(vehicle.chassis || vehicle.genre || vehicle.ptac || vehicle.cylindres) && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide flex items-center gap-1">
                                                                <FileText className="w-3.5 h-3.5" /> Verso
                                                            </h4>
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                                {vehicle.genre && <InfoRow label="Genre" value={vehicle.genre} />}
                                                                {vehicle.ptac && <InfoRow label="PTAC" value={`${vehicle.ptac} kg`} />}
                                                                {vehicle.cylindres && <InfoRow label="Cylindres" value={vehicle.cylindres} />}
                                                                {vehicle.chassis && (
                                                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 sm:col-span-3">
                                                                        <p className="text-xs text-gray-400 mb-0.5">N° Châssis (VIN)</p>
                                                                        <p className="font-mono text-gray-800 text-sm tracking-wider">
                                                                            {vehicle.chassis}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </motion.div>
                                    )}

                                    {/* ── Tab Photos ────────────────────── */}
                                    {activeTab === "photos" && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            {images.length === 0 ? (
                                                <div className="text-center py-10 text-gray-400">
                                                    <Car className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                                    <p className="text-sm">Aucune photo enregistrée.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {images.map((img, i) => (
                                                        <button key={i} onClick={() => { setSelectedImageIndex(i); setFullscreenImage(true); }}
                                                            className="relative h-32 rounded-xl overflow-hidden hover:opacity-90 transition">
                                                            <img src={img} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                                                            <div className="absolute bottom-1 right-1 bg-black/40 text-white text-xs px-1.5 py-0.5 rounded">
                                                                {i + 1}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                </div>
                            </div>
                        </div>

                        {/* ── Colonne droite ───────────────────────────── */}
                        <div className="space-y-4">

                            {/* Prix & stats */}
                            <div className="bg-white rounded-2xl shadow-md p-5">
                                <div className="flex items-baseline justify-between mb-4">
                                    <div>
                                        <span className="text-3xl font-bold text-gray-800">{vehicle.price_per_day}</span>
                                        <span className="text-gray-500 text-sm"> MAD/jour</span>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${vehicle.available !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                        {vehicle.available !== false ? "Disponible" : "Indisponible"}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                                        <p className="text-xl font-bold text-blue-600">{vehicle.reviews_count ?? 0}</p>
                                        <p className="text-xs text-gray-500">Avis</p>
                                    </div>
                                    <div className="bg-yellow-50 rounded-xl p-3 text-center">
                                        <p className="text-xl font-bold text-yellow-600">
                                            {vehicle.reviews_avg_rating ? Number(vehicle.reviews_avg_rating).toFixed(1) : "—"}
                                        </p>
                                        <p className="text-xs text-gray-500">Note</p>
                                    </div>
                                </div>
                            </div>

                            {/* Résumé rapide */}
                            <div className="bg-white rounded-2xl shadow-md p-5 space-y-3">
                                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Résumé</h4>
                                {[
                                    { icon: Car, label: "Catégorie", val: vehicle.category },
                                    { icon: Fuel, label: "Carburant", val: vehicle.fuel_type },
                                    { icon: Gauge, label: "Transmission", val: vehicle.transmission },
                                    { icon: Users, label: "Places", val: vehicle.seats ? `${vehicle.seats} places` : null },
                                    { icon: MapPin, label: "Ville", val: vehicle.city },
                                    { icon: Calendar, label: "Année", val: vehicle.year },
                                    // Ajout du chauffeur dans le résumé
                                    { icon: UserCheck, label: "Chauffeur", val: vehicle.offers_driver ? `${vehicle.driver_daily_rate} MAD/jour` : "Non proposé" },
                                ].filter(r => r.val).map(({ icon: Icon, label, val }) => (
                                    <div key={label} className="flex items-center gap-3 text-sm">
                                        <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span className="text-gray-500 w-28 shrink-0">{label}</span>
                                        <span className={`font-medium ${label === "Chauffeur" && vehicle.offers_driver ? "text-amber-600" : "text-gray-800"}`}>
                                            {val}
                                        </span>
                                    </div>
                                ))}
                                {vehicle.immatriculation && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span className="text-gray-500 w-28 shrink-0">Immat.</span>
                                        <span className="font-mono font-semibold text-gray-800">{vehicle.immatriculation}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="bg-white rounded-2xl shadow-md p-5 space-y-3">
                                <button onClick={() => router.push(`/owner/vehicules/${vehicle.id}/edit`)}
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:shadow-md transition">
                                    <Wrench className="w-4 h-4" /> Modifier le véhicule
                                </button>
                                <button onClick={() => router.push("/owner/vehicules")}
                                    className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                                    <ChevronLeft className="w-4 h-4" /> Retour à mes véhicules
                                </button>
                            </div>

                            {/* Dates */}
                            {(vehicle.created_at || vehicle.updated_at) && (
                                <div className="bg-white rounded-2xl shadow-md p-5 space-y-2">
                                    {vehicle.created_at && (
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>Ajouté le</span>
                                            <span className="font-medium text-gray-700">
                                                {new Date(vehicle.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                                            </span>
                                        </div>
                                    )}
                                    {vehicle.updated_at && (
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>Modifié le</span>
                                            <span className="font-medium text-gray-700">
                                                {new Date(vehicle.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Fullscreen image */}
            <AnimatePresence>
                {fullscreenImage && images.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
                        onClick={() => setFullscreenImage(false)}>
                        <button onClick={() => setFullscreenImage(false)} className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full">
                            <XCircle className="w-6 h-6" />
                        </button>
                        <img src={images[selectedImageIndex]} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" />
                        {images.length > 1 && (
                            <>
                                <button onClick={e => { e.stopPropagation(); handlePrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full">
                                    <ChevronLeftIcon className="w-6 h-6" />
                                </button>
                                <button onClick={e => { e.stopPropagation(); handleNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full">
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}