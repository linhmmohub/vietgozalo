@echo off
chcp 65001 >nul
title VIETGO FOOD - HỆ THỐNG ĐIỂM DANH & BOT ZALO 24/7
color 0A

echo =========================================================================
echo  🚀 KHỞI ĐỘNG TRỌN BỘ HỆ THỐNG VIETGO FOOD TĨNH GIA (NGHI SƠN) 24/7
echo  📦 1. MÁY CHỦ TRUNG TÂM (CỔNG 3000 + GIAO DIỆN QUẢN LÝ)
echo  🤖 2. ZALO BOT TỰ ĐỘNG ĐIỂM DANH & DEEPSEEK AI
echo =========================================================================
echo.

cd /d "%~dp0"

echo [1/2] Đang khởi động Máy chủ trung tâm (Port 3000)...
start "VietGo Central Server (Port 3000)" cmd /k "title VietGo Central Server & node ./node_modules/tsx/dist/cli.mjs server.ts"

timeout /t 3 >nul

echo [2/2] Đang khởi động Zalo Bot Gateway...
cd zalobot
start "VietGo Zalo Bot 24/7" cmd /k "title VietGo Zalo Bot 24/7 & node bot.js"

echo.
echo =========================================================================
echo  ✅ HỆ THỐNG ĐÃ KHỞI CHẠY THÀNH CÔNG!
echo  🌐 Giao diện Web: http://localhost:3000
echo  📡 Webhook Endpoint: http://localhost:3000/api/zalo/webhook
echo  💡 LƯU Ý: Vui lòng để 2 cửa sổ màu đen chạy ngầm để phục vụ anh em tài xế 24/7.
echo =========================================================================
echo.
pause
