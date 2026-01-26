"use client";

import React, { useMemo } from 'react';

interface SmellDetail {
    name: string;
    description: string;
    line: number;
}

interface GraphNode {
  id: string;
  label: string;
  full_name: string;
  x: number;
  y: number;
  has_smell: boolean;
  smell_count: number;
  smell_details: SmellDetail[];
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphSummaryTableProps {
  data: GraphData | null;
}

const GraphSummaryTable: React.FC<GraphSummaryTableProps> = ({ data }) => {
  const stats = useMemo(() => {
    if (!data) return null;
    
    const totalSmells = data.nodes.reduce((acc, node) => acc + (node.smell_count || 0), 0);
    return { 
        totalSmells, 
        totalNodes: data.nodes.length,
        totalEdges: data.edges.length 
    };
  }, [data]);

  if (!data || !stats) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 w-full max-w-sm">
      <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">Summary</h3>
      
      <div className="space-y-3 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-red-100 border-2 border-red-500 rounded"></div>
          <span className="text-gray-700 font-medium">Smell Detected</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-blue-100 border-2 border-blue-500 rounded"></div>
          <span className="text-gray-700 font-medium">No smells</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
            <h4 className="text-lg font-bold text-gray-800">Total Smells:</h4>
            <span className="text-2xl font-extrabold text-red-600">{stats.totalSmells}</span>
        </div>
        <div className="flex items-baseline justify-between">
            <h4 className="text-md font-semibold text-gray-600">Total Functions:</h4>
            <span className="text-lg font-bold text-gray-800">{stats.totalNodes}</span>
        </div>
        <div className="flex items-baseline justify-between">
            <h4 className="text-md font-semibold text-gray-600">Total Calls:</h4>
            <span className="text-lg font-bold text-gray-800">{stats.totalEdges}</span>
        </div>
      </div>
    </div>
  );
};

export default GraphSummaryTable;
