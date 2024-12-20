"""Maintenance Runs router."""
from robot_server.fast_build_router import FastBuildRouter

from .base_router import base_router

from .commands_router import commands_router
from .labware_router import labware_router

maintenance_runs_router = FastBuildRouter()

maintenance_runs_router.include_router(base_router)
maintenance_runs_router.include_router(commands_router)
maintenance_runs_router.include_router(labware_router)

__all__ = ["maintenance_runs_router"]
