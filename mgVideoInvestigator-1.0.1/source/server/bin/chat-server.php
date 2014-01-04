<?php
/**
 * @author Magnoliyan
 * @version 1.0.3
 *
 */

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use MgRTC\Chat;

require dirname(__DIR__) . '/vendor/autoload.php';
require __DIR__ . '/config.php';

$server = IoServer::factory(
    new HttpServer(new WsServer(new Chat($config))), $config['port']
);

echo "\nMagnoliyan Video Chat server Investigator running...\n";
$server->run();