 /**
 * Toggle de visibilité du mot de passe
 */
function togglePassword() {
    const pwd  = document.getElementById('password');
    const icon = document.getElementById('password-toggle-icon');
    if (pwd.type === 'password') {
      pwd.type = 'text';
      icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      pwd.type = 'password';
      icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
  }
  
  // Motifs interdits
  const forbiddenPatterns = [
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b/i,
    /--/, /;/, /\/\*/, /\*\//
  ];
  function containsForbidden(s) {
    return forbiddenPatterns.some(rx => rx.test(s));
  }
  
  /**
   * Affiche une alerte Bootstrap avant le formulaire
   */
  function showError(message, form) {
    // Supprime l’ancienne
    const old = form.parentNode.querySelector('.alert');
    if (old) old.remove();
  
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger';
    alert.setAttribute('role', 'alert');
    alert.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i>${message}`;
  
    form.parentNode.insertBefore(alert, form);
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    if (!form) return;
  
    // Pré-remplissage
    const rem = localStorage.getItem('remembered_email');
    if (rem) {
      form.email.value       = rem;
      form.querySelector('#remember-me').checked = true;
    }
  
    form.addEventListener('submit', async e => {
      e.preventDefault();
  
      const email = form.email.value.trim();
      const pwd   = form.password.value;
      const remember = form['remember-me'].checked;
  
      // 1. Champs vides ?
      if (!email || !pwd) {
        showError('Veuillez remplir tous les champs.', form);
        return;
      }
  
      // 2. Username uniquement chiffré interdit
      if (!email.includes('@') && /^\d+$/.test(email)) {
        showError('Le nom d’utilisateur ne peut pas être que des chiffres.', form);
        return;
      }
  
      // 3. Injection ?
      if (containsForbidden(email) || containsForbidden(pwd)) {
        showError('Caractères non autorisés détectés.', form);
        return;
      }
  
      // 4. Loader
      const btn = form.querySelector('button[type="submit"]');
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Connexion…';
      btn.disabled  = true;
  
      try {
        await login(email, pwd);
        if (remember) localStorage.setItem('remembered_email', email);
        else localStorage.removeItem('remembered_email');
      } catch (err) {
        showError(err.message || 'Erreur lors de la connexion.', form);
      } finally {
        btn.innerHTML = orig;
        btn.disabled  = false;
      }
    });
  });
  