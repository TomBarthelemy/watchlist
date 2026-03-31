# Watchlist

Application web Angular standalone pour gerer des watchlists collaboratives (films, series, animes) avec authentification Supabase, recherche TMDB et gestion des membres.

## Sommaire

- [Apercu](#apercu)
- [Fonctionnalites](#fonctionnalites)
- [Stack Technique](#stack-technique)
- [Architecture](#architecture)
- [Routes](#routes)
- [Demarrage Rapide](#demarrage-rapide)
- [Configuration](#configuration)
- [Scripts Disponibles](#scripts-disponibles)
- [Structure du Projet](#structure-du-projet)
- [Qualite et Tests](#qualite-et-tests)
- [Roadmap](#roadmap)

## Apercu

L'application permet de:

- se connecter via Supabase Auth
- creer ou selectionner une watchlist
- rechercher des contenus via l'API TMDB
- ajouter des items avec metadonnees (genre, annee, synopsis, trailer)
- filtrer/trier les items et marquer vus/non vus
- gerer les membres d'une watchlist
- personnaliser le theme (light/dark)

## Fonctionnalites

### Cote utilisateur

- Authentification email/mot de passe
- Flux d'acces post-login:
	- aucune liste -> creation
	- une liste -> ouverture directe
	- plusieurs listes -> selection
- Liste principale:
	- ajout via autocomplete TMDB
	- prevention des doublons
	- filtres par categorie/statut/auteur
	- tri par date/titre
	- marquage vu/non vu
	- suppression avec confirmation
- Presence temps reel (utilisateurs en ligne)
- Ecrans membres et settings dedies

### Cote technique

- Architecture feature-first avec Angular standalone
- Etat local via Signals
- Realtime Supabase (postgres_changes + presence)
- Barrels (index.ts) pour simplifier les imports de types/modeles

## Stack Technique

- Angular 18 (standalone components)
- TypeScript
- RxJS
- Angular Material (CDK, slide-toggle, tooltips)
- Supabase JS
- SCSS

## Architecture

Le projet suit une organisation modulaire:

- core: services singleton transverses (supa, theme, active watchlist)
- shared: composants reutilisables globaux (auth)
- features: logique metier par domaine
	- watchlist-access
	- watchlist-main
	- watchlist-members
	- watchlist-settings
- models et types: organises par domaine, avec barrels

## Routes

- / -> page d'acces watchlist (selection/creation)
- /watchlist/:id -> page principale
- /watchlist/:id/members -> page membres
- /watchlist/:id/settings -> page parametres

## Demarrage Rapide

### 1) Prerequis

- Node.js 18+
- npm 9+

### 2) Installation

```bash
npm install
```

### 3) Lancer en local

```bash
npm start
```

Puis ouvrir http://localhost:4200.

### 4) Build production

```bash
npm run build
```

## Configuration

La configuration runtime est lue depuis `public/app-config.json`.

Exemple:

```json
{
	"supaUrl": "https://xxx.supabase.co",
	"supaAnon": "YOUR_SUPABASE_ANON_KEY",
	"listId": "optional-default-list-id",
	"redirectUrl": "http://localhost:4200",
	"tmdbApiKey": "YOUR_TMDB_API_KEY",
	"avatarBucket": "avatars"
}
```

Notes importantes:

- Ne jamais mettre de cle service role Supabase dans le front.
- L'anon key Supabase est prevue pour le client, mais doit etre protegee par des policies RLS correctes.
- Idealement, adaptez la config par environnement (local/staging/prod).

## Scripts Disponibles

- `npm start`: lance le serveur de developpement
- `npm run build`: build de production
- `npm run watch`: build en mode watch (dev)
- `npm test`: tests unitaires (Karma)

## Structure du Projet

```text
src/app/
	core/
		services/
	shared/
		components/
	features/
		watchlist-access/
			components/
			services/
			watchlist-access-page.component.*
		watchlist-main/
			components/
			directives/
			services/
			stores/
			watchlist-main-page.component.*
		watchlist-members/
			components/
			services/
			watchlist-members-page.component.*
		watchlist-settings/
			components/
			watchlist-settings-page.component.*
	models/
		tmdb/
		users/
		watchlist/
		index.ts
	types/
		ui/
		watchlist/
		index.ts
```

## Qualite et Tests

- Build verifie regulierement via `npm run build`
- Tests unitaires disponibles via `npm test`
- A date, le projet beneficierait d'une couverture tests plus large sur:
	- services metier (access, members, supa)
	- composants de page
	- parcours critiques (creation/selection de watchlist)

## Roadmap

- Ajouter des guards de route (auth + membership)
- Renforcer la page settings (edition nom, suppression, permissions)
- Completer la gestion des roles membres (owner/editor/viewer)
- Ajouter des tests unitaires et e2e

