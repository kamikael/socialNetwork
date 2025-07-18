<?php
/**
 * API d'authentification - Réseau Social
 * Gestion de l'inscription, connexion, confirmation email et réinitialisation de mot de passe
 */


ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Configuration
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function generateConfirmationToken() {
    return bin2hex(random_bytes(16));
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
require './vendor/autoload.php'; // Charge PHPMailer
$config = require 'emailconf.php';

function sendEmail($to, $subject, $bodyHtml, $bodyText = '') {
    global $config;

  $mail = new PHPMailer(true);

    try {
        // Configuration SMTP
        $mail->isSMTP();
        $mail->Host       = $config['smtp_host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $config['smtp_username'];
        $mail->Password   = $config['smtp_password'];
        $mail->SMTPSecure = $config['smtp_secure'];
        $mail->Port       = $config['smtp_port'];

        // Expéditeur et destinataire
        $mail->setFrom($config['from_email'], $config['from_name']);
        $mail->addReplyTo($config['reply_to']);
        $mail->addAddress($to);

        // Contenu de l'email
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $bodyHtml;
        $mail->AltBody = $bodyText ?: strip_tags($bodyHtml);

        $mail->send();
        return true;

    } catch (PHPMailer\PHPMailer\Exception $e) {
        error_log("Erreur d'envoi mail : {$mail->ErrorInfo}");
        return false;
    }
}


function sendConfirmationEmail($email, $token, $nom, $prenom) {
    $subject = "Confirmation de votre compte - Réseau Social";
    $confirmUrl = "http://" . $_SERVER['HTTP_HOST'] . "/app/api/auth.php?action=confirm&token=" . $token;
    
    $htmlContent = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>Confirmation de compte</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f8f9fa; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>Bienvenue sur Réseau Social !</h1>
            </div>
            <div class='content'>
                <h2>Bonjour $prenom $nom,</h2>
                <p>Merci de vous être inscrit sur notre réseau social. Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
                <p style='text-align: center;'>
                    <a href='$confirmUrl' class='button'>Confirmer mon compte</a>
                </p>
                <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
                <p><a href='$confirmUrl'>$confirmUrl</a></p>
                <p>Ce lien expire dans 24 heures.</p>
            </div>
            <div class='footer'>
                <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
                <p>&copy; 2024 Réseau Social. Tous droits réservés.</p>
            </div>
        </div>
    </body>
    </html>";
    
    return sendEmail($email, $subject, $htmlContent);
}

function sendPasswordResetEmail($email, $token, $nom, $prenom) {
    $subject = "Réinitialisation de mot de passe - Réseau Social";
    $resetUrl = "http://" . $_SERVER['HTTP_HOST'] . "/reset-password.html?token=" . $token;
    
    $htmlContent = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>Réinitialisation de mot de passe</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f8f9fa; }
            .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>Réinitialisation de mot de passe</h1>
            </div>
            <div class='content'>
                <h2>Bonjour $prenom $nom,</h2>
                <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
                <p style='text-align: center;'>
                    <a href='$resetUrl' class='button'>Réinitialiser mon mot de passe</a>
                </p>
                <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
                <p><a href='$resetUrl'>$resetUrl</a></p>
                <p>Ce lien expire dans 1 heure.</p>
                <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
            </div>
            <div class='footer'>
                <p>&copy; 2024 Réseau Social. Tous droits réservés.</p>
            </div>
        </div>
    </body>
    </html>";
    
    return sendEmail($email, $subject, $htmlContent);
}

// Traitement des requêtes
$method = $_SERVER['REQUEST_METHOD'];
$input = null;
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
}
$action = $_GET['action'] ?? $_POST['action'] ?? ($input['action'] ?? '');

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        switch ($action) {
            case 'register':
                handleRegister($pdo, $input);
                break;
                
            case 'login':
                handleLogin($pdo, $input);
                break;
                
            case 'reset_password':
                handlePasswordReset($pdo, $input);
                break;
                
            case 'confirm_reset':
                handleConfirmReset($pdo, $input);
                break;
                
            default:
                throw new Exception('Action non reconnue');
        }
    } elseif ($method === 'GET') {
        switch ($action) {
            case 'confirm':
                handleEmailConfirmation($pdo, $_GET['token'] ?? '');
                break;
                
            case 'validate_admin':
                handleValidateAdmin($pdo);
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
        'trace' => $e->getTraceAsString()
    ]);
}

