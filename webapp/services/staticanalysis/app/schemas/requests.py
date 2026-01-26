from pydantic import BaseModel
from typing import Optional


class DetectSmellRequest(BaseModel):
    """
    Schema for the request body to detect code smells.
    """

    code_snippet: str
    file_name: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "code_snippet": "def example_function():\n                print('Hello, world!')",
                "file_name": "example.py"
            }
        }
