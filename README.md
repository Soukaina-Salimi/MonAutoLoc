# AutoRent Maroc

## Architecture

```
MonAutoLoc/
├── auth-service/              # Laravel 11 — Auth, profils, OCR, OAuth
├── vehicle-service/           # Laravel 11 — Véhicules, images
├── booking-service/           # Laravel 11 — Réservations, contrats PDF
├── review-service/            # Laravel 11 — Avis clients
├── ocr-service/               # FastAPI — PaddleOCR + Groq LLM
├── chatbot-orchestrator/      # FastAPI — Chatbot A2A/MCP + IA modules
├── marketing-orchestrator/    # FastAPI — Marketing IA (Meta Graph API)
├── demand-prediction/         # FastAPI
├── pricing-dynamique/         # FastAPI
├── report-generator/          # FastAPI
├── behavior-analytics/        # FastAPI
├── frontend/                  # Next.js 16 — Interface web
├── nginx/                     # API Gateway & Reverse proxy
├── docker-compose.yml
└── .env                       # Variables d'environnement
```

### Services et ports

| Service                | Port | Technologie                   | Base de données |
| ---------------------- | ---- | ----------------------------- | --------------- |
| auth-service           | 8001 | Laravel 11                    | db_auth         |
| vehicle-service        | 8002 | Laravel 11                    | db_vehicle      |
| booking-service        | 8003 | Laravel 11                    | db_booking      |
| review-service         | 8004 | Laravel 11                    | db_review       |
| ocr-service            | 8005 | FastAPI + PaddleOCR           | —               |
| chatbot-orchestrator   | 8006 | FastAPI + Groq                | Redis           |
| marketing-orchestrator | 8007 | FastAPI + Groq                | —               |
| pricing-dynamique      | 8008 | FastAPI + Groq                | —               |
| demand-prediction      | 8009 | FastAPI + Prophet + Groq      | Redis           |
| behavior-analytics     | 8010 | FastAPI + scikit-learn + Groq | Redis           |
| report-generator       | 8011 | FastAPI + ReportLab + Groq    | —               |
| nginx (API Gateway)    | 80   | Nginx Alpine                  | —               |
| frontend               | 3000 | Next.js 16                    | —               |
| mysql                  | 3306 | MySQL 8.0                     | —               |
| redis                  | 6379 | Redis 7 Alpine                | —               |
| phpmyadmin             | 8080 | phpMyAdmin                    | —               |

---

## Installation rapide

### 1. Cloner le dépôt

```bash
git clone https://github.com/Soukaina-Salimi/MonAutoLoc.git
cd MonAutoLoc
```

### 2. Créer les fichiers d'environnement

vous trouverez ci joint un dossier compressé contenant le fichiers .env de chaque service ainsi le fichier .env globale

### 3. Construire et démarrer

```bash
docker compose up -d --build
```

Le premier démarrage prend un peu de temps tant que PaddleOCR télécharge des modèles ML (~2 GB) uniquement la première fois.

### 4. Initialiser les bases de données

```bash
# Migrations
docker exec -it auth-service    php artisan migrate --force
docker exec -it vehicle-service php artisan migrate --force
docker exec -it booking-service php artisan migrate --force
docker exec -it review-service  php artisan migrate --force

# Storage symlinks
docker exec -it auth-service    php artisan storage:link
docker exec -it vehicle-service php artisan storage:link
docker exec -it booking-service php artisan storage:link

# Seeders
docker exec -it auth-service php artisan db:seed --class=DatabaseSeeder
```

### 5. Créer le compte administrateur

un compte adminsitrateur est crée avec le seeder :
'email' => admin@autorent.ma
'password' => password

# ─── Base de données ─────────────────────────────────────────────────────

Username=root
MYSQL_ROOT_PASSWORD=secret

## Lancement

### Démarrage complet

```bash

docker compose up -d (dans le bash dans la racine du projet)

```

### Arrêt

