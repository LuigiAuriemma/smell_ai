
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NodeDetailsModal from '../../components/NodeDetailsModal';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} data-testid="modal-content" {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('NodeDetailsModal', () => {
    const mockOnClose = jest.fn();

    const mockNodeBase = {
        id: 'module::Function',
        label: 'Function',
        full_name: 'module.Function',
        type: 'function',
        file_path: 'src/module.py',
        start_line: 10,
        end_line: 12,
        source_code: 'def function():\n    pass',
        has_smell: false,
        smell_count: 0,
        smell_details: [],
    };

    beforeEach(() => {
        mockOnClose.mockClear();
    });

    it('renders nothing when node is null', () => {
        const { container } = render(<NodeDetailsModal node={null} onClose={mockOnClose} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders node details correctly without smells', () => {
        render(<NodeDetailsModal node={mockNodeBase} onClose={mockOnClose} />);
        
        expect(screen.getByText('Node: Function')).toBeInTheDocument();
        expect(screen.getByText('src/module.py')).toBeInTheDocument();
        // Use regex to match the text part, avoiding strict equality issues with the preceding colon
        expect(screen.getByText(/: 10–12/)).toBeInTheDocument();
        expect(screen.getByText('def function():')).toBeInTheDocument();
        expect(screen.getByText('pass')).toBeInTheDocument();
        expect(screen.getByText('✅ Excellent! No smell detected in this function.')).toBeInTheDocument();
    });

    it('renders node details correctly with smells', () => {
        const smellyNode = {
            ...mockNodeBase,
            has_smell: true,
            smell_count: 1,
            smell_details: [{
                name: 'Long Method',
                description: 'Method is too long',
                line: 10
            }]
        };

        render(<NodeDetailsModal node={smellyNode} onClose={mockOnClose} />);

        expect(screen.getByText('Detected Smells (1)')).toBeInTheDocument();
        expect(screen.getByText('Long Method')).toBeInTheDocument();
        expect(screen.getByText('Method is too long')).toBeInTheDocument();
        expect(screen.getByText('Line: 10')).toBeInTheDocument();
        
        // Check if the smelly line is highlighted (class check is fragile, but content presence is key)
        const codeLine = screen.getByText('def function():');
        expect(codeLine).toHaveClass('text-red-800'); // Based on logic: isSmellLine ? 'text-red-800'
    });

    it('renders message when source code is missing', () => {
        const noSourceNode = {
            ...mockNodeBase,
            source_code: ''
        };

        render(<NodeDetailsModal node={noSourceNode} onClose={mockOnClose} />);

        expect(screen.getByText('No source code available')).toBeInTheDocument();
    });

    it('calls onClose when close buttons are clicked', () => {
        render(<NodeDetailsModal node={mockNodeBase} onClose={mockOnClose} />);

        const closeButtons = screen.getAllByRole('button');
        // Expect at least two buttons (header '×' and footer 'Close')
        expect(closeButtons.length).toBeGreaterThanOrEqual(2);

        fireEvent.click(closeButtons[0]);
        expect(mockOnClose).toHaveBeenCalledTimes(1);

        fireEvent.click(closeButtons[1]);
        expect(mockOnClose).toHaveBeenCalledTimes(2);
    });
    
    it('handles parsing module package name correctly', () => {
         const nodeWithRoot = {
            ...mockNodeBase,
            id: '::Function', // Starts with separator to produce empty string at index 0
        };
        render(<NodeDetailsModal node={nodeWithRoot} onClose={mockOnClose} />);
        expect(screen.getByText('Root')).toBeInTheDocument(); // id.split("::")[0] is "" -> fallback to "Root"
    });
});
