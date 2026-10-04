@echo off
cd /d "%~dp0"
docker compose -f docker-compose.production.yml down
echo SIPRIMA PAS dihentikan.
pause
