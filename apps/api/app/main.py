from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.conversations import router as conversations_router
from app.api.routes.health import router as health_router
from app.api.routes.knowledge import router as knowledge_router
from app.api.routes.model_roles import router as model_roles_router
from app.api.routes.projects import router as projects_router
from app.api.routes.providers import router as providers_router
from app.api.routes.repositories import router as repositories_router
from app.api.routes.chat import router as chat_router
from app.api.routes.local_models import router as local_models_router
from app.api.routes.rag import router as rag_router
from app.api.routes.search import router as search_router
from app.api.routes.tags import router as tags_router
from app.core.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or get_settings()

    app = FastAPI(
        title=app_settings.app_name,
        version=app_settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    app.state.settings = app_settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(projects_router)
    app.include_router(knowledge_router)
    app.include_router(model_roles_router)
    app.include_router(tags_router)
    app.include_router(conversations_router)
    app.include_router(providers_router)
    app.include_router(repositories_router)
    app.include_router(search_router)
    app.include_router(chat_router)
    app.include_router(rag_router)
    app.include_router(local_models_router)
    return app


app = create_app()
