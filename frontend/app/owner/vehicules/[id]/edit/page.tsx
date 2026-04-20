"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
    Image as ImageIcon,
    Fuel,
    Gauge,
    Users,
    Calendar,
    DollarSign,
    FileText,
    AlertCircle,
    CheckCircle,
    Menu,
    LayoutDashboard,
    Calendar as CalendarIcon,
    PlusCircle,
    LogOut,
    Settings,
    Bell,
    Loader2,
    UploadCloud,
    Trash2,
    Maximize2,
    Minimize2
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

    // États du formulaire
    const [brand, setBrand] = useState<string>("");
    const [model, setModel] = useState<string>("");
    const [year, setYear] = useState<string>("");
    const [price, setPrice] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [fuelType, setFuelType] = useState<string>("Essence");
    const [transmission, setTransmission] = useState<string>("Manuelle");
    const [seats, setSeats] = useState<string>("5");
    const [puissance, setPuissance] = useState<string>("50");
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
    const [imageSize, setImageSize] = useState<{ original: number; compressed: number } | null>(null);

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
                const res = await api.get(`/vehicules/${id}`);
                const v = res.data;

                setBrand(v.brand || "");
                setModel(v.model || "");
                setYear(v.year?.toString() || "");
                setPrice(v.price_per_day?.toString() || "");
                setDescription(v.description || "");
                setFuelType(v.fuel_type || "Essence");
                setTransmission(v.transmission || "Manuelle");
                setSeats(v.seats?.toString() || "5");
                setPuissance(v.puissance?.toString() || "50");
                // Ajouter l'URL complète pour chaque image
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
                // Vérifier la taille
                if (file.size > 5 * 1024 * 1024) {
                    setImageError("Certaines images dépassent 5MB");
                    continue;
                }

                // Compresser l'image
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
        maxSize: 5 * 1024 * 1024, // 5MB
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
        // Nettoyer l'URL de la preview
        URL.revokeObjectURL(newPreviews[index]);

        setNewImages(prev => prev.filter((_, i) => i !== index));
        setNewPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const validateForm = (): boolean => {
        if (!brand || !model || !year || !price) {
            alert("Veuillez remplir tous les champs obligatoires");
            return false;
        }

        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
            alert("Année invalide");
            return false;
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            alert("Prix invalide");
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
        setUploadProgress(0);

        // Simuler la progression
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                }
                return prev + 10;
            });
        }, 200);

        try {
            const formData = new FormData();
            formData.append("_method", "PUT");
            formData.append("brand", brand);
            formData.append("model", model);
            formData.append("year", year);
            formData.append("price_per_day", price);
            formData.append("description", description);
            formData.append("fuel_type", fuelType);
            formData.append("transmission", transmission);
            formData.append("seats", seats);
            formData.append("puissance", puissance);

            // Nouvelles images
            newImages.forEach((file) => {
                formData.append("images[]", file);
            });

            // Images supprimées
            deletedImages.forEach((id) => {
                formData.append("deleted_images[]", id.toString());
            });

            await api.post(`/vehicules/${id}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    }
                },
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            setTimeout(() => {
                alert("✅ Véhicule modifié avec succès");
                router.push("/owner/vehicules");
            }, 500);

        } catch (error: any) {
            clearInterval(progressInterval);
            console.error("Update error:", error);

            if (error.response?.status === 422) {
                const errors = error.response.data?.errors;
                if (errors) {
                    const messages = Object.values(errors).flat().join("\n");
                    alert(`Erreurs de validation:\n${messages}`);
                } else {
                    alert("Erreur de validation");
                }
            } else {
                alert("❌ Erreur lors de la modification");
            }
        } finally {
            setSaving(false);
            setTimeout(() => setUploadProgress(0), 1000);
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

    // Formatage de la taille
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <div className={`
                fixed inset-y-0 left-0 transform 
                ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
                lg:relative lg:translate-x-0 transition duration-200 ease-in-out
                w-64 bg-white shadow-lg z-30
            `}>
                <div className="h-full flex flex-col">
                    {/* Profile Section */}
                    <div className="p-6 border-b">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-xl">
                                    {user?.name?.charAt(0).toUpperCase() || "O"}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-800 truncate">{user?.name}</h3>
                                <p className="text-sm text-gray-500">Propriétaire</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4">
                        <div className="space-y-2">
                            <button
                                onClick={handleDashboard}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition duration-200"
                            >
                                <LayoutDashboard className="w-5 h-5" />
                                <span>Tableau de bord</span>
                            </button>
                            <button
                                onClick={handleBookings}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition duration-200"
                            >
                                <CalendarIcon className="w-5 h-5" />
                                <span>Réservations</span>
                            </button>
                            <button
                                onClick={handleVehicles}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg font-medium"
                            >
                                <Car className="w-5 h-5" />
                                <span>Mes véhicules</span>
                            </button>
                            <button
                                onClick={() => router.push("/owner/add-vehicule")}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition duration-200"
                            >
                                <PlusCircle className="w-5 h-5" />
                                <span>Ajouter véhicule</span>
                            </button>
                        </div>

                        <div className="absolute bottom-4 left-4 right-4">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition duration-200"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Déconnexion</span>
                            </button>
                        </div>
                    </nav>
                </div>
            </div>

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
                        {/* Barre de progression globale */}
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
                            {/* En-tête */}
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                                <h2 className="text-xl font-semibold text-white flex items-center">
                                    <Car className="w-5 h-5 mr-2" />
                                    {brand} {model}
                                </h2>
                                <p className="text-blue-100 text-sm mt-1">
                                    Modifiez les informations de votre véhicule
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
                                                className={`relative transition-all duration-200 cursor-pointer ${isDragActive ? 'scale-105' : ''
                                                    }`}
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

                                    {/* Colonne droite - Formulaire */}
                                    <div className="lg:col-span-2 space-y-6">
                                        {/* Ligne 1: Marque et Modèle */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Marque <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={brand}
                                                    onChange={(e) => setBrand(e.target.value)}
                                                    placeholder="Ex: Renault, BMW..."
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    disabled={saving}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Modèle <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={model}
                                                    onChange={(e) => setModel(e.target.value)}
                                                    placeholder="Ex: Clio, Serie 3..."
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    disabled={saving}
                                                />
                                            </div>
                                        </div>

                                        {/* Ligne 2: Année et Prix */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Année <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                    <input
                                                        type="number"
                                                        value={year}
                                                        onChange={(e) => setYear(e.target.value)}
                                                        placeholder="2023"
                                                        min="1900"
                                                        max={new Date().getFullYear() + 1}
                                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        disabled={saving}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Prix/jour (€) <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                    <input
                                                        type="number"
                                                        value={price}
                                                        onChange={(e) => setPrice(e.target.value)}
                                                        placeholder="50"
                                                        min="0"
                                                        step="0.01"
                                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        disabled={saving}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ligne 3: Carburant et Transmission */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Carburant
                                                </label>
                                                <div className="relative">
                                                    <Fuel className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                    <select
                                                        value={fuelType}
                                                        onChange={(e) => setFuelType(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                                                        disabled={saving}
                                                    >
                                                        <option>Essence</option>
                                                        <option>Diesel</option>
                                                        <option>Hybride</option>
                                                        <option>Électrique</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Transmission
                                                </label>
                                                <div className="relative">
                                                    <Gauge className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                    <select
                                                        value={transmission}
                                                        onChange={(e) => setTransmission(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                                                        disabled={saving}
                                                    >
                                                        <option>Manuelle</option>
                                                        <option>Automatique</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ligne 4: Places */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nombre de places
                                            </label>
                                            <div className="relative">
                                                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <select
                                                    value={seats}
                                                    onChange={(e) => setSeats(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                                                    disabled={saving}
                                                >
                                                    <option>2</option>
                                                    <option>4</option>
                                                    <option>5</option>
                                                    <option>7</option>
                                                    <option>8</option>
                                                    <option>9</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Puissance
                                            </label>
                                            <div className="relative">
                                                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="number"
                                                    value={puissance}
                                                    onChange={(e) => setPuissance(e.target.value)}
                                                    placeholder="50"
                                                    min="0"
                                                    step="20"
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

                                        {/* Info supplémentaire */}
                                        <div className="bg-blue-50 rounded-lg p-4 flex items-start">
                                            <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-blue-800 font-medium">
                                                    Informations importantes
                                                </p>
                                                <p className="text-xs text-blue-600 mt-1">
                                                    Les champs marqués d'un * sont obligatoires.
                                                    Les images sont automatiquement compressées et optimisées.
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