```bash
# Arrêter tous les services (conserve les données)
docker compose stop

# Arrêter et supprimer les containers (conserve les volumes/données)
docker compose down

# Arrêter et supprimer TOUT y compris les données (⚠️ irréversible)
docker compose down -v
```

---

### Comptes de test

```bash
# Créer un owner de test
docker exec -it auth-service php artisan tinker --execute="$role = App\Models\Role::where('name','owner')->first(); $owner = App\Models\User::create(['name'=>'Mohamed Auto','email'=>'owner@test.ma','password'=>bcrypt('Test@2025!'),'role_id'=>$role->id,'phone'=>'0612345678','city'=>'Casablanca']); echo 'Owner: '.$owner->email;"


# Créer un client de test
docker exec -it auth-service php artisan tinker --execute="$role = App\Models\Role::where('name','client')->first(); $client = App\Models\User::create(['name'=>'Soukaina Client','email'=>'client@test.ma','password'=>bcrypt('Test@2025!'),'role_id'=>$role->id,'phone'=>'0698765432','city'=>'Marrakech']); echo 'Client: '.$client->email;"
```

---

## Commandes utiles

### Docker

```bash
# État de tous les services
docker compose ps

# Logs d'un service spécifique
docker compose logs -f auth-service
docker compose logs -f chatbot-orchestrator
docker compose logs -f marketing-orchestrator
docker compose logs -f ocr-service
docker compose logs -f nginx

# Redémarrer un service
docker compose restart auth-service
docker compose restart chatbot-orchestrator

# Rebuild un service après modification du code
docker compose build --no-cache chatbot-orchestrator
docker compose up -d chatbot-orchestrator

# Accéder au shell d'un container
docker exec -it auth-service    bash
docker exec -it chatbot-orchestrator bash
docker exec -it mysql           mysql -u root -p
```

### Laravel (artisan)

```bash
# Vider le cache
docker exec -it auth-service php artisan cache:clear
docker exec -it auth-service php artisan config:clear
docker exec -it auth-service php artisan route:clear

# Lister toutes les routes
docker exec -it auth-service php artisan route:list

# Rollback migrations
docker exec -it auth-service php artisan migrate:rollback

# Rafraîchir les migrations ( supprime les données)
docker exec -it auth-service php artisan migrate:fresh --seed

```

### Tests API (curl)

```bash
# Test inscription
curl -X POST http://localhost/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.ma","password":"Test@2025!","role":"client"}'

# Test login
curl -X POST http://localhost/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@autorent.ma","password":"Admin@2025!"}'

# Test chatbot (avec token)
curl -X POST http://localhost/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{"message":"Voitures disponibles à Casablanca","session_id":"test-123"}'

# Test pricing IA
curl -X POST http://localhost/api/agent/pricing/suggest \
  -H "Content-Type: application/json" \
  -d '{"category":"berline","city":"Casablanca","brand":"Dacia","model":"Logan","year":2022}'

# Test santé OCR
curl http://localhost:8005/health

# Test santé chatbot
curl http://localhost/api/agent/health
```

### Tests des modules IA Premium

#### Prédiction de Demande (Prophet)

```bash
# Prédiction 30 jours — Casablanca, berline
curl -X POST http://localhost/api/agent/demand/predict \
  -H "Content-Type: application/json" \
  -d '{
    "city":       "Casablanca",
    "category":   "berline",
    "days_ahead": 30,
    "owner_id":   1
  }'

# Prédiction 90 jours — Marrakech, SUV (haute saison)
curl -X POST http://localhost/api/agent/demand/predict \
  -H "Content-Type: application/json" \
  -d '{
    "city":       "Marrakech",
    "category":   "suv",
    "days_ahead": 90
  }'

# Villes et catégories supportées
curl http://localhost/api/agent/demand/cities

```

#### Behavior Analytics (RFM + K-Means + Churn)

