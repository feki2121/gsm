# Documentation des Routes API Next.js

Ce document décrit toutes les routes API générées pour la gestion du système.

## Structure générale

- **GET `/api/[ressource]`** - Récupère tous les éléments avec pagination
- **POST `/api/[ressource]`** - Crée un nouvel élément
- **GET `/api/[ressource]/[id]`** - Récupère un élément spécifique
- **PUT `/api/[ressource]/[id]`** - Met à jour un élément
- **DELETE `/api/[ressource]/[id]`** - Supprime un élément

## Paramètres de pagination

Pour les requêtes GET `[ressource]`, les paramètres suivants sont supportés :
- `page` (défaut: 1) - Numéro de page
- `limit` (défaut: 10) - Nombre d'éléments par page

**Exemple :**
```
GET /api/products?page=2&limit=20
```

## Ressources API

### 1. Products
- **GET** `/api/products` - Liste tous les produits avec pagination
- **POST** `/api/products` - Crée un produit
- **GET** `/api/products/[id]` - Récupère un produit
- **PUT** `/api/products/[id]` - Met à jour un produit
- **DELETE** `/api/products/[id]` - Supprime un produit

**Champs pour POST/PUT :**
- `reference` (required) - Référence unique
- `designation` (required) - Désignation
- `categoryId` (required) - ID de la catégorie
- `homeId` (required) - ID de l'emplacement
- `prixAchat` - Prix d'achat
- `prixVente` - Prix de vente
- `quantiteStock` - Quantité en stock
- `seuilAlerte` - Seuil d'alerte stock

### 2. Categories
- **GET** `/api/categories` - Liste toutes les catégories
- **POST** `/api/categories` - Crée une catégorie
- **GET** `/api/categories/[id]` - Récupère une catégorie
- **PUT** `/api/categories/[id]` - Met à jour une catégorie
- **DELETE** `/api/categories/[id]` - Supprime une catégorie

**Champs pour POST/PUT :**
- `nom` (required) - Nom de la catégorie
- `description` - Description

### 3. Homes (Emplacements)
- **GET** `/api/homes` - Liste tous les emplacements
- **POST** `/api/homes` - Crée un emplacement
- **GET** `/api/homes/[id]` - Récupère un emplacement
- **PUT** `/api/homes/[id]` - Met à jour un emplacement
- **DELETE** `/api/homes/[id]` - Supprime un emplacement

**Champs pour POST/PUT :**
- `nom` (required) - Nom de l'emplacement
- `description` - Description

### 4. Clients
- **GET** `/api/clients` - Liste tous les clients
- **POST** `/api/clients` - Crée un client
- **GET** `/api/clients/[id]` - Récupère un client
- **PUT** `/api/clients/[id]` - Met à jour un client
- **DELETE** `/api/clients/[id]` - Supprime un client

**Champs pour POST/PUT :**
- `nom` (required) - Nom du client
- `telephone` (required) - Téléphone
- `adresse` - Adresse
- `email` - Email
- `solde` - Solde compte

### 5. Fournisseurs
- **GET** `/api/fournisseurs` - Liste tous les fournisseurs
- **POST** `/api/fournisseurs` - Crée un fournisseur
- **GET** `/api/fournisseurs/[id]` - Récupère un fournisseur
- **PUT** `/api/fournisseurs/[id]` - Met à jour un fournisseur
- **DELETE** `/api/fournisseurs/[id]` - Supprime un fournisseur

**Champs pour POST/PUT :**
- `nom` (required) - Nom du fournisseur
- `telephone` (required) - Téléphone
- `adresse` - Adresse
- `email` - Email
- `solde` - Solde compte

### 6. Factures
- **GET** `/api/factures` - Liste toutes les factures
- **POST** `/api/factures` - Crée une facture
- **GET** `/api/factures/[id]` - Récupère une facture
- **PUT** `/api/factures/[id]` - Met à jour une facture
- **DELETE** `/api/factures/[id]` - Supprime une facture

**Champs pour POST/PUT :**
- `numero` (required) - Numéro de facture
- `clientId` (required) - ID du client
- `totalHT` (required) - Total HT
- `totalTVA` (required) - Total TVA
- `totalTTC` (required) - Total TTC
- `remise` - Montant remise
- `statut` - Statut (IMPAYEE, PAYEE, ANNULEE)
- `type` - Type (DIRECTE, BL)
- `lignes` - Tableau de lignes de facture

### 7. Devis
- **GET** `/api/devis` - Liste tous les devis
- **POST** `/api/devis` - Crée un devis
- **GET** `/api/devis/[id]` - Récupère un devis
- **PUT** `/api/devis/[id]` - Met à jour un devis
- **DELETE** `/api/devis/[id]` - Supprime un devis

**Champs pour POST/PUT :**
- `numero` (required) - Numéro de devis
- `clientId` (required) - ID du client
- `totalHT` (required) - Total HT
- `totalTTC` (required) - Total TTC
- `validite` (required) - Date de validité
- `statut` - Statut (EN_ATTENTE, ACCEPTE, REFUSE)
- `lignes` - Tableau de lignes de devis

### 8. Bon Livraisons
- **GET** `/api/bon-livraisons` - Liste tous les bons de livraison
- **POST** `/api/bon-livraisons` - Crée un bon de livraison
- **GET** `/api/bon-livraisons/[id]` - Récupère un bon de livraison
- **PUT** `/api/bon-livraisons/[id]` - Met à jour un bon de livraison
- **DELETE** `/api/bon-livraisons/[id]` - Supprime un bon de livraison

