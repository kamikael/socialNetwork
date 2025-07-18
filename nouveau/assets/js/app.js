 /**
 * Application Réseau Social - Script Principal
 * Gestion de la navigation SPA, authentification, et appels API
 */

// Configuration de l'API
const API_BASE_URL = 'api/';

// Variables globales
let currentUser = null;
let currentPage = 'accueil';
let currentChat = null;
let messages = {};
let chatInterval = null;
let friends = [];

/**
 * Initialisation de l'application
 */

function initApp() {
    console.log('Initialisation de l\'application...');
    checkAuthStatus();
    setupEventListeners();
    
    // Rediriger vers la page de connexion si aucun utilisateur n'est connecté
    if (!currentUser) {
        loadPage('connexion');
    } else {
        // Si l'utilisateur est connecté, charger la page d'accueil ou la page demandée
        const hash = window.location.hash.substring(1);
        const pageToLoad = hash || 'accueil';
        loadPage(pageToLoad);
    }
}

/**
 * Vérification du statut d'authentification
 */

function checkAuthStatus() {
    const userData = sessionStorage.getItem('user');
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
            showAuthenticatedUI();
            console.log('Utilisateur connecté:', currentUser.nom);
            const space_user = document.getElementById("name-user") 
            if( space_user ) space_user
            .textContent = `${currentUser.prenom} ${currentUser.nom}`;
        } catch (error) {
            console.error('Erreur lors du parsing des données utilisateur:', error);
            logout();
        }
    } else {
        showVisitorUI();
        console.log('Aucun utilisateur connecté');
    }
}

/**
 * Affichage de l'interface pour utilisateurs connectés
 */
function showAuthenticatedUI() {
    document.getElementById('nav-authenticated').style.display = 'block';
    document.getElementById('nav-user-menu').style.display = 'block';
    document.getElementById('nav-visitor').style.display = 'none';
    
    // Mettre à jour le nom d'utilisateur
    const userNameElement = document.getElementById('user-name');
    if (userNameElement && currentUser) {
        userNameElement.textContent = `${currentUser.prenom} ${currentUser.nom}`;
    }
}

/**
 * Affichage de l'interface pour visiteurs
 */
function showVisitorUI() {
    document.getElementById('nav-authenticated').style.display = 'none';
    document.getElementById('nav-user-menu').style.display = 'none';
    document.getElementById('nav-visitor').style.display = 'block';
}

/**
 * Configuration des écouteurs d'événements
 */
function setupEventListeners() {
    // Gestion de la navigation
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.page) {
            loadPage(event.state.page, false);
        }
    });
}

/**
 * Chargement d'une page (navigation SPA)
 */
async function loadPage(pageName, updateHistory = true) {
    console.log('Chargement de la page:', pageName);
    
    // Vérifier l'authentification si nécessaire
    if (requiresAuth(pageName) && !currentUser) {
        loadPage('connexion');
        return;
    }
    
    // Mettre à jour l'historique
    if (updateHistory) {
        window.history.pushState({ page: pageName }, '', `#${pageName}`);
    }
    
    currentPage = pageName;
    
    // Afficher le loading
    showLoading();
    
    try {
        // Charger le contenu de la page
        const response = await fetch(`vues/clients/${pageName}.html`);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const content = await response.text();
        document.getElementById('content').innerHTML = content;
        
        // Initialiser les fonctionnalités spécifiques à la page
        initPageFunctionality(pageName);
        
        // Charger le fichier JavaScript spécifique à la page si nécessaire
        if (pageName === 'profil-ami') {
            await loadScript('assets/js/profil-ami.js');
        }else if(pageName === 'accueil'){
            await loadScript('assets/js/accueil.js');
        }
        else if(pageName === 'profil'){
            await loadScript('assets/js/profil.js');
        }
        else if(pageName === 'amis'){
            await loadScript('assets/js/amis.js');
        }
        else if(pageName === 'connexion'){
            await loadScript('assets/js/connexion.js');
        }
        else if(pageName === 'inscription'){
            await loadScript('assets/js/inscription.js');
        }
        else if(pageName === 'motdepasse_oublie'){
            await loadScript('assets/js/motdepasse_oub.js');
        }
        
        // Mettre à jour la navigation active
        updateActiveNavigation(pageName);
        
    } catch (error) {
        console.error('Erreur lors du chargement de la page:', error);
        showError('Erreur lors du chargement de la page');
    }
}

/**
 * Vérifier si une page nécessite une authentification
 */
function requiresAuth(pageName) {
    const publicPages = ['connexion', 'inscription', 'motdepasse_oublie'];
    return !publicPages.includes(pageName);
}

/**
 * Initialisation des fonctionnalités spécifiques à chaque page
 */
