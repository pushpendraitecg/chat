<?php

namespace MgRTC\Session;

use MgRTC\Session\AuthInterface;
use Ratchet\ConnectionInterface;

class AuthSimple extends AuthBase implements AuthInterface {

    /**
     * Find user
     * 
     * @param array $config
     * @param string $username
     * @param string $password
     * @return array|null
     */
    protected function _findUser($config,$username,$password){
        if(!isset ($config['members']) && !is_array($config['members'])){
            return null;
        }
        foreach ($config['members'] as $user) {
            if($user['username'] == $username && $user['password'] == $password){
                return $user;
            }
        }
        return null;
    }

    /**
     * @param ConnectionInterface $conn
     * @param array $cookies
     * @return array
     */
    public function authUser(ConnectionInterface $conn, array $cookies) {
        if(isset ($conn->Config['simple'])){
            $config = $conn->Config['simple'];
        }
        else{
            $config = array('allowAnonim'   => true);
        }

        if(isset ($cookies['mgVideoChatSimpleUser']) && isset($cookies['mgVideoChatSimplePass'])){
            $user = $this->_findUser($config, $cookies['mgVideoChatSimpleUser'], $cookies['mgVideoChatSimplePass']);
            if(!$user){
                return null;
            }
            return array(
                'provider'      => 'simple',
                'id'            => $user['id'],
                'email'         => '',
                'name'          => $user['name']
            );
        }
        
        //$this->debug($cookies);
        if(!$config['allowAnonim'] || !isset ($cookies['mgVideoChatSimple']) || !$cookies['mgVideoChatSimple']){
            return null;
        }
        return array(
            'provider'      => 'simple',
            'id'            => $conn->resourceId . '_a',
            'email'         => '',
            'name'          => urldecode($cookies['mgVideoChatSimple'])
        );
    }
}