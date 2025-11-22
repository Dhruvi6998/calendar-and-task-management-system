<?php

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'calendar_tasks');
define('DB_CHARSET', 'utf8mb4');

date_default_timezone_set('UTC');

error_reporting(E_ALL);
ini_set('display_errors', 1);

function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST .
               ";dbname=" . DB_NAME .
               ";charset=" . DB_CHARSET;

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5
        ];

        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;

    } catch(PDOException $e) {
        error_log("Database Connection Error: " . $e->getMessage());
        http_response_code(500);
        die(json_encode([
            'success' => false,
            'message' => 'Database connection failed. Please try again later.',
            'error' => $e->getMessage()
        ]));
    }
}

function executeQuery($pdo, $sql, $params = []) {
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    } catch(PDOException $e) {
        error_log("Query Error: " . $e->getMessage());
        return [];
    }
}

function executeUpdate($pdo, $sql, $params = []) {
    try {
        $stmt = $pdo->prepare($sql);
        return $stmt->execute($params);
    } catch(PDOException $e) {
        error_log("Update Error: " . $e->getMessage());
        return false;
    }
}

function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }

    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');

    return $data;
}

function validateDate($date, $format = 'Y-m-d') {
    $d = DateTime::createFromFormat($format, $date);
    return $d && $d->format($format) === $date;
}

?>
