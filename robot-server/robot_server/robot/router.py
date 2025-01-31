"""Router for /robot endpoints."""
from server_utils.fastapi_utils.light_router import LightRouter

from .control.router import control_router

robot_router = LightRouter()

robot_router.include_router(router=control_router)
