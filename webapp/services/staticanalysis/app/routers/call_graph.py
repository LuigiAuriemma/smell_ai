from fastapi import APIRouter, HTTPException
from webapp.services.staticanalysis.app.schemas.requests import DetectSmellRequest
from webapp.services.staticanalysis.app.schemas.graph_schemas import CallGraphResponse, GraphData
from components.dependency_graph_builder import DependencyGraphBuilder
from components.inspector import Inspector
import tempfile
import os
import pandas as pd

router = APIRouter()

@router.post("/generate_call_graph", response_model=CallGraphResponse)
async def generate_call_graph(payload: DetectSmellRequest):
    code_snippet = payload.code_snippet
    file_name = payload.file_name or "uploaded_file.py"
    temp_file_path = None
    
    try:
        # temporary file
        with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w") as temp_file:
            temp_file.write(code_snippet)
            temp_file_path = temp_file.name
            
        # 1. Run Smell Detection
        inspector = Inspector("output") # Dummy output path
        smells_df = inspector.inspect(temp_file_path)
        
        # Prepare smell map: function_name -> list of smell details
        smell_map = {}
        if not smells_df.empty:
            for _, row in smells_df.iterrows():
                func_name = row.get("function_name")
                # Create a structure matching SmellDetail schema
                smell_info = {
                    "name": row.get("smell_name", "Unknown"),
                    "description": row.get("description", "No description available"),
                    "line": int(row.get("line", 0)) if pd.notna(row.get("line")) else 0
                }
                
                if func_name:
                    if func_name not in smell_map:
                        smell_map[func_name] = []
                    smell_map[func_name].append(smell_info)

        # 2. Build Call Graph
        # Use a temp directory for outputs that we might not even use, but the builder expects it
        with tempfile.TemporaryDirectory() as temp_out_dir:
            builder = DependencyGraphBuilder(temp_out_dir)

            # Map temp path to original file name
            display_map = {temp_file_path: file_name}
            builder.build_graph([temp_file_path], display_names=display_map)

            graph_data = builder.get_graph_data()
            
            # 3. Merge Smell Data into Graph Nodes
            for node in graph_data["nodes"]:
                # node["label"] usually contains the simple function name
                func_name = node["label"]
                if func_name in smell_map:
                    node["has_smell"] = True
                    node["smell_details"] = smell_map[func_name]
                    node["smell_count"] = len(smell_map[func_name])
                else:
                    node["has_smell"] = False
                    node["smell_details"] = []
                    node["smell_count"] = 0
            
        return CallGraphResponse(success=True, data=GraphData(**graph_data))
        
    except Exception as e:
        return CallGraphResponse(success=False, data=None, error=str(e))
        
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
