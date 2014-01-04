<?php

namespace MgRTC;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class Chat implements MessageComponentInterface {

    /**
     * Assoc array of clients resourceId: {connection: , desc: }
     * 
     * @var array
     */
    protected $clients;

    /**
     *
     * @var array
     */
    protected $config;

    /**
     * Constructor
     */
    public function __construct(array $config) {
        $this->clients = array();
        $this->config = $config;
    }

    /**
     * New Connection opened
     * 
     * @param ConnectionInterface $conn
     * @param mixed $request
     */
    public function onOpen(ConnectionInterface $conn, $request = null) {        
        $this->debug("New anonim connection! ({$conn->resourceId}) in room ({$conn->Room})");
    }

    /**
     * add connection when logged in
     * 
     * @param ConnectionInterface $conn
     * @param array $userDesc
     */
    protected function _addConnection(ConnectionInterface $conn, $userDesc){
        // Store the new connection to send messages to later
        $this->clients[$conn->Room][$conn->resourceId] = array(
            'connection'    => $conn,
            'desc'          => $userDesc
        );
        $this->debug("New logged connection! ({$conn->resourceId}) in room ({$conn->Room})");
        $this->debug($userDesc);
    }

    /**
     * Broadcast message for all but sender
     * 
     * @param string|array $msg
     * @param ConnectionInterface $from
     */
    public function broadcast($msg, ConnectionInterface $from) {
        //no room created
        if(!isset ($this->clients[$from->Room])){
            return false;
        }
        if(is_array($msg)){
            $msg = json_encode($msg);
        }
        $currDesc = $this->clients[$from->Room][$from->resourceId]['desc'];
        // broadcast message to all connected clients
        foreach ($this->clients[$from->Room] as $client) {
            //not to sender
            if ($from !== $client['connection'] && ($currDesc['data']['userData']['operator'] || $client['desc']['data']['userData']['operator'])) {
                $this->send($msg, $client['connection']);
            }
        }
    }

    /**
     * Send a message to a connection
     * 
     * @param string $msg
     * @param ConnectionInterface $to
     */
    protected function send($msg, ConnectionInterface $to){
       if(is_array($msg)){
            $msg = json_encode($msg);
       }
       $to->send($msg);
    }

    /**
     * Get client in a room by user id
     * 
     * @param mixed $userId
     * @param int $room
     * @return array|false
     */
    protected function findClient($userId, $room){
        //no room created
        if(!isset ($this->clients[$room])){
            return false;
        }
        foreach ($this->clients[$room] as $client) {
            if ($client['desc']['data']['userData']['id'] == $userId) {
                return $client;
            }
        }
    }

    /**
     * New message received
     * 
     * @param ConnectionInterface $from
     * @param string $message
     * @return mixed
     */
    public function onMessage(ConnectionInterface $from, $message) {
        $msg = json_decode($message, TRUE);
        //messages: login, call_invite, call_accept, sdp_offer, sdp_answer, ice_candidate
        switch($msg['type']){
            //login client
            case "login":
                if(!isset ($from->User)){
                    return FALSE;
                }
                //check for duplicates
                if(isset($this->config['allowDuplicates']) && $this->config['allowDuplicates'] === false && 
                        $this->findClient($from->User['id'], $from->Room)){
                    //if same ID found get out
                    $this->debug("Duplicate attemp in room {$from->Room} for user id {$from->User['id']}");
                    return FALSE;
                }
                $userDesc = array(
                    'data'  => array(
                        'userData'  => $from->User
                    )
                );
                //add connection
                $this->_addConnection($from, $userDesc);
                //send connection id and data
                $this->send(array(
                    "type"  => "connectionId",
                    "data"  => array(
                        "connectionId"  => $from->resourceId,
                        "data"          => $userDesc
                    )
                ),$from);

                $isOperator = $from->User['operator'];
                
                //prepare and send all existing connections to new peer
                $peerConnections = array();
                foreach ($this->clients[$from->Room] as $resourceId  => $client) {
                    //only if operator or peer is operator
                    if ($from !== $client['connection'] && ($isOperator || $client['desc']['data']['userData']['operator'])) {
                        $peerConnections[$resourceId] = $client['desc'];
                    }
                }
                $this->send(array(
                    "type"    => 'connections',
                    "data"    => $peerConnections
                ),$from);
                
                //inform old peers about new connection
                $this->broadcast(array(
                    "type"    => 'connection_add',
                    "data"    => array(
                        "connectionId"  => $from->resourceId,
                        "data"          => $userDesc

                    )
                ), $from);
                break;
            case "call_invite":
            case "call_accept":
            case "call_drop":
            case "call_busy":
            case "sdp_offer":
            case "sdp_answer":
            case "ice_candidate":
            case "chat_message":
                //check if logged in
                if(!isset ($this->clients[$from->Room][$from->resourceId]) || !isset ($this->clients[$from->Room][$from->resourceId]['desc'])){
                    return FALSE;
                }
                $peerConnectionId = $msg['data']['connectionId'];
                //find recepient
                if(!isset ($this->clients[$from->Room][$peerConnectionId]) || !isset ($this->clients[$from->Room][$peerConnectionId]['desc'])){
                    return FALSE;
                }
                //set caller id
                $msg['data']['connectionId'] = $from->resourceId;
                $this->send($msg, $this->clients[$from->Room][$peerConnectionId]['connection']);
                break;
        }
    }

    /**
     * Closing connection
     * 
     * @param ConnectionInterface $conn
     */
    public function onClose(ConnectionInterface $conn) {
        if(!isset($conn->Room) || !isset ($this->clients[$conn->Room]) || !isset($this->clients[$conn->Room][$conn->resourceId])){
            return;
        }
        $this->debug("Connection {$conn->resourceId} from room {$conn->Room} has disconnected");
        $this->debug($this->clients[$conn->Room][$conn->resourceId]['desc']);
        //inform about closed connection
        $this->broadcast(array(
            "type"  => "connection_remove",
            "data"  => array(
                "connectionId"  => $conn->resourceId
            )
        ),$conn);

        // The connection is closed, remove it, as we can no longer send it messages
        unset ($this->clients[$conn->Room][$conn->resourceId]);
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