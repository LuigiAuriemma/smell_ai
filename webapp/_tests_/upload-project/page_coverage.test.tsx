import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProjectContext } from "../../context/ProjectContext";
import UploadProjectPage from "../../app/upload-project/page";
import { detectAi, detectStatic } from "../../utils/api";
import { toast } from "react-toastify";

// Mocking API calls and typing them
jest.mock("../../utils/api", () => ({
  detectAi: jest.fn(),
  detectStatic: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const Wrapper = ({ children, value }: { children: React.ReactNode, value?: any }) => (
  <ProjectContext.Provider value={value || {
    projects: [],
    addProject: jest.fn(),
    updateProject: jest.fn(),
    removeProject: jest.fn(),
  }}>
    {children}
  </ProjectContext.Provider>
);

// Helper to create a file with a mocked text() method
const createMockFile = (name: string, content: string): File => {
  const file = new File([content], name, { type: "text/python" });
  Object.defineProperty(file, 'text', {
    value: jest.fn().mockResolvedValue(content),
    writable: true 
  });
  return file;
};

describe("UploadProjectPage Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles successful submission with files and generates correct result string", async () => {
    const mockUpdateProject = jest.fn();
    const mockFile = createMockFile("test.py", "print('hello')");

    (detectAi as jest.Mock).mockResolvedValue({
      smells: [{ 
        function_name: "test_func", 
        line: 10, 
        smell_name: "Test Smell", 
        description: "A bad smell", 
        additional_info: "Fix it" 
      }],
      success: true
    });


    render(<UploadProjectPage />, {
      wrapper: ({children}) => <Wrapper children={children} value={{
          projects: [{ 
            name: "test-project",
            files: [mockFile], 
            data: { files: [], message: "", result: null, smells: [] }, 
            isLoading: false 
          }],
          addProject: jest.fn(),
          updateProject: mockUpdateProject,
          removeProject: jest.fn(),
        }} />
    });

    const submitButton = screen.getByText("Upload and Analyze All Projects");
    fireEvent.click(submitButton);

    await waitFor(() => expect(detectAi).toHaveBeenCalled());
    
    // Check if updateProject was called with expected result string structure
    await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledWith(0, expect.objectContaining({
            isLoading: false,
            data: expect.objectContaining({
                result: expect.stringContaining("Function: test_func"),
                smells: expect.any(Array)
            })
        }));
    });
    
    // Verify specific parts of the generated string
    const lastCall = mockUpdateProject.mock.calls[mockUpdateProject.mock.calls.length - 1];
    const updateData = lastCall[1];
    expect(updateData.data.result).toContain("Line: 10");
    expect(updateData.data.result).toContain("Smell: Test Smell");
    expect(updateData.data.result).toContain("Additional Info: Fix it");
  });

  it("handles submission with analysis failure (success: false)", async () => {
    const mockUpdateProject = jest.fn();
    const mockFile = createMockFile("fail.py", "code");

    (detectAi as jest.Mock).mockResolvedValue({
      success: false,
      smells: []
    });

    render(<UploadProjectPage />, {
      wrapper: ({children}) => <Wrapper children={children} value={{
          projects: [{ 
            name: "fail-project",
            files: [mockFile], 
            data: { files: [], message: "", result: null, smells: [] }, 
            isLoading: false 
          }],
          addProject: jest.fn(),
          updateProject: mockUpdateProject,
          removeProject: jest.fn(),
        }} />
    });

    fireEvent.click(screen.getByText("Upload and Analyze All Projects"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Analysis failed for snippet: fail.py"));
    });
  });

  it("handles submission with exception (Generic Error)", async () => {
    const mockUpdateProject = jest.fn();
    const mockFile = createMockFile("error.py", "code");

    (detectAi as jest.Mock).mockRejectedValue(new Error("Network Error"));

    render(<UploadProjectPage />, {
      wrapper: ({children}) => <Wrapper children={children} value={{
          projects: [{ 
            name: "error-project",
            files: [mockFile], 
            data: { files: [], message: "", result: null, smells: [] }, 
            isLoading: false 
          }],
          addProject: jest.fn(),
          updateProject: mockUpdateProject,
          removeProject: jest.fn(),
        }} />
    });

    fireEvent.click(screen.getByText("Upload and Analyze All Projects"));

    await waitFor(() => {
        // Should trigger the generic error toast in catch block
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Unexpected error analyzing snippet: error.py"));
    });
  });

    it("handles submission with exception (Data Success False)", async () => {
    const mockUpdateProject = jest.fn();
    const mockFile = createMockFile("error.py", "code");

    const specificError = { data: { success: false, message: "Custom API Error" } };
    (detectAi as jest.Mock).mockRejectedValue(specificError);

    render(<UploadProjectPage />, {
      wrapper: ({children}) => <Wrapper children={children} value={{
          projects: [{ 
            name: "error-project",
            files: [mockFile], 
            data: { files: [], message: "", result: null, smells: [] }, 
            isLoading: false 
          }],
          addProject: jest.fn(),
          updateProject: mockUpdateProject,
          removeProject: jest.fn(),
        }} />
    });

    fireEvent.click(screen.getByText("Upload and Analyze All Projects"));

    await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Error analyzing snippet: error.py - Custom API Error"));
    });
  });

  it("handles projects without files correctly (updateProject else branch)", async () => {
    const mockUpdateProject = jest.fn();
    
    // Project with no files (undefined/null)
    render(<UploadProjectPage />, {
      wrapper: ({children}) => <Wrapper children={children} value={{
          projects: [{ 
            name: "empty-project",
            files: null, 
            data: { files: null, message: "", result: null, smells: [] }, 
            isLoading: false 
          }],
          addProject: jest.fn(),
          updateProject: mockUpdateProject,
          removeProject: jest.fn(),
        }} />
    });

    fireEvent.click(screen.getByText("Upload and Analyze All Projects"));

    // Verify prepareCodeSnippets returns empty array and updateProjectsWithAnalysisResults hits else
    await waitFor(() => expect(detectAi).not.toHaveBeenCalled()); // Should handle empty list
    
    await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledWith(0, expect.objectContaining({
            data: expect.objectContaining({
                message: "Error, no valid files to analyze."
            })
        }));
    });
  });

  it("resets projects on global error (handleSubmitAll catch block)", async () => {
    const mockUpdateProject = jest.fn();
    // Use helper but mock rejection
    const mockFile = createMockFile("bad.py", "");
    (mockFile.text as jest.Mock).mockRejectedValue(new Error("Read Error"));

    render(<UploadProjectPage />, {
      wrapper: ({children}) => <Wrapper children={children} value={{
          projects: [{ 
            name: "bad-project",
            files: [mockFile], 
            data: { files: [], message: "", result: null, smells: [] }, 
            isLoading: false 
          }],
          addProject: jest.fn(),
          updateProject: mockUpdateProject,
          removeProject: jest.fn(),
        }} />
    });

    fireEvent.click(screen.getByText("Upload and Analyze All Projects"));

    await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Error during project analysis");
        // Verify resetProjectsOnError was called
        expect(mockUpdateProject).toHaveBeenCalledWith(0, expect.objectContaining({
             data: expect.objectContaining({
                message: "Error analyzing project."
            })
        }));
    });
  });
});
