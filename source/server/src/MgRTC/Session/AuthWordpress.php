<?php

namespace MgRTC\Session;

use MgRTC\Session\AuthInterface;
use Ratchet\ConnectionInterface;

class AuthWordpress extends AuthBase implements AuthInterface {

    /**
     * @param ConnectionInterface $conn
     * @param array $cookies
     * @return array
     */
    public function authUser(ConnectionInterface $conn, array $cookies) {
        global $current_user;
        $current_user = null;
        $wpDir = $conn->Config['wordpress']['dir'];
        foreach ($cookies as $key => $value) {
            $_COOKIE[$key] = urldecode($value);
        }
        require_once($wpDir . '/wp-config.php');
        require_once($wpDir . '/wp-includes/wp-db.php');
        require_once($wpDir . '/wp-includes/pluggable.php');
        $userInfo  = wp_get_current_user();
        if(!$userInfo || !$userInfo->ID){
            return null;
        }
        return array(
            'provider'      => 'wordpress',
            'id'            => $userInfo->ID,
            'email'         => $userInfo->user_email,
            'name'          => $userInfo->display_name
            //'first_name'    => $userInfo->['first_name'],
            //'last_name'     => $userInfo->['last_name'],
            //'gender'        => $userInfo->['gender'],
            //'image'         => 'https://graph.facebook.com/' . $userInfo['id'] . '/picture',
            //'locale'        => $userInfo->['locale']
        );
    }
}