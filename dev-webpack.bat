@echo off
echo Iniciando servidor Next.js sem Turbopack...
set NEXT_PRIVATE_SKIP_TURBO=1
npx next dev
