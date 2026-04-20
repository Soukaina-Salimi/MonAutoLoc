{{-- booking-service/resources/views/contracts/location.blade.php --}}
<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Contrat de location — {{ $contract_number }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 11px;
            color: #1a1a2e;
            background: #fff;
            line-height: 1.6;
        }

        /* ── En-tête ── */
        .header {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%);
            color: white;
            padding: 28px 36px;
            position: relative;
        }

        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .agency-info h1 {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }

        .agency-info p {
            font-size: 10px;
            opacity: 0.85;
            margin-top: 2px;
        }

        .contract-ref {
            text-align: right;
        }

        .contract-ref .number {
            font-size: 16px;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.2);
            padding: 6px 14px;
            border-radius: 6px;
            display: inline-block;
            letter-spacing: 1px;
        }

        .contract-ref .date {
            font-size: 9px;
            opacity: 0.8;
            margin-top: 4px;
        }

        .header-title {
            margin-top: 18px;
            border-top: 1px solid rgba(255, 255, 255, 0.3);
            padding-top: 14px;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 2px;
            text-transform: uppercase;
            opacity: 0.95;
        }

        /* ── Body ── */
        .content {
            padding: 24px 36px;
        }

        /* ── Section ── */
        .section {
            margin-bottom: 18px;
        }

        .section-title {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #2d6a9f;
            border-bottom: 2px solid #2d6a9f;
            padding-bottom: 4px;
            margin-bottom: 10px;
        }

        /* ── Parties ── */
        .parties-grid {
            display: table;
            width: 100%;
        }

        .party-col {
            display: table-cell;
            width: 48%;
            vertical-align: top;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 14px;
        }

        .party-col:first-child {
            margin-right: 4%;
        }

        .party-spacer {
            display: table-cell;
            width: 4%;
        }

        .party-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 6px;
        }

        .party-name {
            font-size: 13px;
            font-weight: 700;
            color: #1e3a5f;
        }

        .party-detail {
            font-size: 10px;
            color: #475569;
            margin-top: 2px;
        }

        /* ── Véhicule ── */
        .vehicle-box {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-left: 4px solid #2d6a9f;
            border-radius: 6px;
            padding: 14px 16px;
        }

        .vehicle-main {
            font-size: 16px;
            font-weight: 700;
            color: #1e3a5f;
        }

        .vehicle-immat {
            display: inline-block;
            font-family: 'DejaVu Sans Mono', monospace;
            font-size: 11px;
            font-weight: 700;
            background: #1e3a5f;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            margin-top: 4px;
            letter-spacing: 1.5px;
        }

        .vehicle-specs {
            margin-top: 8px;
            display: table;
            width: 100%;
        }

        .spec-item {
            display: table-cell;
            font-size: 10px;
            color: #475569;
        }

        .spec-label {
            color: #94a3b8;
            font-size: 9px;
        }

        /* ── Tableau des prix ── */
        .price-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
        }

        .price-table th {
            background: #1e3a5f;
            color: white;
            padding: 7px 10px;
            text-align: left;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }

        .price-table td {
            padding: 7px 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
        }

        .price-table tr:nth-child(even) td {
            background: #f8fafc;
        }

        .price-table .subtotal td {
            background: #f1f5f9;
            font-weight: 600;
        }

        .price-table .total td {
            background: #1e3a5f;
            color: white;
            font-size: 13px;
            font-weight: 700;
            border: none;
        }

        .text-right {
            text-align: right;
        }

        /* ── Driver badge ── */
        .driver-badge {
            display: inline-block;
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fcd34d;
            border-radius: 4px;
            padding: 2px 8px;
            font-size: 9px;
            font-weight: 700;
            margin-left: 8px;
            vertical-align: middle;
        }

        /* ── Conditions ── */
        .conditions {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 14px 16px;
        }

        .conditions p {
            font-size: 9.5px;
            color: #475569;
            margin-bottom: 5px;
            padding-left: 12px;
            position: relative;
        }

        .conditions p::before {
            content: "•";
            position: absolute;
            left: 0;
            color: #2d6a9f;
            font-weight: 700;
        }

        /* ── Signature ── */
        .signature-grid {
            display: table;
            width: 100%;
            margin-top: 6px;
        }

        .sig-box {
            display: table-cell;
            width: 46%;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 14px;
            text-align: center;
            vertical-align: top;
        }

        .sig-spacer {
            display: table-cell;
            width: 8%;
        }

        .sig-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 40px;
        }

        .sig-line {
            border-top: 1px solid #94a3b8;
            padding-top: 5px;
            font-size: 9px;
            color: #94a3b8;
        }

        /* ── Footer ── */
        .footer {
            background: #1e3a5f;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
            padding: 10px;
            font-size: 8.5px;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
        }

        .footer strong {
            color: white;
        }

        /* ── Badge statut ── */
        .status-badge {
            display: inline-block;
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
            border-radius: 12px;
            padding: 3px 12px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
    </style>
</head>

<body>

    {{-- ── En-tête ────────────────────────────────────────────────────────── --}}
    <div class="header">
        <div class="header-top">
            <div class="agency-info">
                {{-- Logo de l'agence en base64 --}}
                @if($is_agency && !empty($agency_logo_base64))
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="{{ $agency_logo_base64 }}" alt="Logo" style="height: 50px; width: auto; max-width: 120px; object-fit: contain;">
                    <div>
                        <h1>{{ $agency_name }}</h1>
                        @if($agency_rc)
                        <p>RC : {{ $agency_rc }}</p>
                        @endif
                    </div>
                </div>
                @elseif($is_agency && $agency_name)
                <h1>{{ $agency_name }}</h1>
                @if($agency_rc)
                <p>RC : {{ $agency_rc }}</p>
                @endif
                @else
                <h1>AutoRent</h1>
                <p>Plateforme de location de véhicules</p>
                @endif
            </div>
            <div class="contract-ref">
                <div class="number">{{ $contract_number }}</div>
                <div class="date">Généré le {{ $generated_at }}</div>
                <div style="margin-top: 6px;">
                    <span class="status-badge" style="background: rgba(255,255,255,0.2); color: white; border-color: rgba(255,255,255,0.4);">
                        CONTRAT DE LOCATION
                    </span>
                </div>
            </div>
        </div>
        <div class="header-title">
            Contrat de location de véhicule
            @if($with_driver)
            <span class="driver-badge" style="background: rgba(255,255,255,0.25); color: white; border-color: rgba(255,255,255,0.4);">
                Avec chauffeur
            </span>
            @endif
        </div>
    </div>

    {{-- ── Contenu ────────────────────────────────────────────────────────── --}}
    <div class="content">

        {{-- Parties --}}
        <div class="section">
            <div class="section-title">Parties au contrat</div>
            <div class="parties-grid">
                <div class="party-col">
                    <div class="party-label">Le Propriétaire (Bailleur)</div>
                    <div class="party-name">{{ $owner_name }}</div>
                    @if($owner_email)
                    <div class="party-detail">✉ {{ $owner_email }}</div>
                    @endif
                    @if($owner_phone)
                    <div class="party-detail">☎ {{ $owner_phone }}</div>
                    @endif
                    @if($is_agency && $agency_rc)
                    <div class="party-detail" style="margin-top: 4px; font-size:9px; color:#64748b;">
                        RC : {{ $agency_rc }}
                    </div>
                    @endif
                </div>
                <div class="party-spacer"></div>
                <div class="party-col">
                    <div class="party-label">Le Locataire (Preneur)</div>
                    <div class="party-name">{{ $client_name }}</div>
                    @if($client_email)
                    <div class="party-detail">✉ {{ $client_email }}</div>
                    @endif
                    @if($client_phone)
                    <div class="party-detail">☎ {{ $client_phone }}</div>
                    @endif
                    @if($client_city)
                    <div class="party-detail">📍 {{ $client_city }}</div>
                    @endif
                </div>
            </div>
        </div>

        {{-- Véhicule --}}
        <div class="section">
            <div class="section-title">Véhicule loué</div>
            <div class="vehicle-box">
                <div class="vehicle-main">
                    {{ strtoupper($vehicle_brand) }} {{ $vehicle_model }}
                    @if($with_driver)
                    <span class="driver-badge">+ {{ $nb_drivers }} Chauffeur{{ $nb_drivers > 1 ? 's' : '' }}</span>
                    @endif
                </div>
                <div class="vehicle-immat">{{ $vehicle_immatriculation }}</div>
                <div class="vehicle-specs">
                    <div class="spec-item">
                        <div class="spec-label">Année</div>
                        <strong>{{ $vehicle_year }}</strong>
                    </div>
                    <div class="spec-item">
                        <div class="spec-label">Catégorie</div>
                        <strong>{{ ucfirst($vehicle_category) }}</strong>
                    </div>
                    <div class="spec-item">
                        <div class="spec-label">Carburant</div>
                        <strong>{{ $vehicle_fuel }}</strong>
                    </div>
                    <div class="spec-item">
                        <div class="spec-label">Transmission</div>
                        <strong>{{ $vehicle_transmission }}</strong>
                    </div>
                    @if($vehicle_city)
                    <div class="spec-item">
                        <div class="spec-label">Localisation</div>
                        <strong>{{ $vehicle_city }}</strong>
                    </div>
                    @endif
                </div>
            </div>
        </div>

        {{-- Période et Prix --}}
        <div class="section">
            <div class="section-title">Période de location et tarification</div>
            <table class="price-table">
                <thead>
                    <tr>
                        <th style="width: 50%">Désignation</th>
                        <th class="text-right" style="width: 15%">Qté</th>
                        <th class="text-right" style="width: 17%">P.U. (MAD)</th>
                        <th class="text-right" style="width: 18%">Total (MAD)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            Location véhicule
                            <br><span style="font-size: 9px; color:#64748b;">
                                Du {{ $start_date }} au {{ $end_date }}
                            </span>
                        </td>
                        <td class="text-right">{{ $nb_days }} jour{{ $nb_days > 1 ? 's' : '' }}</td>
                        <td class="text-right">{{ number_format($price_per_day, 2) }}</td>
                        <td class="text-right">{{ number_format($vehicle_price, 2) }}</td>
                    </tr>

                    @if($with_driver)
                    <tr>
                        <td>
                            Service chauffeur ({{ $nb_drivers }} chauffeur{{ $nb_drivers > 1 ? 's' : '' }})
                            <br><span style="font-size: 9px; color:#64748b;">
                                Chauffeur professionnel inclus — {{ $nb_days }} jour{{ $nb_days > 1 ? 's' : '' }}
                            </span>
                        </td>
                        <td class="text-right">{{ $nb_drivers }} × {{ $nb_days }}j</td>
                        <td class="text-right">{{ number_format($driver_price_per_day, 2) }}</td>
                        <td class="text-right">{{ number_format($driver_price_total, 2) }}</td>
                    </tr>
                    @endif

                    <tr class="total">
                        <td colspan="3" style="font-size: 12px; letter-spacing: 1px;">
                            TOTAL À PAYER
                        </td>
                        <td class="text-right" style="font-size: 15px;">
                            {{ number_format($total_price, 2) }} MAD
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        {{-- Conditions --}}
        <div class="section">
            <div class="section-title">Conditions générales</div>
            <div class="conditions">
                <p>Le véhicule est loué en bon état de marche et de propreté. Le locataire s'engage à le restituer dans le même état.</p>
                <p>Le locataire est responsable de toute contravention, amende ou infraction commise pendant la période de location.</p>
                <p>En cas d'accident, le locataire doit informer immédiatement le propriétaire et remplir un constat amiable.</p>
                <p>Le kilométrage est illimité sauf indication contraire mentionnée au présent contrat.</p>
                <p>L'assurance de base est incluse. Toute franchise reste à la charge du locataire en cas de sinistre.</p>
                <p>Le carburant est à la charge du locataire. Le véhicule doit être restitué avec le même niveau de carburant.</p>
                @if($with_driver)
                <p>Le chauffeur fourni est un professionnel qualifié. Il reste sous la responsabilité du propriétaire pendant toute la durée.</p>
                <p>Le locataire s'engage à traiter le chauffeur avec respect et à ne pas lui demander d'effectuer des trajets non prévus.</p>
                @endif
                <p>En cas de litige, les parties s'engagent à privilégier un règlement amiable avant tout recours judiciaire.</p>
                <p>Le présent contrat est régi par la loi marocaine en vigueur.</p>
            </div>
        </div>

        {{-- Signatures --}}
        <div class="section" style="margin-top: 24px;">
            <div class="section-title">Signatures</div>
            <div style="font-size: 9px; color: #64748b; margin-bottom: 10px;">
                En signant ce contrat, les deux parties reconnaissent avoir lu et accepté toutes les conditions mentionnées ci-dessus.
            </div>
            <div class="signature-grid">
                <div class="sig-box">
                    <div class="sig-label">Le Propriétaire (Bailleur)</div>
                    <div class="sig-line">
                        {{ $owner_name }}<br>
                        <span style="font-size: 8px;">Signature et cachet</span>
                    </div>
                </div>
                <div class="sig-spacer"></div>
                <div class="sig-box">
                    <div class="sig-label">Le Locataire (Preneur)</div>
                    <div class="sig-line">
                        {{ $client_name }}<br>
                        <span style="font-size: 8px;">Lu et approuvé — Signature</span>
                    </div>
                </div>
            </div>
        </div>

    </div>

    {{-- ── Footer ───────────────────────────────────────────────────────── --}}
    <div class="footer">
        <strong>AutoRent</strong> · Contrat N° {{ $contract_number }} · Réservation #{{ $booking_id }} · Généré le {{ $generated_at }}
        @if($is_agency && $agency_name) · {{ $agency_name }} @endif
    </div>

</body>

</html>