<?php
/**
 * API Amis - Réseau Social
 * Gestion des amis, invitations, suggestions
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
            case 'users':
                // Liste des utilisateurs (hors soi-même)
                $stmt = $pdo->prepare('SELECT id, prenom, nom, email, photo_profil, bio FROM utilisateurs WHERE id != ? AND statut = "actif"');
                $stmt->execute([$userId]);
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'data' => $users]);
                break;
            case 'friends':
                // Liste des amis
                $stmt = $pdo->prepare('SELECT u.id, u.prenom, u.nom, u.email, u.photo_profil, a.date_amitie FROM amis a JOIN utilisateurs u ON (u.id = a.ami_id) WHERE a.user_id = ? UNION SELECT u.id, u.prenom, u.nom, u.email, u.photo_profil, a.date_amitie FROM amis a JOIN utilisateurs u ON (u.id = a.user_id) WHERE a.ami_id = ?');
                $stmt->execute([$userId, $userId]);
                $friends = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'data' => $friends]);
                break;
            case 'requests':
                // Invitations reçues
                $stmt = $pdo->prepare('SELECT ia.id, u.prenom, u.nom, u.email, u.photo_profil, ia.date_invitation, ia.expediteur_id as user_id FROM invitations_amis ia JOIN utilisateurs u ON ia.expediteur_id = u.id WHERE ia.destinataire_id = ? AND ia.statut = "en_attente"');
                $stmt->execute([$userId]);
                $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'data' => $requests]);
                break;
            case 'suggestions':
                // Suggestions d'amis (utilisateurs non amis, pas d'invitation en cours)
                $stmt = $pdo->prepare('SELECT id, prenom, nom, email, photo_profil, (SELECT COUNT(*) FROM amis WHERE (user_id = utilisateurs.id OR ami_id = utilisateurs.id) AND (user_id = ? OR ami_id = ?)) as mutual_friends FROM utilisateurs WHERE id != ? AND statut = "actif" AND id NOT IN (SELECT ami_id FROM amis WHERE user_id = ? UNION SELECT user_id FROM amis WHERE ami_id = ?) AND id NOT IN (SELECT destinataire_id FROM invitations_amis WHERE expediteur_id = ? AND statut = "en_attente")');
                $stmt->execute([$userId, $userId, $userId, $userId, $userId, $userId]);
                $suggestions = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'data' => $suggestions]);
                break;
            case 'stats':
                // Statistiques d'amis
                $friendsCount = (int)$pdo->query('SELECT COUNT(*) FROM amis WHERE user_id = ' . (int)$userId . ' OR ami_id = ' . (int)$userId)->fetchColumn();
                $mutualFriends = 0; // À calculer si besoin
                echo json_encode(['success' => true, 'data' => ['friends_count' => $friendsCount, 'mutual_friends' => $mutualFriends]]);
                break;
            default:
                throw new Exception('Action non reconnue');
        }
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
        switch ($action) {
            case 'send_request':
                $destId = $input['user_id'] ?? 0;
                if ($destId == $userId) throw new Exception('Impossible de s\'inviter soi-même');
                // Vérifier si déjà amis ou invitation existante
                $stmt = $pdo->prepare('SELECT id FROM amis WHERE (user_id = ? AND ami_id = ?) OR (user_id = ? AND ami_id = ?)');
                $stmt->execute([$userId, $destId, $destId, $userId]);
                if ($stmt->fetch()) throw new Exception('Déjà amis');
                $stmt = $pdo->prepare('SELECT id FROM invitations_amis WHERE expediteur_id = ? AND destinataire_id = ? AND statut = "en_attente"');
                $stmt->execute([$userId, $destId]);
                if ($stmt->fetch()) throw new Exception('Invitation déjà envoyée');
                $stmt = $pdo->prepare('INSERT INTO invitations_amis (expediteur_id, destinataire_id, date_invitation, statut) VALUES (?, ?, NOW(), "en_attente")');
                $stmt->execute([$userId, $destId]);
                echo json_encode(['success' => true, 'message' => 'Invitation envoyée']);
                break;
            case 'accept_request':
                $requestId = $input['request_id'] ?? 0;
                // Récupérer l'invitation
                $stmt = $pdo->prepare('SELECT * FROM invitations_amis WHERE id = ? AND destinataire_id = ? AND statut = "en_attente"');
                $stmt->execute([$requestId, $userId]);
                $inv = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$inv) throw new Exception('Invitation non trouvée');
                // Ajouter dans amis
                $stmt = $pdo->prepare('INSERT INTO amis (user_id, ami_id, date_amitie) VALUES (?, ?, NOW())');
                $stmt->execute([$inv['expediteur_id'], $userId]);
                // Mettre à jour l'invitation
                $stmt = $pdo->prepare('UPDATE invitations_amis SET statut = "acceptee" WHERE id = ?');
                $stmt->execute([$requestId]);
                echo json_encode(['success' => true, 'message' => 'Invitation acceptée']);
                break;
            case 'reject_request':
                $requestId = $input['request_id'] ?? 0;
                $stmt = $pdo->prepare('UPDATE invitations_amis SET statut = "refusee" WHERE id = ? AND destinataire_id = ?');
                $stmt->execute([$requestId, $userId]);
                echo json_encode(['success' => true, 'message' => 'Invitation refusée']);
                break;
            case 'remove_friend':
                $friendId = $input['friend_id'] ?? 0;
                $stmt = $pdo->prepare('DELETE FROM amis WHERE (user_id = ? AND ami_id = ?) OR (user_id = ? AND ami_id = ?)');
                $stmt->execute([$userId, $friendId, $friendId, $userId]);
                echo json_encode(['success' => true, 'message' => 'Ami supprimé']);
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
