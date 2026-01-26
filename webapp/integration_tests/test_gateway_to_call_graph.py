from fastapi.testclient import TestClient
from webapp.gateway import main

client = TestClient(main.app)

def test_generate_call_graph_integration():
    """
    Integration test for CR-02 Call Graph feature.
    Verifies the flow from Gateway -> Static Analysis Service -> Graph Builder.
    """
    code_snippet = """
def function_a():
    function_b()

def function_b():
    print("hello")
"""
    payload = {
        "code_snippet": code_snippet,
        "file_name": "integration_test.py"
    }

    response = client.post("/api/generate_call_graph", json=payload)

    # Check Gateway response
    assert response.status_code == 200
    
    json_response = response.json()
    
    # If the service is not running, we might get a 500 or error
    # But assuming the environment is consistent with previous tests:
    assert json_response["success"] is True
    assert "data" in json_response
    
    graph_data = json_response["data"]
    assert "nodes" in graph_data
    assert "edges" in graph_data
    
    # Verify content logic (GraphBuilder worked)
    node_labels = [n["label"] for n in graph_data["nodes"]]
    assert "function_a" in node_labels
    assert "function_b" in node_labels
    
    # Verify edges exist (function_a calls function_b)
    # Edge structure might vary slightly, checking existence
    assert len(graph_data["edges"]) >= 1

def test_generate_call_graph_with_smells_integration():
    """
    Integration test checking that Static Analysis results are correctly merged into the Graph.
    """
    # Snippet known to trigger 'columns_and_datatype_not_explicitly_set'
    code_snippet = """
import pandas as pd
def smelly_function():
    data = {'col1': [1, 2], 'col2': [3, 4]}
    df = pd.DataFrame(data)
    print(df)
"""
    payload = {
        "code_snippet": code_snippet,
        "file_name": "smelly_test.py"
    }

    response = client.post("/api/generate_call_graph", json=payload)

    assert response.status_code == 200
    json_response = response.json()
    assert json_response["success"] is True
    
    nodes = json_response["data"]["nodes"]
    
    # Find the node for 'smelly_function'
    smelly_node = next((n for n in nodes if "smelly_function" in n["label"]), None)
    
    assert smelly_node is not None, "Node for smelly_function not found in graph"
    
    # Verify that the smell was detected and attached to the node
    # Note: Dependent on 'columns_and_datatype_not_explicitly_set' rule being active
    assert smelly_node["has_smell"] is True
    assert smelly_node["smell_count"] > 0
    assert any(s["name"] == "columns_and_datatype_not_explicitly_set" for s in smelly_node["smell_details"])