/**
 * Gestion de l'inscription
 */
function handleRegister($pdo, $input) {
    // Validation des données
    $required = ['prenom', 'nom', 'email', 'password', 'date_naissance'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            throw new Exception("Le champ $field est requis");
        }
    }
    
    // Validation de l'email
    if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Adresse email invalide');
    }
    
    // Validation de l'âge (minimum 13 ans)
    $birthDate = new DateTime($input['date_naissance']);
    $today = new DateTime();
    $age = $today->diff($birthDate)->y;
    if ($age < 13) {
        throw new Exception('Vous devez avoir au moins 13 ans pour créer un compte');
    }
    
    // Vérifier si l'email existe déjà
    $stmt = $pdo->prepare("SELECT id FROM utilisateurs WHERE email = ?");
    $stmt->execute([$input['email']]);
    if ($stmt->fetch()) {
        throw new Exception('Cette adresse email est déjà utilisée');
    }
    
    // Traitement de la photo de profil
    $photoPath = null;
    if (isset($_FILES['photo_profil']) && $_FILES['photo_profil']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = '../assets/images/avatars/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $fileInfo = pathinfo($_FILES['photo_profil']['name']);
        $extension = strtolower($fileInfo['extension']);
        
        // Vérifier le type de fichier
        $allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];
        if (!in_array($extension, $allowedTypes)) {
            throw new Exception('Type de fichier non autorisé');
        }
        
        // Vérifier la taille (max 2MB)
        if ($_FILES['photo_profil']['size'] > 2 * 1024 * 1024) {
            throw new Exception('La photo ne doit pas dépasser 2MB');
        }
        
        $filename = uniqid() . '.' . $extension;
        $photoPath = 'assets/images/avatars/' . $filename;
        
        if (!move_uploaded_file($_FILES['photo_profil']['tmp_name'], '../' . $photoPath)) {
            throw new Exception('Erreur lors de l\'upload de la photo');
        }
    }
    
    // Générer le token de confirmation
    $confirmationToken = generateConfirmationToken();
    
    
    // Insérer l'utilisateur
    $stmt = $pdo->prepare("
        INSERT INTO utilisateurs (prenom, nom, email, mot_de_passe, date_naissance, telephone, adresse, photo_profil, confirmation_token, date_inscription, statut)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'en_attente')
    ");
    
    $hashedPassword = hashPassword($input['password']);
    $stmt->execute([
        $input['prenom'],
        $input['nom'],
        $input['email'],
        $hashedPassword,
        $input['date_naissance'],
        $input['telephone'] ?? null,
        $input['adresse'] ?? null,
        $photoPath,
        $confirmationToken
    ]);
    
    $userId = $pdo->lastInsertId();
    
    // Envoyer l'email de confirmation
    if (!sendConfirmationEmail($input['email'], $confirmationToken, $input['nom'], $input['prenom'])) {
        // Si l'email ne peut pas être envoyé, supprimer l'utilisateur
        $stmt = $pdo->prepare("DELETE FROM utilisateurs WHERE id = ?");
        $stmt->execute([$userId]);
        throw new Exception('Erreur lors de l\'envoi de l\'email de confirmation');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Inscription réussie. Vérifiez votre email pour confirmer votre compte.'
    ]);
}

/**
 * Gestion de la connexion
 */
