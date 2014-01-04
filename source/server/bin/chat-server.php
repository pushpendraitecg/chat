<?php
/**
 * @author Magnoliyan
 * @version 1.0.3
 *
 */

use Ratchet\Server\IoServer;
use Ratchet\Server\IpBlackList;
use Ratchet\Http\HttpServer;
use Ratchet\Http\OriginCheck;
use Ratchet\WebSocket\WsServer;
use MgRTC\Chat;
use MgRTC\Daemon;
use MgRTC\Session\SessionProvider;
use MgRTC\Session\AuthFacebook;

require dirname(__DIR__) . '/vendor/autoload.php';
require __DIR__ . '/config.php';

/**
 * Create WS server
 * 
 * @global Ratchet\Server\IoServer $server
 * @global array $config
 */
function createServer(){
    global $server, $config;

    $app = new Chat($config);
    //ip blacklist
    if(isset ($config['IpBlackList']) && is_array($config['IpBlackList'])){
        $app = new IpBlackList($app);
        foreach ($config['IpBlackList'] as $ipBlackList) {
            $app->blockAddress($ipBlackList);
        }
    }
    //session
    $session = new SessionProvider($app, $config);
    //websocket
    $wsServer = new WsServer($session);
    //limit origins
    if(isset ($config['allowedOrigins']) && is_array($config['allowedOrigins'])){
        $wsServer = new OriginCheck($wsServer, $config['allowedOrigins']);
    }

    $server = MgRTC\Server::factory(new HttpServer($wsServer), $config['port']);
}

/**
 * Start server
 * 
 * @global Ratchet\Server\IoServer $server
 */
function onRun(){
    global $server;

    createServer();
    $server->run();
}

/**
 * Stop server
 * 
 * @global Ratchet\Server\IoServer $server
 */
function onStop(){
    global $server;
    try {
        $server->socket->shutdown();
    }catch (Exception $exc) {
        //echo $exc->getMessage();
    }
    $server->loop->stop();

}

//get command
$command = isset ($argv[1])? $argv[1] : 'execute';

//Deamon igniter
Daemon::getInstance()->run(array(
    'daemon_name'   => 'mg-chat-server',
    'run'           => 'onRun',
    'stop'          => 'onStop',
    'pid_file'      => __DIR__ . '/mg-chat-server.pid'
),$command);