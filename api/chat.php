<?php
/**
 * API Chat - Réseau Social
 * Gestion des messages et conversations
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Debug: Log des requêtes
error_log("Chat API - Méthode: " . $_SERVER['REQUEST_METHOD']);
error_log("Chat API - Action: " . ($_GET['action'] ?? 'aucune'));
error_log("Chat API - User ID: " . ($_GET['user_id'] ?? $_POST['user_id'] ?? 'aucun'));

// Gestion des requêtes OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

// Variables globales
$pdo = null;
$currentUser = null;
$method = $_SERVER['REQUEST_METHOD'];
$input = null;
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
}

try {
    // Connexion à la base de données
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Vérifier l'authentification
    $currentUser = validateUser();
    
    // Récupérer l'action
    $action = $_GET['action'] ?? ($input['action'] ?? '');
    
    // Traitement des actions
    switch ($action) {
        case 'users':
            getUsers();
            break;
        case 'messages':
            getMessages();
            break;
        case 'send':
            sendMessage();
            break;
        case 'conversations':
            getConversations();
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Action non reconnue']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
     echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}

/**
 * Valider le token d'authentification
 */
/**
 * Valider le token d'authentification via l'ID de l'utilisateur
 */
function validateUser() {
    global $pdo;

    // Récupération de l'ID utilisateur depuis POST, GET ou JSON
    $userId = $_POST['user_id'] ?? $_GET['user_id'] ?? null;

    // Ajout : lecture du body JSON si POST vide
    if (!$userId && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($input['user_id'])) {
            $userId = $input['user_id'];
        }
    }

    if (!isset($userId) || !ctype_digit((string)$userId)) {
        throw new Exception('Identifiant utilisateur invalide');
    }

    // Préparation et exécution de la requête
    $stmt = $pdo->prepare("
        SELECT id, prenom, nom, email, photo_profil, statut
        FROM utilisateurs
        WHERE id = ? 
    ");
    $stmt->bindValue(1, (int)$userId, PDO::PARAM_INT);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Vérification du résultat
    if (!$user) {
        throw new Exception('Utilisateur non trouvé ou non autorisé');
    }

    return $user;
}



/**
 * Récupérer la liste des utilisateurs (amis)
 */
function getUsers() {
    global $pdo, $currentUser;
    
    // Récupérer tous les utilisateurs actifs (sauf l'utilisateur connecté)
    $stmt = $pdo->prepare("
        SELECT 
            id, prenom, nom, email, photo_profil, statut,
            derniere_connexion,
            CASE 
                WHEN derniere_connexion >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 
                ELSE 0 
            END as online
        FROM utilisateurs 
        WHERE id != ? AND statut = 'actif'
        ORDER BY prenom, nom
    ");
    
    $stmt->execute([$currentUser['id']]);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'users' => $users
    ]);
}

/**
 * Récupérer les messages d'une conversation
 */
