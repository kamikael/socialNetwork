Majorelle VODOUNON :  Social Network - Interface Utilisateur

Le code suivant propose une interface de connexion, d'inscription et de mot de passe oublié pour l'application Social Network, parfaitement structurée.

 Notions front-end utilisées et leur but

- HTML : Structure les pages (formulaires, champs, boutons, titres, etc.) pour organiser le contenu de manière claire et accessible.
- CSS & Bootstrap* : Gèrent l'apparence visuelle, le responsive design et l'esthétique moderne de l'application. Bootstrap est utilisé pour accélérer le développement et garantir une interface adaptée à tous les écrans.
- JavaScript : Ajoute de l'interactivité (validation des formulaires, navigation sans rechargement, affichage dynamique des messages, etc.) et permet la communication avec le serveur via des appels API.
-Gestion de l'état utilisateur (sessionStorage/localStorage): Stocke temporairement des informations pour garder l'utilisateur connecté ou pré-remplir certains champs.
- Responsive Design : Garantit une expérience optimale sur ordinateur, tablette et mobile.
- Font Awesome : Utilisé pour ajouter des icônes et améliorer la lisibilité et l'esthétique de l'interface.

Objectif

L'ensemble de ces notions est utilisé dans le but d'offrir une application web moderne, rapide, agréable à utiliser et facile à maintenir. L'organisation du code par page et par fonctionnalité, la validation côté client, la navigation fluide et le design responsive sont autant de choix qui visent à garantir une expérience utilisateur optimale et une base solide pour faire évoluer le projet.
> Ce projet met en œuvre les bonnes pratiques du développement web moderne côté front-end, en combinant structure, interactivité, sécurité et design pour proposer une interface complète et professionnelle pour un réseau social éducatif.

## Notions JavaScript et PHP utilisées

### JavaScript
-sessionStorage / localStorage: Stockent des informations côté navigateur pour améliorer l’expérience utilisateur (ex : garder l’utilisateur connecté, pré-remplir l’email, etc.).
- fetch : Permet d’appeler l’API PHP sans recharger la page, pour une application plus fluide et réactive.
- addEventListener : Rend l’interface interactive en réagissant aux actions de l’utilisateur (clics, soumissions de formulaires, etc.).
- async/await : Simplifie la gestion des appels asynchrones (ex : attendre la réponse d’une API) et rend le code plus lisible.

### PHP
- Superglobales (`$_POST`, `$_GET`, `$_SERVER`) : Récupèrent les données envoyées par le front (formulaires, requêtes AJAX, informations sur la requête).
- PDO : Accès sécurisé à la base de données avec des requêtes préparées pour éviter les injections SQL.
- password_hash / password_verify : Sécurisent les mots de passe en les chiffrant et en les vérifiant lors de la connexion.
- header() : Gère les réponses HTTP (envoi de JSON, redirections après certaines actions, etc.).
- try/catch : Gère les erreurs et exceptions pour éviter que l’application ne plante et fournir des messages d’erreur clairs au front.

# Ajout du back-end

 A présent le projet intègre également un back-end complet pour gérer l’authentification, l’inscription, la confirmation d’email et la réinitialisation de mot de passe.

## Notions back-end (PHP) utilisées et leur but

- PHP : Langage principal pour le traitement des requêtes, la logique métier et la communication avec la base de données.
- Superglobales (`$_POST`, `$_GET`, `$_SERVER`) : Permettent de récupérer les données envoyées par le front (formulaires, requêtes AJAX, informations sur la requête).
- PDO (PHP Data Objects) : Interface sécurisée pour accéder à la base de données MySQL, avec requêtes préparées pour éviter les injections SQL.
- Gestion des mots de passe (`password_hash`, `password_verify`) : Sécurise les mots de passe utilisateurs en les chiffrant et en les vérifiant lors de la connexion.
- PHPMailer : Librairie utilisée pour l’envoi d’emails (confirmation d’inscription, réinitialisation de mot de passe) via SMTP. Elle permet d’envoyer des emails de façon sécurisée et professionnelle, en gérant l’authentification auprès du serveur mail (Gmail, Outlook, etc.), le format HTML des messages, et la gestion des erreurs d’envoi. PHPMailer est appelée dans le code pour envoyer automatiquement un email à l’utilisateur lors de l’inscription (pour confirmer son compte) ou lors d’une demande de réinitialisation de mot de passe.
- Gestion des en-têtes HTTP (`header()`) : Permet de renvoyer des réponses JSON, de gérer les redirections et les autorisations CORS.
- Gestion des erreurs et exceptions (`try/catch`) : Permet de capturer et traiter proprement les erreurs, pour éviter les plantages et fournir des messages clairs au front.
- Organisation modulaire : Séparation de la configuration (config.php, emailconf.php), de la logique métier (auth.php) et des dépendances (vendor/).

## Objectif

L’ensemble de ces notions et outils permet de garantir un back-end sécurisé, fiable et évolutif, capable de gérer toutes les opérations d’authentification et de communication avec le front-end. L’utilisation de standards modernes (PDO, PHPMailer, gestion des erreurs) assure la robustesse et la sécurité du projet.

> Le back-end de ce projet applique les bonnes pratiques du développement PHP moderne : sécurité, modularité, gestion des erreurs, et communication efficace avec le front. Il complète l’interface utilisateur pour offrir une solution d’authentification complète et professionnelle.
