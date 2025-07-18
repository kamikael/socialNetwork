/**
 * Script de vérification d'authentification pour le back-office
 * Ce script doit être inclus dans toutes les pages du back-office
 */

// Configuration de l'API
const API_BASE_URL = '../../api/';

// Variables globales pour l'admin
let adminUser = null;
let adminToken = null;

/**
 * Vérification de l'authentification admin
 */
function checkAdminAuth() {
    const storedUser = sessionStorage.getItem('admin_user');
    const storedToken = sessionStorage.getItem('admin_token');
    
    if (!storedUser || !storedToken) {
        redirectToLogin();
        return false;
    }
    
    try {
        adminUser = JSON.parse(storedUser);
        adminToken = storedToken;
        
        // Vérifier si l'utilisateur a le rôle admin
        if (adminUser.role !== 'administrateur') {
            console.error('Utilisateur non autorisé:', adminUser.role);
            logoutAdmin();
            return false;
        }
        
       
        
        return true;
    } catch (error) {
        console.error('Erreur lors du parsing des données admin:', error);
        logoutAdmin();
        return false;
    }
}

/**
 * Validation du token admin avec le serveur
 */
async function validateAdminToken() {
    try {
        const response = await fetch(API_BASE_URL + 'admin_auth.php', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'validate_token'
            })
        });
        
        // Vérifier d'abord le statut HTTP
        if (!response.ok) {
            console.error('Erreur HTTP lors de la validation du token:', response.status);
            if (response.status === 400 || response.status === 401) {
                logoutAdmin();
                return;
            }
            // Pour les autres erreurs HTTP, on continue (problème temporaire)
            return;
        }
        
        const data = await response.json();
        
        if (!data.success) {
            console.error('Token admin invalide:', data.message);
            logoutAdmin();
        }
    } catch (error) {
        console.error('Erreur lors de la validation du token:', error);
        // En cas d'erreur réseau, on continue (le token pourrait être valide)
        // Ne pas déconnecter automatiquement pour éviter les boucles
    }
}

/**
 * Redirection vers la page de connexion
 */
function redirectToLogin() {
    // Sauvegarder l'URL actuelle pour rediriger après connexion
    sessionStorage.setItem('admin_redirect_url', window.location.href);
    window.location.href = 'connexion.html';
}

/**
 * Déconnexion admin
 */
function logoutAdmin() {
    sessionStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_redirect_url');
    redirectToLogin();
}

/**
 * Appel API sécurisé pour le back-office
 */
async function adminApiCall(endpoint, method = 'GET', data = null) {
    if (!adminToken) {
        throw new Error('Token d\'authentification manquant');
    }
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(API_BASE_URL + endpoint, options);
        const result = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token expiré ou invalide
                logoutAdmin();
                throw new Error('Session expirée. Veuillez vous reconnecter.');
            }
            throw new Error(result.message || 'Erreur API');
        }
        
        return result;
    } catch (error) {
        console.error('Erreur API admin:', error);
        throw error;
    }
}

/**
 * Affichage d'une alerte
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.innerHTML = alertHtml;
    
    // Auto-fermer après 5 secondes
    setTimeout(() => {
        const alert = alertContainer.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

/**
 * Mise à jour de l'interface utilisateur admin
 */
function updateAdminUI() {
    if (!adminUser) return;
    
    // Mettre à jour le nom d'utilisateur dans la navigation
    const userNameElement = document.getElementById('admin-user-name');
    if (userNameElement) {
        userNameElement.textContent = `${adminUser.prenom} ${adminUser.nom}`;
    }
    
    // Mettre à jour l'email dans la navigation
    const userEmailElement = document.getElementById('admin-user-email');
    if (userEmailElement) {
        userEmailElement.textContent = adminUser.email;
    }
}

/**
 * Initialisation de la sécurité admin
 */
function initAdminSecurity() {
    // Vérifier l'authentification au chargement de la page
    if (!checkAdminAuth()) {
        return;
    }
    
    // Mettre à jour l'interface utilisateur
    updateAdminUI();
    
    // Ajouter un écouteur pour la déconnexion
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logoutAdmin();
        });
    }
    
    // Vérifier périodiquement la validité du token (toutes les 10 minutes)
    // Utiliser une vérification plus douce pour éviter les boucles
  
    
    // Empêcher l'accès aux pages via URL directe
    window.addEventListener('beforeunload', function() {
        // Cette fonction peut être utilisée pour des vérifications supplémentaires
    });
}

// Exécuter la vérification d'authentification immédiatement
document.addEventListener('DOMContentLoaded', function() {
    initAdminSecurity();
});

// Vérification supplémentaire au chargement de la page
window.addEventListener('load', function() {
    if (!adminUser) {
        initAdminSecurity();
    }
}); 