<?php

namespace MgRTC;

use Ratchet\Server\IoServer;
use React\Socket\Server as Reactor;
use React\Socket\ServerInterface;
use React\EventLoop\LoopInterface;
use React\EventLoop\Factory as LoopFactory;
use Ratchet\MessageComponentInterface;

class Server extends IoServer {
    /**
     *
     * @var React\Socket\Server
     */
    public $socket = null;

    /**
     * @param \Ratchet\MessageComponentInterface  $app      The Ratchet application stack to host
     * @param \React\Socket\ServerInterface       $socket   The React socket server to run the Ratchet application off of
     * @param \React\EventLoop\LoopInterface|null $loop     The React looper to run the Ratchet application off of
     */
    public function __construct(MessageComponentInterface $app, ServerInterface $socket, LoopInterface $loop = null) {
        parent::__construct($app, $socket, $loop);
        $this->socket = $socket;
    }


}