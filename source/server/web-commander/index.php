<?php
$config = require (__DIR__ . '/config.php');

if (!isset($_SERVER['PHP_AUTH_USER']) || $_SERVER['PHP_AUTH_USER'] != $config['username'] || $_SERVER['PHP_AUTH_PW'] != $config['password']) {
    header('WWW-Authenticate: Basic realm="Magnoliyan Video Chat Commander"');
    header('HTTP/1.0 401 Unauthorized');
    echo 'Canceled';
    exit;
}

function action_start(){
    global $config, $status;        
    
    if($status){        
        return false;
    }
    spawnProcess($config['start_cmd']);
    //echo $config['start_cmd']; die();
    $status = is_running();
    return "Start executed";
}

function action_stop(){
    global $config, $status;
    
    if(!$status){
        return false;
    }
    spawnProcess($config['stop_cmd']);
    $status = is_running();
    return "Stop executed";
}

function action_index(){
    global $config;
    return null;
}

function print_status(){
    global $status;

    if(!$status){
        return '<div class="alert alert-warning">Not running</div>';
    }
    else{
        $html = '<div class="alert alert-success">Running</div><table class="table">';
        $header = "<thead><tr>\n";
        $row = "<tr>\n";
        foreach ($status as $column => $value) {
            $header .= "<th>$column</th>";
            $row .= "<td>$value</td>";
        }
        $header .= "</tr></thead>\n";
        $row .= "</tr>\n";
        $html .= $header . $row ."</table>";
        return $html;
    }
}

function is_running(){
    global $config;

    $result = shell_exec("ps aux | grep " . $config['p_sig']);
    $result = preg_replace('!\s+!', ' ', $result);
    $result = trim($result);
    if(!$result || $result == ""){
        return false;
    }
    $resultArr = explode(" ",$result);
    $columns = array("USER","PID","%CPU","%MEM","VSZ","RSS","TTY","STAT","START","TIME","COMMAND");
    $status = array();
    foreach ($columns as $index => $column) {
        $status[$column] = $resultArr[$index];
    }
    return $status;
}

function spawnProcess($command) {
    if (PHP_OS == 'WINNT' || PHP_OS == 'WIN32') {
        $pcommand = 'start /b ' . $command;
    } else {
        $pcommand = $command . ' > /dev/null &';
    }
    pclose(popen($pcommand, 'r'));
}

$action = $_REQUEST['action'];
$methodName = 'action_' . $action;
if(!function_exists($methodName)){
    $action = 'index';
    $methodName = 'action_index';
}

$status = is_running();
$result = $methodName();

?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">

        <title>Magnoliyan Video Chat Commander</title>

        <!-- Bootstrap core CSS -->
        <link href="//netdna.bootstrapcdn.com/bootstrap/3.0.3/css/bootstrap.min.css" rel="stylesheet">
    </head>

    <body>
        <div class="container">
            <h1>Magnoliyan Video Chat Commander</h1>
            <?php if($result){ ?>
            <div class="alert alert-warning"><?php echo $result; ?></div>
            <?php } ?>
            <div class="panel panel-default">
                <div class="panel-heading">
                    <h3 class="panel-title">Status</h3>
                </div>
                <div class="panel-body">
                    <?php echo print_status(); ?>
                </div>
            </div>
            <div class="panel panel-primary">
                <div class="panel-body">
                    <?php
                        if($status){ ?>
                            <a href="index.php?action=stop" class="btn btn-danger btn-lg active" role="button">Stop</a>
                        <?php }else{ ?>
                            <a href="index.php?action=start" class="btn btn-primary btn-lg active" role="button">Start</a>
                        <?php }
                    ?>
                </div>
            </div>            

        </div>
        <script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
        <script src="//netdna.bootstrapcdn.com/bootstrap/3.0.3/js/bootstrap.min.js"></script>
    </body>
</html>