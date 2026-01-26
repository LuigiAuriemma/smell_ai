import pytest
from unittest.mock import MagicMock, patch, mock_open
import os
import networkx as nx
from components.dependency_graph_builder import DependencyGraphBuilder

@pytest.fixture
def mock_extractor_cls():
    with patch("components.dependency_graph_builder.CallGraphExtractor") as mock:
        yield mock

@pytest.fixture
def builder():
    return DependencyGraphBuilder(output_path="mock_output")

def test_initialization(builder):
    assert builder.output_path == "mock_output"
    assert isinstance(builder.graph, nx.DiGraph)
    assert builder.symbol_table == {}

def test_build_graph_simple(builder, mock_extractor_cls):
    # Setup mock extractor instance
    mock_extractor = mock_extractor_cls.return_value
    mock_extractor.definitions = [
        {"name": "func_a", "file_path": "file1.py", "type": "function", "start_line": 1, "end_line": 10, "source_code": "def func_a..."},
        {"name": "func_b", "file_path": "file1.py", "type": "function", "start_line": 12, "end_line": 20, "source_code": "def func_b..."}
    ]
    mock_extractor.calls = [
        {"caller_function": "func_a", "called_function": "func_b"}
    ]
    
    # Mock open and ast.parse
    file_content = "def func_a(): func_b()\ndef func_b(): pass"
    with patch("builtins.open", mock_open(read_data=file_content)), \
         patch("ast.parse"), \
         patch("os.path.relpath", return_value="file1.py"), \
         patch("os.makedirs"):
        
        builder.build_graph(["/abs/path/to/file1.py"])
        
        # Verify nodes
        assert "file1.py::func_a" in builder.graph.nodes
        assert "file1.py::func_b" in builder.graph.nodes
        
        # Verify edge
        assert builder.graph.has_edge("file1.py::func_a", "file1.py::func_b")
        
        # Verify attributes
        node_a = builder.graph.nodes["file1.py::func_a"]
        assert node_a["type"] == "function"
        assert node_a["start_line"] == 1

def test_build_graph_with_display_names(builder, mock_extractor_cls):
    mock_extractor = mock_extractor_cls.return_value
    mock_extractor.definitions = [{"name": "main", "file_path": "script.py", "type": "function", "start_line": 1, "end_line": 5, "source_code": "..."}]
    mock_extractor.calls = []

    with patch("builtins.open", mock_open(read_data="...")), \
         patch("ast.parse"), \
         patch("os.makedirs"):
        
        display_names = {"/tmp/random_temp_file.py": "script.py"}
        builder.build_graph(["/tmp/random_temp_file.py"], display_names=display_names)
        
        # Verify that the graph uses the display name (script.py) instead of temp path
        assert "script.py::main" in builder.graph.nodes
        assert builder.graph.nodes["script.py::main"]["file"] == "script.py"

def test_get_graph_data(builder):
    # Manually populate graph
    builder.graph.add_node("mod::func1", type="function", file="mod.py", start_line=1, end_line=5, source_code="code")
    builder.graph.add_node("mod::func2", type="function", file="mod.py", start_line=6, end_line=10, source_code="code")
    builder.graph.add_edge("mod::func1", "mod::func2")
    
    data = builder.get_graph_data()
    
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) == 2
    assert len(data["edges"]) == 1
    
    # Check node structure
    node1 = next(n for n in data["nodes"] if n["id"] == "mod::func1")
    assert node1["label"] == "func1"
    assert "x" in node1
    assert "y" in node1
    
    # Check edge structure
    edge = data["edges"][0]
    assert edge["source"] == "mod::func1"
    assert edge["target"] == "mod::func2"

def test_get_graph_data_empty(builder):
    data = builder.get_graph_data()
    assert data["nodes"] == []
    assert data["edges"] == []
