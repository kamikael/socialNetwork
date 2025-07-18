<?php
/**
 * API Profil - Réseau Social
 * Gestion du profil utilisateur : affichage, modification, mot de passe, avatar, stats, articles
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

function getUserIdFromToken($pdo) {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) return null;
    $token = str_replace('Bearer ', '', $headers['Authorization']);
    $stmt = $pdo->prepare('SELECT id FROM utilisateurs WHERE token_session = ?');
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    return $user ? $user['id'] : null;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $userId = getUserIdFromToken($pdo);
    if (!$userId) throw new Exception('Non autorisé');
    if ($method === 'GET') {
        switch ($action) {
            case 'get':
                $stmt = $pdo->prepare('SELECT id, prenom, nom, email, date_naissance, telephone, adresse, photo_profil, bio FROM utilisateurs WHERE id = ?');
                $stmt->execute([$userId]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'data' => $user]);
                break;
            case 'get_user':
                $targetUserId = $_GET['user_id'] ?? 0;
                if (!$targetUserId) throw new Exception('ID utilisateur requis');
                
                // Vérifier que l'utilisateur existe et est ami avec l'utilisateur connecté
                $stmt = $pdo->prepare('SELECT u.id, u.prenom, u.nom, u.email, u.date_naissance, u.telephone, u.adresse, u.photo_profil, u.bio, u.ville FROM utilisateurs u WHERE u.id = ? AND u.statut = "actif"');
                $stmt->execute([$targetUserId]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$user) throw new Exception('Utilisateur non trouvé');
                
                // Vérifier si c'est un ami (optionnel - vous pouvez retirer cette vérification si vous voulez permettre de voir tous les profils)
                $stmt = $pdo->prepare('SELECT COUNT(*) FROM amis WHERE (user_id = ? AND ami_id = ?) OR (user_id = ? AND ami_id = ?)');
                $stmt->execute([$userId, $targetUserId, $targetUserId, $userId]);
                $isFriend = $stmt->fetchColumn() > 0;
                
                if (!$isFriend) throw new Exception('Vous devez être ami pour voir ce profil');
                
                echo json_encode(['success' => true, 'data' => $user]);
                break;
            case 'stats':
                $articles = (int)$pdo->query('SELECT COUNT(*) FROM articles WHERE user_id = ' . (int)$userId)->fetchColumn();
                $amis = (int)$pdo->query('SELECT COUNT(*) FROM amis WHERE user_id = ' . (int)$userId . ' OR ami_id = ' . (int)$userId)->fetchColumn();
                $likes = (int)$pdo->query('SELECT COUNT(*) FROM likes l JOIN articles a ON l.article_id = a.id WHERE a.user_id = ' . (int)$userId)->fetchColumn();
                echo json_encode(['success' => true, 'data' => ['articles_count' => $articles, 'amis_count' => $amis, 'likes_received' => $likes]]);
                break;
            case 'articles':
                $stmt = $pdo->prepare('SELECT * FROM articles WHERE user_id = ? ORDER BY date_creation DESC');
                $stmt->execute([$userId]);
                $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($articles as &$article) {
                    $article['likes'] = (int)$pdo->query('SELECT COUNT(*) FROM likes WHERE article_id = ' . (int)$article['id'])->fetchColumn();
                    $article['comments_count'] = (int)$pdo->query('SELECT COUNT(*) FROM commentaires WHERE article_id = ' . (int)$article['id'])->fetchColumn();
                }
                echo json_encode(['success' => true, 'data' => $articles]);
                break;
            default:
                throw new Exception('Action non reconnue');
        }
    } elseif ($method === 'POST') {
        // Pour upload d'image, utiliser $_POST et $_FILES
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? ($_POST['action'] ?? '');
        switch ($action) {
            case 'update':
                $prenom = $_POST['prenom'] ?? '';
                $nom = $_POST['nom'] ?? '';
                $email = $_POST['email'] ?? '';
                $telephone = $_POST['telephone'] ?? null;
                $adresse = $_POST['adresse'] ?? null;
                $bio = $_POST['bio'] ?? null;
                if (!$prenom || !$nom || !$email) throw new Exception('Champs obligatoires manquants');
                $stmt = $pdo->prepare('UPDATE utilisateurs SET prenom = ?, nom = ?, email = ?, telephone = ?, adresse = ?, bio = ? WHERE id = ?');
                $stmt->execute([$prenom, $nom, $email, $telephone, $adresse, $bio, $userId]);
                echo json_encode(['success' => true, 'message' => 'Profil mis à jour']);
                break;
            case 'update_avatar':
                if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) throw new Exception('Aucune image reçue');
                $uploadDir = '../assets/images/avatars/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
                $fileInfo = pathinfo($_FILES['avatar']['name']);
                $extension = strtolower($fileInfo['extension']);
                $allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];
                if (!in_array($extension, $allowedTypes)) throw new Exception('Type de fichier non autorisé');
                if ($_FILES['avatar']['size'] > 2 * 1024 * 1024) throw new Exception('Image trop volumineuse');
                $filename = uniqid() . '.' . $extension;
                $avatarPath = 'assets/images/avatars/' . $filename;
                if (!move_uploaded_file($_FILES['avatar']['tmp_name'], '../' . $avatarPath)) throw new Exception('Erreur upload image');
                $stmt = $pdo->prepare('UPDATE utilisateurs SET photo_profil = ? WHERE id = ?');
                $stmt->execute([$avatarPath, $userId]);
                echo json_encode(['success' => true, 'avatar_url' => $avatarPath]);
                break;
            case 'change_password':
                $current = $input['current_password'] ?? '';
                $new = $input['new_password'] ?? '';
                if (!$current || !$new) throw new Exception('Champs requis');
                $stmt = $pdo->prepare('SELECT mot_de_passe FROM utilisateurs WHERE id = ?');
                $stmt->execute([$userId]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$user || !password_verify($current, $user['mot_de_passe'])) throw new Exception('Mot de passe actuel incorrect');
                if (strlen($new) < 8) throw new Exception('Le nouveau mot de passe doit contenir au moins 8 caractères');
                $hashed = password_hash($new, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?');
                $stmt->execute([$hashed, $userId]);
                echo json_encode(['success' => true, 'message' => 'Mot de passe changé']);
                break;
            case 'delete_article':
                $articleId = $input['article_id'] ?? 0;
                $stmt = $pdo->prepare('DELETE FROM articles WHERE id = ? AND user_id = ?');
                $stmt->execute([$articleId, $userId]);
                echo json_encode(['success' => true, 'message' => 'Article supprimé']);
                break;
            default:
                throw new Exception('Action non reconnue');
        }
    } else {
        throw new Exception('Méthode non autorisée');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'token' => $_GET['token'] ?? ''
    ]);
}