function initPageFunctionality(pageName) {
    switch (pageName) {
        case 'accueil':
            loadArticles();
            setupAccueilPage();
            break;
        case 'profil':
            loadProfil();
            loadArticles();
            setupAccueilPage();
            break;
        case 'profil-ami':
            // La page profil-ami sera gérée par son propre fichier JS
            break;
        case 'amis':
            loadAmis();
            break;
        case 'chat':
            initChat();
            break;        
        case 'connexion':
            setupLoginForm();
            break;
        case 'inscription':
            setupRegisterForm();
            break;
        case 'motdepasse_oublie':
            setupPasswordResetForm();
            break;
    }
}

function setupAccueilPage() {
  const space_user = document.getElementById("name-user") 
            if( space_user ) space_user
            .textContent = `${currentUser.prenom} ${currentUser.nom}`;
    // Rendre les fonctions modales globales pour le bouton
    window.showCreateArticleModal = function() {
        const form = document.getElementById('create-article-form');
        if (form) {
            form.style.display = 'block';
            const textarea = document.getElementById('article-content');
            if (textarea) textarea.focus();
        }
    };
    window.hideCreateArticleForm = function() {
        const form = document.getElementById('create-article-form');
        if (form) {
            form.style.display = 'none';
            const articleForm = document.getElementById('article-form');
            if (articleForm) articleForm.reset();
        }
    };
    // Réattacher le submit du formulaire d'article (si besoin)
    const articleForm = document.getElementById('article-form');
    if (articleForm) {
        articleForm.onsubmit = async function(e) {
            e.preventDefault();
            const content = document.getElementById('article-content').value.trim();
            const imageFile = document.getElementById('article-image').files[0];
            if (!content) {
                showError('Le contenu de l\'article ne peut pas être vide');
                return;
            }
            try {
                const formData = new FormData();
                formData.append('action', 'create');
                formData.append('contenu', content);
                if (imageFile) {
                    formData.append('image', imageFile);
                }
                const token = (window.sessionToken || localStorage.getItem('token_session') || currentUser.token || '');
                formData.append('token', token);
                const response = await fetch(API_BASE_URL + 'articles.php', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (result.success) {
                    showSuccess('Article publié avec succès !');
                    window.hideCreateArticleForm();
                    loadArticles();
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error('Erreur lors de la création de l\'article:', error);
                showError('Erreur lors de la création de l\'article');
            }
        };
    }
}

/**
 * Mise à jour de la navigation active
 */
function updateActiveNavigation(pageName) {
    // Retirer la classe active de tous les liens
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Ajouter la classe active au lien correspondant
    const activeLink = document.querySelector(`[onclick="loadPage('${pageName}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

/**
 * Affichage du loading
 */
function showLoading() {
    document.getElementById('content').innerHTML = `
        <div class="loading">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
        </div>
    `;
}

/**
 * Affichage d'une erreur
 */
function showError(message) {
    document.getElementById('content').innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-triangle"></i> ${message}
        </div>
    `;
}

/**
 * Charger un script dynamiquement
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // Vérifier si le script est déjà chargé
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Affichage d'un message de succès
 */
function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle"></i> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    const reference = document.getElementById('register-form');

    // Aller chercher le parent direct (ou un wrapper intermédiaire)
    if(!reference) return
    const actualParent = reference.parentNode; // ou reference.closest('.wrapper')
    
if(actualParent) actualParent
         .insertBefore(alertDiv, reference);
    // Auto-dismiss après 5 secondes
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

/**
 * Appel API générique
 */
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    // Ajouter automatiquement user_id pour les appels chat.php si l'utilisateur est connecté
    if (currentUser && currentUser.id) {
        const separator = endpoint.includes('?') ? '&' : '?';
        endpoint += `${separator}user_id=${currentUser.id}`;
    }
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    // Ajouter le token d'authentification si disponible
    if (currentUser && currentUser.token) {
        options.headers['Authorization'] = `Bearer ${currentUser.token}`;
    }
    
    try {
        const response = await fetch(API_BASE_URL + endpoint, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Erreur API');
        }
        
        return result;
    } catch (error) {
        console.error('Erreur API:', error);
        throw error;
    }
}

/**
 * Connexion utilisateur
 */
async function login(email, password) {
    try {
        const result = await apiCall('auth.php', 'POST', {
            action: 'login',
            email: email,
            password: password
        });
        
        if (result.success) {
            currentUser = result.user;
            sessionStorage.setItem('user', JSON.stringify(currentUser));
            showAuthenticatedUI();
            showSuccess('Connexion réussie !');
            loadPage('accueil');
        } else {
          showSuccess('echec');
            throw new Error(result.message);
        }
    } catch (error) {
       showSuccess('echec');
        throw error;
    }
}

/**
 * Inscription utilisateur
 */
async function register(userData) {
    try {
        const result = await apiCall('auth.php', 'POST', {
            action: 'register',
            ...userData
        });
        
        if (result.success) {
            showSuccess('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');
            loadPage('connexion');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Déconnexion
 */
function logout() {
    currentUser = null;
    sessionStorage.removeItem('user');
    
    // Nettoyer les messages du localStorage
    localStorage.removeItem('chat_messages');
    messages = {};
    
    showVisitorUI();
    loadPage('connexion');
    showSuccess('Déconnexion réussie');
}

/**
 * Chargement des articles (page d'accueil)
 */
async function loadArticles() {
    try {
        const articles = await apiCall('articles.php?action=list');
        displayArticles(articles.data || []);
    } catch (error) {
        console.error('Erreur lors du chargement des articles:', error);
        showError('Erreur lors du chargement des articles');
    }
}

/**
 * Affichage des articles
 */
function displayArticles(articles) {
    const articlesContainer = document.getElementById('articles-container');
    if (!articlesContainer) return;
    
    if (articles.length === 0) {
        articlesContainer.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-newspaper fa-4x mb-3 text-secondary"></i>
                <h5 class="mb-0">Aucun article à afficher</h5>
            </div>
        `;
        return;
    }
    
    articlesContainer.innerHTML = articles.map(article => `
        <div class="card shadow-sm mb-4 border-0" data-article-id="${article.id}" style="border-radius: 12px;">
            <!-- En-tête du post -->
            <div class="card-header bg-white border-0 px-4 py-3">
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center">
                        <div class="position-relative">
                            <img src="${article.avatar || 'assets/images/default-avatar.png'}" 
                                 class="rounded-circle border border-2 border-light shadow-sm" 
                                 width="48" height="48" alt="Avatar" style="object-fit: cover;">
                            <div class="position-absolute bottom-0 end-0 bg-success rounded-circle border border-2 border-white" 
                                 style="width: 14px; height: 14px;"></div>
                        </div>
                        <div class="ms-3">
                            <div class="d-flex align-items-center">
                                <strong class="text-dark fw-bold">${article.prenom} ${article.nom}</strong>
                                <i class="fas fa-check-circle text-primary ms-1" style="font-size: 14px;"></i>
                            </div>
                            <div class="d-flex align-items-center text-muted small">
                                <span>${formatDate(article.date_creation)}</span>
                                <i class="fas fa-globe-americas ms-2" style="font-size: 12px;"></i>
                            </div>
                        </div>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-link text-muted p-1" type="button" data-bs-toggle="dropdown">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#"><i class="fas fa-bookmark me-2"></i>Enregistrer</a></li>
                            <li><a class="dropdown-item" href="#"><i class="fas fa-flag me-2"></i>Signaler</a></li>
                            <li><a class="dropdown-item" href="#"><i class="fas fa-user-times me-2"></i>Masquer</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Contenu du post -->
            <div class="card-body px-4 py-0">
                <div class="mb-3">
                    <p class="card-text mb-0" style="line-height: 1.5; font-size: 15px;">${article.contenu}</p>
                </div>
                
                ${article.image ? `
                    <div class="mb-3">
                        <img src="${article.image}" class="img-fluid w-100 rounded" 
                             alt="Image article" style="max-height: 500px; object-fit: cover;">
                    </div>
                ` : ''}
                
                <!-- Statistiques des réactions -->
                <div class="d-flex justify-content-between align-items-center py-2 px-1">
                    <div class="d-flex align-items-center">
                        <div class="d-flex me-2" style="margin-left: -5px;">
                            <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center border border-2 border-white" 
                                 style="width: 20px; height: 20px; z-index: 3;">
                                <i class="fas fa-thumbs-up text-white" style="font-size: 10px;"></i>
                            </div>
                            <div class="bg-danger rounded-circle d-flex align-items-center justify-content-center border border-2 border-white" 
                                 style="width: 20px; height: 20px; margin-left: -5px; z-index: 2;">
                                <i class="fas fa-heart text-white" style="font-size: 10px;"></i>
                            </div>
                            <div class="bg-warning rounded-circle d-flex align-items-center justify-content-center border border-2 border-white" 
                                 style="width: 20px; height: 20px; margin-left: -5px; z-index: 1;">
                                <i class="fas fa-laugh text-white" style="font-size: 10px;"></i>
                            </div>
                        </div>
                        <span class="text-muted small fw-bold" id="likes-${article.id}">${article.likes || 0}</span>
                    </div>
                    <div class="d-flex gap-3 text-muted small">
                        <span class="cursor-pointer" onclick="toggleComments(${article.id})">
                            <span id="comments-${article.id}" class="fw-bold">${article.comments_count || 0}</span> commentaires
                        </span>
                        <span class="cursor-pointer">
                            <span id="shares-${article.id}" class="fw-bold">${article.shares || 0}</span> partages
                        </span>
                    </div>
                </div>
                
                <!-- Ligne de séparation -->
                <hr class="my-2">
                
                <!-- Boutons d'actions -->
                <div class="d-flex justify-content-around py-2">
                    <div class="dropdown flex-fill">
                        <button class="btn btn-link text-muted d-flex align-items-center justify-content-center gap-2 w-100 py-2 rounded hover-bg-light" 
                                type="button" data-bs-toggle="dropdown" onclick="showReactionPicker(${article.id})">
                            <i class="fas fa-thumbs-up ${article.user_liked ? 'text-primary' : ''}" id="reaction-icon-${article.id}"></i>
                            <span class="${article.user_liked ? 'text-primary fw-bold' : ''}" id="reaction-text-${article.id}">
                                ${article.user_liked ? 'J\'aime' : 'J\'aime'}
                            </span>
                        </button>
                        <div class="dropdown-menu p-2 border-0 shadow-lg" style="border-radius: 25px;">
                            <div class="d-flex gap-1" id="reaction-picker-${article.id}">
                                <button class="btn btn-link p-2 rounded-circle reaction-btn" onclick="addReaction(${article.id}, 'like')" 
                                        style="font-size: 24px; width: 45px; height: 45px;">👍</button>
                                <button class="btn btn-link p-2 rounded-circle reaction-btn" onclick="addReaction(${article.id}, 'love')" 
                                        style="font-size: 24px; width: 45px; height: 45px;">❤️</button>
                                <button class="btn btn-link p-2 rounded-circle reaction-btn" onclick="addReaction(${article.id}, 'haha')" 
                                        style="font-size: 24px; width: 45px; height: 45px;">😂</button>
                                <button class="btn btn-link p-2 rounded-circle reaction-btn" onclick="addReaction(${article.id}, 'wow')" 
                                        style="font-size: 24px; width: 45px; height: 45px;">😮</button>
                                <button class="btn btn-link p-2 rounded-circle reaction-btn" onclick="addReaction(${article.id}, 'sad')" 
                                        style="font-size: 24px; width: 45px; height: 45px;">😢</button>
                                <button class="btn btn-link p-2 rounded-circle reaction-btn" onclick="addReaction(${article.id}, 'angry')" 
                                        style="font-size: 24px; width: 45px; height: 45px;">😡</button>
                            </div>
                        </div>
                    </div>
                    
                    <button class="btn btn-link text-muted d-flex align-items-center justify-content-center gap-2 flex-fill py-2 rounded hover-bg-light" 
                            onclick="toggleComments(${article.id})">
                        <i class="fas fa-comment-alt"></i>
                        <span>Commenter</span>
                    </button>
                    
                    <div class="dropdown flex-fill">
                        <button class="btn btn-link text-muted d-flex align-items-center justify-content-center gap-2 w-100 py-2 rounded hover-bg-light" 
                                type="button" data-bs-toggle="dropdown">
                            <i class="fas fa-share"></i>
                            <span>Partager</span>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="shareArticle(${article.id}, 'profile')">
                                <i class="fas fa-user me-2"></i>Partager sur votre profil
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="shareArticle(${article.id}, 'story')">
                                <i class="fas fa-plus-circle me-2"></i>Partager dans votre story
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="shareArticle(${article.id}, 'message')">
                                <i class="fas fa-envelope me-2"></i>Envoyer en message privé
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="shareArticle(${article.id}, 'link')">
                                <i class="fas fa-link me-2"></i>Copier le lien
                            </a></li>
                        </ul>
                    </div>
                </div>
                
                <!-- Section commentaires -->
                <div id="comments-section-${article.id}" class="mt-3 border-top pt-3" style="display: none;">
                    <div class="d-flex align-items-center gap-3 mb-3">
                        <h6 class="text-muted mb-0">
                            <i class="fas fa-comments me-2"></i>Commentaires
                        </h6>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                Plus récents
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#">Plus récents</a></li>
                                <li><a class="dropdown-item" href="#">Plus anciens</a></li>
                                <li><a class="dropdown-item" href="#">Plus populaires</a></li>
                            </ul>
                        </div>
                    </div>
                    
                    <div id="comments-list-${article.id}" class="mb-3"></div>
                    
                    <!-- Zone de saisie commentaire -->
                    <div class="d-flex gap-3 align-items-start">
                        <img src="${getCurrentUserAvatar()}" class="rounded-circle" width="36" height="36" alt="Your avatar">
                        <div class="flex-fill">
                            <div class="bg-light rounded-pill px-3 py-2">
                                <div class="d-flex align-items-center">
                                    <input type="text" class="form-control border-0 bg-transparent" 
                                           id="comment-input-${article.id}" 
                                           placeholder="Écrivez un commentaire..." 
                                           onkeypress="handleCommentKeyPress(event, ${article.id})"
                                           style="box-shadow: none;">
                                    <div class="d-flex gap-2">
                                        <button class="btn btn-link p-1 text-muted" onclick="toggleEmojiPicker(${article.id})">
                                            <i class="fas fa-smile"></i>
                                        </button>
                                        <button class="btn btn-link p-1 text-muted" onclick="attachFile(${article.id})">
                                            <i class="fas fa-camera"></i>
                                        </button>
                                        <button class="btn btn-link p-1 text-muted" onclick="attachGif(${article.id})">
                                            <i class="fas fa-images"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Picker d'emojis -->
                            <div id="emoji-picker-${article.id}" class="mt-2 p-3 bg-white border rounded shadow-sm" style="display: none;">
                                <div class="row g-1">
                                    <div class="col-auto">
                                        <button class="btn btn-sm btn-link p-1" onclick="insertEmoji(${article.id}, '😀')" style="font-size: 20px;">😀</button>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-sm btn-link p-1" onclick="insertEmoji(${article.id}, '😂')" style="font-size: 20px;">😂</button>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-sm btn-link p-1" onclick="insertEmoji(${article.id}, '😍')" style="font-size: 20px;">😍</button>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-sm btn-link p-1" onclick="insertEmoji(${article.id}, '😭')" style="font-size: 20px;">😭</button>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-sm btn-link p-1" onclick="insertEmoji(${article.id}, '😡')" style="font-size: 20px;">😡</button>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-sm btn-link p-1" onclick="insertEmoji(${article.id}, '👍')" style="font-size: 20px;">👍</button>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-sm btn-link p-1" onclick="insertEmoji(${article.id}, '👎')" style="font-size: 20px;">👎</button>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-sm btn-link p-1" onclick="insertEmoji(${article.id}, '❤️')" style="font-size: 20px;">❤️</button>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-sm btn-link p-1" onclick="insertEmoji(${article.id}, '🔥')" style="font-size: 20px;">🔥</button>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-sm btn-link p-1" onclick="insertEmoji(${article.id}, '🎉')" style="font-size: 20px;">🎉</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="d-flex justify-content-end mt-2">
                                <button class="btn btn-primary btn-sm rounded-pill px-3" onclick="addComment(${article.id})">
                                    <i class="fas fa-paper-plane me-1"></i> Publier
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Fonctions utilitaires pour la gestion des réactions et commentaires
function addReaction(articleId, reactionType) {
    // Logique pour ajouter une réaction
    console.log(`Réaction ${reactionType} ajoutée à l'article ${articleId}`);
    
    // Mettre à jour l'interface
    const reactionIcon = document.getElementById(`reaction-icon-${articleId}`);
    const reactionText = document.getElementById(`reaction-text-${articleId}`);
    
    // Mapping des réactions
    const reactionMap = {
        'like': { icon: 'fas fa-thumbs-up', text: 'J\'aime', color: 'text-primary' },
        'love': { icon: 'fas fa-heart', text: 'J\'adore', color: 'text-danger' },
        'haha': { icon: 'fas fa-laugh', text: 'Haha', color: 'text-warning' },
        'wow': { icon: 'fas fa-surprise', text: 'Wow', color: 'text-info' },
        'sad': { icon: 'fas fa-sad-tear', text: 'Triste', color: 'text-secondary' },
        'angry': { icon: 'fas fa-angry', text: 'Grr', color: 'text-danger' }
    };
    
    const reaction = reactionMap[reactionType];
    reactionIcon.className = `${reaction.icon} ${reaction.color}`;
    reactionText.textContent = reaction.text;
    reactionText.className = `${reaction.color} fw-bold`;
}

function toggleEmojiPicker(articleId) {
    const picker = document.getElementById(`emoji-picker-${articleId}`);
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}

function insertEmoji(articleId, emoji) {
    const input = document.getElementById(`comment-input-${articleId}`);
    input.value += emoji;
    input.focus();
}

function getCurrentUserAvatar() {
    // Retourner l'avatar de l'utilisateur actuel
    return 'assets/images/current-user-avatar.png';
}

function attachFile(articleId) {
    // Logique pour attacher un fichier
    console.log(`Attacher fichier pour l'article ${articleId}`);
}

function attachGif(articleId) {
    // Logique pour attacher un GIF
    console.log(`Attacher GIF pour l'article ${articleId}`);
}

function shareArticle(articleId, shareType) {
    // Logique pour partager l'article
    console.log(`Partager l'article ${articleId} via ${shareType}`);
}

function showReactionPicker(articleId) {
    // Animation au survol du bouton J'aime
    console.log(`Afficher picker de réactions pour l'article ${articleId}`);
}

/**
 * Formatage de date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Chargement du back-office
 */
function loadBackOffice() {
    window.location.href = 'vues/back-office/connexion.html';
}

/**
 * Configuration du formulaire de connexion
 */
function setupLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            await login(email, password);
        } catch (error) {
            showError(error.message);
        }
    });
}

/**
 * Configuration du formulaire d'inscription
 */
function setupRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const userData = Object.fromEntries(formData.entries());
        
        try {
            await register(userData);
        } catch (error) {
            showError(error.message);
        }
    });
}

