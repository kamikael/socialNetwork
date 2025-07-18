/**
 * Configuration du formulaire de réinitialisation de mot de passe
 */
document.addEventListener('DOMContentLoaded', function() {
    const resetForm = document.getElementById('password-reset-form');
    if (resetForm) {
        resetForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            
            if (!email) {
                showError('Veuillez entrer votre adresse email');
                return;
            }
            
            // Validation basique de l'email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('Veuillez entrer une adresse email valide');
                return;
            }
            
            // Afficher le loading
            const submitBtn = resetForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
            submitBtn.disabled = true;
            
            try {
                const result = await apiCall('auth.php', 'POST', {
                    action: 'reset_password',
                    email: email
                });
                
                if (result.success) {
                    // Afficher un message de succès
                    resetForm.innerHTML = `
                        <div class="text-center">
                            <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                            <h5 class="text-success">Email envoyé !</h5>
                            <p class="text-muted">
                                Un lien de réinitialisation a été envoyé à <strong>${email}</strong>
                            </p>
                            <p class="text-muted small">
                                Vérifiez votre boîte de réception et vos spams.
                            </p>
                            <div class="mt-3">
                                <a href="#" onclick="loadPage('connexion')" class="btn btn-primary">
                                    <i class="fas fa-arrow-left"></i> Retour à la connexion
                                </a>
                            </div>
                        </div>
                    `;
                } else {
                    throw new Error(result.message);
                }
                
            } catch (error) {
                console.error('Erreur lors de la réinitialisation:', error);
                showError(error.message || 'Erreur lors de l\'envoi de l\'email');
            } finally {
                // Restaurer le bouton si l'erreur n'a pas été gérée par le succès
                if (submitBtn.parentNode) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
        
        // Pré-remplir l'email si disponible dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const emailParam = urlParams.get('email');
        if (emailParam) {
            document.getElementById('email').value = emailParam;
        }
    }
});