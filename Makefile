.PHONY: all help seed test build

help:
	@echo Available commands:
	@echo   make seed   - Seed database with realistic demo data (idempotent)
	@echo   make test   - Run vitest test suite in web
	@echo   make build  - Compile production bundle in web

seed:
	python backend/scripts/seed.py

test:
	cd web && npm test -- --run

build:
	cd web && npm run build
