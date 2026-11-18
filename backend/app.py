"""Flask API for browsing events and managing event registrations."""

import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from postgrest import APIError
from supabase import Client, create_client

load_dotenv()

app = Flask(__name__)

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_KEY")
if not supabase_url or not supabase_key:
    raise RuntimeError(
        "Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the environment or .env file."
    )

supabase: Client = create_client(supabase_url, supabase_key)


@app.after_request
def add_cors_headers(response):
    """Allow browser clients from any origin to call this API (no cookies)."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Max-Age"] = "86400"
    return response


@app.errorhandler(APIError)
def handle_supabase_error(error):
    code = getattr(error, "code", None)
    message = getattr(error, "message", "Database request failed")
    status = 409 if code == "23505" else 500
    return jsonify(error=message, code=code), status


def required_value(data, field):
    value = data.get(field) if isinstance(data, dict) else None
    if not isinstance(value, str) or not value.strip():
        return None
    return value.strip()


@app.get("/api/events")
def list_events():
    """Browse events."""
    response = (
        supabase.table("events")
        .select("id, organizer_id, title, capacity, status")
        .order("title")
        .execute()
    )
    return jsonify(response.data)


@app.get("/api/events/<event_id>")
def get_event(event_id):
    """Return one event, or 404 when it does not exist."""
    response = (
        supabase.table("events")
        .select("id, organizer_id, title, capacity, status")
        .eq("id", event_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        return jsonify(error="Event not found"), 404
    return jsonify(response.data[0])


@app.get("/api/users")
def list_users():
    """List available demo accounts for the frontend account picker."""
    response = (
        supabase.table("users")
        .select("id, email")
        .order("email")
        .execute()
    )
    return jsonify(response.data)


@app.post("/api/registrations")
def create_registration():
    """Register a user for an event; duplicate registrations return 409."""
    data = request.get_json(silent=True)
    user_id = required_value(data, "user_id")
    event_id = required_value(data, "event_id")
    if not user_id or not event_id:
        return jsonify(error="JSON body must include non-empty user_id and event_id"), 400

    event_response = (
        supabase.table("events")
        .select("id, capacity")
        .eq("id", event_id)
        .limit(1)
        .execute()
    )
    if not event_response.data:
        return jsonify(error="Event not found"), 404

    user_response = (
        supabase.table("users")
        .select("id")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not user_response.data:
        return jsonify(error="User not found"), 404

    existing = (
        supabase.table("registrations")
        .select("id")
        .eq("user_id", user_id)
        .eq("event_id", event_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return jsonify(error="User is already registered for this event"), 409

    capacity = event_response.data[0].get("capacity")
    if capacity is not None:
        count_response = (
            supabase.table("registrations")
            .select("id", count="exact")
            .eq("event_id", event_id)
            .execute()
        )
        if count_response.count is not None and count_response.count >= capacity:
            return jsonify(error="Event is full"), 409

    # The database should also have a unique constraint on (user_id, event_id)
    # to prevent duplicate registrations from simultaneous requests.
    response = (
        supabase.table("registrations")
        .insert({"user_id": user_id, "event_id": event_id})
        .select("id, user_id, event_id, created_at")
        .execute()
    )
    return jsonify(response.data[0]), 201


@app.get("/api/me/registrations")
def list_my_registrations():
    """List registrations for the user_id supplied in the query string."""
    user_id = request.args.get("user_id", "").strip()
    if not user_id:
        return jsonify(error="Query parameter user_id is required"), 400

    response = (
        supabase.table("registrations")
        .select("id, user_id, event_id, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return jsonify(response.data)


@app.get("/api/events/<event_id>/registrations")
def list_event_registrations(event_id):
    """List attendees if organizer_id matches the event's organizer_id."""
    organizer_id = request.args.get("organizer_id", "").strip()
    if not organizer_id:
        return jsonify(error="Query parameter organizer_id is required"), 400

    event_response = (
        supabase.table("events")
        .select("id, organizer_id")
        .eq("id", event_id)
        .limit(1)
        .execute()
    )
    if not event_response.data:
        return jsonify(error="Event not found"), 404
    if event_response.data[0]["organizer_id"] != organizer_id:
        return jsonify(error="Only the event organizer may view attendees"), 403

    response = (
        supabase.table("registrations")
        .select("id, user_id, event_id, created_at, users(id, email)")
        .eq("event_id", event_id)
        .order("created_at")
        .execute()
    )
    return jsonify(response.data)


if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
