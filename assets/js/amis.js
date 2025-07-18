
let currentTab = 'users';
let allUsers = [];
let friendRequests = [];

/**
 * Chargement des données d'amis
 */
async function loadAmis() {
    try {
        // Charger les utilisateurs
        const usersResult = await apiCall('amis.php?action=users');
        allUsers = usersResult.data || [];
        displayUsers(allUsers);
        
        // Charger les amis
        const friendsResult = await apiCall('amis.php?action=friends');
        friends = friendsResult.data || [];
        displayFriends(friends);
        
        // Charger les demandes d'amitié
        const requestsResult = await apiCall('amis.php?action=requests');
        friendRequests = requestsResult.data || [];
        displayRequests(friendRequests);
        
        // Charger les suggestions
        const suggestionsResult = await apiCall('amis.php?action=suggestions');
        displaySuggestions(suggestionsResult.data || []);
        
        // Charger les statistiques
        loadFriendsStats();
        
    } catch (error) {
        console.error('Erreur lors du chargement des amis:', error);
        showError('Erreur lors du chargement des données');
    }
}

/**
 * Affichage des utilisateurs
 */
function displayUsers(users) {
    const container = document.getElementById('users-list');
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-users fa-3x mb-3"></i>
                <p>Aucun utilisateur trouvé</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = users.map(user => {
        const isFriend = friends.some(friend => friend.id === user.id);
        const hasRequest = friendRequests.some(req => req.user_id === user.id);
        
        let actionButton = '';
        if (isFriend) {
            actionButton = `
                <button class="btn btn-sm btn-success" disabled>
                    <i class="fas fa-check"></i> Ami
                </button>
            `;
        } else if (hasRequest) {
            actionButton = `
                <button class="btn btn-sm btn-warning" disabled>
                    <i class="fas fa-clock"></i> En attente
                </button>
            `;
        } else {
            actionButton = `
                <button class="btn btn-sm btn-primary" onclick="sendFriendRequest(${user.id})">
                    <i class="fas fa-user-plus"></i> Ajouter
                </button>
            `;
        }
        
        return `
            <div class="user-item d-flex align-items-center p-3 border-bottom">
                <img src="${user.photo_profil || 'assets/images/default-avatar.png'}" 
                     class="rounded-circle me-3" width="50" height="50" alt="Avatar">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${user.prenom} ${user.nom}</h6>
                    <p class="text-muted mb-1">${user.email}</p>
                    ${user.bio ? `<small class="text-muted">${user.bio}</small>` : ''}
                </div>
                <div class="ms-3">
                    ${actionButton}
                    <button class="btn btn-sm btn-outline-secondary ms-2" onclick="viewProfile(${user.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Affichage des amis
 */
function displayFriends(friendsList) {
    const container = document.getElementById('friends-list');
    
    if (friendsList.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-user-friends fa-3x mb-3"></i>
                <p>Vous n'avez pas encore d'amis</p>
                <p class="small">Ajoutez des utilisateurs pour commencer !</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = friendsList.map(friend => `
        <div class="friend-item d-flex align-items-center p-3 border-bottom">
            <img src="${friend.photo_profil || 'assets/images/default-avatar.png'}" 
                 class="rounded-circle me-3" width="50" height="50" alt="Avatar">
            <div class="flex-grow-1">
                <h6 class="mb-1">${friend.prenom} ${friend.nom}</h6>
                <p class="text-muted mb-1">${friend.email}</p>
                <small class="text-muted">Ami depuis ${formatDate(friend.date_amitie)}</small>
            </div>
            <div class="ms-3">
                <button class="btn btn-sm btn-outline-primary me-2" onclick="startChat(${friend.id})">
                    <i class="fas fa-comments"></i> Chat
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="removeFriend(${friend.id})">
                    <i class="fas fa-user-minus"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Affichage des demandes d'amitié
 */
function displayRequests(requests) {
    const container = document.getElementById('requests-list');
    const badge = document.getElementById('requests-badge');
    
    // Mettre à jour le badge
    if (requests.length > 0) {
        badge.textContent = requests.length;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-user-plus fa-3x mb-3"></i>
                <p>Aucune demande d'amitié en attente</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = requests.map(request => `
        <div class="request-item d-flex align-items-center p-3 border-bottom">
            <img src="${request.photo_profil || 'assets/images/default-avatar.png'}" 
                 class="rounded-circle me-3" width="50" height="50" alt="Avatar">
            <div class="flex-grow-1">
                <h6 class="mb-1">${request.prenom} ${request.nom}</h6>
                <p class="text-muted mb-1">${request.email}</p>
                <small class="text-muted">Demande reçue le ${formatDate(request.date_demande)}</small>
            </div>
            <div class="ms-3">
                <button class="btn btn-sm btn-success me-2" onclick="acceptFriendRequest(${request.id})">
                    <i class="fas fa-check"></i> Accepter
                </button>
                <button class="btn btn-sm btn-danger" onclick="rejectFriendRequest(${request.id})">
                    <i class="fas fa-times"></i> Refuser
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Affichage des suggestions d'amis
 */
function displaySuggestions(suggestions) {
    const container = document.getElementById('suggestions-list');
    
    if (suggestions.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <small>Aucune suggestion pour le moment</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = suggestions.map(suggestion => `
        <div class="suggestion-item d-flex align-items-center p-2 border-bottom">
            <img src="${suggestion.photo_profil || 'assets/images/default-avatar.png'}" 
                 class="rounded-circle me-2" width="35" height="35" alt="Avatar">
            <div class="flex-grow-1">
                <small class="fw-bold">${suggestion.prenom} ${suggestion.nom}</small>
                <br>
                <small class="text-muted">${suggestion.mutual_friends} ami(s) en commun</small>
            </div>
            <button class="btn btn-sm btn-primary" onclick="sendFriendRequest(${suggestion.id})">
                <i class="fas fa-user-plus"></i>
            </button>
        </div>
    `).join('');
}

/**
 * Chargement des statistiques d'amis
 */
async function loadFriendsStats() {
    try {
        const result = await apiCall('amis.php?action=stats');
        if (result.success) {
            document.getElementById('stats-friends').textContent = result.data.friends_count || 0;
            document.getElementById('stats-mutual').textContent = result.data.mutual_friends || 0;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
    }
}

/**
 * Envoi d'une demande d'amitié
 */
async function sendFriendRequest(userId) {
    try {
        const result = await apiCall('amis.php', 'POST', {
            action: 'send_request',
            user_id: userId
        });
        
        if (result.success) {
            showSuccess('Demande d\'amitié envoyée !');
            loadAmis(); // Recharger les données
        }
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la demande:', error);
        showError('Erreur lors de l\'envoi de la demande');
    }
}

/**
 * Accepter une demande d'amitié
 */
async function acceptFriendRequest(requestId) {
    try {
        const result = await apiCall('amis.php', 'POST', {
            action: 'accept_request',
            request_id: requestId
        });
        
        if (result.success) {
            showSuccess('Demande d\'amitié acceptée !');
            loadAmis(); // Recharger les données
        }
    } catch (error) {
        console.error('Erreur lors de l\'acceptation:', error);
        showError('Erreur lors de l\'acceptation de la demande');
    }
}

/**
 * Refuser une demande d'amitié
 */
async function rejectFriendRequest(requestId) {
    try {
        const result = await apiCall('amis.php', 'POST', {
            action: 'reject_request',
            request_id: requestId
        });
        
        if (result.success) {
            showSuccess('Demande d\'amitié refusée');
            loadAmis(); // Recharger les données
        }
    } catch (error) {
        console.error('Erreur lors du refus:', error);
        showError('Erreur lors du refus de la demande');
    }
}

/**
 * Supprimer un ami
 */
async function removeFriend(friendId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet ami ?')) {
        return;
    }
    
    try {
        const result = await apiCall('amis.php', 'POST', {
            action: 'remove_friend',
            friend_id: friendId
        });
        
        if (result.success) {
            showSuccess('Ami supprimé');
            loadAmis(); // Recharger les données
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showError('Erreur lors de la suppression de l\'ami');
    }
}

/**
 * Démarrer un chat avec un ami
 */
function startChat(friendId) {
    // Ouvrir le chat et démarrer une conversation
    toggleChat();
    // La fonction sera gérée par le module chat
    setTimeout(() => {
        if (typeof startConversation === 'function') {
            startConversation(friendId);
        }
    }, 500);
}

/**
 * Voir le profil d'un utilisateur
 */
function viewProfile(userId) {
    // Sauvegarder l'ID de l'utilisateur à consulter
    sessionStorage.setItem('viewFriendProfile', userId);
    // Charger la page du profil ami
    loadPage('profil-ami');
}

/**
 * Recherche d'utilisateurs
 */
function searchUsers(query) {
    const searchTerm = query.toLowerCase();
    const filteredUsers = allUsers.filter(user => 
        user.prenom.toLowerCase().includes(searchTerm) ||
        user.nom.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );
    displayUsers(filteredUsers);
}

/**
 * Affichage des onglets
 */
function showTab(tabName) {
    // Masquer tous les onglets
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Afficher l'onglet sélectionné
    document.getElementById(tabName + '-tab').style.display = 'block';
    
    // Mettre à jour les boutons
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    currentTab = tabName;
}

// Rendre les fonctions accessibles globalement
window.loadAmis = loadAmis;
window.displayUsers = displayUsers;
window.displayFriends = displayFriends;
window.displayRequests = displayRequests;
window.displaySuggestions = displaySuggestions;
window.loadFriendsStats = loadFriendsStats;
window.sendFriendRequest = sendFriendRequest;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.removeFriend = removeFriend;
window.startChat = startChat;
window.viewProfile = viewProfile;
window.searchUsers = searchUsers;
window.showTab = showTab;