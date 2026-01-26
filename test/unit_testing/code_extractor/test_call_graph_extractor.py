import pytest
import ast
from code_extractor.call_graph_extractor import CallGraphExtractor

def test_extract_simple_function():
    source = """
def my_func():
    pass
"""
    extractor = CallGraphExtractor(source_code=source, file_path="test.py")
    tree = ast.parse(source)
    extractor.visit(tree)

    assert len(extractor.definitions) == 1
    def_ = extractor.definitions[0]
    assert def_["name"] == "my_func"
    assert def_["type"] == "FUNCTION"
    assert def_["file_path"] == "test.py"
    assert "def my_func():" in def_["source_code"]

def test_extract_async_function():
    source = """
async def my_async_func():
    pass
"""
    extractor = CallGraphExtractor(source_code=source, file_path="test.py")
    tree = ast.parse(source)
    extractor.visit(tree)

    assert len(extractor.definitions) == 1
    assert extractor.definitions[0]["name"] == "my_async_func"
    assert extractor.definitions[0]["type"] == "ASYNC_FUNCTION"

def test_extract_calls_within_function():
    source = """
def caller():
    callee()
"""
    extractor = CallGraphExtractor(source_code=source, file_path="test.py")
    tree = ast.parse(source)
    extractor.visit(tree)

    assert len(extractor.calls) == 1
    call = extractor.calls[0]
    assert call["caller_function"] == "caller"
    assert call["called_function"] == "callee"
    assert call["lineno"] == 3

def test_extract_calls_global_scope():
    source = """
print('hello')
"""
    extractor = CallGraphExtractor(source_code=source, file_path="test.py")
    tree = ast.parse(source)
    extractor.visit(tree)

    assert len(extractor.calls) == 1
    call = extractor.calls[0]
    assert call["caller_function"] is None
    assert call["called_function"] == "print"

def test_extract_method_calls():
    source = """
def caller():
    obj.method()
"""
    extractor = CallGraphExtractor(source_code=source, file_path="test.py")
    tree = ast.parse(source)
    extractor.visit(tree)

    assert len(extractor.calls) == 1
    assert extractor.calls[0]["called_function"] == "method"
    assert extractor.calls[0]["caller_function"] == "caller"

def test_nested_functions():
    source = """
def outer():
    def inner():
        pass
    inner()
"""
    extractor = CallGraphExtractor(source_code=source, file_path="test.py")
    tree = ast.parse(source)
    extractor.visit(tree)

    # Should define both outer and inner
    assert len(extractor.definitions) == 2
    names = [d["name"] for d in extractor.definitions]
    assert "outer" in names
    assert "inner" in names

    # Should have a call to inner
    assert len(extractor.calls) == 1
    assert extractor.calls[0]["called_function"] == "inner"
    assert extractor.calls[0]["caller_function"] == "outer"

def test_extract_call_name_edge_cases():
    # Only Name and Attribute are handled in _get_call_name
    source = """
def caller():
    (lambda x: x)()  # Call on a lambda, likely returns None for name
"""
    extractor = CallGraphExtractor(source_code=source, file_path="test.py")
    tree = ast.parse(source)
    extractor.visit(tree)

    # Should verify that it doesn't crash and maybe doesn't log a call or logs with None
    # Based on code: if call_name: append. So list should be empty if name is None
    assert len(extractor.calls) == 0
