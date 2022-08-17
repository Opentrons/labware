"""Load liquid command request, result, and implementation models."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, Type, Dict, TYPE_CHECKING
from typing_extensions import Literal

from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate
from ..errors import (
    LiquidNotFoundError,
    LabwareNotLoadedError,
    WellDoesNotExistError,
)

if TYPE_CHECKING:
    from ..state import StateView

LoadLiquidCommandType = Literal["loadLiquid"]


class LoadLiquidParams(BaseModel):
    """Payload required to load a liquid into a well."""

    liquidId: str = Field(
        ...,
        description="Unique identifier of the liquid to load.",
    )
    labwareId: str = Field(
        ...,
        description="Unique identifier of labware to load liquid into.",
    )
    volumeByWell: Dict[str, float] = Field(
        ...,
        description="Volume of liquid, in µL, loaded into each well by name, in this labware.",
    )


class LoadLiquidResult(BaseModel):
    """Result data from the execution of a LoadLiquid command."""

    pass


class LoadLiquidImplementation(AbstractCommandImpl[LoadLiquidParams, LoadLiquidResult]):
    """Load liquid command implementation."""

    def __init__(self, state_view: StateView, **kwargs: object) -> None:
        self._state_view = state_view

    async def execute(self, params: LoadLiquidParams) -> LoadLiquidResult:
        """Load data necessary for a liquid."""
        if not self._state_view.liquid.has(params.liquidId):
            raise LiquidNotFoundError()

        try:
            labware_wells = self._state_view.labware.get_wells(params.labwareId)
        except KeyError:
            raise LabwareNotLoadedError()

        for well in params.volumeByWell:
            if well not in labware_wells:
                raise WellDoesNotExistError()

        return LoadLiquidResult()


class LoadLiquid(BaseCommand[LoadLiquidParams, LoadLiquidResult]):
    """Load liquid command resource model."""

    commandType: LoadLiquidCommandType = "loadLiquid"
    params: LoadLiquidParams
    result: Optional[LoadLiquidResult]

    _ImplementationCls: Type[LoadLiquidImplementation] = LoadLiquidImplementation


class LoadLiquidCreate(BaseCommandCreate[LoadLiquidParams]):
    """Load liquid command creation request."""

    commandType: LoadLiquidCommandType = "loadLiquid"
    params: LoadLiquidParams

    _CommandCls: Type[LoadLiquid] = LoadLiquid
