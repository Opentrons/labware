"""Configure for volume command request, result, and implementation models."""
from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Any

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema
from typing_extensions import Literal

from .pipetting_common import PipetteIdMixin
from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence
from ..state.update_types import StateUpdate

if TYPE_CHECKING:
    from ..execution import EquipmentHandler


ConfigureForVolumeCommandType = Literal["configureForVolume"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class ConfigureForVolumeParams(PipetteIdMixin):
    """Parameters required to configure volume for a specific pipette."""

    volume: float = Field(
        ...,
        description="Amount of liquid in uL. Must be at least 0 and no greater "
        "than a pipette-specific maximum volume.",
        ge=0,
    )
    tipOverlapNotAfterVersion: str | SkipJsonSchema[None] = Field(
        None,
        description="A version of tip overlap data to not exceed. The highest-versioned "
        "tip overlap data that does not exceed this version will be used. Versions are "
        "expressed as vN where N is an integer, counting up from v0. If None, the current "
        "highest version will be used.",
        json_schema_extra=_remove_default,
    )


class ConfigureForVolumeResult(BaseModel):
    """Result data from execution of an ConfigureForVolume command."""

    pass


class ConfigureForVolumeImplementation(
    AbstractCommandImpl[
        ConfigureForVolumeParams,
        SuccessData[ConfigureForVolumeResult],
    ]
):
    """Configure for volume command implementation."""

    def __init__(self, equipment: EquipmentHandler, **kwargs: object) -> None:
        self._equipment = equipment

    async def execute(
        self, params: ConfigureForVolumeParams
    ) -> SuccessData[ConfigureForVolumeResult]:
        """Check that requested pipette can be configured for the given volume."""
        pipette_result = await self._equipment.configure_for_volume(
            pipette_id=params.pipetteId,
            volume=params.volume,
            tip_overlap_version=params.tipOverlapNotAfterVersion,
        )

        state_update = StateUpdate()
        state_update.update_pipette_config(
            pipette_id=pipette_result.pipette_id,
            config=pipette_result.static_config,
            serial_number=pipette_result.serial_number,
        )

        return SuccessData(
            public=ConfigureForVolumeResult(),
            state_update=state_update,
        )


class ConfigureForVolume(
    BaseCommand[ConfigureForVolumeParams, ConfigureForVolumeResult, ErrorOccurrence]
):
    """Configure for volume command model."""

    commandType: ConfigureForVolumeCommandType = "configureForVolume"
    params: ConfigureForVolumeParams
    result: Optional[ConfigureForVolumeResult] = None

    _ImplementationCls: Type[
        ConfigureForVolumeImplementation
    ] = ConfigureForVolumeImplementation


class ConfigureForVolumeCreate(BaseCommandCreate[ConfigureForVolumeParams]):
    """Configure for volume command creation request model."""

    commandType: ConfigureForVolumeCommandType = "configureForVolume"
    params: ConfigureForVolumeParams

    _CommandCls: Type[ConfigureForVolume] = ConfigureForVolume
