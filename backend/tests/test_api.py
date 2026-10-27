import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.data.loader import DataFilesMissingError, load_data
from app.main import create_app


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app()) as test_client:
        yield test_client


def test_each_request_logs_one_line(client, caplog):
    with caplog.at_level("INFO", logger="app.request"):
        client.get("/api/health")
    lines = [r.getMessage() for r in caplog.records if r.name == "app.request"]
    assert len(lines) == 1
    assert lines[0].startswith("GET /api/health 200")


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_meta_reports_range_and_defaults(client):
    body = client.get("/api/meta").json()
    assert body["first_decision_date"] == "2026-01-01"
    assert body["last_decision_date"] == "2026-01-31"
    assert body["default_cutoff_hour"] == 9
    assert body["timezone"] == "UTC"
    assert "forecast - actual" in body["error_definition"]


def test_forecast_at_decision_returns_48_slots_from_the_0730_publish(client):
    response = client.get("/api/forecast-at-decision", params={"decision_date": "2026-01-14"})
    assert response.status_code == 200
    body = response.json()

    assert body["delivery_date"] == "2026-01-15"
    assert body["cutoff"] == "2026-01-14T09:00:00Z"
    assert body["dropped_slots"] == 0
    assert len(body["slots"]) == 48
    assert {slot["publish_time"] for slot in body["slots"]} == {"2026-01-14T07:30:00Z"}
    first = body["slots"][0]
    assert first["error_mw"] == pytest.approx(first["forecast_mw"] - first["actual_mw"])
    assert body["metrics"]["n"] == 48


def test_earlier_cutoff_uses_an_earlier_publish(client):
    body = client.get(
        "/api/forecast-at-decision", params={"decision_date": "2026-01-14", "cutoff_hour": 5}
    ).json()
    assert {slot["publish_time"] for slot in body["slots"]} == {"2026-01-14T04:30:00Z"}


def test_dropped_slots_are_reported_with_null_fields(client):
    body = client.get(
        "/api/forecast-at-decision", params={"decision_date": "2026-01-14", "cutoff_hour": 0}
    ).json()
    assert body["dropped_slots"] > 0
    dropped = [slot for slot in body["slots"] if slot["forecast_mw"] is None]
    assert len(dropped) == body["dropped_slots"]
    assert dropped[0]["publish_time"] is None and dropped[0]["error_mw"] is None


def test_accuracy_defaults_to_the_whole_month(client):
    body = client.get("/api/accuracy").json()
    assert body["start"] == "2026-01-01" and body["end"] == "2026-01-31"
    assert body["days"] == 31
    assert body["overall"]["n"] == 31 * 48
    assert body["overall"]["mae"] > 0
    assert body["overall"]["p95_abs"] >= body["overall"]["p90_abs"]
    horizons = [bucket["from_hours"] for bucket in body["by_horizon"]]
    assert horizons == sorted(horizons) and horizons[0] == 0
    assert len(body["by_hour"]) == 24


def test_accuracy_for_one_day_matches_forecast_at_decision(client):
    day = client.get("/api/forecast-at-decision", params={"decision_date": "2026-01-20"}).json()
    span = client.get("/api/accuracy", params={"start": "2026-01-20", "end": "2026-01-20"}).json()
    assert span["overall"]["mae"] == pytest.approx(day["metrics"]["mae"])
    assert span["overall"]["bias"] == pytest.approx(day["metrics"]["bias"])


@pytest.mark.parametrize(
    "path, params",
    [
        ("/api/forecast-at-decision", {"decision_date": "2025-12-31"}),
        ("/api/forecast-at-decision", {"decision_date": "2026-02-01"}),
        ("/api/accuracy", {"start": "2026-01-01", "end": "2026-02-01"}),
    ],
)
def test_dates_outside_january_2026_are_404(client, path, params):
    response = client.get(path, params=params)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


@pytest.mark.parametrize(
    "path, params",
    [
        ("/api/forecast-at-decision", {}),
        ("/api/forecast-at-decision", {"decision_date": "not-a-date"}),
        ("/api/forecast-at-decision", {"decision_date": "2026-01-10", "cutoff_hour": 24}),
        ("/api/forecast-at-decision", {"decision_date": "2026-01-10", "cutoff_hour": -1}),
        ("/api/accuracy", {"start": "2026-01-20", "end": "2026-01-10"}),
        ("/api/accuracy", {"cutoff_hour": "x"}),
    ],
)
def test_bad_parameters_are_422_with_the_common_error_shape(client, path, params):
    response = client.get(path, params=params)
    assert response.status_code == 422
    assert "code" in response.json()["error"]


def test_openapi_lists_exactly_the_four_endpoints(client):
    paths = set(client.get("/openapi.json").json()["paths"])
    assert paths == {
        "/api/health",
        "/api/meta",
        "/api/forecast-at-decision",
        "/api/accuracy",
    }


def test_missing_data_files_give_a_clear_error(tmp_path):
    with pytest.raises(DataFilesMissingError, match="fetch_data.py"):
        load_data(tmp_path)


def test_default_settings_match_the_documented_assumptions():
    settings = get_settings()
    assert settings.default_cutoff_hour == 9
    assert settings.first_decision_date.isoformat() == "2026-01-01"
