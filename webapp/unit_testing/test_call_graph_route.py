
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from webapp.services.staticanalysis.app.main import app
from webapp.services.staticanalysis.app.schemas.graph_schemas import CallGraphResponse

client = TestClient(app)

@pytest.fixture
def mock_inspector():
    with patch("webapp.services.staticanalysis.app.routers.call_graph.Inspector") as mock:
        yield mock

@pytest.fixture
def mock_dependency_builder():
    with patch("webapp.services.staticanalysis.app.routers.call_graph.DependencyGraphBuilder") as mock:
        yield mock

@pytest.fixture
def sample_payload():
    return {
        "code_snippet": "def foo(): pass",
        "file_name": "test_script.py"
    }

def test_generate_call_graph_success(mock_inspector, mock_dependency_builder, sample_payload):
    # Setup Mocks
    inspector_instance = mock_inspector.return_value
    # Mock empty smells dataframe
    import pandas as pd
    inspector_instance.inspect.return_value = pd.DataFrame(columns=["function_name", "smell_name", "description", "line"])

    builder_instance = mock_dependency_builder.return_value
    # Mock graph data structure
    expected_graph_data = {
            "nodes": [{
                "id": "foo", 
                "label": "foo", 
                "type": "function",
                "full_name": "foo",
                "file_path": "test_script.py",
                "x": 0.0,
                "y": 0.0
            }],
            "edges": []
    }
    builder_instance.get_graph_data.return_value = expected_graph_data

    # Execute
    response = client.post("/generate_call_graph", json=sample_payload)

    # Verify
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["nodes"][0]["label"] == "foo"
    
    # Check if mocks were called correctly
    inspector_instance.inspect.assert_called_once()
    builder_instance.build_graph.assert_called_once()

def test_generate_call_graph_with_smells(mock_inspector, mock_dependency_builder, sample_payload):
    # Setup Inspector to return smells
    inspector_instance = mock_inspector.return_value
    import pandas as pd
    smells_df = pd.DataFrame([
        {"function_name": "foo", "smell_name": "Long Method", "description": "Too long", "line": 10}
    ])
    inspector_instance.inspect.return_value = smells_df

    # Setup Graph Builder
    builder_instance = mock_dependency_builder.return_value
    # The builder returns nodes without smell info initially, the route enriches them
    initial_graph_data = {
        "nodes": [{
            "id": "foo", 
            "label": "foo",
            "full_name": "foo",
            "file_path": "test_script.py", 
            "x": 0.0, 
            "y": 0.0
        }],
        "edges": []
    }
    builder_instance.get_graph_data.return_value = initial_graph_data

    # Execute
    response = client.post("/generate_call_graph", json=sample_payload)

    # Verify
    assert response.status_code == 200
    nodes = response.json()["data"]["nodes"]
    foo_node = nodes[0]
    
    # Assert smell info was merged into the node
    assert foo_node["has_smell"] is True
    assert foo_node["smell_count"] == 1
    assert foo_node["smell_details"][0]["name"] == "Long Method"

def test_generate_call_graph_error_handling(mock_inspector, mock_dependency_builder, sample_payload):
    # Setup Inspector to raise exception
    mock_inspector.return_value.inspect.side_effect = Exception("Analysis failed")

    # Execute
    response = client.post("/generate_call_graph", json=sample_payload)

    # Verify
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "Analysis failed" in data["error"]
