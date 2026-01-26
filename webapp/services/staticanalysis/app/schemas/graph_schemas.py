from typing import List, Optional
from pydantic import BaseModel

class SmellDetail(BaseModel):
    name: str
    description: str
    line: int

class GraphNode(BaseModel):
    id: str
    label: str
    full_name: str
    type: str = "function"
    file_path: str = ""
    start_line: int = 0
    end_line: int = 0
    source_code: str = ""
    x: float
    y: float
    has_smell: bool = False
    smell_count: int = 0
    smell_details: List[SmellDetail] = []

class GraphEdge(BaseModel):
    source: str
    target: str

class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class CallGraphResponse(BaseModel):
    success: bool
    data: Optional[GraphData]
    error: Optional[str] = None
