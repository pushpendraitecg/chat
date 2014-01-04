<?php

namespace MgRTC;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class Chat implements MessageComponentInterface {

    /**
     *
     * @var array
     */
    protected $config;

    /**
     * Constructor
     */
    public function __construct(array $config) {
        $this->config = $config;
    }

    public function onOpen(ConnectionInterface $conn, $request = null) {
    }

    public function onMessage(ConnectionInterface $from, $msg) {
    }

    public function onClose(ConnectionInterface $conn) {
    }

    /**
     * Close on error
     * 
     * @param ConnectionInterface $conn
     * @param \Exception $e
     */
    public function onError(ConnectionInterface $conn, \Exception $e) {
        $this->debug("An error has occurred: {$e->getMessage()}");
        $conn->close();
    }

    /**
     * Var dump obj
     * 
     * @param mixed $obj
     */
    public function debug($obj){
        if(!isset ($this->config['debug']) || !$this->config['debug']){
            return;
        }
        if(is_scalar($obj)){
            echo "$obj\n";
        }
        else{
            print_r($obj);
        }
    }

}