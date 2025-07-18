
// Fonctions spécifiques à la page d'accueil

/**
 * Afficher le formulaire de création d'article
 */

function showCreateArticleModal() {
    document.getElementById('create-article-form').style.display = 'block';
    document.getElementById('article-content').focus();
}

/**
 * Masquer le formulaire de création d'article
 */
function hideCreateArticleForm() {
    document.getElementById('create-article-form').style.display = 'none';
    document.getElementById('article-form').reset();
}

/**
 * Configuration du formulaire d'article
 */
document.addEventListener('DOMContentLoaded', function() {
    const articleForm = document.getElementById('article-form');
    if (articleForm) {
        articleForm.addEventListener('submit', async function(e) {
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
                
                const result = await apiCall('articles.php', 'POST', {
                    action: 'create',
                    body: formData
                });
                
                if (result.success) {
                    showSuccess('Article publié avec succès !');
                    hideCreateArticleForm();
                    loadArticles(); // Recharger les articles
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error('Erreur lors de la création de l\'article:', error);
                showError('Erreur lors de la création de l\'article');
            }
        });
    }
});

/**
 * Basculer le like/dislike d'un article
 */
async function toggleLike(articleId) {
    try {
        const result = await apiCall('articles.php', 'POST', {
            action: 'toggle_like',
            article_id: articleId
        });
        
        if (result.success) {
            // Mettre à jour l'affichage du like
            const likeButton = document.querySelector(`[onclick="toggleLike(${articleId})"]`);
            const likeIcon = likeButton.querySelector('i');
            const likeCount = document.getElementById(`likes-${articleId}`);
            
            if (result.liked) {
                likeIcon.classList.remove('text-muted');
                likeIcon.classList.add('text-danger');
                likeButton.classList.add('liked');
                likeButton.classList.remove('btn-outline-primary');
            } else {
                likeIcon.classList.remove('text-danger');
                likeIcon.classList.add('text-muted');
                likeButton.classList.remove('liked');
                likeButton.classList.add('btn-outline-primary');
            }
            
            // Animation du compteur
            likeCount.textContent = result.likes_count;
            likeCount.classList.add('updated');
            setTimeout(() => {
                likeCount.classList.remove('updated');
            }, 600);
            
            // Animation de l'icône
            likeIcon.style.transform = 'scale(1.3)';
            setTimeout(() => {
                likeIcon.style.transform = 'scale(1)';
            }, 200);
            
            // Notification
            if (result.liked) {
                showSuccess('❤️ Article liké !');
            } else {
                showSuccess('💔 Like retiré');
            }
        }
    } catch (error) {
        console.error('Erreur lors du like:', error);
        showError('Erreur lors du like');
    }
}

/**
 * Basculer l'affichage des commentaires
 */
async function toggleComments(articleId) {
    const commentsSection = document.getElementById(`comments-section-${articleId}`);
    const isVisible = commentsSection.style.display !== 'none';
    
    if (!isVisible) {
        // Afficher l'indicateur de chargement
        const commentsList = document.getElementById(`comments-list-${articleId}`);
        commentsList.innerHTML = `
            <div class="comments-loading">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement des commentaires...</span>
                </div>
                <p class="mt-2">Chargement des commentaires...</p>
            </div>
        `;
        commentsSection.style.display = 'block';
        
        // Charger les commentaires
        try {
            const result = await apiCall(`articles.php?action=comments&article_id=${articleId}`);
            displayComments(articleId, result.data || []);
        } catch (error) {
            console.error('Erreur lors du chargement des commentaires:', error);
            commentsList.innerHTML = `
                <div class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erreur lors du chargement des commentaires</p>
                </div>
            `;
            showError('Erreur lors du chargement des commentaires');
        }
    } else {
        commentsSection.style.display = 'none';
    }
}

/**
 * Afficher les commentaires
 */
function displayComments(articleId, comments) {
    const commentsList = document.getElementById(`comments-list-${articleId}`);
    if (!commentsList) return;
    
    if (comments.length === 0) {
        commentsList.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="fas fa-comment-slash fa-2x mb-2"></i>
                <p class="mb-0">Aucun commentaire pour le moment</p>
                <small>Soyez le premier à commenter !</small>
            </div>
        `;
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="d-flex align-items-start">
                <img src="${comment.avatar || 'assets/images/default-avatar.png'}" 
                     class="comment-avatar me-3" width="35" height="35" alt="Avatar">
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <div class="comment-author">${comment.prenom} ${comment.nom}</div>
                        <div class="comment-date">
                            <i class="fas fa-clock"></i> ${formatDate(comment.date_creation)}
                        </div>
                    </div>
                    <div class="comment-content">${escapeHtml(comment.contenu)}</div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Ajouter un commentaire
 */
async function addComment(articleId) {
    const input = document.getElementById(`comment-input-${articleId}`);
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        const result = await apiCall('articles.php', 'POST', {
            action: 'add_comment',
            article_id: articleId,
            contenu: content
        });
        
        if (result.success) {
            input.value = '';
            
            // Mettre à jour le compteur de commentaires avec animation
            const commentCount = document.getElementById(`comments-${articleId}`);
            if (commentCount) {
                const newCount = parseInt(commentCount.textContent) + 1;
                commentCount.textContent = newCount;
                commentCount.classList.add('updated');
                setTimeout(() => {
                    commentCount.classList.remove('updated');
                }, 600);
            }
            
            // Recharger les commentaires
            const commentsResult = await apiCall(`articles.php?action=comments&article_id=${articleId}`);
            displayComments(articleId, commentsResult.data || []);
            
            // Ajouter la classe 'new' au dernier commentaire pour l'animation
            const commentsList = document.getElementById(`comments-list-${articleId}`);
            const lastComment = commentsList.lastElementChild;
            if (lastComment) {
                lastComment.classList.add('new');
                setTimeout(() => {
                    lastComment.classList.remove('new');
                }, 300);
            }
            
            showSuccess('💬 Commentaire ajouté !');
        }
    } catch (error) {
        console.error('Erreur lors de l\'ajout du commentaire:', error);
        showError('Erreur lors de l\'ajout du commentaire');
    }
}

/**
 * Afficher une image en grand
 */
function showImageModal(imageSrc) {
    document.getElementById('modal-image').src = imageSrc;
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    modal.show();
}

/**
 * Gérer la touche Entrée pour les commentaires
 */
function handleCommentKeyPress(event, articleId) {
    if (event.key === 'Enter') {
        addComment(articleId);
    }
}

/**
 * Échapper le HTML pour éviter les injections
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Partager un article (fonctionnalité de base)
 */
function shareArticle(articleId) {
    // Pour l'instant, on copie juste le lien
    const url = window.location.href + '#article-' + articleId;
    navigator.clipboard.writeText(url).then(() => {
        showSuccess('Lien de l\'article copié dans le presse-papiers !');
    }).catch(() => {
        showError('Impossible de copier le lien');
    });
}