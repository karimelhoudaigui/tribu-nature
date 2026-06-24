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

## Fonctionnalités principales

- Landing page moderne
- Onboarding avec calendrier, ambiances visuelles et filtres avancés
- Dashboard de Trips compatibles
- Page détail Trip
- Conversation créée quand l'utilisateur rejoint une Trip
- Local Activity Graph simulé
- Communauté, profil, prestataires et sécurité
