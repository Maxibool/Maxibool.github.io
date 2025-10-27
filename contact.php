<?php
/**
 * Contact Form Handler
 * Handles form submissions with validation, email sending, and data storage
 */

// Load configuration
$config = require_once 'config.php';

// ============================================
// HEADERS & CORS
// ============================================
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(405, false, 'Méthode non autorisée');
}

// ============================================
// GET & PARSE DATA
// ============================================
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !is_array($input)) {
    sendJsonResponse(400, false, 'Aucune donnée reçue ou format invalide');
}

// ============================================
// SANITIZE INPUT
// ============================================
$name = trim(htmlspecialchars($input['name'] ?? '', ENT_QUOTES, 'UTF-8'));
$email = trim(filter_var($input['email'] ?? '', FILTER_SANITIZE_EMAIL));
$phone = trim(htmlspecialchars($input['phone'] ?? '', ENT_QUOTES, 'UTF-8'));
$message = trim(htmlspecialchars($input['message'] ?? '', ENT_QUOTES, 'UTF-8'));

// ============================================
// VALIDATE
// ============================================
$validation = $config['validation'];

// Required fields
if (empty($name) && $validation['name']['required']) {
    sendJsonResponse(400, false, 'Le nom est obligatoire');
}
if (empty($email) && $validation['email']['required']) {
    sendJsonResponse(400, false, "L'email est obligatoire");
}
if (empty($message) && $validation['message']['required']) {
    sendJsonResponse(400, false, 'Le message est obligatoire');
}

// Name length
if (strlen($name) < $validation['name']['min_length']) {
    sendJsonResponse(400, false, 'Le nom doit contenir au moins ' . $validation['name']['min_length'] . ' caractères');
}
if (strlen($name) > $validation['name']['max_length']) {
    sendJsonResponse(400, false, 'Le nom ne peut pas dépasser ' . $validation['name']['max_length'] . ' caractères');
}

// Message length
if (strlen($message) < $validation['message']['min_length']) {
    sendJsonResponse(400, false, 'Le message doit contenir au moins ' . $validation['message']['min_length'] . ' caractères');
}
if (strlen($message) > $validation['message']['max_length']) {
    sendJsonResponse(400, false, 'Le message ne peut pas dépasser ' . $validation['message']['max_length'] . ' caractères');
}

// Email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendJsonResponse(400, false, 'Adresse email invalide');
}

// Phone format (optional)
if (!empty($phone) && !preg_match($validation['phone']['pattern'], $phone)) {
    sendJsonResponse(400, false, 'Format de téléphone invalide');
}

// ============================================
// PREPARE DATA
// ============================================
$contact_data = [
    'name' => $name,
    'email' => $email,
    'phone' => $phone,
    'message' => $message,
    'timestamp' => date('Y-m-d H:i:s'),
    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
];