/**
 * Configuration du formulaire de réinitialisation de mot de passe
 */
function setupPasswordResetForm() {
    const form = document.getElementById('password-reset-form');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        
        try {
            await apiCall('auth.php', 'POST', {
                action: 'reset_password',
                email: email
            });
            showSuccess('Un email de réinitialisation a été envoyé à votre adresse.');
        } catch (error) {
            showError(error.message);
        }
    });
}


/**
 * Récupérer l'utilisateur connecté
 */
function getCurrentUser() {
  try {
    const userStr = sessionStorage.getItem('user');
    console.log('🔍 SessionStorage user:', userStr);
    
    if (!userStr) {
      console.log('❌ Aucune donnée utilisateur dans sessionStorage');
      return null;
    }
    
    const user = JSON.parse(userStr);
    console.log('👤 Utilisateur parsé:', user);
    
    if (!user) {
      console.log('❌ Utilisateur null après parsing');
      return null;
    }
    
    if (!user.token_session) {
      console.log('❌ Token session manquant, mais utilisateur valide:', user);
      // Retourner l'utilisateur même sans token pour le chat
      return user;
    }
    
    console.log('✅ Utilisateur valide avec token');
    return user;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
    return null;
  }
}

/**
 * Initialisation de la page chat
 */
async function initChat() {
  console.log('🚀 Initialisation du chat...');
  try {
    const currentUser = getCurrentUser();
    console.log('👤 Utilisateur connecté:', currentUser);
    
    if (!currentUser) {
      console.log('❌ Aucun utilisateur connecté');
      return;
    }

    // Charger les messages depuis le localStorage
    loadMessagesFromStorage();

    console.log('📞 Chargement des amis...');
    // Charger la liste des amis
    await loadChatFriends();
    
    console.log('🔄 Démarrage du polling...');
    // Démarrer le polling pour les nouveaux messages
    startChatPolling();
    
    // Vérifier s'il y a un ami spécifique à ouvrir automatiquement
    const chatWithFriend = sessionStorage.getItem('chatWithFriend');
    if (chatWithFriend) {
      console.log('🎯 Ouverture automatique du chat avec l\'ami ID:', chatWithFriend);
      setTimeout(() => {
        openChat(parseInt(chatWithFriend));
        // Nettoyer le sessionStorage
        sessionStorage.removeItem('chatWithFriend');
      }, 1000); // Attendre 1 seconde pour que la page soit chargée
    }
    
    console.log('✅ Chat initialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du chat:', error);
    showError('Erreur lors du chargement du chat');
  }
}

