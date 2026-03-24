# Theodollars Bank (T$)

Web app de banque virtuelle pour soirée événementielle d'entreprise avec système de duels.

## Stack

- Next.js 16 + TypeScript
- Prisma + PostgreSQL
- Socket.io (temps réel)
- Tailwind CSS + Framer Motion

## Installation

### Prérequis

- Node.js 20+
- PostgreSQL (ou Docker)

### 1. Cloner et installer

```bash
git clone https://github.com/jeremyaeck/Theobank.git
cd Theobank
npm install
```

### 2. Configuration

Copier `.env.example` vers `.env` et configurer :

```bash
cp .env.example .env
```

Variables :
- `DATABASE_URL` : URL PostgreSQL
- `JWT_SECRET` : Clé secrète pour les tokens JWT
- `ADMIN_PASSWORD` : Mot de passe du compte Banque (admin)

### 3. Base de données

Avec Docker :
```bash
docker-compose up -d
```

Puis les migrations :
```bash
npm run migrate
npm run seed
```

### 4. Lancer

```bash
npm run dev
```

L'app est accessible sur `http://localhost:3000`

## Comptes

- **Admin (Banque)** : username `Banque`, mot de passe = `ADMIN_PASSWORD` dans .env
- **Joueurs** : inscription libre, solde initial de 50 T$

## Deploiement (Railway/Render)

1. Connecter le repo GitHub
2. Ajouter un service PostgreSQL
3. Configurer les variables d'environnement
4. Build command : `npm run build`
5. Start command : `npm run dev`
6. Lancer `npm run migrate:deploy && npm run seed` une fois
