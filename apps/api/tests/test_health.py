def test_health_endpoint_reports_api_status(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "Asteria API",
        "version": "0.1.0",
        "environment": "test",
        "database_configured": True,
    }


def test_health_endpoint_does_not_expose_database_url(client):
    response = client.get("/health")

    assert "database_url" not in response.json()
