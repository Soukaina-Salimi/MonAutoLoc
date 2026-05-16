"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import ChatbotWidget from "@/components/ChatbotWidget";
import Link from "next/link";

import {
  Car,
  ChevronRight,
  Star,
  Fuel,
  Gauge,
  Users,
  ArrowRight,
  CheckCircle,
  Package,
  Truck,
  Luggage,
  Search,
  Calendar,
  Smile,
  CreditCard,
  Shield,
  Clock,
  Headphones,
  Sparkles,
  Zap,
  TrendingUp,
  PlusCircle,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  MapPin,
  BarChart3,
  Bot,
  Megaphone,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  price_per_day: number;
  image_url: string | null;
  year: number;
  fuel_type: string;
  transmission: string;
  seats: number;
  rating?: number;
  city?: string;
}

// ── Config services clients - Couleurs plus vives ─────────────────────────────────────────────────

const CLIENT_SERVICES = [
  {
    id: "location",
    title: "Location de véhicules",
    shortDesc: "La liberté sur roues",
    icon: Car,
    color: "#FF6B35", // Orange vif
    lightBg: "#FFF0E8", // Orange pâle
    stats: [
      { v: "500+", l: "Véhicules" },
      { v: "4.9★", l: "Note" },
    ],
    features: ["Assurance complète", "Kilométrage illimité"],
    route: "/vehicules",
  },
  {
    id: "bagages",
    title: "Transport de bagages",
    shortDesc: "Voyagez léger",
    icon: Luggage,
    color: "#7C3AED", // Violet vif
    lightBg: "#F3E8FF", // Violet pâle
    stats: [
      { v: "2h", l: "Express" },
      { v: "24/7", l: "Disponible" },
    ],
    features: ["Suivi en temps réel", "Assurance bagages"],
    route: "/bagages",
  },
  {
    id: "livraison",
    title: "Livraison de colis",
    shortDesc: "Rapide et fiable",
    icon: Package,
    color: "#06D6A0", // Vert émeraude
    lightBg: "#E0FCF4", // Vert pâle
    stats: [
      { v: "99%", l: "À temps" },
      { v: "50k+", l: "Colis" },
    ],
    features: ["Livraison J+1", "Suivi en ligne"],
    route: "/livraison",
  },
  {
    id: "demenagement",
    title: "Déménagement",
    shortDesc: "Serein de A à Z",
    icon: Truck,
    color: "#EF476F", // Rose vif
    lightBg: "#FDE7EC", // Rose pâle
    stats: [
      { v: "2h", l: "Devis" },
      { v: "15+", l: "Ans exp." },
    ],
    features: ["Devis gratuit", "Équipe professionnelle"],
    route: "/demenagement",
  },
];

// ── Composant ServiceCard ─────────────────────────────────────────────────────

