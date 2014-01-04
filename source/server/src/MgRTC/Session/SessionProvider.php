<?php
namespace MgRTC\Session;
use MgRTC\Session\AuthInterface;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

/**
 * This component will allow access to session data from your website for each user connected
 * Symfony HttpFoundation is required for this component to work
 * Your website must also use Symfony HttpFoundation Sessions to read your sites session data
 * If your are not using at least PHP 5.4 you must include a SessionHandlerInterface stub (is included in Symfony HttpFoundation, loaded w/ composer)
 */
class SessionProvider implements MessageComponentInterface {
    /**
     * @var \Ratchet\MessageComponentInterface
     */
    protected $_app;

    /**
     *
     * @var MgRTC\Session\AuthInterface
     */
    protected $_authAdapter;

    /**
     *
     * @var array
     */
    protected $config;

    /**
     * @param \Ratchet\MessageComponentInterface $app
     * @param array $config;
     * @throws \RuntimeException
     */
    public function __construct(MessageComponentInterface $app, array $config) {
        $this->_app     = $app;
        $this->config = $config;
    }

    protected function _createAuthAdapter($room){
        if(isset ($this->config['rooms']) && isset ($this->config['rooms'][$room]) && isset ($this->config['rooms'][$room]['authAdapter'])){
            $authClass = $this->config['rooms'][$room]['authAdapter'];
        }
        else{
            $authClass = $this->config['authAdapter'];
        }
        $this->debug("Creating auth adapter [$authClass] for room [$room]");
        $this->_authAdapter = new $authClass($this->config);
    }

    /**
     * {@inheritdoc}
     */
    function onOpen(ConnectionInterface $conn, $request = null) {
        $conn->Config = $this->config;
        if (isset($conn->WebSocket)) {
            //get room from query string
            $room = (int)$conn->WebSocket->request->getQuery()->get('room');
            if(null == $room){
                $room = 0;
            }
            $conn->Room = $room;
            $this->_createAuthAdapter($room);
            $userInfo = $this->_authAdapter->authUser($conn,$conn->WebSocket->request->getCookies());
            if($userInfo){
                $operators = null;
                if(isset ($this->config['rooms']) && isset ($this->config['rooms'][$room]) && isset ($this->config['rooms'][$room]['operators'])){
                    $operators = $this->config['rooms'][$room]['operators'];
                }
                else if($this->config['operators']){
                    $operators = $this->config['operators'];
                }
                //set if operator
                if(!array_key_exists('operator', $userInfo)){
                    if(!isset($operators)){
                        $userInfo['operator'] = true;
                    }
                    else{
                        $userInfo['operator'] = in_array($userInfo['id'], $operators);
                    }
                }
                $conn->User = $userInfo;
            }
        }

        return $this->_app->onOpen($conn);
    }

    /**
     * {@inheritdoc}
     */
    function onMessage(ConnectionInterface $from, $msg) {
        return $this->_app->onMessage($from, $msg);
    }

    /**
     * {@inheritdoc}
     */
    function onClose(ConnectionInterface $conn) {
        // "close" session for Connection

        return $this->_app->onClose($conn);
    }

    /**
     * {@inheritdoc}
     */
    function onError(ConnectionInterface $conn, \Exception $e) {
        return $this->_app->onError($conn, $e);
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