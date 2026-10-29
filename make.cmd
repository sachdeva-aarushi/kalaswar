@echo off
if "%1"=="" goto help
if "%1"=="seed" goto seed
if "%1"=="test" goto test
if "%1"=="build" goto build
if "%1"=="help" goto help

:help
echo Available commands:
echo   make seed    - Seed database with realistic demo data (idempotent)
echo   make test    - Run test suite
echo   make build   - Build production web application
goto end

:seed
python backend\scripts\seed.py %2 %3 %4
goto end

:test
cd web && npm test -- --run
goto end

:build
cd web && npm run build
goto end

:end
