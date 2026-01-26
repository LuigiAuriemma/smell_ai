import pytest
import os
import json
import pandas as pd
from unittest.mock import Mock, patch
from cli.cli_runner import CodeSmileCLI


@pytest.fixture
def graph_integration_setup(tmp_path):
    input_path = tmp_path / "input_graph"
    output_path = tmp_path / "output_graph"
    input_path.mkdir()
    
    # Create a Python file with a known call structure
    # func_a calls func_b
    code = """
def func_a():
    func_b()

def func_b():
    print("hello")
"""
    (input_path / "main.py").write_text(code, encoding="utf-8")

    return str(input_path), str(output_path)


@patch("components.rule_checker.RuleChecker.rule_check")
def test_cli_call_graph_integration(mock_rule_check, graph_integration_setup):
    """
    Integration test for CR-01: Verifies that the CLI with --call-graph flag
    correctly generates a JSON call graph file with the expected structure.
    """
    # Mock RuleChecker to avoid needing actual ML models or rule logic
    # We return an empty DataFrame as if no smells were found.
    mock_rule_check.return_value = pd.DataFrame(columns=[
        "filename", "function_name", "smell_name", 
        "line", "description", "additional_info"
    ])

    input_path, output_path = graph_integration_setup

    args = Mock(
        input=input_path,
        output=output_path,
        parallel=False,
        resume=False,
        multiple=False,
        max_walkers=1,
        call_graph=True  # Enable call graph generation
    )

    # Execute
    with patch("builtins.print"):
        cli = CodeSmileCLI(args)
        cli.execute()
    
    # Assertions
    # Note: ProjectAnalyzer appends "output" to the given output path
    expected_output_dir = os.path.join(output_path, "output")
    json_path = os.path.join(expected_output_dir, "call_graph.json")
    
    assert os.path.exists(json_path), f"Graph file not found at {json_path}"
    
    # Verify graph content
    with open(json_path, 'r', encoding="utf-8") as f:
        graph_data = json.load(f)
        
    # Check that we have nodes and links/edges
    assert "nodes" in graph_data
    # NetworkX node_link_data uses 'links' or 'edges' depending on version/config
    # Based on failure output, it is using 'edges'
    link_key = "links" if "links" in graph_data else "edges"
    assert link_key in graph_data
    
    # Find our functions in the nodes
    nodes = graph_data['nodes']
    node_ids = [n['id'] for n in nodes]
    
    # Check for relative path usage in IDs, e.g., "main.py::func_a"
    func_a_id = next((nid for nid in node_ids if "main.py::func_a" in nid), None)
    func_b_id = next((nid for nid in node_ids if "main.py::func_b" in nid), None)
    
    assert func_a_id is not None, "func_a node not found in graph keys"
    assert func_b_id is not None, "func_b node not found in graph keys"
    
    # Check validation of edge
    links = graph_data[link_key]
    # Link format: {'source': id, 'target': id}
    
    edge_found = False
    for link in links:
        if link['source'] == func_a_id and link['target'] == func_b_id:
            edge_found = True
            break
            
    assert edge_found, f"Expected edge {func_a_id} -> {func_b_id} not found"


@pytest.fixture
def multi_file_setup(tmp_path):
    input_path = tmp_path / "input_multi"
    output_path = tmp_path / "output_multi"
    input_path.mkdir()

    # utils.py
    (input_path / "utils.py").write_text("def helper():\n    pass", encoding="utf-8")

    # main.py
    main_code = """
from utils import helper

def main():
    helper()
"""
    (input_path / "main.py").write_text(main_code, encoding="utf-8")

    return str(input_path), str(output_path)


@patch("components.rule_checker.RuleChecker.rule_check")
def test_cli_call_graph_multifile(mock_rule_check, multi_file_setup):
    """
    Verifies call graph generation across multiple files (main.py -> utils.py).
    """
    mock_rule_check.return_value = pd.DataFrame(columns=[
        "filename", "function_name", "smell_name",
        "line", "description", "additional_info"
    ])

    input_path, output_path = multi_file_setup
    args = Mock(
        input=input_path,
        output=output_path,
        parallel=False,
        resume=False,
        multiple=False,
        max_walkers=1,
        call_graph=True
    )

    with patch("builtins.print"):
        cli = CodeSmileCLI(args)
        cli.execute()
    
    # Check output
    json_path = os.path.join(output_path, "output", "call_graph.json")
    assert os.path.exists(json_path)

    with open(json_path, 'r', encoding="utf-8") as f:
        graph_data = json.load(f)
    
    nodes = graph_data['nodes']
    node_ids = [n['id'] for n in nodes]

    # Check for presence of both functions
    # Using 'in' because the path prefix might be full or relative depending on execution context
    utils_id = next((nid for nid in node_ids if "utils.py::helper" in nid), None)
    main_id = next((nid for nid in node_ids if "main.py::main" in nid), None)

    assert utils_id, "utils.py::helper not found"
    assert main_id, "main.py::main not found"

    # Check edge
    link_key = "links" if "links" in graph_data else "edges"
    edges = graph_data[link_key]
    
    found = any(e['source'] == main_id and e['target'] == utils_id for e in edges)
    assert found, f"Edge from {main_id} to {utils_id} not found"


