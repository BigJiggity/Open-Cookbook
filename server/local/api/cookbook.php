<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$host = getenv('DB_HOST') ?: '127.0.0.1';
$database = getenv('DB_NAME') ?: 'open_cookbook';
$user = getenv('DB_USER') ?: 'open_cookbook';
$password = getenv('DB_PASSWORD') ?: 'open_cookbook';
$documentId = getenv('COOKBOOK_DOCUMENT_ID') ?: 'default';

try {
    $pdo = new PDO(
        "mysql:host={$host};dbname={$database};charset=utf8mb4",
        $user,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['message' => 'Database connection failed.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $statement = $pdo->prepare('SELECT document_json FROM cookbook_documents WHERE document_id = ?');
    $statement->execute([$documentId]);
    $row = $statement->fetch();
    echo $row ? $row['document_json'] : json_encode(['selectedRecipeId' => '', 'recipes' => []]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $rawBody = file_get_contents('php://input');
    $payload = json_decode($rawBody, true);
    if (!is_array($payload) || !array_key_exists('recipes', $payload) || !is_array($payload['recipes'])) {
        http_response_code(400);
        echo json_encode(['message' => 'Invalid cookbook payload.']);
        exit;
    }

    $documentJson = json_encode([
        'selectedRecipeId' => $payload['selectedRecipeId'] ?? '',
        'recipes' => $payload['recipes'],
    ], JSON_UNESCAPED_SLASHES);

    $statement = $pdo->prepare(
        'INSERT INTO cookbook_documents (document_id, document_json, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE document_json = VALUES(document_json), updated_at = CURRENT_TIMESTAMP'
    );
    $statement->execute([$documentId, $documentJson]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['message' => 'Method not allowed.']);
