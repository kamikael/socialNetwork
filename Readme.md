# Projet PHP - Réseau SocialNetwork

##  Présentation
Nom: Tokpo Neal
École: ESGIS - École Supérieure de Gestion d'Informatique et des Sciences  
Niveau: Licence 2 - Informatique, Réseaux et Télécommunications (IRT) 
Option: AL (groupe:2) 
Localisation: Cotonou, Bénin  
Intérêts: Développement web, applications PHP, projets collaboratifs, conteneurisation (Docker), Laravel


Ce document retrace l'évolution des fonctionnalités  des APIs associées, comme si chaque section avait été ajoutée lors de différents pushs sur le dépôt GitHub.

## :rocket: Initialisation du projet (Push 1)
- Mise en place de la structure du projet avec séparation claire entre l'API (dossier `api/`) et les vues (dossier `vues/`).
- Ajout des dépendances de base (ex : PHPMailer pour la gestion des emails).

## :busts_in_silhouette: Gestion des utilisateurs et profils (Push 2)
- **API Profil (`api/profil.php`)** :
  - Récupération des informations du profil utilisateur connecté (`GET /profil.php?action=get`).
  - Modification des informations du profil (nom, prénom, email, téléphone, adresse, bio).
  - Changement de mot de passe sécurisé.
  - Upload et modification de l’avatar utilisateur.
  - Suppression d’un article du profil.
  - Statistiques personnelles : nombre d’articles, nombre d’amis, nombre de likes reçus.
  - Consultation du profil d’un autre utilisateur (si ami).
  - Récupération des articles de l’utilisateur connecté avec nombre de likes et de commentaires.


## :handshake: Gestion des amis et invitations (Push 3)
- **API Amis (`api/amis.php`)** :
  - Liste des utilisateurs actifs (hors soi-même).
  - Liste des amis de l’utilisateur connecté.
  - Envoi d’une invitation d’ami (avec vérification des doublons et de l’état de la relation).
  - Acceptation ou refus d’une invitation reçue.
  - Suppression d’un ami existant.
  - Suggestions d’amis (utilisateurs non amis, sans invitation en cours).
  - Statistiques sur le nombre d’amis et d’amis en commun.


## :speech_balloon: Gestion des conversations et messages (Push 4)
- **API Chat (`api/chat.php`)** :
  - Récupération de la liste des utilisateurs disponibles pour discuter.
  - Récupération des messages d’une conversation (création automatique de la conversation si inexistante).
  - Envoi de messages texte ou image à un utilisateur (création de la conversation si besoin).
  - Récupération des conversations récentes avec aperçu du dernier message et de l’activité.

## :bar_chart: Statistiques et opérations avancées (Push 5)
- Statistiques détaillées sur le profil (nombre d’articles, amis, likes reçus).
- Statistiques sur les relations d’amitié (nombre total, amis en commun).

## :lock: Sécurité et authentification (Push 6)
- Authentification par token pour toutes les APIs sensibles (profil, amis, chat).
- Vérification systématique de l’identité de l’utilisateur pour chaque action.
- Gestion des erreurs et des statuts HTTP pour toutes les APIs.

## :file_folder: Structure des dossiers
- `api/` : Contient les endpoints PHP pour l’API (profil, amis, chat, etc.).
- `vues/back-office/` : (Prévu pour les interfaces d’administration/backoffice).
- `vues/clients/` : Interfaces utilisateurs classiques (amis, chat, profil, etc.).

## :information_source: Notes
- Le backoffice est prévu pour exploiter ces APIs afin de gérer les utilisateurs, les relations et la modération des contenus.
- Les endpoints sont sécurisés et nécessitent une authentification par token.
- Les fonctionnalités évoluent au fil des pushs pour répondre aux besoins de gestion et de supervision du réseau social.
## Travail réalisé 
J’ai pris en charge les modules suivants :
- Développement complet de la page profil utilisateur
- Intégration du système de chat (envoi, réception, affichage)
- Création du module de gestion des amis :
- Envoi, acceptation et refus de demandes
- Affichage de la liste d’amis
- Système de recherche de profils

## Technologies utilisées

- PHP 8+
- MySQL
- HTML5 / CSS3
- JavaScript
- Bootstrap 5

##  Lancer le projet localement

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/kamikael/socialNetwork.git 