@echo off
setlocal
cd /d "%~dp0"

if not exist .env (
  >.env echo POSTGRES_DB=siprima_pas
  >>.env echo POSTGRES_USER=siprima
  >>.env echo POSTGRES_PASSWORD=siprima_db_2026
  >>.env echo JWT_SECRET=siprima_jwt_secret_2026_local
  >>.env echo CORS_ORIGIN=http://localhost
  >>.env echo ADMIN_EMAIL=admin@siprima.local
  >>.env echo ADMIN_PASSWORD=AdminSIPRIMA2026!
  echo Konfigurasi lokal SIPRIMA PAS dibuat otomatis.
)

echo.
echo ==============================================
echo       SIPRIMA PAS - LOCAL BROWSER
echo ==============================================
echo.

docker info >nul 2>&1
if errorlevel 1 (
  echo Docker Desktop belum berjalan.
  echo Silakan buka Docker Desktop, tunggu Engine Running,
  echo lalu jalankan file ini lagi.
  pause
  exit /b 1
)

echo Menyiapkan SIPRIMA PAS. Pertama kali dapat memerlukan waktu...
docker compose -f docker-compose.production.yml up -d --build
if errorlevel 1 (
  echo.
  echo GAGAL menjalankan SIPRIMA PAS.
  echo Periksa pesan error di atas.
  pause
  exit /b 1
)

echo Menunggu layanan SIPRIMA PAS...
timeout /t 8 /nobreak >nul
start "" "http://localhost"
echo.
echo SIPRIMA PAS aktif di http://localhost
echo Login lokal: admin@siprima.local
echo Password: AdminSIPRIMA2026!
echo.
pause