function ServiceCard({
  svc,
  index,
}: {
  svc: (typeof CLIENT_SERVICES)[0];
  index: number;
}) {
  const Icon = svc.icon;
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      onClick={() => router.push(svc.route)}
      className="group cursor-pointer bg-white rounded-2xl border border-gray-100 shadow-md
                 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden"
    >
      {/* Bande couleur en haut */}
      <div className="h-1.5 w-full" style={{ backgroundColor: svc.color }} />

      <div className="p-6">
        {/* Icon + titre */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                       group-hover:scale-110 transition-transform duration-300"
            style={{ backgroundColor: svc.lightBg }}
          >
            <Icon className="w-6 h-6" style={{ color: svc.color }} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-base leading-tight">
              {svc.title}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: svc.color }}>
              {svc.shortDesc}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-4 py-3 border-y border-gray-50">
          {svc.stats.map((s) => (
            <div key={s.l}>
              <p className="text-lg font-bold text-gray-800">{s.v}</p>
              <p className="text-xs text-gray-400">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="space-y-1.5 mb-5">
          {svc.features.map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 text-sm text-gray-500"
            >
              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
              {f}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="flex items-center justify-between text-sm font-semibold"
          style={{ color: svc.color }}
        >
          <span>Découvrir</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
}

// ── Composant VehicleCard ─────────────────────────────────────────────────────

function VehicleCard({ v, onClick }: { v: Vehicle; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300
                 overflow-hidden cursor-pointer border border-gray-100"
    >
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-violet-200 to-orange-200">
        {v.image_url ? (
          <img
            src={v.image_url}
            alt={`${v.brand} ${v.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="w-12 h-12 text-white/50" />
          </div>
        )}
        {/* Prix badge */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow">
          <span className="text-sm font-bold text-orange-600">
            {v.price_per_day} MAD
          </span>
          <span className="text-xs text-gray-400">/j</span>
        </div>
        {/* Rating */}
        {v.rating && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 shadow">
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-xs font-semibold">{v.rating}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-800">
          {v.brand} {v.model}
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
          {v.city && (
            <>
              <MapPin className="w-3 h-3" />
              <span>{v.city}</span>
              <span>·</span>
            </>
          )}
          <span>{v.year}</span>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Fuel className="w-3 h-3" />
            {v.fuel_type}
          </span>
          <span className="flex items-center gap-1">
            <Gauge className="w-3 h-3" />
            {v.transmission}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {v.seats}pl
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));

    api
      .get<Vehicle[]>("/vehicules")
      .then((r) => setVehicles(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <ChatbotWidget />
      <Navbar user={user} setUser={setUser} />

      {/* ══════════════════════════════════════════════════════
          1 — HERO + SERVICES CLIENTS
          ══════════════════════════════════════════════════════ */}
      <section className="pt-28 pb-16 px-4 bg-gradient-to-br from-orange-50 via-violet-50 to-pink-50">
        <div className="max-w-6xl mx-auto">
          {/* Titre */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-violet-500 text-white px-4 py-2
                            rounded-full text-sm font-medium mb-5 shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>La mobilité au Maroc, simplifiée</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
              De quoi avez-vous besoin
              <span className="block bg-gradient-to-r from-orange-600 via-violet-600 to-pink-600 bg-clip-text text-transparent">
                aujourd'hui ?
              </span>
            </h1>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Choisissez parmi nos quatre services — tout est pensé pour que
              votre journée se passe bien.
            </p>
          </motion.div>

          {/* 4 cartes services */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CLIENT_SERVICES.map((svc, i) => (
              <ServiceCard key={svc.id} svc={svc} index={i} />
            ))}
          </div>

          {/* Stats globales */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-8 border-t border-gray-200/50"
          >
            {[
              { v: "500+", l: "Véhicules disponibles" },
              { v: "10 000+", l: "Clients satisfaits" },
              { v: "4.9 / 5", l: "Note moyenne" },
              { v: "24/7", l: "Support client" },
            ].map(({ v, l }) => (
              <div key={l} className="text-center">
                <p className="text-2xl font-extrabold bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">
                  {v}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          2 — VÉHICULES POPULAIRES
          ══════════════════════════════════════════════════════ */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-orange-500 text-sm font-semibold uppercase tracking-wider">
                Notre flotte
              </p>
              <h2 className="text-3xl font-bold text-gray-900 mt-1">
                Véhicules populaires
              </h2>
            </div>
            <button
              onClick={() => router.push("/vehicules")}
              className="flex items-center gap-1 text-violet-600 text-sm font-medium hover:gap-2 transition-all"
            >
              Voir tout <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {vehicles.slice(0, 4).map((v) => (
                <VehicleCard
                  key={v.id}
                  v={v}
                  onClick={() => router.push(`/vehicules/${v.id}`)}
                />
              ))}
            </div>
          )}

          {!loading && vehicles.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun véhicule disponible pour le moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3 — COMMENT ÇA MARCHE
          ══════════════════════════════════════════════════════ */}
      <section className="py-16 px-4 bg-gradient-to-br from-orange-50 to-violet-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-orange-500 text-sm font-semibold uppercase tracking-wider">
              Simple et rapide
            </p>
            <h2 className="text-3xl font-bold text-gray-900 mt-1">
              Comment ça marche ?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                icon: Search,
                title: "Choisissez",
                desc: "Sélectionnez le service adapté à vos besoins",
              },
              {
                step: "02",
                icon: Calendar,
                title: "Réservez",
                desc: "Réservation en ligne en moins de 3 minutes",
              },
              {
                step: "03",
                icon: Smile,
                title: "Profitez",
                desc: "Nous prenons le relais — vous vous détendez",
              },
              {
                step: "04",
                icon: CreditCard,
                title: "Payez",
                desc: "Paiement sécurisé à la fin du service",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="relative inline-block mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <span
                    className="absolute -top-2 -right-2 w-6 h-6 bg-white border-2 border-orange-200
                                   rounded-full text-xs font-bold bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent flex items-center justify-center shadow-sm"
                  >
                    {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 max-w-[160px] mx-auto">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          4 — POURQUOI NOUS CHOISIR
          ══════════════════════════════════════════════════════ */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-orange-500 text-sm font-semibold uppercase tracking-wider">
              Nos engagements
            </p>
            <h2 className="text-3xl font-bold text-gray-900 mt-1">
              Pourquoi AutoRent ?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Shield,
                title: "Assurance incluse",
                desc: "Protection complète sur chaque service",
                gradient: "from-orange-500 to-orange-600",
                bg: "bg-orange-50",
              },
              {
                icon: Clock,
                title: "Disponible 24/7",
                desc: "Support à votre écoute à tout moment",
                gradient: "from-violet-500 to-violet-600",
                bg: "bg-violet-50",
              },
              {
                icon: CreditCard,
                title: "Paiement sécurisé",
                desc: "Transactions chiffrées et protégées",
                gradient: "from-emerald-500 to-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                icon: Headphones,
                title: "Assistance dédiée",
                desc: "Un conseiller pour chaque demande",
                gradient: "from-pink-500 to-pink-600",
                bg: "bg-pink-50",
              },
            ].map((f) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-6 text-center hover:shadow-xl transition-all border border-gray-100"
              >
                <div
                  className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mx-auto mb-3`}
                >
                  <f.icon
                    className={`w-6 h-6 bg-gradient-to-br ${f.gradient} bg-clip-text text-transparent`}
                  />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          ── SÉPARATEUR VISUEL "VOUS ÊTES PROPRIÉTAIRE ?"
          ══════════════════════════════════════════════════════ */}
      <div className="relative py-8 px-4 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative bg-white px-6 py-2 rounded-full border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">
            Vous proposez un service ou possédez un véhicule ?
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          5 — SECTION OWNER — "PROPOSEZ VOS SERVICES"
          ══════════════════════════════════════════════════════ */}
      <section className="py-16 px-4 bg-gradient-to-br from-gray-900 via-violet-900 to-orange-900">
        <div className="max-w-6xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-10">
            <div
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20
                            text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>Pour les prestataires &amp; propriétaires</span>
            </div>
          </div>

          {/* Grid 2 colonnes */}
          <div className="grid lg:grid-cols-2 gap-10 items-center mb-12">
            {/* Gauche — pitch */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
                AutoRent, c'est aussi
                <span className="bg-gradient-to-r from-orange-400 via-yellow-300 to-pink-400 bg-clip-text text-transparent">
                  {" "}
                  votre vitrine
                </span>{" "}
                pour développer votre activité.
              </h2>
              <p className="text-gray-300 text-lg mb-6">
                Que vous ayez un véhicule à louer, un camion pour les
                déménagements ou des capacités de livraison — rejoignez notre
                plateforme et accédez à des milliers de clients potentiels.
              </p>

              {/* Services proposables */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  {
                    icon: Car,
                    label: "Location de véhicules",
                    color: "from-orange-500 to-orange-600",
                  },
                  {
                    icon: Luggage,
                    label: "Transport de bagages",
                    color: "from-violet-500 to-violet-600",
                  },
                  {
                    icon: Package,
                    label: "Livraison de colis",
                    color: "from-emerald-500 to-emerald-600",
                  },
                  {
                    icon: Truck,
                    label: "Déménagement",
                    color: "from-pink-500 to-pink-600",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-2.5 bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}
                    >
                      <s.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white text-sm font-medium">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push("/register")}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-violet-500
                           hover:from-orange-600 hover:to-violet-600 text-white font-bold px-6 py-3 rounded-xl transition-all
                           hover:shadow-xl hover:shadow-orange-500/30"
              >
                <PlusCircle className="w-5 h-5" />
                Créer mon espace propriétaire
              </button>
              <p className="text-gray-400 text-xs mt-2">
                Inscription gratuite · Sans engagement
              </p>
            </div>

            {/* Droite — features IA premium */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-8 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-violet-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-orange-300 text-sm font-semibold">
                  Dashboard IA Premium inclus
                </span>
              </div>

              <div className="space-y-4">
                {[
                  {
                    icon: BarChart3,
                    title: "Prédiction de la demande",
                    desc: "Anticipez les pics d'activité et optimisez vos disponibilités",
                  },
                  {
                    icon: TrendingUp,
                    title: "Suggestion de prix intelligente",
                    desc: "L'IA analyse le marché et vous recommande le prix optimal",
                  },
                  {
                    icon: Bot,
                    title: "Chatbot IA pour vos clients",
                    desc: "Répondez automatiquement aux questions 24h/24",
                  },
                  {
                    icon: Megaphone,
                    title: "Marketing automatique",
                    desc: "Publication auto sur vos réseaux sociaux après chaque ajout",
                  },
                ].map((f) => (
                  <div key={f.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <f.icon className="w-4 h-4 text-orange-300" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {f.title}
                      </p>
                      <p className="text-gray-300 text-xs mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Témoignage */}
              <div className="mt-6 pt-5 border-t border-white/10">
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 text-yellow-400 fill-current"
                    />
                  ))}
                  <span className="text-yellow-400 text-xs ml-1 font-semibold">
                    +45% de revenus
                  </span>
                </div>
                <p className="text-gray-200 text-sm italic">
                  "Grâce à AutoRent et à la suggestion de prix IA, j'ai optimisé
                  mes tarifs et triplé mes réservations en 2 mois."
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  — Ahmed B., propriétaire à Casablanca
                </p>
              </div>
            </div>
          </div>

          {/* Stats en bas */}
          <div className="grid grid-cols-3 gap-6 text-center border-t border-white/10 pt-8">
            {[
              { v: "1 200+", l: "Prestataires actifs" },
              { v: "45%", l: "Revenus supplémentaires en moy." },
              { v: "48h", l: "Pour les premiers clients" },
            ].map(({ v, l }) => (
              <div key={l}>
                <p className="text-2xl font-extrabold text-white">{v}</p>
                <p className="text-sm text-gray-300 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          6 — CTA FINAL
          ══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-gradient-to-br from-orange-500 to-violet-600">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-extrabold text-white mb-3">
              Prêt à commencer ?
            </h2>
            <p className="text-orange-100 text-lg mb-8">
              Rejoignez des milliers de clients et prestataires sur AutoRent.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => router.push("/register")}
                className="bg-white text-orange-600 font-bold px-7 py-3 rounded-xl
                           hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center gap-2"
              >
                Créer un compte gratuit <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push("/vehicules")}
                className="border-2 border-white/60 text-white font-semibold px-7 py-3 rounded-xl
                           hover:bg-white/10 transition-all"
              >
                Voir les véhicules
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER
          ══════════════════════════════════════════════════════ */}
      <footer className="bg-gray-950 text-gray-400">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-violet-600 rounded-xl flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <span className="font-extrabold text-xl text-white">
                  AutoRent
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4 max-w-xs">
                Location, transport, livraison, déménagement — la mobilité
                marocaine en un seul endroit.
              </p>
              <div className="flex gap-2">
                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gradient-to-br hover:from-orange-500 hover:to-violet-600 transition-all"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              {
                title: "Services",
                links: [
                  "Location véhicules",
                  "Transport bagages",
                  "Livraison colis",
                  "Déménagement",
                ],
              },
              {
                title: "Propriétaires",
                links: [
                  "Créer un compte",
                  "Dashboard owner",
                  "Fonctionnalités IA",
                  "Aide",
                ],
              },
              {
                title: "Contact",
                links: [
                  "+212 5XX XX XX XX",
                  "contact@autorent.ma",
                  "Casablanca, Maroc",
                  "Lun-Sam 9h-19h",
                ],
              },
            ].map((s) => (
              <div key={s.title}>
                <h4 className="text-white text-sm font-semibold mb-4">
                  {s.title}
                </h4>
                <ul className="space-y-2">
                  {s.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="text-sm text-gray-500 hover:text-orange-400 transition-colors"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
            <p>
              &copy; {new Date().getFullYear()} AutoRent. Tous droits réservés.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-orange-400 transition">
                Conditions
              </a>
              <a href="#" className="hover:text-orange-400 transition">
                Confidentialité
              </a>
              <a href="#" className="hover:text-orange-400 transition">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
