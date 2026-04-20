// hooks/useProfile.ts  — partagé entre /Client/profile et /owner/profile
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export type ServiceType = "location" | "transport_bagages" | "livraison_colis" | "demenagement";

export interface ProfileUser {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    phone?: string;
    city?: string;
    address?: string;
    date_of_birth?: string;
    gender?: "male" | "female" | "other";
    avatar?: string | null;
    bio?: string;
    profile_completed: boolean;
    role: { id: number; name: string };
    owner_services: { id: number; service_type: ServiceType; is_active: boolean }[];
    documents: {
        id: number;
        type: string;
        status: "pending" | "verified" | "rejected";
        extracted_data: any;
        verified_at: string | null;
        cross_validated_at: string | null;
    }[];
    // Identité
    cin_number: string;
    permis_number: string;
    permis_categories: string;
    cin_expiry_date: string | null;
    permis_expiry_date: string | null;
    // Véhicule
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_fuel: string;
    vehicle_power: string;
    vehicle_seats: string;
    // ── Informations agence ─────────────────────────────────
    is_agency?: boolean;
    agency_name?: string;
    agency_logo_url?: string | null;
    agency_rc?: string;        // Registre de commerce
    agency_description?: string;
    agency_verified?: boolean;
    agency_website?: string;
    agency_phone?: string;
}

export interface ProfileForm {
    first_name: string;
    last_name: string;
    phone: string;
    city: string;
    address: string;
    date_of_birth: string;
    gender: string;
    bio: string;
    services: ServiceType[];
    // Identité
    cin_number: string;
    permis_number: string;
    permis_categories: string;
    cin_expiry_date: string;
    permis_expiry_date: string;
    // Véhicule
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_fuel: string;
    vehicle_power: string;
    vehicle_seats: string;
    // ── Informations agence ─────────────────────────────────
    is_agency: boolean;
    agency_name: string;
    agency_logo_url: string;
    agency_rc: string;
    agency_description: string;
    agency_website: string;
    agency_phone: string;
}



export function useProfile() {
    const router = useRouter();
    const [user, setUser] = useState<ProfileUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [form, setForm] = useState<ProfileForm>({
        first_name: "",
        last_name: "",
        phone: "",
        city: "",
        address: "",
        date_of_birth: "",
        gender: "",
        bio: "",
        services: [],
        cin_number: "",
        permis_number: "",
        permis_categories: "",
        cin_expiry_date:  "",
        permis_expiry_date:  "",
        vehicle_brand: "",
        vehicle_model: "",
        vehicle_fuel: "",
        vehicle_power: "",
        vehicle_seats: "",
        // ── Informations agence ─────────────────────────────────
        is_agency: false,
        agency_name: "",
        agency_logo_url: "",
        agency_rc: "",
        agency_description: "",
        agency_website: "",
        agency_phone: "",

    });

    function showMsg(type: "success" | "error", text: string) {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 4000);
    }

    // ── Fetch /api/me (données fraîches depuis le serveur) ────────────────────
    async function fetchProfile() {
        setLoading(true);
        try {
            const { data } = await api.get<ProfileUser>("/me");
            setUser(data);
            setForm({
                first_name: data.first_name ?? data.name?.split(" ")[0] ?? "",
                last_name: data.last_name ?? data.name?.split(" ").slice(1).join(" ") ?? "",
                phone: data.phone ?? "",
                city: data.city ?? "",
                address: data.address ?? "",
                date_of_birth: data.date_of_birth ?? "",
                gender: data.gender ?? "",
                bio: data.bio ?? "",
                services: data.owner_services?.map((s) => s.service_type) ?? [],
                cin_number: data.cin_number || "",
                permis_number: data.permis_number || "",
                cin_expiry_date:  data.cin_expiry_date || "",
                permis_expiry_date:  data.permis_expiry_date || "",
                permis_categories: data.permis_categories || "",
                vehicle_brand: data.vehicle_brand || "",
                vehicle_model: data.vehicle_model || "",
                vehicle_fuel: data.vehicle_fuel || "",
                vehicle_power: data.vehicle_power || "",
                vehicle_seats: data.vehicle_seats || "",
                // ── Informations agence ─────────────────────────────────
                is_agency: data.is_agency || false,
                agency_name: data.agency_name || "",
                agency_logo_url: data.agency_logo_url || "",
                agency_rc: data.agency_rc || "",
                agency_description: data.agency_description || "",
                agency_website: data.agency_website || "",
                agency_phone: data.agency_phone || "",

            });
            // Sync localStorage
            localStorage.setItem("user", JSON.stringify(data));
        } catch (err: any) {
            if (err.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                router.push("/login");
            } else {
                showMsg("error", "Impossible de charger le profil.");
            }
        } finally {
            setLoading(false);
        }
    }

    // ── PUT /api/profile ──────────────────────────────────────────────────────
    async function saveProfile(extra?: Partial<ProfileForm>): Promise<boolean> {
        setSaving(true);
        try {
            const payload = { ...form, ...extra };
            
            // Enlever les champs vides pour ne pas écraser avec ""
            const clean = Object.fromEntries(
                Object.entries(payload).filter(([, v]) =>
                    v !== "" && v !== null && v !== undefined &&
                    !(Array.isArray(v) && v.length === 0)
                )
            );
            
            const { data } = await api.put("/profile", clean);
            const updated = { ...user, ...data.user };
            setUser(updated as ProfileUser);
            localStorage.setItem("user", JSON.stringify(updated));
            showMsg("success", "Profil mis à jour avec succès.");
            return true;
        } catch (err: any) {
            const errors = err.response?.data?.errors as Record<string, string[]> | undefined;
            showMsg("error", errors
                ? Object.values(errors)[0]?.[0] ?? "Erreur de validation"
                : err.response?.data?.message ?? "Erreur lors de la sauvegarde."
            );
            return false;
        } finally {
            setSaving(false);
        }
    }

    // ── POST /api/profile/avatar ──────────────────────────────────────────────
    async function saveAvatar(file: File): Promise<string | null> {
        try {
            const fd = new FormData();
            fd.append("avatar", file);
            const { data } = await api.post("/profile/avatar", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            showMsg("success", "Avatar mis à jour.");
            return data.avatar_url as string;
        } catch {
            showMsg("error", "Erreur lors de l'upload de l'avatar.");
            return null;
        }
    }

    // ── PUT /api/profile/password ─────────────────────────────────────────────
    async function changePassword(current: string, next: string, confirm: string): Promise<boolean> {
        if (next !== confirm) { showMsg("error", "Les mots de passe ne correspondent pas."); return false; }
        if (next.length < 8) { showMsg("error", "Minimum 8 caractères."); return false; }
        setSaving(true);
        try {
            await api.put("/profile/password", {
                current_password: current,
                password: next,
                password_confirmation: confirm,
            });
            showMsg("success", "Mot de passe modifié.");
            return true;
        } catch (err: any) {
            showMsg("error", err.response?.data?.message ?? "Mot de passe actuel incorrect.");
            return false;
        } finally {
            setSaving(false);
        }
    }

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        fetchProfile();
    }, []);

    return {
        user, loading, saving, msg, form, setForm, setUser,
        fetchProfile, saveProfile, saveAvatar, changePassword, showMsg,
    };
}