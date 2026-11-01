@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   KAZ KOMPOZIT - локальный запуск
echo ============================================
where node >/dev/null 2>/dev/null || (echo [!] Не найден Node.js. Установите версию 20 или новее с сайта nodejs.org & pause & exit /b 1)
if not exist .env (copy .env.example .env >/dev/null & echo [i] Создан файл .env - впишите в него DATABASE_URL и пароль администратора, затем запустите снова. & notepad .env & pause & exit /b 0)
echo [1/4] Установка зависимостей...
call npm install || (echo [!] Ошибка установки & pause & exit /b 1)
echo [2/4] Обновление структуры базы данных...
call npm run db:migrate || (echo [!] Нет связи с базой данных. Проверьте DATABASE_URL в .env & pause & exit /b 1)
echo [3/4] Начальные данные...
call npm run db:seed
echo [4/4] Запуск сайта: http://localhost:3000  ^|  админка: http://localhost:3000/admin
call npm run dev
pause
