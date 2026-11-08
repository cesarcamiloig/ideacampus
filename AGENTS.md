# AGENTS.md

IdeaCampus: full-stack scaffold for student entrepreneurship management (UFPS academic project, Análisis y Diseño 2026). Monorepo with `backend/` (Django), `frontend/` (React + Vite), `database/` (MySQL init scripts).

## Run / verify
- Bring everything up from the repo root: `docker-compose up --build -d`. Services: `db` (MySQL 8.4, host port 3306), `backend` (Django runserver, 8000), `frontend` (Vite, 5173).
- Run backend commands inside the container (compose bind-mounts `./backend` -> `/app`, hot reload on): `docker-compose exec backend python manage.py <cmd>`.
- Frontend: `npm run dev`, `npm run build`, `npm run lint` (oxlint, config in `frontend/.oxlintrc.json`).
- No CI workflows and no test suite configured. Only Django's default runner (`manage.py test`); frontend has no test script.

## Critical gotchas
- `backend/core/settings.py` is still the stock `django-admin startproject` scaffold: it uses SQLite and does **not** read `.env` or the compose `DB_*` vars. MySQL is not wired up on `main`.
- `rest_framework`, `django-cors-headers`, and `mysqlclient` are in `requirements.txt` but are **not** in `INSTALLED_APPS`/`MIDDLEWARE`. `.env`/`.env.example` keys (`DB_*`, `DJANGO_*`, `GOOGLE_*`, `VITE_API_URL`) are aspirational — nothing reads them yet, and `SECRET_KEY`/`DEBUG` are hardcoded.
- Git history shows a Google OAuth + JWT auth feature (HU-01, CORS) that was merged then **reverted** (commit `93cdf7e`). It does not exist in the current tree — do not assume it is present.
- `database/init.sql` and `seeds.sql` are empty placeholders mounted into MySQL's init dir; they only run when the `db_data` volume is first created. Re-provision with `docker-compose down -v` before `up --build`.
- `mysqlclient` needs MySQL dev libraries; the backend Dockerfile installs them. Running Django outside Docker on Windows will fail without them.
- `.env` is gitignored — never commit it or other secrets.

## Conventions
- Issues, PR descriptions, docs, and commit messages are in Spanish. Commit style: `feat(<modulo>): ...` / `chore: ...` (see `git log`). User stories follow `HU-XX` Gherkin template in `.github/ISSUE_TEMPLATE/`.
- PRs should link their issue (`Closes #N`) and satisfy `.github/pull_request_template.md` (containers build, Gherkin acceptance criteria met, no secrets, manual tests pass). Feature branches are named `feat/HU-XX-...` and merge into `develop`/`main`.
