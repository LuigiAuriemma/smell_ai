"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import NodeDetailsModal from './NodeDetailsModal';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface SmellDetail {
    name: string;
    description: string;
    line: number;
}

interface GraphNode {
  id: string;
  label: string;
  full_name: string;
  type: string;
  file_path: string;
  start_line: number;
  end_line: number;
  source_code: string;
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

interface CallGraphVisualizerProps {
  data: GraphData | null;
}

const CallGraphVisualizer: React.FC<CallGraphVisualizerProps> = ({ data }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  if (!data || !data.nodes.length) {
    return <div className="text-center text-gray-500 mt-4">No graph data available.</div>;
  }

  // Map nodes to dictionary for quick lookup by ID
  const nodeMap = new Map(data.nodes.map(node => [node.id, node]));

  // Create Annotations (Boxes with text) to replace standard markers
  const annotations = data.nodes.map((n) => {
    // Generate hover text (HTML subset supported by Plotly annotations)
    let hoverText = `<b>${n.full_name}</b>`;
    if (n.has_smell) {
        hoverText += `<br><br>🚨 <b>${n.smell_count} Smells Detected:</b><br>`;
        hoverText += n.smell_details.slice(0, 2).map(s => `• ${s.name}`).join('<br>');
        if(n.smell_details.length > 2) hoverText += '<br>...Click for full details';
    } else {
        hoverText += `<br><br>✅ No smells detected`;
    }

    return {
      x: n.x,
      y: n.y,
      text: `<b>${n.label}</b>`,
      showarrow: false,
      // Modern styling with opacity difference between background and border
      bgcolor: n.has_smell ? 'rgba(254, 226, 226, 0.9)' : 'rgba(219, 234, 254, 0.9)', // Light Red/Blue
      bordercolor: n.has_smell ? 'rgba(220, 38, 38, 1)' : 'rgba(37, 99, 235, 1)', // Darker Red/Blue Border
      borderwidth: 2,
      font: { 
        color: n.has_smell ? '#991b1b' : '#1e40af', // Dark Red/Blue Text
        size: 11
      },
      borderpad: 8,
      captureevents: true, // Capture click events on the annotation
      hovertext: hoverText
    };
  });

  // Prepare node trace (Invisible, just for structure if needed)
  const nodeTrace = {
    x: data.nodes.map(n => n.x),
    y: data.nodes.map(n => n.y),
    mode: 'markers',
    type: 'scatter',
    marker: {
      size: 1,
      color: 'rgba(0,0,0,0)' // Transparent
    },
    hoverinfo: 'none'
  };

  const handleAnnotationClick = (event: any) => {
    if (event && event.index !== undefined) {
        const node = data.nodes[event.index];
        if (node) {
            setSelectedNode(node);
        }
    }
  };

  // Prepare edge trace (lines)
  const edgeX: (number | null)[] = [];
  const edgeY: (number | null)[] = [];

  data.edges.forEach(edge => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    
    if (source && target) {
      edgeX.push(source.x, target.x, null);
      edgeY.push(source.y, target.y, null);
    }
  });

  const edgeTrace = {
    x: edgeX,
    y: edgeY,
    type: 'scatter',
    mode: 'lines',
    line: { width: 1, color: '#94a3b8' }, // Tailwind slate-400
    hoverinfo: 'none'
  };

  return (
    <div className="w-full h-[600px] border border-gray-200 rounded-lg shadow-sm bg-white">
      <Plot
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
        data={[edgeTrace as any, nodeTrace as any]}
        layout={{
          title: 'Call Graph Visualization',
          showlegend: false,
          hovermode: 'closest',
          margin: { b: 20, l: 20, r: 20, t: 40 },
          xaxis: { showgrid: false, zeroline: false, showticklabels: false },
          yaxis: { showgrid: false, zeroline: false, showticklabels: false },
          dragmode: 'pan',
          annotations: annotations as any[]
        }}
        config={{
          scrollZoom: true,
          displayModeBar: true,
          displaylogo: false
        }}
        onClickAnnotation={handleAnnotationClick} 
      />
      
      <NodeDetailsModal 
        node={selectedNode} 
        onClose={() => setSelectedNode(null)} 
      />
    </div>
  );
};

export default CallGraphVisualizer;
