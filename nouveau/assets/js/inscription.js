 
/**
 * Basculer la visibilité du mot de passe
 */
function togglePassword(fieldId) {
    const passwordInput = document.getElementById(fieldId);
    const toggleIcon = document.getElementById(fieldId === 'password' ? 'password-toggle-icon' : 'password-confirm-toggle-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

/**
 * Afficher les conditions d'utilisation
 */
function showTerms() {
    const modal = new bootstrap.Modal(document.getElementById('termsModal'));
    modal.show();
}

/**
 * Validation du formulaire d'inscription
 */
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validation des champs
            const prenom = document.getElementById('prenom').value.trim();
            const nom = document.getElementById('nom').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const passwordConfirm = document.getElementById('password_confirm').value;
            const dateNaissance = document.getElementById('date_naissance').value;
            const terms = document.getElementById('terms').checked;
            
            // Validations
            if (!prenom || !nom || !email || !password || !passwordConfirm || !dateNaissance) {
                showError('Veuillez remplir tous les champs obligatoires');
                return;
            }
            
            if (password.length < 8) {
                showError('Le mot de passe doit contenir au moins 8 caractères');
                return;
            }
            
            if (password !== passwordConfirm) {
                showError('Les mots de passe ne correspondent pas');
                return;
            }
            
            if (!terms) {
                showError('Vous devez accepter les conditions d\'utilisation');
                return;
            }
            
            // Validation de l'âge (minimum 13 ans)
            const birthDate = new Date(dateNaissance);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (age < 13 || (age === 13 && monthDiff < 0)) {
                showError('Vous devez avoir au moins 13 ans pour créer un compte');
                return;
            }
            
            // Afficher le loading
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création du compte...';
            submitBtn.disabled = true;
            
            try {
                // Préparer les données JSON
                const userData = {
                    prenom: prenom,
                    nom: nom,
                    email: email,
                    password: password,
                    date_naissance: dateNaissance
                };
                
                const response = await fetch(API_BASE_URL + 'auth.php?action=register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showSuccess('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');
                    setTimeout(() => {
                        loadPage('connexion');
                    }, 3000);
                } else {
                    throw new Error(result.message);
                }
                
            } catch (error) {
                console.error('Erreur lors de l\'inscription:', error);
                showError(error.message || 'Erreur lors de l\'inscription');
            } finally {
                // Restaurer le bouton
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
        
        // Validation en temps réel du mot de passe
        const passwordInput = document.getElementById('password');
        const passwordConfirmInput = document.getElementById('password_confirm');
        
        function validatePassword() {
            const password = passwordInput.value;
            const confirm = passwordConfirmInput.value;
            
            if (password.length > 0 && password.length < 8) {
                passwordInput.classList.add('is-invalid');
            } else {
                passwordInput.classList.remove('is-invalid');
            }
            
            if (confirm.length > 0 && password !== confirm) {
                passwordConfirmInput.classList.add('is-invalid');
            } else {
                passwordConfirmInput.classList.remove('is-invalid');
            }
        }
        
        passwordInput.addEventListener('input', validatePassword);
        passwordConfirmInput.addEventListener('input', validatePassword);
    }
});