```bash
# Analyse comportementale complète (RFM + K-Means + Churn + LLM)
curl -X POST http://localhost/api/agent/behavior/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{
    "owner_id": 1,
    "mode":     "full"
  }'

# Analyse uniquement RFM
curl -X POST http://localhost/api/agent/behavior/analyze \
  -H "Content-Type: application/json" \
  -d '{"owner_id": 1, "mode": "rfm"}'

# Analyse uniquement Churn
curl -X POST http://localhost/api/agent/behavior/analyze \
  -H "Content-Type: application/json" \
  -d '{"owner_id": 1, "mode": "churn"}'

# Recommandations pour un client spécifique
curl -X POST http://localhost/api/agent/behavior/recommend \
  -H "Content-Type: application/json" \
  -d '{"owner_id": 1, "client_id": 42}'

```

#### Pricing Dynamique IA

```bash
# SUV à Marrakech (haute saison)
curl -X POST http://localhost/api/agent/pricing/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "category":     "suv",
    "city":         "Marrakech",
    "brand":        "Toyota",
    "model":        "RAV4",
    "year":         2022,
    "fuel_type":    "essence",
    "transmission": "automatique",
    "seats":        5,
    "offers_driver":false
  }'

# Berline économique à Casablanca
curl -X POST http://localhost/api/agent/pricing/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "category":     "berline",
    "city":         "Casablanca",
    "brand":        "Dacia",
    "model":        "Logan",
    "year":         2020,
    "fuel_type":    "diesel",
    "transmission": "manuelle",
    "seats":        5,
    "offers_driver":false
  }'

# Luxe avec chauffeur à Agadir
curl -X POST http://localhost/api/agent/pricing/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "category":     "luxe",
    "city":         "Agadir",
    "brand":        "Mercedes",
    "model":        "Classe E",
    "year":         2023,
    "fuel_type":    "essence",
    "transmission": "automatique",
    "seats":        5,
    "offers_driver":true
  }'

```

#### Rapport Mensuel IA (ReportLab)

```bash
# Générer un rapport PDF mensuel
curl -X POST http://localhost/api/agent/report/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{
    "owner_id":   1,
    "owner_name": "Mohamed Auto",
    "month":      5,
    "year":       2026
  }'

# Lister les rapports disponibles d'un owner
curl http://localhost/api/agent/report/list/1

# Télécharger un rapport PDF
curl -O http://localhost/api/agent/report/download/rapport_1_2026_05.pdf

```

#### OCR — Tests pipeline

```bash
# Test PaddleOCR seul (sans Groq — pour debug qualité image)
curl -X POST http://localhost:8005/ocr/test-paddle \
  -F "file=@/chemin/vers/cin.jpg"

# Extraction complète CIN recto
curl -X POST http://localhost:8005/ocr/extract \
  -F "file=@/chemin/vers/cin_recto.jpg" \
  -F "doc_type=cin"

# Extraction permis recto
curl -X POST http://localhost:8005/ocr/extract \
  -F "file=@/chemin/vers/permis.jpg" \
  -F "doc_type=permis"

# Extraction carte grise verso
curl -X POST http://localhost:8005/ocr/extract \
  -F "file=@/chemin/vers/carte_grise_verso.jpg" \
  -F "doc_type=carte_grise_verso"

# Types supportés :
#   cin | cin_verso | permis | permis_verso
#   carte_grise | carte_grise_verso

```

#### Marketing IA (Meta Graph API)

```bash
# Preview contenu (sans publier)
curl -X POST http://localhost/api/agent/marketing/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{
    "vehicule_id": 1,
    "platforms":   ["facebook", "instagram"],
    "tone":        "professionnel",
    "language":    "fr",
    "owner_id":    1
  }'

# Publication réelle (nécessite compte Meta connecté)
curl -X POST http://localhost/api/agent/marketing/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{
    "vehicule_id":    1,
    "platforms":      ["facebook"],
    "owner_id":       1,
    "custom_contents":{
      "facebook": "Texte personnalisé par l owner..."
    }
  }'

# Analytics d'une publication
curl http://localhost/api/agent/marketing/analytics/POST_ID_FACEBOOK \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

### Gestion des abonnements IA (à la carte)

```bash
# Voir toutes les features avec prix et statut owner
curl http://localhost/api/ai-features \
  -H "Authorization: Bearer VOTRE_TOKEN"


