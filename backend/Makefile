# Kalaswar Core Services Backend Makefile
.PHONY: help dev test lint types clean docker-build docker-run

help:
	@echo "Kalaswar Backend Commands:"
	@echo "  make dev         - Launch local FastAPI development server with hot-reload"
	@echo "  make test        - Execute automated pytest test suite"
	@echo "  make lint        - Perform code compilation and linting verification"
	@echo "  make types       - Export OpenAPI schema and generate TypeScript client types"
	@echo "  make docker-build- Build container image"
	@echo "  make docker-run  - Run containerized backend on port 8000"

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest -v tests/

lint:
	python -m compileall app/
	python -m compileall tests/

types:
	python scripts/generate_client_types.py

clean:
	python -c "import pathlib, shutil; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('__pycache__')]"
	python -c "import pathlib, shutil; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('.pytest_cache')]"

docker-build:
	docker build -t kalaswar-backend:latest .

docker-run:
	docker run -p 8000:8000 --env-file .env kalaswar-backend:latest
