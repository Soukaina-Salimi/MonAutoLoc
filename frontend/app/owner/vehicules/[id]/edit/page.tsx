"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import api from "@/lib/api";
import {
    Car,
    Save,
    ArrowLeft,
    Upload,
    X,
    DollarSign,
    FileText,
    AlertCircle,
    Menu,
    Bell,
    Settings,
    Loader2,
    UploadCloud,
    Trash2,
    MapPin,
    UserCheck,
    Info
} from "lucide-react";

// Interface pour l'utilisateur
interface User {
    id: number;
    name: string;
    email: string;
    role: {
        id: number;
        name: string;
    };
}

// Interface pour les images existantes
interface ExistingImage {
    id: number;
    path: string;
    url?: string;
}

export default function EditVehiclePage() {
    const { id } = useParams();
    const router = useRouter();

    // États du formulaire (uniquement les champs modifiables)
    const [price, setPrice] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [city, setCity] = useState<string>("");
    const [address, setAddress] = useState<string>("");
    const [offersDriver, setOffersDriver] = useState<boolean>(false);
    const [driverDailyRate, setDriverDailyRate] = useState<string>("");
    
    // Informations non modifiables (affichage seulement)
    const [vehicleInfo, setVehicleInfo] = useState<{
        brand: string;
        model: string;
        year: number;
        fuel_type: string;
        transmission: string;
        seats: number;
        puissance: number;
    } | null>(null);
    
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [newImages, setNewImages] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
    const [deletedImages, setDeletedImages] = useState<number[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [isCompressing, setIsCompressing] = useState<boolean>(false);

    // Configuration de la compression d'image
    const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        onProgress: (progress: number) => {
            setUploadProgress(progress * 100);
        },
    };

    useEffect(() => {
        // Vérifier l'utilisateur
        const userData = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (!userData || !token) {
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
        } catch (error) {
            console.error("Error parsing user:", error);
            router.push("/login");
            return;
        }

        // Charger les données du véhicule
        const fetchVehicle = async () => {
            try {
                const res = await api.get(`/owner/vehicules/${id}`);
                const v = res.data;

                // Informations non modifiables (affichage)
                setVehicleInfo({
                    brand: v.brand || "",
                    model: v.model || "",
                    year: v.year || "",
                    fuel_type: v.fuel_type || "Essence",
                    transmission: v.transmission || "Manuelle",
                    seats: v.seats || 5,
                    puissance: v.puissance || 50,
                });
                
                // Informations modifiables
                setPrice(v.price_per_day?.toString() || "");
                setDescription(v.description || "");
                setCity(v.city || "");
                setAddress(v.address || "");
                setOffersDriver(v.offers_driver || false);
                setDriverDailyRate(v.driver_daily_rate?.toString() || "");
                
                // Images
                const imagesWithUrl = (v.images || []).map((img: any) => ({
                    ...img,
                    url: img.url || `/storage/${img.path}`
                }));
                setExistingImages(imagesWithUrl);
            } catch (error) {
                console.error("Error fetching vehicle:", error);
                alert("Erreur lors du chargement du véhicule");
            } finally {
                setLoading(false);
            }
        };

        fetchVehicle();
    }, [id]);

    // Configuration du drag & drop
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        try {
            setIsCompressing(true);
            setImageError(null);

            const processedFiles: File[] = [];
            const previews: string[] = [];

            for (const file of acceptedFiles) {
                if (file.size > 5 * 1024 * 1024) {
                    setImageError("Certaines images dépassent 5MB");
                    continue;
                }

                const compressedFile = await imageCompression(file, compressionOptions);
                processedFiles.push(compressedFile);
                previews.push(URL.createObjectURL(compressedFile));
            }

            setNewImages(prev => [...prev, ...processedFiles]);
            setNewPreviews(prev => [...prev, ...previews]);

        } catch (error) {
            console.error("Error processing images:", error);
            setImageError("Erreur lors du traitement des images");
        } finally {
            setIsCompressing(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
        },
        maxFiles: 10 - (existingImages.length + newImages.length),
        maxSize: 5 * 1024 * 1024,
        onDragEnter: () => setIsDragging(true),
        onDragLeave: () => setIsDragging(false),
        onDropRejected: (fileRejections) => {
            const error = fileRejections[0]?.errors[0];
            if (error?.code === 'file-too-large') {
                setImageError("L'image ne doit pas dépasser 5MB");
            } else if (error?.code === 'file-invalid-type') {
                setImageError("Format d'image non supporté");
            } else if (error?.code === 'too-many-files') {
                setImageError("Maximum 10 images au total");
            } else {
                setImageError("Erreur lors du téléchargement");
            }
            setTimeout(() => setImageError(null), 3000);
        }
    });

    const handleDeleteExistingImage = (id: number) => {
        setDeletedImages(prev => [...prev, id]);
        setExistingImages(prev => prev.filter(img => img.id !== id));
    };

    const handleDeleteNewImage = (index: number) => {
        URL.revokeObjectURL(newPreviews[index]);
        setNewImages(prev => prev.filter((_, i) => i !== index));
        setNewPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const validateForm = (): boolean => {
        if (!price) {
            alert("Veuillez saisir le prix par jour");
            return false;
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            alert("Prix invalide");
            return false;
        }

        if (offersDriver && !driverDailyRate) {
            alert("Veuillez saisir le tarif journalier pour le chauffeur");
            return false;
        }

        if (existingImages.length === 0 && newImages.length === 0) {
            alert("Veuillez ajouter au moins une image");
            return false;
        }

        return true;
    };

    const handleUpdate = async () => {
    if (!validateForm()) return;
    setSaving(true);

    try {
        const formData = new FormData();
        // ← _method PUT pour Laravel method spoofing
        formData.append("_method", "PUT");
        formData.append("price_per_day", price);
        formData.append("description", description || "");
        formData.append("city", city || "");
        formData.append("address", address || "");
        formData.append("offers_driver", offersDriver ? "1" : "0");
        if (offersDriver && driverDailyRate) {
            formData.append("driver_daily_rate", driverDailyRate);
        }

        // ── Nouvelles images ──────────────────────────────────────────
        newImages.forEach((file) => {
            formData.append("images[]", file);
        });

        // ── Images supprimées ─────────────────────────────────────────
        deletedImages.forEach((imgId) => {
            formData.append("deleted_images[]", imgId.toString());
        });

        // ── Debug — vérifier ce qui est envoyé ───────────────────────
        console.log("Sending formData:");
        for (const [key, val] of formData.entries()) {
            console.log(key, val instanceof File ? `File: ${val.name}` : val);
        }

        await api.post(`/vehicules/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (e) => {
                if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
            },
        });

        alert("✅ Véhicule modifié avec succès");
        router.push("/owner/vehicules");

    } catch (error: any) {
        console.error("Update error:", error.response?.data);
        if (error.response?.status === 422) {
            const msgs = Object.values(error.response.data?.errors ?? {}).flat().join("\n");
            alert(`Erreurs:\n${msgs}`);
        } else {
            alert("❌ Erreur lors de la modification");
        }
    } finally {
        setSaving(false);
        setUploadProgress(0);
    }
};

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
    };

    const handleDashboard = () => {
        router.push("/owner/dashboard");
    };

    const handleBookings = () => {
        router.push("/owner/bookings");
    };

    const handleVehicles = () => {
        router.push("/owner/vehicules");
    };
    const handleAddVehicules = (): void => {
        router.push("/owner/add-vehicule");
    };
    const handleProfil = (): void => {
        router.push("/owner/profile");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <Car className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                    <p className="mt-4 text-gray-600">Chargement du véhicule...</p>
                </div>
            </div>
        );
    }

    const currentPath = "/owner/vehicules";

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <Sidebar
                user={user || undefined}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                currentPath={currentPath}
            />

            {/* Mobile sidebar backdrop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex-1">
                {/* Header */}
                <header className="bg-white shadow-sm sticky top-0 z-10">
                    <div className="px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className="lg:hidden text-gray-600 hover:text-gray-900"
                                >
                                    <Menu className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={() => router.back()}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                                >
                                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                <h1 className="text-2xl font-bold text-gray-800">Modifier le véhicule</h1>
                            </div>

                            <div className="flex items-center space-x-4">
                                <button className="relative text-gray-600 hover:text-gray-900">
                                    <Bell className="w-6 h-6" />
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                                        3
                                    </span>
                                </button>
                                <button className="text-gray-600 hover:text-gray-900">
                                    <Settings className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="p-4 sm:p-6 lg:p-8">
                    <div className="max-w-4xl mx-auto">
                        {/* Barre de progression */}
                        <AnimatePresence>
                            {uploadProgress > 0 && uploadProgress < 100 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="mb-4"
                                >
                                    <div className="bg-white rounded-lg shadow-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">
                                                {saving ? "Enregistrement..." : "Téléchargement..."}
                                            </span>
                                            <span className="text-sm font-medium text-blue-600">
                                                {uploadProgress}%
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${uploadProgress}%` }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Formulaire */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl shadow-lg overflow-hidden"
                        >
                            {/* En-tête avec infos non modifiables */}
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                                <h2 className="text-xl font-semibold text-white flex items-center">
                                    <Car className="w-5 h-5 mr-2" />
                                    {vehicleInfo?.brand} {vehicleInfo?.model}
                                </h2>
                                <div className="flex flex-wrap gap-4 mt-2 text-blue-100 text-sm">
                                    <span>📅 {vehicleInfo?.year}</span>
                                    <span>⛽ {vehicleInfo?.fuel_type}</span>
                                    <span>⚙️ {vehicleInfo?.transmission}</span>
                                    <span>👥 {vehicleInfo?.seats} places</span>
                                    <span>💪 {vehicleInfo?.puissance} CV</span>
                                </div>
                                <p className="text-blue-100 text-xs mt-2">
                                    ⚠️ Les caractéristiques techniques (marque, modèle, année, etc.) ne sont pas modifiables car issues de la carte grise.
                                </p>
                            </div>

                            {/* Formulaire */}
                            <div className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Colonne gauche - Images */}
                                    <div className="lg:col-span-1">
                                        <div className="space-y-4">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Photos du véhicule <span className="text-red-500">*</span>
                                            </label>

                                            {/* Zone de drop */}
                                            <div
                                                {...getRootProps()}
                                                className={`relative transition-all duration-200 cursor-pointer ${isDragActive ? 'scale-105' : ''}`}
                                            >
                                                <input {...getInputProps()} />
                                                <div
                                                    className={`w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${isDragActive
                                                        ? 'border-blue-600 bg-blue-50'
                                                        : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                                                        }`}
                                                >
                                                    {isCompressing ? (
                                                        <>
                                                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                                                            <p className="text-sm text-gray-600">Compression...</p>
                                                        </>
                                                    ) : isDragActive ? (
                                                        <>
                                                            <UploadCloud className="w-8 h-8 text-blue-600 mb-2" />
                                                            <p className="text-sm font-medium text-blue-600">
                                                                Déposez les images ici
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                                            <p className="text-sm text-gray-500">
                                                                Glissez-déposez ou cliquez
                                                            </p>
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                PNG, JPG, WEBP (max 5MB)
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Message d'erreur */}
                                            <AnimatePresence>
                                                {imageError && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="bg-red-50 text-red-600 text-sm p-2 rounded-lg flex items-center"
                                                    >
                                                        <AlertCircle className="w-4 h-4 mr-2" />
                                                        {imageError}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Images existantes */}
                                            {existingImages.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                                                        Images actuelles
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {existingImages.map((img) => (
                                                            <div key={img.id} className="relative group">
                                                                <img
                                                                    src={img.url || `/storage/${img.path}`}
                                                                    alt="Véhicule"
                                                                    className="h-20 w-full object-cover rounded-lg"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteExistingImage(img.id)}
                                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Nouvelles images */}
                                            {newPreviews.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                                                        Nouvelles images
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {newPreviews.map((preview, index) => (
                                                            <div key={index} className="relative group">
                                                                <img
                                                                    src={preview}
                                                                    alt={`Nouvelle ${index + 1}`}
                                                                    className="h-20 w-full object-cover rounded-lg"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteNewImage(index)}
                                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Colonne droite - Champs modifiables */}
                                    <div className="lg:col-span-2 space-y-6">
                                        {/* Prix */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Prix par jour (MAD) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="number"
                                                    value={price}
                                                    onChange={(e) => setPrice(e.target.value)}
                                                    placeholder="300"
                                                    min="0"
                                                    step="10"
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    disabled={saving}
                                                />
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Description
                                            </label>
                                            <div className="relative">
                                                <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                                                <textarea
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    placeholder="Décrivez votre véhicule (options, état, etc.)"
                                                    rows={4}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    disabled={saving}
                                                />
                                            </div>
                                        </div>

                                        {/* Localisation */}
                                        <div className="border-t border-gray-200 pt-4">
                                            <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-blue-600" />
                                                Localisation
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Ville
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={city}
                                                        onChange={(e) => setCity(e.target.value)}
                                                        placeholder="Ex: Casablanca, Rabat..."
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        disabled={saving}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Adresse de retrait
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={address}
                                                        onChange={(e) => setAddress(e.target.value)}
                                                        placeholder="Adresse complète"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        disabled={saving}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Service chauffeur */}
                                        <div className="border-t border-gray-200 pt-4">
                                            <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                <UserCheck className="w-4 h-4 text-amber-600" />
                                                Service chauffeur
                                            </h3>
                                            
                                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                                                            <UserCheck className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div>
                                                            <label className="font-semibold text-gray-800">Proposer un chauffeur</label>
                                                            <p className="text-xs text-gray-500">Permettez aux clients de louer votre véhicule avec chauffeur</p>
                                                        </div>
                                                    </div>
                                                    {/* Toggle switch */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setOffersDriver(!offersDriver)}
                                                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${offersDriver ? 'bg-amber-500' : 'bg-gray-300'}`}
                                                    >
                                                        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${offersDriver ? 'translate-x-6' : 'translate-x-0'}`} />
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
                                                                        Tarif journalier par chauffeur <span className="text-red-500">*</span>
                                                                    </label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">MAD</span>
                                                                        <input
                                                                            type="number"
                                                                            value={driverDailyRate}
                                                                            onChange={e => setDriverDailyRate(e.target.value)}
                                                                            placeholder="Ex: 200"
                                                                            min="0"
                                                                            step="10"
                                                                            className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                                            disabled={saving}
                                                                        />
                                                                    </div>
                                                                    <p className="text-xs text-gray-400 mt-1">Prix par jour et par chauffeur (max 2)</p>
                                                                </div>
                                                                <div className="bg-amber-100 rounded-lg p-3">
                                                                    <p className="text-xs font-medium text-amber-800 mb-1">📌 Information</p>
                                                                    <p className="text-xs text-amber-700">
                                                                        Les clients pourront choisir 1 ou 2 chauffeurs. Le tarif sera multiplié par le nombre de jours et le nombre de chauffeurs.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Info supplémentaire */}
                                        <div className="bg-blue-50 rounded-lg p-4 flex items-start">
                                            <Info className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-blue-800 font-medium">
                                                    Informations importantes
                                                </p>
                                                <p className="text-xs text-blue-600 mt-1">
                                                    Seuls les champs ci-dessus sont modifiables. Les caractéristiques techniques sont issues de la carte grise et ne peuvent pas être modifiées.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Boutons d'action */}
                                        <div className="flex space-x-4 pt-4">
                                            <button
                                                onClick={handleUpdate}
                                                disabled={saving || isCompressing}
                                                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                            >
                                                {saving ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                        Enregistrement...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-5 h-5 mr-2" />
                                                        Enregistrer les modifications
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => router.back()}
                                                disabled={saving}
                                                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </main>
            </div>
        </div>
    );
}