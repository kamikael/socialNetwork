<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

// Créer la connexion à la base de données
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données: ' . $e->getMessage()]);
    exit();
}

// Récupérer l'action demandée
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'dashboard':
            getDashboard();
            break;
        case 'users':
            getUsers();
            break;
        case 'update_user':
            updateUser();
            break;
        case 'delete_user':
            deleteUser();
            break;
        case 'articles':
            getArticles();
            break;
        case 'delete_article':
            deleteArticle();
            break;
        case 'logs':
            getLogs();
            break;
        case 'stats':
            getStats();
            break;
        case 'add_log':
            addLog();
            break;
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Action non reconnue']);
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

function getDashboard() {
    global $pdo;
    
    // Statistiques générales
    $stats = [];
    
    // Nombre total d'utilisateurs
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM utilisateurs");
    $stats['total_users'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Utilisateurs actifs (connectés dans les 30 derniers jours)
    $stmt = $pdo->query("SELECT COUNT(*) as active FROM utilisateurs WHERE derniere_connexion >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
    $stats['active_users'] = $stmt->fetch(PDO::FETCH_ASSOC)['active'];
    
    // Nombre total d'articles
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM articles");
    $stats['total_articles'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Articles publiés aujourd'hui
    $stmt = $pdo->query("SELECT COUNT(*) as today FROM articles WHERE DATE(date_creation) = CURDATE()");
    $stats['articles_today'] = $stmt->fetch(PDO::FETCH_ASSOC)['today'];
    
    // Nombre total de commentaires
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM commentaires");
    $stats['total_comments'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Nombre total de likes
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM likes");
    $stats['total_likes'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Utilisateurs récents
    $stmt = $pdo->query("
        SELECT id, nom, prenom, email, role, date_inscription, derniere_connexion
        FROM utilisateurs 
        ORDER BY date_inscription DESC 
        LIMIT 10
    ");
    $recent_users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Articles récents
    $stmt = $pdo->query("
        SELECT a.id, a.contenu, a.date_creation, u.nom, u.prenom
        FROM articles a
        JOIN utilisateurs u ON a.user_id = u.id
        ORDER BY a.date_creation DESC 
        LIMIT 10
    ");
    $recent_articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Logs récents (si la table existe)
    try {
        $stmt = $pdo->query("
            SELECT * FROM logs_admin 
            ORDER BY created_at DESC 
            LIMIT 20
        ");
        $recent_logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $recent_logs = [];
    }
    
    echo json_encode([
        'success' => true,
        'stats' => $stats,
        'recent_users' => $recent_users,
        'recent_articles' => $recent_articles,
        'recent_logs' => $recent_logs
    ]);
}

function getUsers() {
    global $pdo;

    // Active le mode exception pour PDO
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Récupération et nettoyage des paramètres GET
    $page   = (int) ($_GET['page']  ?? 1);
    $limit  = (int) ($_GET['limit'] ?? 20);
    $search = trim($_GET['search'] ?? '');
    $role   = trim($_GET['role']   ?? '');

    $offset = ($page - 1) * $limit;

    // Construction dynamique de la clause WHERE
    $where_conditions = [];
    $params            = [];

    if ($search !== '') {
        $where_conditions[] = "(nom   LIKE ? OR 
                                 prenom LIKE ? OR 
                                 email  LIKE ?)";
        $search_param = "%{$search}%";
        $params[] = $search_param;
        $params[] = $search_param;
        $params[] = $search_param;
    }

    if ($role !== '') {
        $where_conditions[] = "role = ?";
        $params[] = $role;
    }

    $where_clause = '';
    if (!empty($where_conditions)) {
        $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);
    }

    try {
        // 1) Compter le total
        $count_sql = "SELECT COUNT(*) AS total
                      FROM utilisateurs
                      $where_clause";
        $stmt = $pdo->prepare($count_sql);
        // Les $params ici sont tous des strings
        foreach ($params as $i => $p) {
            $stmt->bindValue($i + 1, $p, PDO::PARAM_STR);
        }
        $stmt->execute();
        $total = (int) $stmt->fetch(PDO::FETCH_ASSOC)['total'];

        // 2) Récupérer les utilisateurs avec pagination
        $sql = "
            SELECT 
                id, nom, prenom, email, role, photo_profil, 
                date_inscription, derniere_connexion, statut,
                (SELECT COUNT(*) FROM articles    a WHERE a.user_id = u.id) AS articles_count,
                (SELECT COUNT(*) FROM commentaires c WHERE c.user_id = u.id) AS comments_count
            FROM utilisateurs u
            $where_clause
            ORDER BY date_inscription DESC
            LIMIT ? OFFSET ?
        ";

        $stmt = $pdo->prepare($sql);

        // Lier d’abord les critères de recherche/role (tous en string)
        $idx = 1;
        foreach ($params as $p) {
            $stmt->bindValue($idx++, $p, PDO::PARAM_STR);
        }
        // Puis limiter et décaler (int obligatoire)
        $stmt->bindValue($idx++, $limit,  PDO::PARAM_INT);
        $stmt->bindValue($idx++, $offset, PDO::PARAM_INT);

        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    } catch (PDOException $e) {
        // En cas d’erreur, on renvoie un JSON d’erreur
        echo json_encode([
            'success' => false,
            'error'   => $e->getMessage(),
        ]);
        exit;
    }

    // Envoi de la réponse JSON
    echo json_encode([
        'success'     => true,
        'users'       => $users,
        'total'       => $total,
        'page'        => $page,
        'limit'       => $limit,
        'total_pages' => ceil($total / $limit),
    ]);
}


function updateUser() {
    global $pdo;
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $data['user_id'] ?? null;
    $nom = trim($data['nom'] ?? '');
    $prenom = trim($data['prenom'] ?? '');
    $email = trim($data['email'] ?? '');
    $role = $data['role'] ?? 'user';
    
    if (!$user_id || empty($nom) || empty($prenom) || empty($email)) {
        http_response_code(400);
        echo json_encode(['error' => 'Tous les champs sont requis']);
        return;
    }
    
    // Vérifier que l'email n'est pas déjà utilisé par un autre utilisateur
    $stmt = $pdo->prepare("SELECT id FROM utilisateurs WHERE email = ? AND id != ?");
    $stmt->execute([$email, $user_id]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'Cet email est déjà utilisé']);
        return;
    }
    
    // Mettre à jour l'utilisateur
    $stmt = $pdo->prepare("
        UPDATE utilisateurs 
        SET nom = ?, prenom = ?, email = ?, role = ?
        WHERE id = ?
    ");
    $stmt->execute([$nom, $prenom, $email, $role, $user_id]);
    
    // Ajouter un log
    addLog('user_update', "Mise à jour de l'utilisateur ID: $user_id");
    
    echo json_encode(['success' => true]);
}

function deleteUser() {
    global $pdo;
    
    $user_id = $_GET['user_id'] ?? null;
    
    if (!$user_id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID utilisateur requis']);
        return;
    }
    
    // Vérifier que l'utilisateur existe
    $stmt = $pdo->prepare("SELECT nom, prenom FROM utilisateurs WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'Utilisateur non trouvé']);
        return;
    }
    
    // Supprimer les données associées (en cascade)
    $pdo->beginTransaction();
    
    try {
        // Supprimer les likes
        $stmt = $pdo->prepare("DELETE FROM likes WHERE user_id = ?");
        $stmt->execute([$user_id]);
        
        // Supprimer les commentaires
        $stmt = $pdo->prepare("DELETE FROM commentaires WHERE user_id = ?");
        $stmt->execute([$user_id]);
        
        // Supprimer les articles
        $stmt = $pdo->prepare("DELETE FROM articles WHERE user_id = ?");
        $stmt->execute([$user_id]);
        
        // Supprimer les amitiés
        $stmt = $pdo->prepare("DELETE FROM friends WHERE user1_id = ? OR user2_id = ?");
        $stmt->execute([$user_id, $user_id]);
        
        // Supprimer les invitations d'amis
        $stmt = $pdo->prepare("DELETE FROM friend_invitations WHERE from_user_id = ? OR to_user_id = ?");
        $stmt->execute([$user_id, $user_id]);
        
        // Supprimer les messages
        $stmt = $pdo->prepare("DELETE FROM messages WHERE user_id = ?");
        $stmt->execute([$user_id]);
        
        // Supprimer les conversations
        $stmt = $pdo->prepare("DELETE FROM conversations WHERE user1_id = ? OR user2_id = ?");
        $stmt->execute([$user_id, $user_id]);
        
        // Supprimer les tokens de reset
        $stmt = $pdo->prepare("DELETE FROM reset_tokens WHERE user_id = ?");
        $stmt->execute([$user_id]);
        
        // Supprimer l'utilisateur
        $stmt = $pdo->prepare("DELETE FROM utilisateurs WHERE id = ?");
        $stmt->execute([$user_id]);
        
        $pdo->commit();
        
        // Ajouter un log
        addLog('user_delete', "Suppression de l'utilisateur: {$user['prenom']} {$user['nom']} (ID: $user_id)");
        
        echo json_encode(['success' => true]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
      echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    }
}

function getArticles() {
    global $pdo;

    // Active les erreurs PDO pour mieux déboguer
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $page   = (int)($_GET['page'] ?? 1);
    $limit  = (int)($_GET['limit'] ?? 20);
    $search = trim($_GET['search'] ?? '');

    $offset = ($page - 1) * $limit;

    $where_conditions = [];
    $params = [];

    if ($search !== '') {
        $where_conditions[] = "(a.titre LIKE ? OR a.contenu LIKE ?)";
        $search_param = "%{$search}%";
        $params[] = $search_param;
        $params[] = $search_param;
    }

    $where_clause = !empty($where_conditions) 
        ? 'WHERE ' . implode(' AND ', $where_conditions)
        : '';

    try {
        // 1. Compter le total
        $count_sql = "SELECT COUNT(*) as total FROM articles a $where_clause";
        $stmt = $pdo->prepare($count_sql);

        foreach ($params as $i => $param) {
            $stmt->bindValue($i + 1, $param, PDO::PARAM_STR);
        }

        $stmt->execute();
        $total = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];

        // 2. Récupérer les articles avec leurs infos
        $sql = "
            SELECT 
                a.id, a.titre, a.contenu, a.date_creation,
                u.id AS user_id, u.nom, u.prenom, u.photo_profil,
                (SELECT COUNT(*) FROM likes l WHERE l.article_id = a.id) AS likes_count,
                (SELECT COUNT(*) FROM commentaires c WHERE c.article_id = a.id) AS comments_count
            FROM articles a
            JOIN utilisateurs u ON a.user_id = u.id
            $where_clause
            ORDER BY a.date_creation DESC
            LIMIT ? OFFSET ?
        ";

        $stmt = $pdo->prepare($sql);

        // Liaison des paramètres pour search
        $i = 1;
        foreach ($params as $param) {
            $stmt->bindValue($i++, $param, PDO::PARAM_STR);
        }

        // Liaison des paramètres pour limit et offset
        $stmt->bindValue($i++, $limit,  PDO::PARAM_INT);
        $stmt->bindValue($i++, $offset, PDO::PARAM_INT);

        $stmt->execute();
        $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Réponse JSON
        echo json_encode([
            'success'      => true,
            'articles'     => $articles,
            'total'        => $total,
            'page'         => $page,
            'limit'        => $limit,
            'total_pages'  => ceil($total / $limit),
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'error'   => $e->getMessage(),
        ]);
        exit;
    }
}


function deleteArticle() {
    global $pdo;
    
    $article_id = $_GET['article_id'] ?? null;
    
    if (!$article_id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID article requis']);
        return;
    }
    
    // Vérifier que l'article existe
    $stmt = $pdo->prepare("SELECT titre, user_id FROM articles WHERE id = ?");
    $stmt->execute([$article_id]);
    $article = $stmt->fetch();
    
    if (!$article) {
        http_response_code(404);
        echo json_encode(['error' => 'Article non trouvé']);
        return;
    }
    
    // Supprimer les données associées
    $pdo->beginTransaction();
    
    try {
        // Supprimer les likes
        $stmt = $pdo->prepare("DELETE FROM likes WHERE article_id = ?");
        $stmt->execute([$article_id]);
        
        // Supprimer les commentaires
        $stmt = $pdo->prepare("DELETE FROM comments WHERE article_id = ?");
        $stmt->execute([$article_id]);
        
        // Supprimer l'article
        $stmt = $pdo->prepare("DELETE FROM articles WHERE id = ?");
        $stmt->execute([$article_id]);
        
        $pdo->commit();
        
        // Ajouter un log
        addLog('article_delete', "Suppression de l'article: {$article['titre']} (ID: $article_id)");
        
        echo json_encode(['success' => true]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function getLogs() {
    global $pdo;

    // Active les erreurs PDO
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Sécurisation des entrées
    $page   = (int)($_GET['page'] ?? 1);
    $limit  = (int)($_GET['limit'] ?? 50);
    $action = trim($_GET['action'] ?? '');

    $offset = ($page - 1) * $limit;

    $where_conditions = [];
    $params = [];

    if ($action !== '') {
        $where_conditions[] = "action = ?";
        $params[] = $action;
    }

    $where_clause = !empty($where_conditions) 
        ? 'WHERE ' . implode(' AND ', $where_conditions)
        : '';

    try {
        // 1. Compter le total
        $count_sql = "SELECT COUNT(*) AS total FROM admin_logs $where_clause";
        $stmt = $pdo->prepare($count_sql);

        // Lier les paramètres de filtre
        foreach ($params as $i => $param) {
            $stmt->bindValue($i + 1, $param, PDO::PARAM_STR);
        }

        $stmt->execute();
        $total = (int) $stmt->fetch(PDO::FETCH_ASSOC)['total'];

        // 2. Récupérer les logs avec pagination
        $sql = "
            SELECT * 
            FROM logs_admin 
            $where_clause
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        ";

        $stmt = $pdo->prepare($sql);

        // Lier les mêmes paramètres qu'au-dessus
        $i = 1;
        foreach ($params as $param) {
            $stmt->bindValue($i++, $param, PDO::PARAM_STR);
        }

        // Lier LIMIT et OFFSET
        $stmt->bindValue($i++, $limit,  PDO::PARAM_INT);
        $stmt->bindValue($i++, $offset, PDO::PARAM_INT);

        $stmt->execute();
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Réponse JSON
        echo json_encode([
            'success'     => true,
            'logs'        => $logs,
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => ceil($total / $limit),
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'error'   => $e->getMessage(),
        ]);
        exit;
    }
}


function getStats() {
    global $pdo;
    
    // Statistiques par jour (30 derniers jours)
    $stmt = $pdo->query("
        SELECT 
            DATE(date_inscription) as date,
            COUNT(*) as count
        FROM utilisateurs 
        WHERE date_inscription >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(date_inscription)
        ORDER BY date
    ");
    $users_by_day = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Articles par jour
    $stmt = $pdo->query("
       SELECT 
        DATE(date_creation) as date,
                COUNT(*) as count
            FROM articles 
            WHERE date_creation >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(date_creation)
            ORDER BY date
    ");
    $articles_by_day = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Top utilisateurs par articles
    $stmt = $pdo->query("
        SELECT 
            u.nom, u.prenom,
            COUNT(a.id) as articles_count
        FROM utilisateurs u
        LEFT JOIN articles a ON u.id = a.user_id
        GROUP BY u.id
        ORDER BY articles_count DESC
        LIMIT 10
    ");
    $top_users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Top articles par likes
    $stmt = $pdo->query("
        SELECT 
            a.contenu,
            u.nom, u.prenom,
            COUNT(l.id) as likes_count
        FROM articles a
        JOIN utilisateurs u ON a.user_id = u.id
        LEFT JOIN likes l ON a.id = l.article_id
        GROUP BY a.id
        ORDER BY likes_count DESC
        LIMIT 10
    ");
    $top_articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Répartition des rôles
    $stmt = $pdo->query("
        SELECT 
            role,
            COUNT(*) as count
        FROM utilisateurs 
        GROUP BY role
    ");
    $roles_distribution = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'users_by_day' => $users_by_day,
        'articles_by_day' => $articles_by_day,
        'top_users' => $top_users,
        'top_articles' => $top_articles,
        'roles_distribution' => $roles_distribution
    ]);
}

function addLog($action, $description) {
    global $pdo;
    
    try {
        // Vérifier si la table logs_admin existe
        $stmt = $pdo->query("SHOW TABLES LIKE 'logs_admin'");
        if ($stmt->rowCount() == 0) {
            // Table n'existe pas, on ignore le log
            return;
        }
        
        $admin_id = $_GET['admin_id'] ?? 1; // ID de l'admin connecté
        
        $stmt = $pdo->prepare("
            INSERT INTO logs_admin (user_id, action, description, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $admin_id, 
            $action, 
            $description,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ]);
    } catch (Exception $e) {
        // En cas d'erreur, on ignore le log pour ne pas bloquer l'opération
        error_log("Erreur lors de l'ajout du log: " . $e->getMessage());
    }
}
?>
