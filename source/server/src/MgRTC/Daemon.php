<?php

namespace MgRTC;

class Daemon {

    /**
     * singleton instance
     *
     * @var MgRTC\Daemon
     */
    protected static $_instance = null;

    /**
     * private constructor
     */
    private function  __construct()
    {
    }

    /**
     * get instance
     *
     *
     * @return MgRTC\Daemon
     */
    public static function getInstance()
    {
        if(self::$_instance === null)
        {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    /**
     * Callback in a call_user_func format
     *
     * @var array
     */
    protected $_callback = array();

    /**
     * Pid file path
     * 
     * @var string
     */
    protected $_pidFile = '';

    /**
     * Daemon name
     * @var string
     */
    protected $_name = '';

    /**
     * Signal handler
     * 
     * @param int $signo
     */
    public function sigHandler($signo) {
        switch ($signo) {
            case SIGTERM:
                echo sprintf("\n[%s] stopping PID: %s\n", $this->_name, getmypid());
                $stopCallback = $this->getCallback('stop');
                call_user_func_array($stopCallback,array(getmypid()));
                if(file_exists($this->_pidFile)){
                    unlink($this->_pidFile);
                }
                break;
            default:
                echo "Catched signo:$signo\n";
                break;
        }
    }

/*
 *
 * RESTART 
if(!isset ($argv[1])){
    $argv[1] = 0;
}
++$argv[1];
$_ = $_SERVER['_'];

$restart = function () {
    global $_, $argv, $server; // note we need to reference globals inside a function
    try {
        $server->socket->shutdown();
    }catch (Exception $exc) {
        echo $exc->getMessage();
    }
    // restart myself
    pcntl_exec($_, $argv);
};

if(isset($config['autoRestart']) && $config['autoRestart']){
    register_shutdown_function($restart);
    pcntl_signal(SIGTERM, $restart); // kill
    pcntl_signal(SIGHUP, $restart); // kill -s HUP or kill -1
    pcntl_signal(SIGINT, $restart); // Ctrl-C
}*/

    /**
     * Returns the set callback
     *
     * @return mixed
     */
    public function getCallback($key)
    {
        if(!isset ($this->_callback[$key])){
            throw new Exception('Invalid callback key given');
        }
        return $this->_callback[$key];
    }

    /**
     * Sets the callback
     *
     * @param  string|array $callback
     * @return MgRTC\Daemon
     */
    public function setCallback($callback,$key)
    {
        if (!is_callable($callback)) {
            throw new Exception('Invalid callback given');
        }
        $this->_callback[$key] = $callback;
        return $this;
    }

    /**
     * Check if daemon is running
     * 
     * @return boolean
     */
    public function isRunning(){
        if(!file_exists( $this->_pidFile)){
            return false;
        }
        //check if it's stale
        $pid = trim( file_get_contents($this->_pidFile));
        $pids = explode( "\n", trim(shell_exec("ps -e | awk '{print $1}'")));
        //If PID is still active, return true
        if( in_array($pid, $pids ) ){
            return true;
        }
        unlink( $this->_pidFile );
        return false;
    }

    /**
     * Run as daemon
     */
    protected function _runDaemon(){
        $pid = pcntl_fork();
        if ($pid == -1) {
            die('could not fork');
        } else if ($pid) {
            // we are the parent
            //pcntl_wait($status); //Protect against Zombie children
            //echo "Exiting parent process " . getmypid() . "\n";
            exit;
        } else {
            //echo "My PID is " . getmypid() . "\n";
        }

        $pid = getmypid();
        echo sprintf("\n[%s] running with PID: %s\n", $this->_name, $pid);

        //write pid file
        file_put_contents($this->_pidFile, $pid);

        //Without this directive, PHP won't be able to handle the signals
        declare(ticks=1);

        //registering the handler
        pcntl_signal(SIGTERM, array($this,'sigHandler'));
        //execute clients run
        $runCallback = $this->getCallback('run');
        call_user_func_array($runCallback,array());
    }

    /**
     * Run regular
     * 
     */
    protected function _runRegular(){
        $pid = getmypid();
        echo sprintf("\n[%s] starting with PID: %s\n", $this->_name, $pid);

        //registering the handler
        //pcntl_signal(SIGTERM, array($this,'sigHandler'));
        //execute clients run
        $runCallback = $this->getCallback('run');
        call_user_func_array($runCallback,array());
    }

    /**
     * Stop daemon
     */
    protected function _stopDaemon(){
        $pid = trim( file_get_contents($this->_pidFile));
        \shell_exec("kill $pid");
    }


    /**
     * Run process
     * 
     * @param array $options
     * @param string $cmd
     */
    public function run(array $options, $cmd = 'start') {
        $this->_name = $options['daemon_name'];

        $this   ->setCallback($options['run'], 'run')
                ->setCallback($options['stop'], 'stop');

        if(isset ($options['pid_file'])){
            $this->_pidFile = $options['pid_file'];
        }
        else{
            $this->_pidFile = "/var/run/" . $this->_name . ".pid";
        }

        //check if running
        $running = $this->isRunning();
        switch ($cmd) {
            case 'execute':
                $this->_runRegular();
                break;
            case 'start':
                if($running){
                    echo \sprintf("\n[%s] is running already.\n", $this->_name);
                    exit();
                }
                else{
                    $this->_runDaemon();
                }
                break;
            case 'stop':
                if(!$running){
                    echo \sprintf("\n[%s] is not running.\n", $this->_name);
                    exit();
                }
                else{
                    $this->_stopDaemon();
                }
                break;
            default:
                break;
        }
    }

}