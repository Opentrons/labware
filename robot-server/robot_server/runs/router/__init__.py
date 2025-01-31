"""Runs router."""
from server_utils.fastapi_utils.light_router import LightRouter

from .base_router import base_router
from .commands_router import commands_router
from .actions_router import actions_router
from .labware_router import labware_router
from .error_recovery_policy_router import error_recovery_policy_router

runs_router = LightRouter()

runs_router.include_router(base_router)
runs_router.include_router(commands_router)
runs_router.include_router(actions_router)
runs_router.include_router(labware_router)
runs_router.include_router(error_recovery_policy_router)

__all__ = ["runs_router"]