# Activer chatbot_indexing (gratuit — activation immédiate)
curl -X POST http://localhost/api/subscriptions \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feature_id": 1}'

# Souscrire à demand_prediction (99 MAD — nécessite preuve paiement)
curl -X POST http://localhost/api/subscriptions \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -F "feature_id=2" \
  -F "payment_method=virement" \
  -F "payment_reference=VIR-2026-001" \
  -F "payment_proof=@/chemin/vers/recu_paiement.jpg"

# Voir mes abonnements
curl http://localhost/api/subscriptions/my \
  -H "Authorization: Bearer VOTRE_TOKEN"

# Résilier un abonnement
curl -X PATCH http://localhost/api/subscriptions/1/cancel \
  -H "Authorization: Bearer VOTRE_TOKEN"

# ── ADMIN ──────────────────────────────────────────────────────
# Voir toutes les demandes d'abonnement en attente
curl "http://localhost/api/admin/subscriptions?status=pending" \
  -H "Authorization: Bearer TOKEN_ADMIN"

# Activer un abonnement après validation paiement
curl -X PATCH http://localhost/api/admin/subscriptions/1/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -d '{"admin_notes": "Virement reçu et confirmé le 10/06/2026"}'
# → Active automatiquement la feature dans owner_ai_features

# Rejeter un abonnement
curl -X PATCH http://localhost/api/admin/subscriptions/1/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -d '{"admin_notes": "Preuve de paiement illisible"}'
```

### Python (modules IA)

```bash
# les dépendances sont tou déjà cités dans les fichiers requirements et installées via les dockerfile

# Vérifier les packages installés
docker exec -it chatbot-orchestrator pip list

# Tester Prophet
docker exec -it demand-prediction  python -c "from prophet import Prophet; print('Prophet OK')"

# Tester PaddleOCR
docker exec -it ocr-service python -c "from paddleocr import PaddleOCR; print('PaddleOCR OK')"
```

---

## Structure des données de test

### Scénario complet de démonstration

```bash
# 1. Créer un owner avec véhicule
# → S'inscrire sur http://localhost:3000/register (rôle: owner)
# → Ajouter un véhicule depuis le dashboard

# 2. Tester l'OCR
# → Aller dans Profil → Documents
# → Uploader une photo de CIN (JPG/PNG)
# → Observer l'extraction automatique

# 3. Tester le chatbot
# → Aller sur http://localhost:3000/vehicules
# → Ouvrir le widget chatbot (icône en bas à droite)
# → Taper : "Je cherche une voiture à Casablanca"

# 4. Tester la réservation
# → Se connecter en tant que client
# → Réserver un véhicule depuis la liste
# → Vérifier la notification dans le dashboard owner

# 5. Valider en admin
# → Se connecter sur http://localhost:3000/admin
# → admin@autorent.ma / password
# → Accepter les demandes de subscriptions

```

---

## Technologies utilisées

| Catégorie          | Technologie                    | Version  |
| ------------------ | ------------------------------ | -------- |
| Backend API        | Laravel                        | 11       |
| Frontend           | Next.js                        | 16       |
| Agent IA           | FastAPI                        | 0.100+   |
| LLM                | Groq (llama-3.3-70b-versatile) | —        |
| OCR                | PaddleOCR                      | 2.7.3    |
| ML Prédiction      | Prophet (Meta)                 | 1.1.5    |
| ML Clustering      | scikit-learn                   | 1.4.0    |
| Génération PDF     | ReportLab                      | 4.1.0    |
| Cache/Sessions     | Redis                          | 7 Alpine |
| Base de données    | MySQL                          | 8.0      |
| Conteneurisation   | Docker + Compose               | —        |
| Proxy              | Nginx                          | Alpine   |
| OAuth Social       | Meta Graph API                 | v19.0    |
| Chiffrement tokens | AES-256                        | —        |
