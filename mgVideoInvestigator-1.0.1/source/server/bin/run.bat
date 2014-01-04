@echo off
if "%1"=="" (
    SET COMMAND=start
) else (
    SET COMMAND=%1
)

rem get pid
SET PID=
FOR /F "tokens=3" %%a in ('WMIC PROCESS WHERE "Caption='php.exe'" get Commandline^, Processid^|findstr chat-server') DO (    
    SET PID=%%a
)

echo Executing command [%COMMAND%]

rem check if running
if "%PID%" == "" (
    echo [MgVideoChat] Not running
    SET RUNNING=no
) else (
    echo [MgVideoChat] Running with PID: [%PID%]
    SET RUNNING=yes
)

rem start or stop
if "%COMMAND%" == "stop" (
    if "%RUNNING%" == "yes" (
        echo [MgVideoChat] stopping
        taskkill /f /pid %PID%
    )
) else (
    if "%RUNNING%" == "no" (
        echo [MgVideoChat] start
        start /b php chat-server.php > mg-chat-server.log
    )
)