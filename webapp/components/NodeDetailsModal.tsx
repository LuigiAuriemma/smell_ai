import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    has_smell: boolean;
    smell_count: number;
    smell_details: SmellDetail[];
}

interface NodeDetailsModalProps {
    node: GraphNode | null;
    onClose: () => void;
}

const NodeDetailsModal: React.FC<NodeDetailsModalProps> = ({ node, onClose }) => {
    if (!node) return null;

    // Helper to highlight lines with smells
    const renderCode = () => {
        if (!node.source_code) return <span className="text-gray-400 italic">No source code available</span>;

        const lines = node.source_code.split('\n');
        const smellLines = new Set(node.smell_details.map(s => s.line));

        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden font-mono text-sm">
                {lines.map((line, idx) => {
                    const currentLineNum = node.start_line + idx;
                    const isSmellLine = smellLines.has(currentLineNum);
                    
                    return (
                        <div 
                            key={idx} 
                            className={`flex ${isSmellLine ? 'bg-red-50' : 'hover:bg-gray-100'}`}
                        >
                            <span className="w-12 text-right pr-3 text-gray-400 select-none border-r bg-gray-100 py-0.5">
                                {currentLineNum}
                            </span>
                            <span className={`pl-3 pr-2 py-0.5 whitespace-pre-wrap flex-1 ${isSmellLine ? 'text-red-800' : 'text-gray-800'}`}>
                                {line}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            <span className="bg-blue-100 text-blue-600 p-2 rounded-lg text-lg">
                                🔧
                            </span>
                            Node: {node.label}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-light">
                            &times;
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-grow space-y-6">
                        
                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                                <span className="font-semibold text-gray-900 block">Type:</span>
                                {node.type}
                            </div>
                            <div>
                                <span className="font-semibold text-gray-900 block">Module/Package:</span>
                                {node.id.split("::")[0] || "Root"}
                            </div>
                            <div>
                                <span className="font-semibold text-gray-900 block">Defined in:</span>
                                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{node.file_path}</code>
                                <span className="ml-2">: {node.start_line}–{node.end_line}</span>
                            </div>
                        </div>

                        {/* Source Code */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 bg-blue-50 inline-block px-2 py-1 rounded">
                                Source Code (Lines {node.start_line} - {node.end_line}):
                            </h3>
                            {renderCode()}
                        </div>

                        {/* Smells Section */}
                        {node.has_smell && (
                            <div>
                                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-3">
                                    Detected Smells ({node.smell_count})
                                </h3>
                                <div className="space-y-3">
                                    {node.smell_details.map((smell, idx) => (
                                        <div key={idx} className="bg-red-50 border border-red-100 rounded-lg p-4">
                                            <div className="flex items-baseline justify-between mb-1">
                                                <span className="font-bold text-red-700 text-lg">{smell.name}</span>
                                                <span className="text-xs text-red-400 font-mono">Line: {smell.line}</span>
                                            </div>
                                            <p className="text-gray-700 text-sm leading-relaxed">
                                                {smell.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {!node.has_smell && (
                            <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
                                <span className="text-green-700 font-medium flex items-center justify-center gap-2">
                                    ✅ Excellent! No smell detected in this function.
                                </span>
                            </div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t bg-gray-50 flex justify-end">
                        <button 
                            onClick={onClose}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default NodeDetailsModal;
