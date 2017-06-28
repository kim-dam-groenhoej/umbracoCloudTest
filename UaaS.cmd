@ECHO OFF
ECHO One second...
ECHO Downloading helper executable (Waasp.exe)
powershell -ExecutionPolicy Bypass -Command "(New-Object Net.WebClient).DownloadFile('https://umbracoreleases.blob.core.windows.net/download/Waasp.exe', 'Waasp.exe')"

SET /P url="Clone URL: " 
SET /P alias="Namespace: "

SET uaasguid=%url:~-40%
SET uaasguid=%uaasguid:.git=%

IF NOT EXIST %alias%.Web (
	git clone %url%
)
IF EXIST %uaasguid% REN %uaasguid% %alias%.Web

Waasp.exe "%CD%" %alias% %url%
DEL Waasp.exe /Q