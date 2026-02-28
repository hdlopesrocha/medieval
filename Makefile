# Makefile for the Fifth Empire Vue + Ionic project
# Basic targets for development and build

NPM ?= npm

.PHONY: help install dev build preview clean deploy

help:
	@echo "Makefile commands:"
	@echo "  make install    - install dependencies (npm install)"
	@echo "  make dev        - run vite dev server (npm run dev)"
	@echo "  make build      - build for production (npm run build)"
	@echo "  make preview    - preview production build (npm run preview)"
	@echo "  make deploy     - build and publish dist to GitHub Pages (gh-pages)"
	@echo "  make clean      - remove node_modules and dist"

install:
	$(NPM) install

dev:
	$(NPM) run dev

build:
	$(NPM) run build

preview:
	$(NPM) run preview

deploy: build
	@echo "Deploying to GitHub Pages (gh-pages branch)..."
	npx --yes gh-pages -d dist

clean:
	rm -rf node_modules dist
