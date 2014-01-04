<?php

namespace MgRTC\Session;

use MgRTC\Session\AuthInterface;
use MgRTC\Session\Facebook\FacebookCli;
use Ratchet\ConnectionInterface;

class AuthFacebook extends AuthBase implements AuthInterface {

    /**
     * @param ConnectionInterface $conn
     * @param array $cookies
     * @return array
     */
    public function authUser(ConnectionInterface $conn, array $cookies) {
        $key = 'fbsr_' . $conn->Config['facebook']['appId'];
        //$this->debug($cookies);
        if(!isset ($cookies[$key])){
            return null;
        }
        $sr = $cookies[$key];
        $data = $this->parseSignedRequest($sr, $conn->Config['facebook']['secret']);
        if(!$data){
            return null;
        }
        $facebook = new FacebookCli($conn->Config['facebook']);
        $userInfo  = $facebook->api('/' . $data['user_id']);
        if(!$userInfo){
            return null;
        }
        return array(
            'provider'      => 'facebook',
            'id'            => $this->getIndex($userInfo,'id'),
            'email'         => $this->getIndex($userInfo,'email'),
            'name'          => $this->getIndex($userInfo,'name'),
            'first_name'    => $this->getIndex($userInfo,'first_name'),
            'last_name'     => $this->getIndex($userInfo,'last_name'),
            'gender'        => $this->getIndex($userInfo,'gender'),
            'image'         => 'https://graph.facebook.com/' . $userInfo['id'] . '/picture',
            'locale'        => $this->getIndex($userInfo,'locale')
        );
    }

    /**
     * Get array field
     * 
     * @param array $arr
     * @param string $field
     * @return mixed|null
     */
    protected function getIndex($arr, $field){
        if(isset ($arr[$field])){
            return $arr[$field];
        }
        return null;
    }

    /**
     * This function is used to decoding signed_request data
     * more information is here http://developers.facebook.com/docs/authentication/signed_request
     */
    public function parseSignedRequest($signed_request, $secret) {
        list($encoded_sig, $payload) = explode('.', $signed_request, 2);
        // decode the data
        $sig = base64_decode(strtr($encoded_sig, '-_', '+/'));
        $data = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);

        if (strtoupper($data['algorithm']) !== 'HMAC-SHA256') {
            error_log('Unknown algorithm. Expected HMAC-SHA256');
            return null;
        }

        // check sig
        $expected_sig = hash_hmac('sha256', $payload, $secret, $raw = true);
        if ($sig !== $expected_sig) {
            //error_log('Bad Signed JSON signature!');
            return null;
        }

        return $data;
    }

}