<?php
/**
 * Configuration API Endpoint
 * Provides validation rules to the frontend
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: max-age=3600'); // Cache for 1 hour

// Load config
$config = require_once 'config.php';

// Only expose safe client-side configuration
$client_config = [
    'validation' => $config['validation'],
    'messages' => $config['messages']
];

echo json_encode($client_config);
?>