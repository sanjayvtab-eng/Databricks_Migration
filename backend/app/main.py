from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.core.config import get_settings
from app.core.database import Base, engine
from app.api.routes import router
from app.models import canonical

s=get_settings()
Base.metadata.create_all(engine)
app=FastAPI(title=s.app_name,version="2.3.0")
app.add_middleware(CORSMiddleware,allow_origins=s.origins,allow_credentials=True,allow_methods=["*"],allow_headers=["*"])

class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response=await call_next(request)
        response.headers["X-Content-Type-Options"]="nosniff"
        response.headers["X-Frame-Options"]="DENY"
        response.headers["Referrer-Policy"]="no-referrer"
        if request.url.path.startswith("/docs") or request.url.path.startswith("/redoc"):
            response.headers["Content-Security-Policy"]=("default-src 'self' https: data:; script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; frame-ancestors 'none';")
        else:
            response.headers["Content-Security-Policy"]="default-src 'self'; frame-ancestors 'none'"
        return response
app.add_middleware(SecurityHeaders)
app.include_router(router)
@app.get("/health", tags=["System"])
def root_health(): return {"status":"ok","service":"migration-factory"}