// ============================================
// PROCESS
// ============================================
try {
    // Save to file
    $save_result = false;
    if ($config['storage']['enabled']) {
        $save_result = saveContactToFile($contact_data, $config);
    }
    
    // Send emails
    $admin_email_sent = sendEmailToAdmin($contact_data, $config);
    $user_email_sent = sendConfirmationEmail($email, $name, $config);
    
    // Response
    $response = [
        'success' => true,
        'message' => $config['messages']['success'],
        'data_saved' => $save_result,
        'admin_email_sent' => $admin_email_sent,
        'user_email_sent' => $user_email_sent,
        'mail_method' => $config['email']['method']
    ];
    
    if ($config['debug']) {
        $response['debug'] = $contact_data;
    }
    
    sendJsonResponse(200, true, $response['message'], $response);
    
} catch (Exception $e) {
    error_log('Contact form error: ' . $e->getMessage());
    
    $error_response = ['success' => false, 'message' => $config['messages']['error_generic']];
    if ($config['debug']) {
        $error_response['debug'] = $e->getMessage();
    }
    
    sendJsonResponse(500, false, $error_response['message'], $error_response);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function sendJsonResponse($code, $success, $message, $extra = []) {
    http_response_code($code);
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit();
}

function saveContactToFile($data, $config) {
    $file_path = $config['storage']['file_path'];
    $max_size = $config['storage']['max_file_size'];
    
    // Ensure data directory exists
    $dir = dirname($file_path);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    $contacts = [];
    
    if (file_exists($file_path)) {
        if (filesize($file_path) > $max_size) {
            throw new Exception('Fichier trop volumineux');
        }
        
        $existing = file_get_contents($file_path);
        $contacts = json_decode($existing, true) ?: [];
    }
    
    $contacts[] = $data;
    $json = json_encode($contacts, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    if (file_put_contents($file_path, $json, LOCK_EX) === false) {
        throw new Exception('Impossible d\'écrire le fichier');
    }
    
    return true;
}

function sendUniversalEmail($to, $subject, $body, $from_email, $from_name, $config) {
    if ($config['email']['method'] === 'smtp') {
        return sendEmailViaSMTP($to, $subject, $body, $from_email, $from_name, $config);
    }
    return sendEmailViaBuiltInMail($to, $subject, $body, $from_email, $from_name);
}

function sendEmailViaSMTP($to, $subject, $body, $from_email, $from_name, $config) {
    if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        require_once 'PHPMailer/Exception.php';
        require_once 'PHPMailer/PHPMailer.php';
        require_once 'PHPMailer/SMTP.php';
    }
    
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $smtp = $config['email']['smtp'];
    
    try {
        $mail->isSMTP();
        $mail->Host = $smtp['host'];
        $mail->Port = $smtp['port'];
        $mail->SMTPAuth = !empty($smtp['username']);
        $mail->CharSet = $smtp['charset'];
        $mail->SMTPDebug = 0;
        
        if ($mail->SMTPAuth) {
            $mail->Username = $smtp['username'];
            $mail->Password = $smtp['password'];
        }
        
        if ($smtp['secure']) {
            $mail->SMTPSecure = $smtp['secure'];
        }
        
        $mail->setFrom($from_email, $from_name);
        $mail->addAddress($to);
        $mail->addReplyTo($from_email, $from_name);
        
        $mail->isHTML(false);
        $mail->Subject = $subject;
        $mail->Body = $body;
        
        return $mail->send();
        
    } catch (Exception $e) {
        if ($config['debug']) {
            error_log("SMTP Error: " . $e->getMessage());
        }
        return false;
    }
}

function sendEmailViaBuiltInMail($to, $subject, $body, $from_email, $from_name) {
    $headers = [
        'From: ' . $from_name . ' <' . $from_email . '>',
        'Reply-To: ' . $from_email,
        'X-Mailer: PHP/' . phpversion(),
        'Content-Type: text/plain; charset=utf-8'
    ];
    
    return @mail($to, $subject, $body, implode("\r\n", $headers));
}

function sendEmailToAdmin($data, $config) {
    // Prepare the data for replacement
    $phone_display = $data['phone'] ?: 'Non fourni';

    $body = str_replace(
        [
            '{name}',
            '{email}', 
            '{phone}',
            '{message}',
            '{timestamp}',
            '{ip}',
            '{user_agent}'
        ],
        [
            $data['name'],
            $data['email'],
            $phone_display,
            $data['message'],
            $data['timestamp'],
            $data['ip'],
            $data['user_agent']
        ],
        $config['email']['admin_body']
    );
    
    return sendUniversalEmail(
        $config['admin_email'],
        $config['email']['admin_subject'],
        $body,
        $data['email'],
        $data['name'],
        $config
    );
}

function sendConfirmationEmail($user_email, $user_name, $config) {
    $body = str_replace(
        ['{user_name}', '{site_name}', '{site_location}'],
        [$user_name, $config['site_name'], $config['site_location']],
        $config['email']['user_body']
    );
    
    // FIX: Use configured domain instead of localhost
    $from_email = 'noreply@' . $config['site_domain'];
    
    return sendUniversalEmail(
        $user_email,
        $config['email']['user_subject'],
        $body,
        $from_email,
        $config['site_name'],
        $config
    );
}
?>