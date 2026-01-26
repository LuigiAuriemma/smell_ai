
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
# We need to import the app from the gateway
# Adjust the import path based on project structure
from webapp.gateway.main import app

client = TestClient(app)

@patch("webapp.gateway.main.httpx.AsyncClient")
def test_generate_call_graph_proxy(mock_client):
    # Setup the mock to simulate an AsyncClient
    # When AsyncClient() is called, it returns a context manager
    mock_client_instance = AsyncMock()
    mock_client.return_value.__aenter__.return_value = mock_client_instance
    
    # Setup the post response
    expected_response = {"success": True, "data": "mocked_graph"}
    mock_response = MagicMock()
    mock_response.json.return_value = expected_response
    mock_client_instance.post.return_value = mock_response

    # Payload
    payload = {"code": "print('hello')"}

    # Execute request to gateway
    response = client.post("/api/generate_call_graph", json=payload)

    # Verify
    assert response.status_code == 200
    assert response.json() == expected_response
    
    # Check if the proxy called the correct service URL
    # Note: We need to know what STATIC_ANALYSIS_SERVICE is defined as in the module
    # In the file it is "http://localhost:8002"
    mock_client_instance.post.assert_called_with(
        "http://localhost:8002/generate_call_graph", 
        json=payload
    )
