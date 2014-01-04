<?php
namespace MgRTC\Session;

use Ratchet\ConnectionInterface;

interface AuthInterface{
    /**
     * @param ConnectionInterface $conn
     * @param array $cookies
     * @return array
     */
    function authUser(ConnectionInterface $conn, array $cookies);
}