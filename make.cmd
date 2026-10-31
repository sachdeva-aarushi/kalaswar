@echo off
if "%1"=="" goto help
if "%1"=="bootstrap" goto bootstrap
if "%1"=="seed" goto bootstrap
if "%1"=="test" goto test
if "%1"=="build" goto build
if "%1"=="help" goto help

:help
echo Available commands:
echo   make bootstrap - Bootstrap platform reference data (crafts, categories, states, languages)
echo   make seed      - Bootstrap platform reference data
echo   make test      - Run test suite
echo   make build     - Build production web application
goto end

:bootstrap
python backend\scripts\bootstrap.py
goto end

:test
cd web && npm test -- --run
goto end

:build
cd web && npm run build
goto end

:end
