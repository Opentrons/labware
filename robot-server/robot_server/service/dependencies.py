from datetime import datetime, timezone
from uuid import uuid4
from fastapi import Depends

from opentrons.hardware_control import ThreadedAsyncLock, ThreadManagedHardware

from robot_server.util import call_once
from robot_server.hardware import get_thread_manager
from robot_server.service.session.manager import SessionManager


@call_once
async def get_motion_lock() -> ThreadedAsyncLock:
    """
    Get the single motion lock.

    :return: a threaded async lock
    """
    return ThreadedAsyncLock()


@call_once
async def get_session_manager(
    thread_manager: ThreadManagedHardware = Depends(get_thread_manager),
    motion_lock: ThreadedAsyncLock = Depends(get_motion_lock),
) -> SessionManager:
    """The single session manager instance"""
    return SessionManager(
        hardware=thread_manager,
        motion_lock=motion_lock,
    )


async def get_unique_id() -> str:
    """Get a unique ID string to use as a resource identifier."""
    return str(uuid4())


async def get_current_time() -> datetime:
    """Get the current time in UTC to use as a resource timestamp."""
    return datetime.now(tz=timezone.utc)
