

/**
 * Charger le profil utilisateur depuis l’API
 */
async function loadProfil() {
  try {
    const res = await apiCall('profil.php?action=get');
    if (res.success) {
      displayProfile(res.data);
      // Si tu as des stats ou articles, réactive ces appels
      // loadUserStats();
      // loadUserArticles();
    }
  } catch (err) {
    console.error('Erreur chargement du profil:', err);
    showError('Impossible de charger le profil');
  }
}

/**
 * Afficher les données du profil dans la page
 */
function displayProfile(user) {
  // 1) Photo de profil
  const avatar = document.getElementById('profile-avatar');
  if (user.photo_profil) avatar.src = user.photo_profil;

  // 2) Nom, bio, ville
 const profilname =document.getElementById('profile-name')
  if( profilname) profilname
  .textContent  = `${user.prenom} ${user.nom}`;

   const profilbio =document.getElementById('profile-bio')
  if( profilbio) profilbio
  .textContent   = user.bio || '';

  const profilville =document.getElementById('profile-ville')
    if( profilville) profilville
    .textContent = user.ville ? `Habite à ${user.ville}` : '';
    
 const intro =document.getElementById('intro-ville')
  if( intro) intro
  .textContent   = user.ville ? `Habite à ${user.ville}` : '';

  // 3) Email et âge (si tu as ajouté les <p> correspondants)
  if (user.email && document.getElementById('profile-email')) {
    document.getElementById('profile-email').textContent = user.email;
  }
  if (user.date_naissance && document.getElementById('profile-age')) {
    const bd = new Date(user.date_naissance);
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    if (today.getMonth() < bd.getMonth() ||
       (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) {
      age--;
    }
    document.getElementById('profile-age').textContent = `Âge : ${age} ans`;
  }
}

/**
 * Mise à jour de la photo via l’input du modal
 */
async function updateAvatar(event) {
  const file = event.target.files[0];
  if (!file || !file.type.startsWith('image/')) {
    return showError('Sélectionne une image valide');
  }
  if (file.size > 2 * 1024 * 1024) {
    return showError('Image trop lourde (>2 MB)');
  }

  try {
    const fd = new FormData();
    fd.append('action', 'update_avatar');
    fd.append('avatar', file);

    const resp = await fetch(API_BASE_URL + 'profil.php', { method: 'POST', body: fd });
    const json = await resp.json();
    if (json.success) {
      document.getElementById('profile-avatar').src = json.avatar_url;
      showSuccess('Avatar mis à jour !');
    } else {
      throw new Error(json.message);
    }
  } catch (err) {
    console.error(err);
    showError('Erreur lors de la mise à jour de l\'avatar');
  } finally {
    event.target.value = ''; 
  }
}

// Pré-remplir le formulaire d'édition avec les infos actuelles
function fillEditProfileForm(user) {
  document.getElementById('editPrenom').value = user.prenom || '';
  document.getElementById('editNom').value = user.nom || '';
  document.getElementById('editEmail').value = user.email || '';
  document.getElementById('editTelephone').value = user.telephone || '';
  document.getElementById('editDateNaissance').value = user.date_naissance || '';
  document.getElementById('editVille').value = user.ville || '';
  document.getElementById('editAdresse').value = user.adresse || '';
  document.getElementById('editBio').value = user.bio || '';
  document.getElementById('edit-avatar-preview').src = user.photo_profil || '//app/assets/images///assets/images/p1.jpg';
}

// Ouvrir le modal et pré-remplir les champs
const editBtn = document.querySelector('button[data-bs-target="#editModal"]');
if (editBtn) {
  editBtn.addEventListener('click', async () => {
    try {
      const res = await apiCall('profil.php?action=get');
      if (res.success) fillEditProfileForm(res.data);
    } catch (e) { /* ignore */ }
  });
}

// Soumettre le form d’édition du modal (version complète)
document.getElementById('editProfileForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const messages = document.getElementById('editProfileMessages');
  messages.innerHTML = '';
  document.getElementById('saveSpinner').style.display = '';
  document.getElementById('saveProfileBtn').disabled = true;

  // Récupérer les valeurs
  const prenom = document.getElementById('editPrenom').value.trim();
  const nom = document.getElementById('editNom').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const telephone = document.getElementById('editTelephone').value.trim();
  const date_naissance = document.getElementById('editDateNaissance').value;
  const ville = document.getElementById('editVille').value.trim();
  const adresse = document.getElementById('editAdresse').value.trim();
  const bio = document.getElementById('editBio').value.trim();

  // Validation simple
  if (!prenom || !nom || !email) {
    messages.innerHTML = '<div class="alert alert-danger">Prénom, nom et email sont obligatoires.</div>';
    document.getElementById('saveSpinner').style.display = 'none';
    document.getElementById('saveProfileBtn').disabled = false;
    return;
  }

  // Préparer les données
  const fd = new FormData();
  fd.append('action', 'update');
  fd.append('prenom', prenom);
  fd.append('nom', nom);
  fd.append('email', email);
  fd.append('telephone', telephone);
  fd.append('date_naissance', date_naissance);
  fd.append('ville', ville);
  fd.append('adresse', adresse);
  fd.append('bio', bio);

  try {
    const resp = await fetch(API_BASE_URL + 'profil.php', {
      method: 'POST',
      body: fd,
      headers: {
        'Authorization': 'Bearer ' + (window.sessionToken || localStorage.getItem('token_session') || '')
      }
    });
    const json = await resp.json();
    if (json.success) {
      messages.innerHTML = '<div class="alert alert-success">Profil mis à jour !</div>';
      // Rafraîchir l'affichage du profil
      await loadProfil();
      setTimeout(() => {
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
      }, 1000);
    } else {
      messages.innerHTML = `<div class="alert alert-danger">${json.message || 'Erreur lors de la mise à jour.'}</div>`;
    }
  } catch (err) {
    messages.innerHTML = '<div class="alert alert-danger">Erreur réseau ou serveur.</div>';
  } finally {
    document.getElementById('saveSpinner').style.display = 'none';
    document.getElementById('saveProfileBtn').disabled = false;
  }
});

// Écouteur pour l’upload
document.getElementById('avatar-upload')
  ?.addEventListener('change', updateAvatar);

// Alertes sur clic d’une carte d’ami
document.querySelectorAll('.friend-card').forEach(card => {
  card.addEventListener('click', () => {
    const friendName = card.querySelector('p').innerText;
    // Pour l'instant, on affiche une alerte
    // Plus tard, on pourra récupérer l'ID de l'ami et ouvrir son profil
    alert('Profil de ' + friendName + ' - Fonctionnalité à implémenter');
  });
});

// Lancer le chargement au démarrage
document.addEventListener('DOMContentLoaded', loadProfil);
