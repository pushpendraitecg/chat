#!/bin/sh
COMMAND=$1
#check if running
if ps aux | grep [c]hat-server > /dev/null
then
    echo "[MgVideoChat] Running"
    RUNNING="yes"
else
    echo "[MgVideoChat] Not running"
    RUNNING="no"
fi

#start or stop
if [ "$COMMAND" = "stop" ]
then
    if [ $RUNNING = "yes" ]
    then
        echo "[MgVideoChat] stopping"
        pkill -9 -f chat-server
    fi
else
    if [ $RUNNING = "no" ]
    then
        echo "[MgVideoChat] start"
        nohup php chat-server.php 0<&- &> mg-chat-server.log &
    fi
fi