/**
 * Charger la liste des amis
 */
async function loadChatFriends() {
  console.log('🔍 Début de loadChatFriends()');
  try {
    const currentUser = getCurrentUser();
    console.log('👤 Utilisateur dans loadChatFriends:', currentUser);
    
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    console.log('📡 Appel API chat.php?action=users...');
    const data = await apiCall('chat.php?action=users');
    
    console.log('📋 Liste des amis:', data);
    if (data.success) {
      friends = data.users || [];
      console.log('👥 Amis trouvés:', friends.length);
      displayChatFriends();
    } else {
      throw new Error(data.error || 'Erreur lors du chargement des amis');
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des amis:', error);
    showNoFriendsMessage();
  }
}

/**
 * Afficher la liste des amis pour le chat
 */
function displayChatFriends() {
  // Vérifier si nous sommes sur la page chat
  if (currentPage !== 'chat') {
    console.log('📱 displayChatFriends appelé sur la page:', currentPage, '- ignoré');
    return;
  }
  
  const friendList = document.getElementById('friendList');
  
  if (!friendList) {
    console.error('❌ Élément friendList non trouvé');
    return;
  }
  
  if (!friends || friends.length === 0) {
    showNoFriendsMessage();
    return;
  }
  
  friendList.innerHTML = friends.map(friend => `
    <div class="friend d-flex align-items-center p-3 border-bottom position-relative" 
                         style="cursor: pointer; transition: background-color 0.2s;" 
                        onclick="openChat(${friend.id})" data-id="${friend.id}"
                         data-name="${friend.prenom} ${friend.nom}"
                         onmouseover="this.style.backgroundColor='#f8f9fa'" 
                         onmouseout="this.style.backgroundColor='transparent'">
                        <div class="position-relative"> 
                            <img src="https://images.unsplash.com/photo-1494790108755-2616b9c6dd90?w=100&h=100&fit=crop&crop=face" 
                                 class="rounded-circle me-3" 
                                 style="width: 56px; height: 56px; object-fit: cover;">
                            <span class="position-absolute bg-success border border-2 border-white rounded-circle" 
                                  style="width: 16px; height: 16px; bottom: 2px; right: 10px;"></span>
                        </div>
                        <div class="info flex-grow-1 overflow-hidden">
                            <div class="name fw-semibold text-truncateclass">${friend.prenom} ${friend.nom}</div>
                            <div class="preview text-muted small text-truncate"  id="preview-${friend.id}">Salut ! Comment ça va ?</div>
                        </div>
                        <div class="d-flex flex-column align-items-end">
                            <small class="status ${friend.online ? '' : 'offline'} text-muted"></small>
                        </div>
                    </div>
  `).join('');
}

/**
 * Afficher le message "aucun ami"
 */
function showNoFriendsMessage() {
  const friendList = document.getElementById('friendList');
  friendList.innerHTML = `
    <div class="no-friends">
      <i class="fas fa-user-friends"></i>
      <h5>Aucun ami trouvé</h5>
      <p>Ajoutez des amis pour commencer à discuter</p>
      <a href="#" onclick="loadPage('amis')" class="btn btn-primary">
        <i class="fas fa-user-plus me-2"></i>Gérer mes amis
      </a>
    </div>
  `;
}

/**
 * Ouvrir une conversation
 */
async function openChat(userId) {
  try {
    console.log('💬 Ouverture du chat avec l\'utilisateur ID:', userId);
    currentChat = userId;
    
    // Vérifier si l'ami existe dans la liste
    const friend = friends.find(f => f.id == userId);
    if (!friend) {
      console.warn('⚠️ Ami non trouvé dans la liste, tentative de récupération...');
      // Essayer de récupérer les infos de l'ami depuis l'API
      try {
        const userData = await apiCall(`profil.php?action=get_user&user_id=${userId}`);
        if (userData.success) {
          // Ajouter l'ami à la liste temporairement
          friends.push(userData.data);
          console.log('✅ Ami ajouté à la liste temporairement');
        }
      } catch (error) {
        console.error('❌ Impossible de récupérer les infos de l\'ami:', error);
        showError('Impossible de récupérer les informations de cet ami');
        return;
      }
    }
    
    // Mettre à jour l'interface
    updateChatHeader(userId);
    document.getElementById('chatFooter').style.display = 'block';
    
    // Afficher d'abord les messages du localStorage
    if (messages[userId] && messages[userId].length > 0) {
      console.log('📱 Affichage des messages du localStorage pour l\'utilisateur:', userId);
      displayMessages(userId);
    }
    
    // Charger les nouveaux messages depuis la base de données
    await loadMessages(userId);
    
    // Marquer l'ami comme actif
    document.querySelectorAll('.friend').forEach(friend => {
      friend.classList.remove('active');
    });
    const friendElement = document.querySelector(`[data-id="${userId}"]`);
    if (friendElement) {
      friendElement.classList.add('active');
    }
    
    console.log('✅ Chat ouvert avec succès pour l\'utilisateur:', userId);
    
  } catch (error) {
    console.error('Erreur lors de l\'ouverture du chat:', error);
    showError('Erreur lors de l\'ouverture de la conversation');
  }
}

/**
 * Mettre à jour l'en-tête du chat
 */
function updateChatHeader(userId) {
  const friend = friends.find(f => f.id == userId);
  if (friend) {
    document.getElementById('chatHeader').innerHTML = `
      <div class="d-flex align-items-center">
        <img src="${friend.photo_profil || '../../assets/images/default-avatar.png'}" 
             alt="${friend.prenom}" style="width: 35px; height: 35px; border-radius: 50%; margin-right: 10px;">
        <div>
          <h6 class="mb-0">${friend.prenom} ${friend.nom}</h6>
          <small class="text-muted">${friend.online ? 'En ligne' : 'Hors ligne'}</small>
        </div>
      </div>
    `;
  } else {
    // Fallback si l'ami n'est pas trouvé
    document.getElementById('chatHeader').innerHTML = `
      <div class="d-flex align-items-center">
        <img src="../../assets/images/default-avatar.png" 
             alt="Utilisateur" style="width: 35px; height: 35px; border-radius: 50%; margin-right: 10px;">
        <div>
          <h6 class="mb-0">Utilisateur #${userId}</h6>
          <small class="text-muted">Chargement...</small>
        </div>
      </div>
    `;
  }
}

/**
 * Charger les messages d'une conversation
 */
async function loadMessages(userId) {
  console.log('📥 Chargement des messages pour l\'utilisateur:', userId);
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    const data = await apiCall(`chat.php?action=messages&user_id=${userId}`);
    console.log('📋 Messages récupérés de la DB:', data);
    
    if (data.success) {
      // Fusionner les messages de la DB avec ceux du localStorage
      const dbMessages = data.messages || [];
      const localMessages = messages[userId] || [];
      
      // Créer un map des messages locaux par ID pour éviter les doublons
      const localMessagesMap = new Map();
      localMessages.forEach(msg => {
        if (msg.id) {
          localMessagesMap.set(msg.id, msg);
        }
      });
      
      // Ajouter les messages de la DB qui ne sont pas déjà en local
      dbMessages.forEach(dbMsg => {
        if (!localMessagesMap.has(dbMsg.id)) {
          localMessages.push(dbMsg);
        }
      });
      
      messages[userId] = localMessages;
      console.log('💾 Messages fusionnés et stockés localement:', messages[userId]);
      
      // Sauvegarder dans le localStorage
      saveMessagesToStorage();
      
      displayMessages(userId);
    } else {
      throw new Error(data.error || 'Erreur lors du chargement des messages');
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des messages:', error);
    showError('Erreur lors du chargement des messages');
  }
}

/**
 * Afficher les messages
 */
function displayMessages(userId) {
  const chatBody = document.getElementById('chatBody');
  const messageList = messages[userId] || [];
  const currentUser = getCurrentUser();
     if(!chatBody) return
  if (messageList.length === 0) {
    chatBody.innerHTML = `
      <div class="text-center p-5">
        <i class="fas fa-comments fa-2x text-muted mb-3"></i>
        <p class="text-muted">Aucun message dans cette conversation</p>
        <p class="text-muted">Commencez à discuter !</p>
      </div>
    `;
    return;
  }
  
  chatBody.innerHTML = messageList.map(message => `
     <div class="d-flex mb-2 justify-content-end">
  <div class="
      p-2 rounded 
      bg-primary text-white
      shadow-sm
      " 
      style="max-width: 75%;">
    <div class="mb-1">
      ${message.contenu }
    </div>
   <time class="text-end small text-white text-muted" datetime="${message.date_envoi}">
    ${formatDate(message.date_envoi)}
  </time>
  </div>
</div>
  `).join('');
  
  // Scroll vers le bas
  chatBody.scrollTop = chatBody.scrollHeight;
}

/**
 * Envoyer un message
 */
async function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  
  if (!text || !currentChat) return;
  
  console.log('📤 Envoi du message:', text, 'à l\'utilisateur:', currentChat);
  
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    const data = await apiCall('chat.php', 'POST', {
      action: 'send',
      destinataire_id: currentChat,
      contenu: text,
      type: 'text'
    });
    
    console.log('📨 Réponse de l\'envoi:', data);
    
    if (data.success) {
      // Ajouter le message à la liste locale
      if (!messages[currentChat]) messages[currentChat] = [];
      const newMessage = {
        id: data.message.id, // Utiliser l'ID retourné par l'API
        expediteur_id: currentUser.id,
        contenu: text,
        date_envoi: new Date().toISOString()
      };
      messages[currentChat].push(newMessage);
      console.log('➕ Message ajouté localement:', newMessage);
      console.log('📝 Messages locaux après ajout:', messages[currentChat]);
      
      // Sauvegarder dans le localStorage
      saveMessagesToStorage();
      
      // Afficher le message
      displayMessages(currentChat);
      
      // Vider l'input
      input.value = '';
      
    } else {
      throw new Error(data.error || 'Erreur lors de l\'envoi du message');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du message:', error);
    showError('Erreur lors de l\'envoi du message');
  }
}

