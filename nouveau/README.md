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
