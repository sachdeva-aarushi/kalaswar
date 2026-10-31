.PHONY: all help bootstrap seed test build

help:
	@echo Available commands:
	@echo   make bootstrap - Bootstrap platform reference data (crafts, categories, states, languages)
	@echo   make seed      - Bootstrap platform reference data
	@echo   make test      - Run test suite
	@echo   make build     - Compile production bundle in web

bootstrap:
	python backend/scripts/bootstrap.py

seed: bootstrap

test:
	cd web && npm test -- --run

build:
	cd web && npm run build
