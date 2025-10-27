<?php
/**
 * Configuration File
 * Centralized configuration for the sophrologie website
 */

// Auto-detect environment
$is_local = in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1', '::1']);

return [
    // ============================================
    // SITE INFORMATION
    // ============================================
    'site_name' => 'Cabinet de Sophrologie',
    'site_domain' => 'sophrologie.fr',
    'site_location' => 'Palaiseau, Île-de-France',
    
    // ============================================
    // CONTACT INFORMATION
    // ============================================
    'admin_email' => 'maxime.millotte@gmail.com',
    'admin_phone' => '06 XX XX XX XX',
    'contact_email' => 'contact@sophrologie.fr',
    
    // ============================================
    // EMAIL CONFIGURATION
    // ============================================
    'email' => [
        // Email sending method
        'method' => $is_local ? 'smtp' : 'builtin_mail',
        
        // Email subjects
        'admin_subject' => 'Nouveau message de contact - Sophrologie',
        'user_subject' => 'Confirmation de réception - Cabinet de Sophrologie',
        
        // Body
        // Admin notification email template
        'admin_body' => <<<ADMIN_TEMPLATE
        Nouveau message de contact reçu via le site Sophrologie:

        Nom: {name}
        Email: {email}
        Téléphone: {phone}

        Message:
        {message}

        ---
        Envoyé le: {timestamp}
        IP: {ip}
        User Agent: {user_agent}
        ADMIN_TEMPLATE,
        // Client confirmation email template
        'user_body' => <<<CLIENT_TEMPLATE
        Bonjour {user_name},

        Nous avons bien reçu votre message et vous en remercions.
        Nous vous recontacterons dans les plus brefs délais.

        Cordialement,
        Votre Sophrologue

        ---
        {site_name}
        {site_location}
        CLIENT_TEMPLATE,

        // SMTP settings (for local development with Mailpit)
        'smtp' => [
            'host' => 'localhost',
            'port' => 1025,
            'username' => '',
            'password' => '',
            'secure' => false, // false, 'tls', or 'ssl'
            'charset' => 'UTF-8'
        ]
    ],
    
    // ============================================
    // FORM VALIDATION RULES
    // ============================================
    'validation' => [
        'name' => [
            'min_length' => 2,
            'max_length' => 100,
            'required' => true
        ],
        'email' => [
            'required' => true
        ],
        'message' => [
            'min_length' => 10,
            'max_length' => 2000,
            'required' => true
        ],
        'phone' => [
            'pattern' => '/^[0-9\s\-\+\(\)\.]{10,20}$/',
            'required' => false
        ]
    ],
    
    // ============================================
    // FILE STORAGE
    // ============================================
    'storage' => [
        'enabled' => true,
        'file_path' => 'data/contacts.json',
        'max_file_size' => 10485760 // 10MB
    ],
    
    // ============================================
    // DEBUG & LOGGING
    // ============================================
    'debug' => $is_local,
    
    // ============================================
    // RESPONSE MESSAGES
    // ============================================
    'messages' => [
        'success' => 'Votre message a été envoyé avec succès! Je vous recontacterai dans les plus brefs délais.',
        'error_generic' => 'Erreur lors de l\'envoi du message. Veuillez réessayer.',
        'error_validation' => 'Veuillez corriger les erreurs dans le formulaire'
    ]
];
?>