function getMessages() {
    global $pdo, $currentUser;
    
    $otherUserId = $_GET['user_id'] ?? null;
    
    error_log("Chat API - Récupération messages: utilisateur courant=" . $currentUser['id'] . ", autre utilisateur=$otherUserId");
    
    if (!$otherUserId) {
        throw new Exception('ID utilisateur requis');
    }
    
    // Récupérer ou créer une conversation entre les deux utilisateurs
    $conversationId = getOrCreateConversation($currentUser['id'], $otherUserId);
    error_log("Chat API - Conversation ID pour récupération: $conversationId");
    
    // Vérifier d'abord si la conversation existe
    $stmt = $pdo->prepare("SELECT id FROM conversations WHERE id = ?");
    $stmt->execute([$conversationId]);
    $convExists = $stmt->fetch(PDO::FETCH_ASSOC);
    error_log("Chat API - Conversation existe: " . ($convExists ? 'OUI' : 'NON'));
    
    // Récupérer les messages de cette conversation
    $stmt = $pdo->prepare("
        SELECT 
            m.id, m.contenu, m.type, m.image, m.date_envoi,
            m.expediteur_id,
            u.prenom, u.nom, u.photo_profil
        FROM messages m
        INNER JOIN utilisateurs u ON m.expediteur_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.date_envoi ASC
        LIMIT 100
    ");
    
    $stmt->execute([$conversationId]);
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log("Chat API - Messages trouvés: " . count($messages));
    error_log("Chat API - Messages: " . json_encode($messages));
    
    echo json_encode([
        'success' => true,
        'messages' => $messages,
        'conversation_id' => $conversationId
    ]);
}

/**
 * Récupérer ou créer une conversation entre deux utilisateurs
 */
function getOrCreateConversation($user1Id, $user2Id) {
    global $pdo;
    
    // Chercher une conversation existante dans la table conversations
    $stmt = $pdo->prepare("
        SELECT id 
        FROM conversations 
        WHERE (user1_id = ? AND user2_id = ?) 
           OR (user1_id = ? AND user2_id = ?)
        LIMIT 1
    ");
    $stmt->execute([$user1Id, $user2Id, $user2Id, $user1Id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        return $result['id'];
    }
    
    // Créer une nouvelle conversation dans la table conversations
    $stmt = $pdo->prepare("
        INSERT INTO conversations (user1_id, user2_id, date_creation, last_message_at) 
        VALUES (?, ?, NOW(), NOW())
    ");
    $stmt->execute([$user1Id, $user2Id]);
    
    $conversationId = $pdo->lastInsertId();
    
    return $conversationId;
}

/**
 * Envoyer un message
 */
function sendMessage() {
    global $pdo, $currentUser;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $destinataireId = $input['destinataire_id'] ?? null;
    $contenu = trim($input['contenu'] ?? '');
    $type = $input['type'] ?? 'text';
    $image = $input['image'] ?? null;
    
    error_log("Chat API - Envoi message: destinataire=$destinataireId, contenu=$contenu");
    
    if (!$destinataireId || empty($contenu)) {
        throw new Exception('Destinataire et contenu requis');
    }
    
    // Récupérer ou créer une conversation
    $conversationId = getOrCreateConversation($currentUser['id'], $destinataireId);
    error_log("Chat API - Conversation ID: $conversationId");
    
    // Insérer le message
    $stmt = $pdo->prepare("
        INSERT INTO messages (conversation_id, expediteur_id, contenu, type, image, date_envoi, user_id)
        VALUES (?, ?, ?, ?, ?, NOW(), ?)
    ");
    $stmt->execute([$conversationId, $currentUser['id'], $contenu, $type, $image, $destinataireId]);
    
    $messageId = $pdo->lastInsertId();
    error_log("Chat API - Message inséré avec ID: $messageId");
    
    // Mettre à jour la table conversations avec le dernier message
    $stmt = $pdo->prepare("
        UPDATE conversations 
        SET last_message = ?, last_message_at = NOW() 
        WHERE id = ?
    ");
    $stmt->execute([$contenu, $conversationId]);
    
    // Récupérer le message créé
    $stmt = $pdo->prepare("
        SELECT 
            m.id, m.contenu, m.type, m.image, m.date_envoi,
            m.expediteur_id,
            u.prenom, u.nom, u.photo_profil
        FROM messages m
        INNER JOIN utilisateurs u ON m.expediteur_id = u.id
        WHERE m.id = ?
    ");
    $stmt->execute([$messageId]);
    $message = $stmt->fetch(PDO::FETCH_ASSOC);
    
    error_log("Chat API - Message récupéré: " . json_encode($message));
    
    echo json_encode([
        'success' => true,
        'message' => $message
    ]);
}

/**
 * Récupérer les conversations récentes
 */
function getConversations() {
    global $pdo, $currentUser;
    
    // Récupérer les dernières conversations avec aperçu du dernier message
    $stmt = $pdo->prepare("
        SELECT 
            u.id, u.prenom, u.nom, u.photo_profil,
            m.contenu as dernier_message,
            m.date_envoi as derniere_activite,
            m.expediteur_id,
            m.conversation_id
        FROM utilisateurs u
        INNER JOIN messages m ON (
            (m.expediteur_id = ? AND m.user_id = u.id)
            OR (m.expediteur_id = u.id AND m.user_id = ?)
        )
        WHERE u.id != ? AND u.statut = 'actif'
        AND m.id = (
            SELECT MAX(m2.id) 
            FROM messages m2 
            WHERE m2.conversation_id = m.conversation_id
        )
        ORDER BY m.date_envoi DESC
    ");
    
    $stmt->execute([$currentUser['id'], $currentUser['id'], $currentUser['id']]);
    $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'conversations' => $conversations
    ]);
}
?>