function handleLogin($pdo, $input) {
    if (empty($input['email']) || empty($input['password'])) {
        throw new Exception('Email et mot de passe requis');
    }
    
    // Récupérer l'utilisateur
    $stmt = $pdo->prepare("
        SELECT id, prenom, nom, email, mot_de_passe, statut, photo_profil, date_naissance, telephone, adresse, bio, role
        FROM utilisateurs 
        WHERE email = ?
    ");
    $stmt->execute([$input['email']]);
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
    if (!verifyPassword($input['password'], $user['mot_de_passe'])) {
        throw new Exception('Email ou mot de passe incorrect');
    }
    
    // Générer un token de session
    $token = generateToken($user['id']);
    
    // Mettre à jour le token de session
    $stmt = $pdo->prepare("UPDATE utilisateurs SET token_session = ?, derniere_connexion = NOW() WHERE id = ?");
    $stmt->execute([$token, $user['id']]);
    
    // Retourner les données utilisateur (sans le mot de passe)
    unset($user['mot_de_passe']);
    $user['token'] = $token;
    
    echo json_encode([
        'success' => true,
        'message' => 'Connexion réussie',
        'user' => $user
    ]);
}

/**
 * Gestion de la réinitialisation de mot de passe
 */
function handlePasswordReset($pdo, $input) {
    if (empty($input['email'])) {
        throw new Exception('Adresse email requise');
    }
    
    // Vérifier si l'utilisateur existe
    $stmt = $pdo->prepare("SELECT id, prenom, nom FROM utilisateurs WHERE email = ? AND statut = 'actif'");
    $stmt->execute([$input['email']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        // Pour des raisons de sécurité, ne pas révéler si l'email existe ou non
        echo json_encode([
            'success' => true,
            'message' => 'Si cette adresse email existe dans notre base de données, vous recevrez un email de réinitialisation.'
        ]);
        return;
    }
    
    // Générer un token de réinitialisation
    $resetToken = generateConfirmationToken();
    $expiryDate = date('Y-m-d H:i:s', strtotime('+1 hour'));
    
    // Sauvegarder le token
    $stmt = $pdo->prepare("
        INSERT INTO reset_tokens (user_id, token, expires_at) 
        VALUES (?, ?, ?) 
        ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)
    ");
    $stmt->execute([$user['id'], $resetToken, $expiryDate]);
    
    // Envoyer l'email
    if (sendPasswordResetEmail($input['email'], $resetToken, $user['nom'], $user['prenom'])) {
        echo json_encode([
            'success' => true,
            'message' => 'Un email de réinitialisation a été envoyé à votre adresse.'
        ]);
    } else {
        throw new Exception('Erreur lors de l\'envoi de l\'email');
    }
}

/**
 * Gestion de la confirmation de réinitialisation
 */
function handleConfirmReset($pdo, $input) {
    if (empty($input['token']) || empty($input['new_password'])) {
        throw new Exception('Token et nouveau mot de passe requis');
    }
    
    // Vérifier le token
    $stmt = $pdo->prepare("
        SELECT user_id, expires_at 
        FROM reset_tokens 
        WHERE token = ? AND expires_at > NOW()
    ");
    $stmt->execute([$input['token']]);
    $resetData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$resetData) {
        throw new Exception('Token invalide ou expiré');
    }
    
    // Mettre à jour le mot de passe
    $hashedPassword = hashPassword($input['new_password']);
    $stmt = $pdo->prepare("UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?");
    $stmt->execute([$hashedPassword, $resetData['user_id']]);
    
    // Supprimer le token utilisé
    $stmt = $pdo->prepare("DELETE FROM reset_tokens WHERE token = ?");
    $stmt->execute([$input['token']]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Mot de passe mis à jour avec succès'
    ]);
}

/**
 * Gestion de la confirmation d'email
 */
function handleEmailConfirmation($pdo, $token) {
    if (empty($token)) {
        throw new Exception('Token de confirmation requis');
    }
    
    // Vérifier le token
    $stmt = $pdo->prepare("
        SELECT id, prenom, nom 
        FROM utilisateurs 
        WHERE confirmation_token = ? AND statut = 'en_attente'
    ");
    
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        throw new Exception('Token de confirmation invalide');
    }
    
    // Activer le compte
    $stmt = $pdo->prepare("
        UPDATE utilisateurs 
        SET statut = 'actif', confirmation_token = NULL, date_confirmation = NOW() 
        WHERE id = ?
    ");
    $stmt->execute([$user['id']]);
    
    // Rediriger vers la page de connexion avec un message de succès
    header('Location: /app/index.html?confirmed=1');
    exit();
}

/**
 * Gestion de la validation d'administrateur
 */
function handleValidateAdmin($pdo) {
    // Vérifier si l'utilisateur est connecté et est un administrateur
    if (!isset($_SERVER['HTTP_AUTHORIZATION'])) {
        throw new Exception('Non autorisé. Token de session manquant.');
    }

    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    $stmt = $pdo->prepare("
        SELECT id, role 
        FROM utilisateurs 
        WHERE token_session = ? AND statut = 'actif' AND role = 'administrateur'
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception('Non autorisé. Vous n\'êtes pas un administrateur ou votre session est invalide.');
    }

    echo json_encode([
        'success' => true,
        'message' => 'Vérification de l\'administrateur réussie.'
    ]);
}
?>
