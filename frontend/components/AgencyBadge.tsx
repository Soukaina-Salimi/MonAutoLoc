// components/AgencyBadge.tsx
import { Building2, CheckCircle } from "lucide-react";

interface Props {
  owner: {
    is_agency?: boolean;
    display_name?: string;
    agency_name?: string;
    agency_logo_url?: string | null;
    agency_rc?: string | null;
    verified?: boolean;
  };
  size?: "sm" | "md" | "lg";
}

export function AgencyBadge({ owner, size = "md" }: Props) {
  if (!owner.is_agency) return null;

  const sizes = {
    sm: { logo: "w-8 h-8", text: "text-xs", name: "text-sm" },
    md: { logo: "w-12 h-12", text: "text-xs", name: "text-base" },
    lg: { logo: "w-16 h-16", text: "text-sm", name: "text-lg" },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-3">
      {/* Logo */}
      <div
        className={`${s.logo} rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden shrink-0`}
      >
        {owner.agency_logo_url ? (
          <img
            src={owner.agency_logo_url}
            alt={owner.agency_name}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <Building2 className="w-5 h-5 text-gray-400" />
        )}
      </div>
      {/* Nom + badges */}
      <div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-semibold text-gray-800 ${s.name}`}>
            {owner.agency_name || owner.display_name}
          </span>
          <span
            className={`${s.text} bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1`}
          >
            <Building2 className="w-3 h-3" /> Agence
          </span>
          {owner.verified && (
            <span
              className={`${s.text} bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1`}
            >
              <CheckCircle className="w-3 h-3" /> Vérifié
            </span>
          )}
        </div>
        {owner.agency_rc && (
          <p className={`${s.text} text-gray-400 mt-0.5`}>
            RC : {owner.agency_rc}
          </p>
        )}
      </div>
    </div>
  );
}
