@echo off

set SCRIPT_DIR=%~dp0

echo Installing FTDI drivers...

pnputil /add-driver "%~dp0Driver\*.inf" /install

echo Driver installation completed.
pause