**Champs pour POST/PUT :**
- `numero` (required) - Numéro du BL
- `clientId` (required) - ID du client
- `factureId` - ID de facturation
- `statut` - Statut (EN_ATTENTE, LIVREE)
- `lignes` - Tableau de lignes

### 9. Reglements Clients
- **GET** `/api/reglements-clients` - Liste tous les règlements clients
- **POST** `/api/reglements-clients` - Crée un règlement client
- **GET** `/api/reglements-clients/[id]` - Récupère un règlement client
- **PUT** `/api/reglements-clients/[id]` - Met à jour un règlement client
- **DELETE** `/api/reglements-clients/[id]` - Supprime un règlement client

**Champs pour POST/PUT :**
- `clientId` (required) - ID du client
- `montant` (required) - Montant
- `typeReglement` (required) - Type (CHEQUE, VIREMENT, ESPECE, etc.)
- `reference` - Référence
- `statut` - Statut (EN_ATTENTE, VALIDE)
- `echeance` - Date d'échéance
- `banque` - Banque
- `domiciliation` - Domiciliation

### 10. Reglements Fournisseurs
- **GET** `/api/reglements-fournisseurs` - Liste tous les règlements fournisseurs
- **POST** `/api/reglements-fournisseurs` - Crée un règlement fournisseur
- **GET** `/api/reglements-fournisseurs/[id]` - Récupère un règlement fournisseur
- **PUT** `/api/reglements-fournisseurs/[id]` - Met à jour un règlement fournisseur
- **DELETE** `/api/reglements-fournisseurs/[id]` - Supprime un règlement fournisseur

**Champs pour POST/PUT :**
- `fournisseurId` (required) - ID du fournisseur
- `montant` (required) - Montant
- `typeReglement` (required) - Type (CHEQUE, VIREMENT, ESPECE)
- `reference` - Référence
- `statut` - Statut (EN_ATTENTE, VALIDE)
- `echeance` - Date d'échéance
- `banque` - Banque
- `domiciliation` - Domiciliation

### 11. Reglements Divers
- **GET** `/api/reglements-divers` - Liste tous les règlements divers
- **POST** `/api/reglements-divers` - Crée un règlement divers
- **GET** `/api/reglements-divers/[id]` - Récupère un règlement divers
- **PUT** `/api/reglements-divers/[id]` - Met à jour un règlement divers
- **DELETE** `/api/reglements-divers/[id]` - Supprime un règlement divers

**Champs pour POST/PUT :**
- `libelle` (required) - Libellé
- `categorie` (required) - Catégorie de dépense
- `montant` (required) - Montant
- `modeReglement` (required) - Mode (CHEQUE, VIREMENT, ESPECE)
- `reference` - Référence
- `justificatif` - Justificatif

### 12. Caisses
- **GET** `/api/caisses` - Liste toutes les caisses
- **POST** `/api/caisses` - Crée une caisse
- **GET** `/api/caisses/[id]` - Récupère une caisse
- **PUT** `/api/caisses/[id]` - Met à jour une caisse
- **DELETE** `/api/caisses/[id]` - Supprime une caisse

**Champs pour POST/PUT :**
- `date` (required) - Date unique
- `soldeOuverture` (required) - Solde d'ouverture
- `totalEncaissements` - Total encaissements
- `totalDecaissements` - Total décaissements
- `soldeTheorique` (required) - Solde théorique
- `soldeReel` - Solde réel
- `statut` - Statut (OUVERTE, FERMEE)

### 13. Mouvements Caisse
- **GET** `/api/mouvements-caisse` - Liste tous les mouvements
- **POST** `/api/mouvements-caisse` - Crée un mouvement
- **GET** `/api/mouvements-caisse/[id]` - Récupère un mouvement
- **PUT** `/api/mouvements-caisse/[id]` - Met à jour un mouvement
- **DELETE** `/api/mouvements-caisse/[id]` - Supprime un mouvement

**Champs pour POST/PUT :**
- `caisseId` (required) - ID de la caisse
- `type` (required) - Type de mouvement
- `montant` (required) - Montant
- `description` - Description
- `justificatif` - Justificatif

## Messages de réponse

### Succès
- **GET (list)** - Retourne `{ data: [], pagination: {...} }`
- **GET (by id)** - Retourne l'objet
- **POST** - Retourne l'objet créé (status 201)
- **PUT** - Retourne l'objet mis à jour
- **DELETE** - Retourne `{ message: 'X deleted successfully' }`

### Erreurs
- **400** - Champs requis manquants
- **404** - Ressource non trouvée
- **500** - Erreur serveur

## Gestion des erreurs

Tous les endpoints gèrent :
- Les validations d'entrée
- Les erreurs de base de données
- Les erreurs Prisma spécifiques (P2025 = non trouvé)

## Configuration requise

Assurez-vous que :
1. `@prisma/client` est installé
2. Le fichier `.env` contient `DATABASE_URL`
3. Un client Prisma est disponible via `/lib/prisma.ts`

## Exemples de requêtes

### Créer un produit
```javascript
const response = await fetch('/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reference: 'PROD001',
    designation: 'Produit Test',
    categoryId: 'cat_123',
    homeId: 'home_123',
    prixAchat: 50,
    prixVente: 100,
  })
});
```

### Récupérer les produits (page 1, 10 par page)
```javascript
const response = await fetch('/api/products?page=1&limit=10');
```

### Mettre à jour un client
```javascript
const response = await fetch('/api/clients/client_123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nom: 'Nouveau nom',
    telephone: '0612345678',
  })
});
```

### Supprimer une facture
```javascript
const response = await fetch('/api/factures/facture_123', {
  method: 'DELETE'
});
```
