import os
import ast
import json
import networkx as nx
from typing import List
from code_extractor.call_graph_extractor import CallGraphExtractor

class DependencyGraphBuilder:
    """
    Builds a dependency graph (Call Graph) for the analyzed project.
    """

    def __init__(self, output_path: str):
        self.output_path = output_path
        self.graph = nx.DiGraph()
        self.symbol_table = {} 

    def build_graph(self, file_paths: List[str]):
        """
        Parses files and constructs the graph.
        """
        print("Building Call Graph...")
        file_data = {}
        
        # Pass 1: Definitions
        for file_path in file_paths:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    source = f.read()
                
                rel_path = os.path.relpath(file_path, os.getcwd())
                extractor = CallGraphExtractor(source_code=source, file_path=rel_path)
                tree = ast.parse(source)
                extractor.visit(tree)
                
                file_data[file_path] = extractor
                
                for definition in extractor.definitions:
                    func_name = definition["name"]
                    node_id = f"{rel_path}::{func_name}"
                    
                    if func_name not in self.symbol_table:
                        self.symbol_table[func_name] = []
                    self.symbol_table[func_name].append(node_id)
                    
                    self.graph.add_node(
                        node_id, 
                        file=definition["file_path"], 
                        type=definition["type"], 
                        start_line=definition["start_line"],
                        end_line=definition["end_line"],
                        source_code=definition["source_code"]
                    )
            except Exception as e:
                # print(f"Skipping {file_path}: {e}")
                pass

        # Pass 2: Calls (Edges)
        for file_path, extractor in file_data.items():
            rel_path = os.path.relpath(file_path, os.getcwd())
            
            for call in extractor.calls:
                caller = call["caller_function"]
                called = call["called_function"]
                
                source_id = f"{rel_path}::{caller}" if caller else f"{rel_path}::(global)"
                
                # Simple Name Resolution
                if called in self.symbol_table:
                    for target_id in self.symbol_table[called]:
                        self.graph.add_edge(source_id, target_id)
        
        self._save_graph()

    def _save_graph(self):
        data = nx.node_link_data(self.graph)
        output_file = os.path.join(self.output_path, "call_graph.json")
        os.makedirs(self.output_path, exist_ok=True)
        with open(output_file, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Call Graph saved to {output_file}")

        self._save_dot()
        self._save_puml()

    def _save_dot(self):
        output_file = os.path.join(self.output_path, "call_graph.dot")
        os.makedirs(self.output_path, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("digraph call_graph {\n")
            f.write("    rankdir=LR;\n")
            f.write("    node [shape=box];\n")
            
            for node, data in self.graph.nodes(data=True):
                label = f"{node}"
                if "file" in data and "start_line" in data:
                    label += f"\\n({data['file']}:{data['start_line']})"
                f.write(f'    "{node}" [label="{label}"];\n')

            for u, v in self.graph.edges():
                f.write(f'    "{u}" -> "{v}";\n')
            f.write("}\n")
        print(f"Call Graph saved to {output_file}")

    def _save_puml(self):
        output_file = os.path.join(self.output_path, "call_graph.puml")
        os.makedirs(self.output_path, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("@startuml\n")
            
            node_ids = {node: f"node_{i}" for i, node in enumerate(self.graph.nodes())}
            
            for node, nid in node_ids.items():
                f.write(f'component "{node}" as {nid}\n')
                
            for u, v in self.graph.edges():
                if u in node_ids and v in node_ids:
                    f.write(f"{node_ids[u]} --> {node_ids[v]}\n")
            
            f.write("@enduml\n")
        print(f"Call Graph saved to {output_file}")
