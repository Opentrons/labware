"""FastAPI dependencies for the `/labwareOffsets` endpoints."""


from typing import Annotated

from fastapi import Depends

from server_utils.fastapi_utils.app_state import (
    AppState,
    AppStateAccessor,
    get_app_state,
)
from .store import LabwareOffsetStore


_labware_offset_store_accessor = AppStateAccessor[LabwareOffsetStore](
    "labware_offset_store"
)


async def get_labware_offset_store(
    app_state: Annotated[AppState, Depends(get_app_state)],
) -> LabwareOffsetStore:
    """Get the server's singleton LabwareOffsetStore."""
    labware_offset_store = _labware_offset_store_accessor.get_from(app_state)
    if labware_offset_store is None:
        labware_offset_store = LabwareOffsetStore()
        _labware_offset_store_accessor.set_on(app_state, labware_offset_store)
    return labware_offset_store
