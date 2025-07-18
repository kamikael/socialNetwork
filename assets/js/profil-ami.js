let currentFriendId = null;

/**
 * Charger le profil d'un ami
 */
async function loadFriendProfile(friendId) {
    currentFriendId = friendId;
    
    try {
        const res = await apiCall(`profil.php?action=get_user&user_id=${friendId}`);
        if (res.success) {
            displayFriendProfile(res.data);
        } else {
            throw new Error(res.message || 'Erreur lors du chargement du profil');
        }
    } catch (err) {
        console.error('Erreur chargement du profil ami:', err);
        showError('Impossible de charger le profil de cet ami');
        // Rediriger vers la page amis en cas d'erreur
        setTimeout(() => loadPage('amis'), 2000);
    }
}

/**
 * Afficher les données du profil ami dans la page
 */
function displayFriendProfile(user) {
    // Photo de profil
    const avatar = document.getElementById('friend-profile-avatar');
    if (user.photo_profil) avatar.src = user.photo_profil;

    // Nom, bio, ville
    const profileName = document.getElementById('friend-profile-name');
    if (profileName) profileName.textContent = `${user.prenom} ${user.nom}`;

    const profileBio = document.getElementById('friend-profile-bio');
    if (profileBio) profileBio.textContent = user.bio || '';

    const profileVille = document.getElementById('friend-profile-ville');
    if (profileVille) profileVille.textContent = user.ville ? `Habite à ${user.ville}` : '';

    // Informations dans l'onglet Intro
    const introVille = document.getElementById('friend-intro-ville');
    if (introVille) introVille.textContent = user.ville ? `Habite à ${user.ville}` : 'Non renseigné';

    const introEmail = document.getElementById('friend-intro-email');
    if (introEmail) introEmail.textContent = user.email || 'Non renseigné';

    const introPhone = document.getElementById('friend-intro-phone');
    if (introPhone) introPhone.textContent = user.telephone || 'Non renseigné';

    // Onglet À propos
    const aboutTitle = document.getElementById('friend-about-title');
    if (aboutTitle) aboutTitle.textContent = `À propos de ${user.prenom}`;

    const aboutContent = document.getElementById('friend-about-content');
    if (aboutContent) {
        let content = '';
        
        if (user.bio) {
            content += `<p><strong>Bio :</strong> ${user.bio}</p>`;
        }
        
        if (user.date_naissance) {
            const bd = new Date(user.date_naissance);
            const today = new Date();
            let age = today.getFullYear() - bd.getFullYear();
            if (today.getMonth() < bd.getMonth() ||
               (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) {
                age--;
            }
            content += `<p><strong>Âge :</strong> ${age} ans</p>`;
        }
        
        if (user.ville) {
            content += `<p><strong>Ville :</strong> ${user.ville}</p>`;
        }
        
        if (user.adresse) {
            content += `<p><strong>Adresse :</strong> ${user.adresse}</p>`;
        }
        
        if (user.telephone) {
            content += `<p><strong>Téléphone :</strong> ${user.telephone}</p>`;
        }
        
        if (user.email) {
            content += `<p><strong>Email :</strong> ${user.email}</p>`;
        }
        
        if (!content) {
            content = '<p class="text-muted">Aucune information supplémentaire disponible.</p>';
        }
        
        aboutContent.innerHTML = content;
    }

    // Avatar dans les publications
    const postAvatar = document.getElementById('friend-post-avatar');
    if (postAvatar && user.photo_profil) postAvatar.src = user.photo_profil;

    const postName = document.getElementById('friend-post-name');
    if (postName) postName.textContent = `${user.prenom} ${user.nom}`;

    // Masquer les informations sensibles si non renseignées
    const introTravail = document.getElementById('friend-intro-travail');
    if (introTravail) introTravail.textContent = 'Travaille chez ...';

    const introEtudes = document.getElementById('friend-intro-etudes');
    if (introEtudes) introEtudes.textContent = 'Étudie ...';
}

/**
 * Démarrer un chat avec l'ami
 */
function startChatWithFriend() {
    if (currentFriendId) {
        console.log('💬 Démarrage du chat avec l\'ami ID:', currentFriendId);
        
        // Sauvegarder l'ID de l'ami pour le chat
        sessionStorage.setItem('chatWithFriend', currentFriendId);
        
        // Rediriger vers la page chat
        loadPage('chat');
        
        // Afficher un message de confirmation
        showSuccess('Redirection vers le chat...');
    } else {
        showError('Impossible de démarrer le chat: ID de l\'ami non trouvé');
    }
}

/**
 * Initialiser la page du profil ami
 */
function initFriendProfilePage() {
    // Récupérer l'ID de l'ami depuis l'URL ou sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const friendId = urlParams.get('id') || sessionStorage.getItem('viewFriendProfile');
    
    if (friendId) {
        loadFriendProfile(friendId);
        // Nettoyer le sessionStorage
        sessionStorage.removeItem('viewFriendProfile');
    } else {
        showError('ID de l\'ami non spécifié');
        setTimeout(() => loadPage('amis'), 2000);
    }
}

// Initialiser la page au chargement
document.addEventListener('DOMContentLoaded', initFriendProfilePage); 