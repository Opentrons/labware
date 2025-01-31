"""Maintenance Runs router."""
from server_utils.fastapi_utils.light_router import LightRouter

from .base_router import base_router

from .commands_router import commands_router
from .labware_router import labware_router

maintenance_runs_router = LightRouter()

maintenance_runs_router.include_router(base_router)
maintenance_runs_router.include_router(commands_router)
maintenance_runs_router.include_router(labware_router)

__all__ = ["maintenance_runs_router"]
