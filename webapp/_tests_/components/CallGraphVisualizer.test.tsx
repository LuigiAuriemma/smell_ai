
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CallGraphVisualizer from '../../components/CallGraphVisualizer';
import '@testing-library/jest-dom';

// Mock `react-plotly.js`
jest.mock("react-plotly.js", () => {
  return function MockPlot(props: any) {
    return (
        <div data-testid="mock-plot" onClick={props.onClick}>
            Mocked Plot
            <div data-testid="plot-data">{JSON.stringify(props.data)}</div>
        </div>
    );
  };
});

// Helper to create sample graph data
const createSampleData = () => ({
  nodes: [
    {
      id: 'func1',
      label: 'Function 1',
      full_name: 'module.Function1',
      type: 'function',
      file_path: '/path/to/file.py',
      start_line: 10,
      end_line: 20,
      source_code: 'def Function1(): pass',
      x: 0,
      y: 0,
      has_smell: false,
      smell_count: 0,
      smell_details: []
    },
    {
      id: 'func2',
      label: 'Function 2',
      full_name: 'module.Function2',
      type: 'function',
      file_path: '/path/to/file.py',
      start_line: 30,
      end_line: 40,
      source_code: 'def Function2(): pass',
      x: 1,
      y: 1,
      has_smell: true,
      smell_count: 1,
      smell_details: [{ name: 'Long Method', description: 'Too long', line: 30 }]
    }
  ],
  edges: [
    { source: 'func1', target: 'func2' }
  ]
});

describe("CallGraphVisualizer", () => {
  it("renders 'No graph data available' when data is null", () => {
    render(<CallGraphVisualizer data={null} />);
    expect(screen.getByText("No graph data available.")).toBeInTheDocument();
  });

  it("renders 'No graph data available' when nodes are empty", () => {
    render(<CallGraphVisualizer data={{ nodes: [], edges: [] }} />);
    expect(screen.getByText("No graph data available.")).toBeInTheDocument();
  });

  it("renders the Plot component when valid data is provided", async () => {
    const data = createSampleData();
    render(<CallGraphVisualizer data={data} />);

    // Since Plot is dynamically imported, we might need to wait, 
    // but often the mock is synchronous in tests.
    // However, checking for the element is safer with waitFor or findBy
    const plotElement = await screen.findByTestId('mock-plot');
    expect(plotElement).toBeInTheDocument();
  });
});
