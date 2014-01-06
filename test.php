<!DOCTYPE html>
<html>
    <head>
        <title>Magnoliyan Video Chat:1</title>

        <link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/3.0.2/css/bootstrap.min.css">
        <link rel="stylesheet" href="source/client/mgVideoChat/mgVideoChat-1.0.3.css">
    </head>
    <body>
        <div class="container">
            <div class="page-header">
                <h1>Magnoliyan Video Chat <small>Simple</small></h1>
                <p>If no one else is in the room, please open the same page in other tab to do self-test.</p>
            </div>
            <div id="mgVideoChat"></div>
        </div>

        <script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
        <script type="text/javascript" src="//netdna.bootstrapcdn.com/bootstrap/3.0.2/js/bootstrap.min.js"></script>
        <!-- Video Chat -->
        <script src="source/client/mgVideoChat/mgVideoChat-1.0.3-min.js"></script>
        <script>
            $(document).ready(function(){ 
                //alert(3);
            $('#mgVideoChat').mgVideoChat({
                wsURL: 'ws://ec2-54-205-46-237.compute-1.amazonaws.com/.com:8080?room=1'
            });
            
            ////////////////////////////////////////////////////
            
            
            
            
            
            
            }); /////// end 
            
        </script>
    </body>
</html>
