"use client";

import { useState } from "react";
import Header from "../../components/HeaderComponent";
import Footer from "../../components/FooterComponent";
import { FaUpload } from "react-icons/fa";
import CallGraphVisualizer from "../../components/CallGraphVisualizer";
import GraphSummaryTable from "../../components/GraphSummaryTable";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

export default function CallGraphPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
      setGraphData(null); // Reset prev results
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".py")) {
        setFile(droppedFile);
        setFileName(droppedFile.name);
        setGraphData(null);
      } else {
        toast.error("Please upload a valid .py file.");
      }
    }
  };

  const generateGraph = async () => {
    if (!file) {
      toast.warning("Please upload a Python file first.");
      return;
    }

    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      
      try {
        const response = await fetch("http://localhost:8000/api/generate_call_graph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            code_snippet: text,
            file_name: file.name
          }),
        });

        const data = await response.json();

        if (data.success && data.data) {
          setGraphData(data.data);
          toast.success("Call Graph generated successfully!");
        } else {
          toast.error("Failed to generate graph: " + (data.error || "Unknown error"));
        }
      } catch (error) {
        console.error("Error generating graph:", error);
        toast.error("An error occurred while communicating with the server.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-grow pt-24 py-16 bg-gradient-to-b from-purple-50 via-purple-100 to-gray-50">
        <div className="max-w-5xl mx-auto px-6 space-y-10">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-purple-700 mb-4 tracking-tight">
              Call Graph Visualization
            </h1>
            <p className="text-lg text-gray-600">
              Visualize the dependencies and function calls within your Python code.
            </p>
          </div>

          {/* Upload Section */}
          <div 
            className="bg-white p-10 rounded-2xl shadow-lg border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
             <div className="text-center mb-6">
              <label
                htmlFor="file-upload"
                className="block text-xl font-semibold text-gray-700 mb-4"
              >
                Upload Python File
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".py"
                onChange={handleFileChange}
                className="hidden"
              />
               <button
                  onClick={() => document.getElementById("file-upload")?.click()}
                  className="bg-purple-100 text-purple-600 px-6 py-3 rounded-full font-semibold hover:bg-purple-200 transition-colors flex items-center justify-center mx-auto space-x-2"
                >
                  <FaUpload />
                  <span>Select File</span>
                </button>
             </div>
             
             {fileName && (
                <div className="text-center text-green-600 font-medium">
                  Selected: {fileName}
                </div>
              )}
              
             <p className="text-center text-gray-400 mt-4 text-sm">
                Or drag and drop your file here
              </p>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <motion.button
              onClick={generateGraph}
              disabled={loading || !file}
              className={`flex items-center space-x-3 px-8 py-4 rounded-xl text-lg font-bold text-white shadow-lg transition-all ${
                loading || !file
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 hover:scale-105"
              }`}
               whileTap={{ scale: 0.95 }}
            >
              {loading ? (
                 <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <span>Generate Graph</span>
                  {/* <FaChartNetwork /> Icon not found checking icons */} 
                </>
              )}
            </motion.button>
          </div>

          {/* Graph Visualization */}
          {graphData && (
             <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col lg:flex-row gap-8 items-start"
             >
                <div className="flex-grow w-full">
                    <CallGraphVisualizer data={graphData} />
                </div>
                <div className="w-full lg:w-auto flex-shrink-0">
                    <GraphSummaryTable data={graphData} />
                </div>
             </motion.div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
