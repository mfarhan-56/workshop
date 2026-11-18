# Machend API

Flask API for event browsing and registrations, backed by Supabase.

## Deploy on Render

1. Push this repository to GitHub, keeping `backend/.env` out of version control.
2. In Render, create a **Blueprint** and select the repository. Render will find `backend/render.yaml`.
3. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for the service in the Render dashboard. Use the Supabase project URL and publishable key.
4. Deploy. The service starts with Gunicorn and listens on Render's assigned port. `/api/events` is configured as the health check.

The Blueprint's root directory is `backend`, so its build and start commands run there. To deploy the folder as a standalone repository instead, put `render.yaml` at that repository's root and remove any configured root directory.

## Run locally

Create a `.env` file in this directory with `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, then run:

```sh
pip install -r requirements.txt
flask --app app run
```

The app also accepts `SUPABASE_KEY` as a local compatibility fallback. Do not commit `.env` or Supabase secrets.
