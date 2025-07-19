# MEMBRE du groupe----------------------------------------
MBARGA ESSOBE harold garnikael
MAJORELLE VODOUNON
NEAL TOKPO
DEOS GRATIAS
#-----------------------------------------------------

#compte par default
#-------------------
#adminstrateur: 
 email: admin@example.com
 password: admin123
# utilisateur normal
email: darksideinfinity983@gmail.com
password: kamikael

# ----------------------------------------------------------------------------

# mbarga essobe harold garnikael

# -----------------------------------------------------------------------------

# Backoffice Administration – Réseau Social

Ce dépôt contient le code du backoffice d’administration du réseau social, ainsi que les APIs PHP qui interagissent avec lui.  
Le backoffice permet la gestion avancée des utilisateurs, administrateurs, articles, statistiques, logs, et la sécurité d’accès.

---

## Sommaire

- [Fonctionnalités principales](#fonctionnalités-principales)
- [Sécurité & Authentification](#sécurité--authentification)
- [Pages du backoffice](#pages-du-backoffice)
- [APIs principales](#apis-principales)
- [Historique des évolutions](#historique-des-évolutions)
- [Exemples d’utilisation API](#exemples-dutilisation-api)

---

## Fonctionnalités principales

- Authentification sécurisée des administrateurs (token, rôle, session)
- Tableau de bord avec statistiques globales et récentes
- Gestion des utilisateurs (recherche, suspension, suppression, statistiques)
- Gestion des administrateurs (création, modification, suppression)
- Gestion des articles (recherche, suppression, statistiques)
- Visualisation et export des logs d’administration
- Statistiques détaillées (évolution, top utilisateurs/articles, répartition des rôles)
- Sécurité renforcée sur toutes les routes sensibles

---

## Sécurité & Authentification

- **Connexion admin** via `/api/admin_auth.php` (POST, JSON)
- **Vérification du rôle** : seuls les utilisateurs avec `role = "administrateur"` peuvent accéder au backoffice
- **Token d’authentification** stocké côté client (sessionStorage) et côté serveur (base de données)
- **Protection des routes** : chaque page du backoffice inclut `auth-check.js` qui redirige vers la page de connexion si l’utilisateur n’est pas authentifié ou n’a pas le bon rôle
- **Validation du token** à chaque action sensible via l’API

---

## Pages du backoffice

- **connexion.html** : Page de connexion sécurisée pour les administrateurs
- **dashboard.html** : Tableau de bord avec statistiques globales, utilisateurs/articles/logs récents
- **gestion_admins.html** : Gestion des administrateurs (création, recherche, pagination)
- **gestion_utilisateurs.html** : Gestion avancée des utilisateurs (statut, suspension, recherche, statistiques)
- **articles.html** : Gestion des articles (recherche, suppression, pagination)
- **logs.html** : Visualisation et export des logs d’administration (filtrage par action)
- **stats.html** : Statistiques détaillées (graphiques, top utilisateurs/articles, répartition des rôles)
- **auth-check.js** : Script de protection des routes, vérification du token et du rôle

---

## APIs principales

### `/api/admin_auth.php`

- **POST** `/api/admin_auth.php`
  - `action: "login"` : Authentification admin (email, password) → retourne un token
  - `action: "validate_token"` : Vérifie la validité du token (header Authorization)

### `/api/admin.php`

- **GET** `/api/admin.php?action=dashboard`
  - Statistiques globales, utilisateurs/articles/logs récents
- **GET** `/api/admin.php?action=users`
  - Liste, recherche, pagination des utilisateurs
- **POST** `/api/admin.php?action=update_user`
  - Mise à jour d’un utilisateur
- **POST** `/api/admin.php?action=delete_user`
  - Suppression d’un utilisateur
- **GET** `/api/admin.php?action=articles`
  - Liste, recherche, pagination des articles
- **POST** `/api/admin.php?action=delete_article`
  - Suppression d’un article
- **GET** `/api/admin.php?action=logs`
  - Liste, recherche, export des logs d’administration
- **GET** `/api/admin.php?action=stats`
  - Statistiques détaillées (évolution, top, répartition)

---

## Historique des évolutions (exemple de commits)

### :rocket: Initialisation du backoffice

- Création des pages HTML principales (connexion, dashboard, gestion utilisateurs, articles, logs, stats)
- Mise en place du design responsive et de la navigation sidebar

### :lock: Sécurisation de l’accès backoffice

- Ajout de l’authentification admin via token
- Création de `auth-check.js` pour protéger toutes les routes du backoffice
- Vérification du rôle administrateur côté client et serveur

### :bar_chart: Statistiques et dashboard

- Ajout du tableau de bord avec statistiques globales (utilisateurs, articles, commentaires, likes)
- Affichage des utilisateurs, articles et logs récents

### :busts_in_silhouette: Gestion avancée des utilisateurs

- Recherche, pagination, suspension, suppression, statistiques par utilisateur
- Filtres par statut et rôle

### :newspaper: Gestion des articles

- Recherche, suppression, pagination, statistiques par article

### :memo: Gestion des logs d’administration

- Visualisation, filtrage, export des logs (connexion, suppression, modification, etc.)

### :chart_with_upwards_trend: Statistiques détaillées

- Graphiques d’évolution (utilisateurs, articles)
- Top utilisateurs et articles
- Répartition des rôles

### :shield: Sécurité renforcée

- Validation du token à chaque requête API
- Redirection automatique vers la page de connexion en cas d’accès non autorisé
- Logging des actions sensibles

---

## Exemples d’utilisation API

### Authentification admin

```bash
curl -X POST http://localhost/app/api/admin_auth.php \
  -H "Content-Type: application/json" \
  -d '{"action":"login","email":"admin@email.com","password":"motdepasse"}'
```

### Validation du token

```bash
curl -X POST http://localhost/app/api/admin_auth.php \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"action":"validate_token"}'
```

### Récupérer les statistiques du dashboard

```bash
curl http://localhost/app/api/admin.php?action=dashboard
```

---

## Sécurité et bonnes pratiques

- **Ne jamais exposer le token dans l’URL** : toujours utiliser le header Authorization
- **Inclure `auth-check.js` sur toutes les pages du backoffice**
- **Vérifier le rôle et le token côté serveur pour chaque action sensible**
- **Logger toutes les actions critiques pour audit**

---
