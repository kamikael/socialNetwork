<?php
/**
 * API d'authentification administrateur - Réseau Social
 * Gestion spécifique de la connexion des administrateurs
 */

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Configuration
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Gestion des requêtes OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration de la base de données
require_once 'config.php';

// Fonctions utilitaires
function generateToken($userId) {
    return bin2hex(random_bytes(32));
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// Traitement des requêtes
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée. Seule la méthode POST est acceptée.'
    ]);
    exit();
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Récupérer les données POST
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Données JSON invalides');
    }
    
    $action = $input['action'] ?? '';
    
    if ($action === 'login') {
        // Traitement de la connexion administrateur
        handleAdminLogin($pdo, $input);
    } elseif ($action === 'validate_token') {
        // Validation du token administrateur
        handleValidateToken($pdo);
    } else {
        throw new Exception('Action non reconnue. Actions autorisées: "login", "validate_token"');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}

/**
 * Gestion de la connexion administrateur
 */
function handleAdminLogin($pdo, $input) {
    // Validation des données
    if (empty($input['email']) || empty($input['password'])) {
        throw new Exception('Email et mot de passe requis');
    }
    
    $email = trim($input['email']);
    $password = $input['password'];
    
    // Validation de l'email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Format d\'email invalide');
    }
    
    // Récupérer l'utilisateur
    $stmt = $pdo->prepare("
        SELECT id, prenom, nom, email, mot_de_passe, statut, photo_profil, role
        FROM utilisateurs 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        throw new Exception('Email ou mot de passe incorrect');
    }
    
    // Vérifier le statut du compte
    if ($user['statut'] === 'en_attente') {
        throw new Exception('Votre compte n\'est pas encore confirmé. Vérifiez votre email.');
    }
    
    if ($user['statut'] === 'suspendu') {
        throw new Exception('Votre compte a été suspendu. Contactez l\'administrateur.');
    }
    
    // Vérifier le mot de passe
    if (!verifyPassword($password, $user['mot_de_passe'])) {
        throw new Exception('Email ou mot de passe incorrect');
    }
    
    // Vérifier le rôle administrateur
    if ($user['role'] !== 'administrateur') {
        throw new Exception('Accès refusé. Seuls les administrateurs peuvent accéder au back-office.');
    }
    
    // Générer un token de session sécurisé
    $token = generateToken($user['id']);
    
    // Mettre à jour le token de session et la dernière connexion
    $stmt = $pdo->prepare("
        UPDATE utilisateurs 
        SET token_session = ?, derniere_connexion = NOW() 
        WHERE id = ?
    ");
    $stmt->execute([$token, $user['id']]);
    
    // Nettoyer les données sensibles
    unset($user['mot_de_passe']);
    
    // Ajouter le token aux données utilisateur
    $user['token'] = $token;
    
    // Log de connexion administrateur
    logAdminAction($pdo, $user['id'], 'login', 'Connexion administrateur réussie');
    
    echo json_encode([
        'success' => true,
        'message' => 'Connexion administrateur réussie',
        'user' => $user,
        'token' => $token
    ]);
}

/**
 * Log des actions administrateur
 */
function logAdminAction($pdo, $userId, $action) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO admin_logs (admin_id, action, date_action)
            VALUES (?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $userId,
            $action
        ]);
    } catch (Exception $e) {
        // En cas d'erreur de log, on continue (ne pas bloquer la connexion)
        error_log("Erreur lors du log admin: " . $e->getMessage());
    }
}

/**
 * Validation du token administrateur
 */
function handleValidateToken($pdo) {
    // Vérifier si l'en-tête d'autorisation est présent
    if (!isset($_SERVER['HTTP_AUTHORIZATION'])) {
        throw new Exception('Token d\'authentification manquant');
    }
    
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    if (empty($token)) {
        throw new Exception('Token d\'authentification invalide');
    }
    
    // Vérifier le token dans la base de données
    $stmt = $pdo->prepare("
        SELECT id, prenom, nom, email, role, statut
        FROM utilisateurs 
        WHERE token_session = ? AND statut = 'actif' AND role = 'administrateur'
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        throw new Exception('Token invalide ou utilisateur non autorisé');
    }
    
    // Log de validation de token
    logAdminAction($pdo, $user['id'], 'validate_token');
    
    echo json_encode([
        'success' => true,
        'message' => 'Token valide',
        'user' => $user
    ]);
}
?> 