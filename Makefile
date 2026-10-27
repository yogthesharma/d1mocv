.PHONY: help install dev-api dev-web test test-api test-web lint format fetch-data gen-api export-requirements docker-up docker-down

help:
	@echo "install              install backend and frontend dependencies"
	@echo "dev-api              run the API on http://localhost:8000"
	@echo "dev-web              run the web app on http://localhost:5173 (proxies /api to :8000)"
	@echo "test                 run all tests"
	@echo "lint                 lint and format-check both sides"
	@echo "format               format both sides"
	@echo "fetch-data           re-download the Elexon data into data/"
	@echo "gen-api              regenerate frontend API types from the backend"
	@echo "export-requirements  re-export requirements.txt for Vercel"
	@echo "docker-up            build and start with Docker Compose"
	@echo "docker-down          stop Docker Compose"

install:
	cd backend && uv sync --frozen
	cd frontend && npm ci

dev-api:
	cd backend && uv run uvicorn app.main:app --reload --port 8000

dev-web:
	cd frontend && npm run dev

test: test-api test-web

test-api:
	cd backend && uv run pytest -q

test-web:
	cd frontend && npm test

lint:
	cd backend && uv run ruff check . && uv run ruff format --check .
	cd frontend && npm run lint && npm run format:check

format:
	cd backend && uv run ruff check --fix . && uv run ruff format .
	cd frontend && npm run format

fetch-data:
	uv run --project backend python scripts/fetch_data.py

gen-api:
	cd frontend && npm run gen:api

export-requirements:
	uv export --project backend --no-dev --no-hashes --no-emit-project -o requirements.txt

docker-up:
	docker compose up --build

docker-down:
	docker compose down
