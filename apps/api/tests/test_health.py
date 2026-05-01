def test_health_endpoint_reports_api_status(client):
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "Asteria API"
    assert payload["version"] == "0.1.0"
    assert payload["environment"] == "test"
    assert payload["database_configured"] is True
    assert payload["directories"]["app_data"]["path"]
    assert payload["directories"]["models"]["path"]
    assert payload["directories"]["embedding_models"]["path"].endswith(
        "models/embedding"
    ) or payload["directories"]["embedding_models"]["path"].endswith(
        "models\\embedding"
    )


def test_health_endpoint_does_not_expose_database_url(client):
    response = client.get("/health")

    assert "database_url" not in response.json()
