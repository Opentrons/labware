"""Command models to initialize an Absorbance Reader."""
from __future__ import annotations
from typing import List, Optional, Literal, TYPE_CHECKING, Any
from typing_extensions import Type

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from opentrons.drivers.types import ABSMeasurementMode
from opentrons.protocol_engine.types import ABSMeasureMode

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence
from ...errors import InvalidWavelengthError
from ...state import update_types

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


InitializeCommandType = Literal["absorbanceReader/initialize"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class InitializeParams(BaseModel):
    """Input parameters to initialize an absorbance reading."""

    moduleId: str = Field(..., description="Unique ID of the absorbance reader.")
    measureMode: ABSMeasureMode = Field(
        ..., description="Initialize single or multi measurement mode."
    )
    sampleWavelengths: List[int] = Field(..., description="Sample wavelengths in nm.")
    referenceWavelength: int | SkipJsonSchema[None] = Field(
        None,
        description="Optional reference wavelength in nm.",
        json_schema_extra=_remove_default,
    )


class InitializeResult(BaseModel):
    """Result data from initializing an aborbance reading."""


class InitializeImpl(
    AbstractCommandImpl[InitializeParams, SuccessData[InitializeResult]]
):
    """Execution implementation of initializing an Absorbance Reader."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(self, params: InitializeParams) -> SuccessData[InitializeResult]:
        """Initiate a single absorbance measurement."""
        state_update = update_types.StateUpdate()
        abs_reader_substate = self._state_view.modules.get_absorbance_reader_substate(
            module_id=params.moduleId
        )
        # Allow propagation of ModuleNotAttachedError.
        abs_reader = self._equipment.get_module_hardware_api(
            abs_reader_substate.module_id
        )

        if abs_reader is not None:
            # Validate the parameters before initializing.
            sample_wavelengths = set(params.sampleWavelengths)
            sample_wavelengths_len = len(params.sampleWavelengths)
            reference_wavelength = params.referenceWavelength
            supported_wavelengths = set(abs_reader.supported_wavelengths)
            unsupported_wavelengths = sample_wavelengths.difference(
                supported_wavelengths
            )
            sample_wl_str = ", ".join([str(w) + "nm" for w in sample_wavelengths])
            supported_wl_str = ", ".join([str(w) + "nm" for w in supported_wavelengths])
            unsupported_wl_str = ", ".join(
                [str(w) + "nm" for w in unsupported_wavelengths]
            )
            if unsupported_wavelengths:
                raise InvalidWavelengthError(
                    f"Unsupported wavelengths: {unsupported_wl_str}. "
                    f" Use one of {supported_wl_str} instead."
                )

            if params.measureMode == "single":
                if sample_wavelengths_len != 1:
                    raise ValueError(
                        f"Measure mode `single` requires one sample wavelength,"
                        f" {sample_wl_str} provided instead."
                    )
                if (
                    reference_wavelength is not None
                    and reference_wavelength not in supported_wavelengths
                ):
                    raise InvalidWavelengthError(
                        f"Reference wavelength {reference_wavelength}nm is not supported."
                        f" Use one of {supported_wl_str} instead."
                    )

            if params.measureMode == "multi":
                if sample_wavelengths_len < 1 or sample_wavelengths_len > 6:
                    raise ValueError(
                        f"Measure mode `multi` requires 1-6 sample wavelengths,"
                        f" {sample_wl_str} provided instead."
                    )
                if reference_wavelength is not None:
                    raise ValueError(
                        "Reference wavelength cannot be used with Measure mode `multi`."
                    )

            await abs_reader.set_sample_wavelength(
                ABSMeasurementMode(params.measureMode),
                params.sampleWavelengths,
                reference_wavelength=params.referenceWavelength,
            )

        state_update.initialize_absorbance_reader(
            abs_reader_substate.module_id,
            params.measureMode,
            params.sampleWavelengths,
            params.referenceWavelength,
        )

        return SuccessData(public=InitializeResult(), state_update=state_update)


class Initialize(BaseCommand[InitializeParams, InitializeResult, ErrorOccurrence]):
    """A command to initialize an Absorbance Reader."""

    commandType: InitializeCommandType = "absorbanceReader/initialize"
    params: InitializeParams
    result: Optional[InitializeResult] = None

    _ImplementationCls: Type[InitializeImpl] = InitializeImpl


class InitializeCreate(BaseCommandCreate[InitializeParams]):
    """A request to execute an Absorbance Reader measurement."""

    commandType: InitializeCommandType = "absorbanceReader/initialize"
    params: InitializeParams

    _CommandCls: Type[Initialize] = Initialize
