from fastapi import FastAPI
# when running locally/testing
from webapp.services.staticanalysis.app.routers.detect_smell import router
from webapp.services.staticanalysis.app.routers.call_graph import router as call_graph_router
# when deploying in docker
""" from app.routers.detect_smell import router
from app.routers.call_graph import router as call_graph_router """
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Static Analysis Service")

# Middleware for CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the router
app.include_router(router)
app.include_router(call_graph_router)
