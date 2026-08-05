@echo off
cd /d "%~dp0"
py build_site.py "C:\Users\user\Desktop\source\feed.atom"
if errorlevel 1 python build_site.py "C:\Users\user\Desktop\source\feed.atom"
pause
