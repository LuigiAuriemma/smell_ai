import ast
from typing import List, Dict, Any

class CallGraphExtractor(ast.NodeVisitor):
    """
    Extracts function definitions and function calls from Python code
    to support Call Graph generation.
    """

    def __init__(self, source_code: str = "", file_path: str = ""):
        self.definitions = []
        self.calls = []
        self.current_function = None
        self.source_code = source_code
        self.file_path = file_path

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self._handle_function_def(node, "FUNCTION")

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self._handle_function_def(node, "ASYNC_FUNCTION")

    def _handle_function_def(self, node, node_type="FUNCTION"):
        func_name = node.name
        
        func_source = ""
        if self.source_code:
            func_source = ast.get_source_segment(self.source_code, node) or ""

        self.definitions.append({
            "name": func_name,
            "start_line": node.lineno,
            "end_line": getattr(node, 'end_lineno', node.lineno),
            "source_code": func_source,
            "file_path": self.file_path,
            "type": node_type
        })
        
        previous_function = self.current_function
        self.current_function = func_name
        self.generic_visit(node)
        self.current_function = previous_function

    def visit_Call(self, node: ast.Call):
        call_name = self._get_call_name(node)
        if call_name:
            self.calls.append({
                "called_function": call_name,
                "lineno": node.lineno,
                "caller_function": self.current_function
            })
        self.generic_visit(node)

    def _get_call_name(self, node: ast.Call):
        if isinstance(node.func, ast.Name):
            return node.func.id
        elif isinstance(node.func, ast.Attribute):
            return node.func.attr
        return None
