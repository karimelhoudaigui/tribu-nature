# Tribu Nature

MVP React + TypeScript + Tailwind CSS d'une plateforme sociale intelligente dédiée aux micro-aventures nature.

## Lancer le projet

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## APIs locales

Le générateur interroge maintenant des providers réels quand ils sont disponibles :

- OpenStreetMap / Overpass API : actif sans clé API
- Google Places : optionnel avec `VITE_GOOGLE_PLACES_API_KEY`
- DATAtourisme : optionnel avec `VITE_DATATOURISME_API_URL` et `VITE_DATATOURISME_API_TOKEN`

Copier `.env.example` vers `.env.local` pour configurer les clés :

```bash
cp .env.example .env.local
```

Sans clé, l'application garde les données mockées comme fallback.

## Catalogue évolutif avec Supabase

Les Trips ne sont plus obligées de rester stockées en dur dans React. L'app peut lire le catalogue depuis Supabase, qui sert de vraie base PostgreSQL + API REST.

### 1. Créer la base

Créer un projet Supabase, puis exécuter le SQL :

```bash
supabase/migrations/202606240001_create_trip_catalog.sql
```

Tu peux le coller dans le SQL Editor Supabase, ou utiliser la Supabase CLI plus tard.

### 2. Configurer les variables

Copier `.env.example` vers `.env.local`, puis remplir :

```bash
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=clé_anon_publique
```

Pour importer les données Excel dans Supabase, ajouter aussi côté terminal :

```bash
SUPABASE_URL=https://ton-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=clé_service_role_privée
```

Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` dans le frontend ou sur GitHub.

### 3. Importer les catalogues Excel convertis

Les fichiers de seed sont générés depuis les catalogues Excel :

- `data/tripCatalog.seed.json` : catalogue Pyrénées, 36 Trips + 120 activités
- `data/pacaTripCatalog.seed.json` : catalogue PACA, 36 Trips + 145 activités

```bash
npm run seed:supabase
```

La commande importe 72 Trips + 265 activités au total. Ensuite, l'app lit automatiquement Supabase si `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont présents. Sinon elle garde le fallback local pour continuer à fonctionner.

## Fonctionnalités principales

- Landing page moderne
- Onboarding avec calendrier, ambiances visuelles et filtres avancés
- Dashboard de Trips compatibles
- Page détail Trip
- Conversation créée quand l'utilisateur rejoint un Trip
- Local Activity Graph simulé
- Communauté, profil, prestataires et sécurité