/**
 * Gérer la touche Entrée
 */
function handleKeyPress(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
}

/**
 * Filtrer les amis
 */
function filterFriends() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const friendElements = document.querySelectorAll('.friend');
  
  friendElements.forEach(friend => {
    const name = friend.getAttribute('data-name').toLowerCase();
    if (name.includes(search)) {
      friend.style.display = 'flex';
    } else {
      friend.style.display = 'none';
    }
  });
}

/**
 * Démarrer le polling pour les nouveaux messages
 */
function startChatPolling() {
  // Vérifier les nouveaux messages toutes les 5 secondes
  chatInterval = setInterval(async () => {
    if (currentChat) {
      await loadMessages(currentChat);
    }
  }, 10000);
}

/**
 * Arrêter le polling
 */
function stopChatPolling() {
  if (chatInterval) {
    clearInterval(chatInterval);
    chatInterval = null;
  }
}

/**
 * Formater une date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) { // Moins d'une minute
    return 'À l\'instant';
  } else if (diff < 3600000) { // Moins d'une heure
    return `Il y a ${Math.floor(diff / 60000)} min`;
  } else if (diff < 86400000) { // Moins d'un jour
    return `Il y a ${Math.floor(diff / 3600000)}h`;
  } else {
    return date.toLocaleDateString('fr-FR');
  }
}

/**
 * Afficher une erreur
 */
function showError(message) {
  const chatBody = document.getElementById('chatBody');
  if(chatBody) {
    chatBody.innerHTML = `
      <div class="text-center p-5">
        <i class="fas fa-exclamation-triangle fa-2x text-danger mb-3"></i>
        <p class="text-danger">${message}</p>
      </div>
    `
  }else{
    return;
  }
}

/**
 * Sauvegarder les messages dans le localStorage
 */
function saveMessagesToStorage() {
  try {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
    console.log('💾 Messages sauvegardés dans localStorage');
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des messages:', error);
  }
}

/**
 * Charger les messages depuis le localStorage
 */
function loadMessagesFromStorage() {
  try {
    const storedMessages = localStorage.getItem('chat_messages');
    if (storedMessages) {
      messages = JSON.parse(storedMessages);
      console.log('📂 Messages chargés depuis localStorage:', messages);
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des messages:', error);
    messages = {};
  }
}


// Initialisation de l'application au chargement de la page
document.addEventListener('DOMContentLoaded', initApp);
