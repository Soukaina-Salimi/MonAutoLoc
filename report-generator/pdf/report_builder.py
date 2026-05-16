# report-generator/pdf/report_builder.py
"""
Génération du PDF professionnel avec ReportLab.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from reportlab.graphics import renderPDF
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

W, H = A4

# ── Palette de couleurs AutoRent ───────────────────────────────────────────────
BLUE       = colors.HexColor("#2563EB")
PURPLE     = colors.HexColor("#7C3AED")
DARK       = colors.HexColor("#1E293B")
GRAY       = colors.HexColor("#64748B")
LIGHT_GRAY = colors.HexColor("#F8FAFC")
BORDER     = colors.HexColor("#E2E8F0")
GREEN      = colors.HexColor("#059669")
RED        = colors.HexColor("#DC2626")
AMBER      = colors.HexColor("#D97706")
TEAL       = colors.HexColor("#0D9488")
WHITE      = colors.white

VERDICT_COLORS = {
    "excellent":    GREEN,
    "bon":          TEAL,
    "moyen":        AMBER,
    "insuffisant":  RED,
}


def build_pdf(data: dict, output_path: str) -> None:
    """Génère le PDF complet du rapport mensuel."""

    doc = SimpleDocTemplate(
        output_path,
        pagesize      = A4,
        leftMargin    = 2*cm,
        rightMargin   = 2*cm,
        topMargin     = 2*cm,
        bottomMargin  = 2*cm,
        title         = f"Rapport AutoRent {data['period']['label']}",
        author        = "AutoRent IA",
    )

    S     = _build_styles()
    story = []

    # ── Page de garde ──────────────────────────────────────────────────────
    story += _cover_page(data, S)
    story.append(PageBreak())

    # ── Section 1 : Vue d'ensemble ─────────────────────────────────────────
    story += _section_overview(data, S)
    story.append(PageBreak())

    # ── Section 2 : Analyse financière ────────────────────────────────────
    story += _section_financials(data, S)

    # ── Section 3 : Flotte ────────────────────────────────────────────────
    story += _section_fleet(data, S)
    story.append(PageBreak())

    # ── Section 4 : Comportement clients ──────────────────────────────────
    story += _section_behavior(data, S)

    # ── Section 5 : Marketing ─────────────────────────────────────────────
    story += _section_marketing(data, S)
    story.append(PageBreak())

    # ── Section 6 : Insights IA + Recommandations ─────────────────────────
    story += _section_insights(data, S)

    # ── Section 7 : Prédictions mois suivant ──────────────────────────────
    story += _section_predictions(data, S)

    doc.build(story, onFirstPage=_add_footer, onLaterPages=_add_footer)
    logger.info(f"[pdf] Rapport généré : {output_path}")


# ── Styles ─────────────────────────────────────────────────────────────────────

def _build_styles() -> dict:
    return {
        "h1": ParagraphStyle("h1",
            fontName="Helvetica-Bold", fontSize=22, textColor=WHITE,
            alignment=TA_CENTER, leading=28),

        "h2": ParagraphStyle("h2",
            fontName="Helvetica-Bold", fontSize=14, textColor=BLUE,
            spaceBefore=16, spaceAfter=8, leading=20),

        "h3": ParagraphStyle("h3",
            fontName="Helvetica-Bold", fontSize=11, textColor=DARK,
            spaceBefore=10, spaceAfter=5),

        "body": ParagraphStyle("body",
            fontName="Helvetica", fontSize=9.5, textColor=DARK,
            leading=14, spaceAfter=4),

        "body_gray": ParagraphStyle("body_gray",
            fontName="Helvetica", fontSize=9, textColor=GRAY,
            leading=13, spaceAfter=3),

        "bullet": ParagraphStyle("bullet",
            fontName="Helvetica", fontSize=9.5, textColor=DARK,
            leading=14, leftIndent=14, spaceAfter=3, bulletIndent=4),

        "center": ParagraphStyle("center",
            fontName="Helvetica", fontSize=9.5, textColor=DARK,
            alignment=TA_CENTER, leading=14),

        "kpi_val": ParagraphStyle("kpi_val",
            fontName="Helvetica-Bold", fontSize=22, textColor=DARK,
            alignment=TA_CENTER, leading=28),

        "kpi_lbl": ParagraphStyle("kpi_lbl",
            fontName="Helvetica", fontSize=8.5, textColor=GRAY,
            alignment=TA_CENTER),

        "insight": ParagraphStyle("insight",
            fontName="Helvetica", fontSize=9.5, textColor=WHITE,
            leading=14, leftIndent=8, rightIndent=8),
    }


# ── Helpers ────────────────────────────────────────────────────────────────────

def _hr(color=BORDER, thickness=0.8):
    return HRFlowable(width="100%", thickness=thickness,
                      color=color, spaceAfter=8, spaceBefore=4)

def _sp(n=6):
    return Spacer(1, n)

def _section_header(title: str, S: dict, color=BLUE):
    data = [[Paragraph(f"<b>{title}</b>",
                       ParagraphStyle("sh", fontName="Helvetica-Bold",
                                      fontSize=13, textColor=WHITE, leading=18))]]
    t = Table(data, colWidths=[W - 4*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), color),
        ("TOPPADDING",    (0,0),(-1,-1), 10),
        ("BOTTOMPADDING", (0,0),(-1,-1), 10),
        ("LEFTPADDING",   (0,0),(-1,-1), 14),
    ]))
    return t

def _kpi_card(label: str, value: str, sub: str = "", color=BLUE) -> Table:
    data = [
        [Paragraph(value, ParagraphStyle("kv",
            fontName="Helvetica-Bold", fontSize=20, textColor=color,
            alignment=TA_CENTER, leading=26))],
        [Paragraph(label, ParagraphStyle("kl",
            fontName="Helvetica-Bold", fontSize=8.5, textColor=DARK,
            alignment=TA_CENTER))],
    ]
    if sub:
        data.append([Paragraph(sub, ParagraphStyle("ks",
            fontName="Helvetica", fontSize=8, textColor=GRAY,
            alignment=TA_CENTER))])

    t = Table(data, colWidths=[4.2*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), LIGHT_GRAY),
        ("BOX",           (0,0),(-1,-1), 1, BORDER),
        ("TOPPADDING",    (0,0),(-1,-1), 10),
        ("BOTTOMPADDING", (0,0),(-1,-1), 10),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ("RIGHTPADDING",  (0,0),(-1,-1), 6),
        ("LINEABOVE",     (0,0),(-1,0), 3, color),
    ]))
    return t

def _fmt_money(val) -> str:
    try:
        return f"{int(val):,} MAD".replace(",", " ")
    except Exception:
        return f"{val} MAD"

def _fmt_pct(val) -> str:
    try:
        val = float(val)
        sign = "+" if val >= 0 else ""
        return f"{sign}{val:.1f}%"
    except Exception:
        return "0%"


# ── Sections du rapport ────────────────────────────────────────────────────────

def _cover_page(data: dict, S: dict) -> list:
    elems = []

    # Fond bleu dégradé simulé (rectangle coloré)
    cover_bg = Table(
        [[Paragraph("", S["body"])]],
        colWidths=[W - 4*cm]
    )
    cover_bg.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), BLUE),
        ("TOPPADDING",    (0,0),(-1,-1), 60),
        ("BOTTOMPADDING", (0,0),(-1,-1), 60),
    ]))

    # Titre principal
    title_data = [
        [Paragraph("🚗  AutoRent Maroc", ParagraphStyle("ct",
            fontName="Helvetica-Bold", fontSize=28, textColor=WHITE,
            alignment=TA_CENTER, leading=36))],
        [Paragraph("RAPPORT MENSUEL IA", ParagraphStyle("ct2",
            fontName="Helvetica-Bold", fontSize=16, textColor=colors.HexColor("#93C5FD"),
            alignment=TA_CENTER, spaceBefore=8))],
        [Paragraph(data["period"]["label"].upper(), ParagraphStyle("ct3",
            fontName="Helvetica-Bold", fontSize=22, textColor=WHITE,
            alignment=TA_CENTER, spaceBefore=4))],
    ]
    cover_title = Table(title_data, colWidths=[W - 4*cm])
    cover_title.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), BLUE),
        ("TOPPADDING",    (0,0),(-1,-1), 50),
        ("BOTTOMPADDING", (0,0),(-1,-1), 50),
        ("LEFTPADDING",   (0,0),(-1,-1), 30),
        ("RIGHTPADDING",  (0,0),(-1,-1), 30),
    ]))
    elems.append(cover_title)
    elems.append(_sp(20))

    # Infos owner
    owner_display = data.get("agency_name") or data.get("owner_name", "Owner")
    meta_data = [[
        Paragraph(f"<b>Propriétaire :</b> {owner_display}", S["body"]),
        Paragraph(f"<b>Généré le :</b> {datetime.now().strftime('%d/%m/%Y à %H:%M')}", S["body_gray"]),
        Paragraph(f"<b>Par :</b> AutoRent IA System", S["body_gray"]),
    ]]
    meta = Table(meta_data, colWidths=[(W-4*cm)/3]*3)
    meta.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), LIGHT_GRAY),
        ("BOX",           (0,0),(-1,-1), 1, BORDER),
        ("TOPPADDING",    (0,0),(-1,-1), 10),
        ("BOTTOMPADDING", (0,0),(-1,-1), 10),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("FONTSIZE",      (0,0),(-1,-1), 9),
    ]))
    elems.append(meta)
    elems.append(_sp(30))

    # KPIs résumé sur la couverture
    fin   = data["financials"]
    bkgs  = data["bookings"]
    fleet = data["fleet"]

    kpi_row = [
        _kpi_card("Revenus",       _fmt_money(fin["total_revenue"]),
                  _fmt_pct(fin["revenue_change_pct"]) + " vs mois passé", GREEN),
        _kpi_card("Réservations",  str(bkgs["total"]),
                  f"{bkgs['completed']} terminées", BLUE),
        _kpi_card("Taux occupation", f"{fleet['occupation_rate']}%",
                  f"{fleet['total_vehicles']} véhicules", PURPLE),
        _kpi_card("Note moyenne",  str(fleet["avg_rating"]) + "/5",
                  "Satisfaction clients", AMBER),
    ]
    kpi_table = Table([kpi_row], colWidths=[4.2*cm]*4,
                      hAlign="CENTER")
    kpi_table.setStyle(TableStyle([
        ("LEFTPADDING",  (0,0),(-1,-1), 3),
        ("RIGHTPADDING", (0,0),(-1,-1), 3),
    ]))
    elems.append(kpi_table)

    return elems


def _section_overview(data: dict, S: dict) -> list:
    elems = []
    insights = data.get("insights", {})
    verdict  = insights.get("performance_verdict", "moyen")
    v_color  = VERDICT_COLORS.get(verdict, AMBER)

    elems.append(_section_header("📊  Vue d'ensemble du mois", S))
    elems.append(_sp(10))

    # Executive summary
    if insights.get("executive_summary"):
        summary_data = [[
            Paragraph(f"<b>Synthèse exécutive :</b> {insights['executive_summary']}",
                      ParagraphStyle("es", fontName="Helvetica", fontSize=10,
                                     textColor=WHITE, leading=15))
        ]]
        summary_t = Table(summary_data, colWidths=[W - 4*cm])
        summary_t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), DARK),
            ("TOPPADDING",    (0,0),(-1,-1), 14),
            ("BOTTOMPADDING", (0,0),(-1,-1), 14),
            ("LEFTPADDING",   (0,0),(-1,-1), 16),
            ("RIGHTPADDING",  (0,0),(-1,-1), 16),
            ("LINEABOVE",     (0,0),(-1,0), 4, v_color),
        ]))
        elems.append(summary_t)
        elems.append(_sp(12))

    # Performance verdict
    verdict_labels = {
        "excellent":   "🏆 Excellent mois !",
        "bon":         "✅ Bon mois",
        "moyen":       "⚡ Mois moyen — améliorations possibles",
        "insuffisant": "⚠️ Mois insuffisant — actions requises",
    }
    elems.append(Paragraph(verdict_labels.get(verdict, ""), S["h3"]))
    elems.append(_sp(6))

    # Réalisations clés
    achievements = insights.get("key_achievements", [])
    concerns     = insights.get("key_concerns", [])

    if achievements or concerns:
        ach_items = "\n".join([f"• {a}" for a in achievements])
        con_items = "\n".join([f"• {c}" for c in concerns])

        two_col = Table([
            [
                Paragraph("<b>✅ Réalisations clés</b>", S["h3"]),
                Paragraph("<b>⚠️ Points d'attention</b>", S["h3"]),
            ],
            [
                Paragraph(ach_items, S["bullet"]),
                Paragraph(con_items, S["bullet"]),
            ]
        ], colWidths=[(W-4*cm)/2]*2)
        two_col.setStyle(TableStyle([
            ("VALIGN",        (0,0),(-1,-1), "TOP"),
            ("BACKGROUND",    (0,0),(-1,0), LIGHT_GRAY),
            ("TOPPADDING",    (0,0),(-1,-1), 8),
            ("BOTTOMPADDING", (0,0),(-1,-1), 8),
            ("LEFTPADDING",   (0,0),(-1,-1), 10),
            ("BOX",           (0,0),(-1,-1), 1, BORDER),
            ("INNERGRID",     (0,0),(-1,-1), 0.5, BORDER),
        ]))
        elems.append(two_col)

    return elems


def _section_financials(data: dict, S: dict) -> list:
    elems = []
    fin   = data["financials"]
    bkgs  = data["bookings"]

    elems.append(_sp(14))
    elems.append(_section_header("💰  Analyse Financière", S, TEAL))
    elems.append(_sp(10))

    # KPIs financiers détaillés
    kpis = [
        _kpi_card("Revenus du mois", _fmt_money(fin["total_revenue"]),
                  _fmt_pct(fin["revenue_change_pct"]) + " vs mois passé", GREEN),
        _kpi_card("Mois précédent", _fmt_money(fin["prev_month_revenue"]), "", GRAY),
        _kpi_card("Valeur moy. réservation", _fmt_money(fin["avg_booking_value"]), "", BLUE),
        _kpi_card("Réservations totales", str(bkgs["total"]),
                  f"✓ {bkgs['completed']}  ✗ {bkgs['cancelled']}", PURPLE),
    ]
    kpi_t = Table([kpis], colWidths=[4.2*cm]*4)
    kpi_t.setStyle(TableStyle([
        ("LEFTPADDING",  (0,0),(-1,-1), 3),
        ("RIGHTPADDING", (0,0),(-1,-1), 3),
    ]))
    elems.append(kpi_t)
    elems.append(_sp(12))

    # Graphique barres revenus par semaine
    rev_chart = data.get("revenue_chart", [])
    if rev_chart:
        elems.append(Paragraph("<b>Revenus par semaine</b>", S["h3"]))
        elems.append(_sp(6))
        elems.append(_bar_chart_revenue(rev_chart))
        elems.append(_sp(10))

    # Tableau des statuts réservations
    status_data = [
        [Paragraph("<b>Statut</b>", S["h3"]),
         Paragraph("<b>Nombre</b>", S["h3"]),
         Paragraph("<b>%</b>", S["h3"])],
    ]
    total = max(bkgs["total"], 1)
    for status, count in [
        ("✅ Terminées",  bkgs["completed"]),
        ("❌ Annulées",   bkgs["cancelled"]),
        ("⏳ En attente", bkgs["pending"]),
    ]:
        pct = round(count / total * 100, 1)
        status_data.append([
            Paragraph(status, S["body"]),
            Paragraph(str(count), S["center"]),
            Paragraph(f"{pct}%", S["center"]),
        ])

    status_t = Table(status_data, colWidths=[8*cm, 4*cm, 4*cm])
    status_t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,0), DARK),
        ("TEXTCOLOR",     (0,0),(-1,0), WHITE),
        ("FONTNAME",      (0,0),(-1,0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),(-1,-1), 9),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_GRAY]),
        ("GRID",          (0,0),(-1,-1), 0.5, BORDER),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("ALIGN",         (1,0),(-1,-1), "CENTER"),
    ]))
    elems.append(status_t)

    return elems


def _section_fleet(data: dict, S: dict) -> list:
    elems = []
    fleet = data["fleet"]

    elems.append(_sp(14))
    elems.append(_section_header("🚗  Analyse de la Flotte", S, PURPLE))
    elems.append(_sp(10))

    # KPIs flotte
    kpis = [
        _kpi_card("Véhicules",    str(fleet["total_vehicles"]),     "",           BLUE),
        _kpi_card("Taux occupation", f"{fleet['occupation_rate']}%","Ce mois",    GREEN),
        _kpi_card("Note moyenne", f"{fleet['avg_rating']}/5",       "Clients",    AMBER),
    ]
    kpi_t = Table([kpis], colWidths=[5.2*cm]*3)
    kpi_t.setStyle(TableStyle([
        ("LEFTPADDING", (0,0),(-1,-1), 4),
        ("RIGHTPADDING",(0,0),(-1,-1), 4),
    ]))
    elems.append(kpi_t)
    elems.append(_sp(12))

    # Top véhicule du mois
    top_v = fleet.get("top_vehicle", {})
    if top_v:
        top_data = [[
            Paragraph(f"<b>🏆 Véhicule du mois :</b> {top_v.get('brand','')} {top_v.get('model','')} "
                      f"({top_v.get('year','')}) — Note {top_v.get('average_rating', 0)}/5",
                      ParagraphStyle("tv", fontName="Helvetica", fontSize=10,
                                     textColor=WHITE, leading=14))
        ]]
        top_t = Table(top_data, colWidths=[W - 4*cm])
        top_t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), TEAL),
            ("TOPPADDING",    (0,0),(-1,-1), 10),
            ("BOTTOMPADDING", (0,0),(-1,-1), 10),
            ("LEFTPADDING",   (0,0),(-1,-1), 14),
        ]))
        elems.append(top_t)
        elems.append(_sp(10))

    # Tableau liste véhicules
    vehicles = fleet.get("vehicles", [])
    if vehicles:
        elems.append(Paragraph("<b>Détail de la flotte</b>", S["h3"]))
        elems.append(_sp(6))

        header = [
            Paragraph("<b>Véhicule</b>", S["h3"]),
            Paragraph("<b>Ville</b>", S["h3"]),
            Paragraph("<b>Prix/jour</b>", S["h3"]),
            Paragraph("<b>Statut</b>", S["h3"]),
            Paragraph("<b>Note</b>", S["h3"]),
        ]
        rows = [header]
        for v in vehicles[:8]:
            status_emoji = "🟢" if v.get("status") == "available" else "🔵"
            rows.append([
                Paragraph(f"{v.get('brand','')} {v.get('model','')}", S["body"]),
                Paragraph(str(v.get("city", "")), S["body"]),
                Paragraph(f"{v.get('price_per_day', 0)} MAD", S["center"]),
                Paragraph(f"{status_emoji} {v.get('status','')}", S["body"]),
                Paragraph(f"⭐ {v.get('average_rating', 0)}", S["center"]),
            ])

        v_table = Table(rows, colWidths=[5.5*cm, 2.5*cm, 2.5*cm, 3*cm, 2.5*cm])
        v_table.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,0), DARK),
            ("TEXTCOLOR",     (0,0),(-1,0), WHITE),
            ("FONTNAME",      (0,0),(-1,0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0),(-1,-1), 8.5),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_GRAY]),
            ("GRID",          (0,0),(-1,-1), 0.5, BORDER),
            ("TOPPADDING",    (0,0),(-1,-1), 6),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ]))
        elems.append(v_table)

    return elems


def _section_behavior(data: dict, S: dict) -> list:
    elems = []
    beh   = data.get("behavior", {})

    elems.append(_sp(14))
    elems.append(_section_header("👥  Comportement Clients", S, colors.HexColor("#BE185D")))
    elems.append(_sp(10))

    # KPIs clients
    kpis = [
        _kpi_card("Clients analysés", str(beh.get("total_clients", 0)),  "",     BLUE),
        _kpi_card("Champions",        str(beh.get("champion_count", 0)), "top",  GREEN),
        _kpi_card("À risque",         str(beh.get("at_risk_count", 0)),  "churn",RED),
        _kpi_card("Score RFM moyen",  f"{beh.get('avg_rfm_score', 0)}/100", "",  PURPLE),
    ]
    kpi_t = Table([kpis], colWidths=[4.2*cm]*4)
    kpi_t.setStyle(TableStyle([
        ("LEFTPADDING", (0,0),(-1,-1), 3),
        ("RIGHTPADDING",(0,0),(-1,-1), 3),
    ]))
    elems.append(kpi_t)
    elems.append(_sp(12))

    # Tableau segments RFM
    segments = beh.get("segments", {})
    if segments:
        elems.append(Paragraph("<b>Segmentation RFM des clients</b>", S["h3"]))
        elems.append(_sp(6))

        seg_icons = {
            "Champion":      "🏆",
            "Loyal":         "⭐",
            "Potentiel":     "🚀",
            "Nouveau":       "✨",
            "À risque":      "⚠️",
            "Perdu VIP":     "💔",
            "Dormant":       "😴",
            "Sensible prix": "💰",
            "Standard":      "👤",
        }

        header = [
            Paragraph("<b>Segment</b>", S["h3"]),
            Paragraph("<b>Clients</b>", S["h3"]),
            Paragraph("<b>%</b>", S["h3"]),
            Paragraph("<b>Dépense moy.</b>", S["h3"]),
            Paragraph("<b>Score RFM</b>", S["h3"]),
        ]
        rows = [header]
        for name, stats in sorted(segments.items(),
                                   key=lambda x: x[1]["count"], reverse=True):
            rows.append([
                Paragraph(f"{seg_icons.get(name, '👤')} {name}", S["body"]),
                Paragraph(str(stats["count"]), S["center"]),
                Paragraph(f"{stats['percentage']}%", S["center"]),
                Paragraph(f"{int(stats['avg_spend'])} MAD", S["center"]),
                Paragraph(str(stats["avg_rfm_score"]), S["center"]),
            ])

        seg_t = Table(rows, colWidths=[4.5*cm, 2.5*cm, 2*cm, 4*cm, 3*cm])
        seg_t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,0), DARK),
            ("TEXTCOLOR",     (0,0),(-1,0), WHITE),
            ("FONTNAME",      (0,0),(-1,0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0),(-1,-1), 8.5),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_GRAY]),
            ("GRID",          (0,0),(-1,-1), 0.5, BORDER),
            ("TOPPADDING",    (0,0),(-1,-1), 6),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
            ("ALIGN",         (1,0),(-1,-1), "CENTER"),
        ]))
        elems.append(seg_t)

    return elems


def _section_marketing(data: dict, S: dict) -> list:
    elems = []
    mkt   = data.get("marketing", {})

    elems.append(_sp(14))
    elems.append(_section_header("📢  Marketing & Réseaux Sociaux", S,
                                  colors.HexColor("#DB2777")))
    elems.append(_sp(10))

    kpis = [
        _kpi_card("Publications", str(mkt.get("campaigns_count", 0)),
                  "ce mois", colors.HexColor("#DB2777")),
    ]

    # KPIs par plateforme
    platforms = mkt.get("platforms", {})
    for plat, count in list(platforms.items())[:3]:
        emoji = {"facebook": "👍", "instagram": "📸", "tiktok": "🎵"}.get(plat, "📣")
        kpis.append(_kpi_card(plat.capitalize(), str(count), "publications", BLUE))

    while len(kpis) < 4:
        kpis.append(_kpi_card("—", "0", "", GRAY))

    kpi_t = Table([kpis[:4]], colWidths=[4.2*cm]*4)
    kpi_t.setStyle(TableStyle([
        ("LEFTPADDING", (0,0),(-1,-1), 3),
        ("RIGHTPADDING",(0,0),(-1,-1), 3),
    ]))
    elems.append(kpi_t)

    return elems


def _section_insights(data: dict, S: dict) -> list:
    elems = []
    ins   = data.get("insights", {})

    elems.append(_sp(14))
    elems.append(_section_header("🤖  Recommandations IA", S, DARK))
    elems.append(_sp(10))

    advice_sections = [
        ("💰 Conseil Pricing",   ins.get("pricing_advice",  ""), GREEN),
        ("🚗 Conseil Flotte",    ins.get("fleet_advice",    ""), BLUE),
        ("📢 Conseil Marketing", ins.get("marketing_advice",""), colors.HexColor("#DB2777")),
    ]

    for label, text, color in advice_sections:
        if not text: continue
        box_data = [[
            Paragraph(f"<b>{label}</b>", ParagraphStyle("al",
                fontName="Helvetica-Bold", fontSize=9.5, textColor=color)),
            Paragraph(text, S["body"]),
        ]]
        box = Table(box_data, colWidths=[4.5*cm, W - 4*cm - 4.5*cm])
        box.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(0,-1), LIGHT_GRAY),
            ("BOX",           (0,0),(-1,-1), 1, BORDER),
            ("LINEAFTER",     (0,0),(0,-1), 3, color),
            ("TOPPADDING",    (0,0),(-1,-1), 10),
            ("BOTTOMPADDING", (0,0),(-1,-1), 10),
            ("LEFTPADDING",   (0,0),(-1,-1), 10),
            ("VALIGN",        (0,0),(-1,-1), "TOP"),
        ]))
        elems.append(box)
        elems.append(_sp(6))

    # Plan 30 jours
    strategy = ins.get("next_month_strategy", "")
    if strategy:
        elems.append(_sp(4))
        elems.append(Paragraph("<b>📅 Plan d'action — mois prochain</b>", S["h3"]))
        strat_data = [[Paragraph(strategy, ParagraphStyle("st",
            fontName="Helvetica", fontSize=9.5, textColor=WHITE, leading=14))]]
        strat_t = Table(strat_data, colWidths=[W - 4*cm])
        strat_t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), DARK),
            ("TOPPADDING",    (0,0),(-1,-1), 12),
            ("BOTTOMPADDING", (0,0),(-1,-1), 12),
            ("LEFTPADDING",   (0,0),(-1,-1), 14),
            ("RIGHTPADDING",  (0,0),(-1,-1), 14),
        ]))
        elems.append(strat_t)

    # KPIs à surveiller
    kpis_watch = ins.get("kpis_to_watch", [])
    if kpis_watch:
        elems.append(_sp(10))
        elems.append(Paragraph("<b>📊 KPIs à surveiller le mois prochain</b>", S["h3"]))
        elems.append(_sp(4))
        kpi_cells = [Paragraph(f"• {k}", S["bullet"]) for k in kpis_watch]
        kpi_row   = Table([kpi_cells], colWidths=[(W-4*cm)/len(kpi_cells)]*len(kpi_cells))
        kpi_row.setStyle(TableStyle([
            ("BACKGROUND", (0,0),(-1,-1), LIGHT_GRAY),
            ("BOX",        (0,0),(-1,-1), 1, BORDER),
            ("TOPPADDING", (0,0),(-1,-1), 8),
            ("BOTTOMPADDING",(0,0),(-1,-1), 8),
            ("LEFTPADDING",(0,0),(-1,-1), 10),
        ]))
        elems.append(kpi_row)

    return elems


def _section_predictions(data: dict, S: dict) -> list:
    elems = []
    pred  = data.get("next_month", {})

    elems.append(_sp(14))
    elems.append(_section_header("🔮  Prédictions Mois Suivant", S, TEAL))
    elems.append(_sp(10))

    if pred:
        pred_text = (
            f"Marché ciblé : {pred.get('city','N/A')} — {pred.get('category','N/A')}. "
            f"Demande prévue : {pred.get('avg_daily','?')} réservations/jour en moyenne. "
            f"Tendance : {pred.get('trend','stable')}. "
            f"Jours à forte demande : {pred.get('high_demand_days','?')} jours. "
        )
        if pred.get("peak_day"):
            pk = pred["peak_day"]
            pred_text += f"Pic prévu le {pk.get('date','?')} ({pk.get('predicted','?')} réservations)."

        pred_data = [[Paragraph(pred_text, ParagraphStyle("pr",
            fontName="Helvetica", fontSize=10, textColor=WHITE, leading=15))]]
        pred_t = Table(pred_data, colWidths=[W - 4*cm])
        pred_t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), TEAL),
            ("TOPPADDING",    (0,0),(-1,-1), 14),
            ("BOTTOMPADDING", (0,0),(-1,-1), 14),
            ("LEFTPADDING",   (0,0),(-1,-1), 16),
            ("RIGHTPADDING",  (0,0),(-1,-1), 16),
        ]))
        elems.append(pred_t)
    else:
        elems.append(Paragraph(
            "Prédictions non disponibles — activez le module Prédiction de Demande.",
            S["body_gray"]
        ))

    elems.append(_sp(20))

    # Footer rapport
    footer_data = [[
        Paragraph("Rapport généré automatiquement par AutoRent IA System.",
                  S["body_gray"]),
        Paragraph(f"© AutoRent Maroc {datetime.now().year}",
                  ParagraphStyle("fr", fontName="Helvetica", fontSize=9,
                                 textColor=GRAY, alignment=TA_RIGHT)),
    ]]
    footer_t = Table(footer_data, colWidths=[(W-4*cm)/2]*2)
    footer_t.setStyle(TableStyle([
        ("LINEABOVE",     (0,0),(-1,0), 1, BORDER),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("LEFTPADDING",   (0,0),(-1,-1), 0),
        ("RIGHTPADDING",  (0,0),(-1,-1), 0),
    ]))
    elems.append(footer_t)

    return elems


def _bar_chart_revenue(rev_data: list) -> Drawing:
    """Génère un graphique barres des revenus hebdomadaires."""
    d = Drawing(W - 4*cm, 120)

    if not rev_data:
        return d

    values  = [float(r.get("revenue", 0)) for r in rev_data]
    labels  = [r.get("week", f"S{i+1}") for i, r in enumerate(rev_data)]
    max_val = max(values, default=1) or 1

    chart_w = W - 4*cm - 2*cm
    chart_h = 90
    x0      = 1*cm
    y0      = 15

    bar_w   = chart_w / max(len(values), 1)
    padding = bar_w * 0.25

    for i, (val, label) in enumerate(zip(values, labels)):
        bar_h   = (val / max_val) * chart_h
        bar_x   = x0 + i * bar_w + padding / 2
        bar_y   = y0
        bar_bw  = bar_w - padding

        # Barre
        rect = Rect(bar_x, bar_y, bar_bw, bar_h,
                    fillColor=BLUE if i < len(values) - 1 else GREEN,
                    strokeColor=None)
        d.add(rect)

        # Valeur au-dessus
        if val > 0:
            d.add(String(bar_x + bar_bw/2, bar_y + bar_h + 2,
                         f"{int(val):,}",
                         fontSize=7, fillColor=DARK,
                         textAnchor="middle"))

        # Label en dessous
        d.add(String(bar_x + bar_bw/2, bar_y - 10,
                     label, fontSize=7, fillColor=GRAY,
                     textAnchor="middle"))

    return d


def _add_footer(canvas, doc):
    """Numérotation des pages."""
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRAY)
    page_num = canvas.getPageNumber()
    if page_num > 1:
        canvas.drawString(2*cm, 1.2*cm, "AutoRent Maroc — Rapport Mensuel IA Confidentiel")
        canvas.drawRightString(W - 2*cm, 1.2*cm, f"Page {page_num}")
    canvas.restoreState()