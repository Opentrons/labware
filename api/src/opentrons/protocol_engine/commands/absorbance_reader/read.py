"""Command models to read absorbance."""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Dict, TYPE_CHECKING, List, Any

from typing_extensions import Literal, Type
from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors import CannotPerformModuleAction, StorageLimitReachedError
from ...errors.error_occurrence import ErrorOccurrence

from ...resources.file_provider import (
    PlateReaderData,
    ReadData,
    MAXIMUM_CSV_FILE_LIMIT,
)
from ...resources import FileProvider
from ...state import update_types

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


ReadAbsorbanceCommandType = Literal["absorbanceReader/read"]


class ReadAbsorbanceParams(BaseModel):
    """Input parameters for an absorbance reading."""

    moduleId: str = Field(..., description="Unique ID of the Absorbance Reader.")
    fileName: str | SkipJsonSchema[None] = Field(
        None,
        description="Optional file name to use when storing the results of a measurement.",
        json_schema_extra=_remove_default,
    )


class ReadAbsorbanceResult(BaseModel):
    """Result data from running an aborbance reading, returned as a dictionary map of wavelengths containing a map of values by well name (eg. {450: {"A1": 0.0, ...}})."""

    data: Optional[Dict[int, Dict[str, float]]] = Field(
        ..., description="Absorbance data points per wavelength."
    )
    fileIds: Optional[List[str]] = Field(
        ...,
        description="List of file IDs for files output as a result of a Read action.",
    )


class ReadAbsorbanceImpl(
    AbstractCommandImpl[ReadAbsorbanceParams, SuccessData[ReadAbsorbanceResult]]
):
    """Execution implementation of an Absorbance Reader measurement."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        file_provider: FileProvider,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment
        self._file_provider = file_provider

    async def execute(  # noqa: C901
        self, params: ReadAbsorbanceParams
    ) -> SuccessData[ReadAbsorbanceResult]:
        """Initiate an absorbance measurement."""
        state_update = update_types.StateUpdate()
        abs_reader_substate = self._state_view.modules.get_absorbance_reader_substate(
            module_id=params.moduleId
        )

        # Allow propagation of ModuleNotAttachedError.
        abs_reader = self._equipment.get_module_hardware_api(
            abs_reader_substate.module_id
        )

        if abs_reader_substate.configured is False:
            raise CannotPerformModuleAction(
                "Cannot perform Read action on Absorbance Reader without calling `.initialize(...)` first."
            )
        if abs_reader_substate.is_lid_on is False:
            raise CannotPerformModuleAction(
                "Absorbance Plate Reader can't read a plate with the lid open. Call `close_lid()` first."
            )

        # TODO: we need to return a file ID and increase the file count even when a moduel is not attached
        if (
            params.fileName is not None
            and abs_reader_substate.configured_wavelengths is not None
        ):
            # Validate that the amount of files we are about to generate does not put us higher than the limit
            if (
                self._state_view.files.get_filecount()
                + len(abs_reader_substate.configured_wavelengths)
                > MAXIMUM_CSV_FILE_LIMIT
            ):
                raise StorageLimitReachedError(
                    message=f"Attempt to write file {params.fileName} exceeds file creation limit of {MAXIMUM_CSV_FILE_LIMIT} files."
                )

        asbsorbance_result: Dict[int, Dict[str, float]] = {}
        transform_results = []
        # Handle the measurement and begin building data for return
        if abs_reader is not None:
            start_time = datetime.now()
            results = await abs_reader.start_measure()
            finish_time = datetime.now()
            if abs_reader._measurement_config is not None:
                sample_wavelengths = abs_reader._measurement_config.sample_wavelengths
                for wavelength, result in zip(sample_wavelengths, results):
                    converted_values = (
                        self._state_view.modules.convert_absorbance_reader_data_points(
                            data=result
                        )
                    )
                    asbsorbance_result[wavelength] = converted_values
                    transform_results.append(
                        ReadData.model_construct(
                            wavelength=wavelength, data=converted_values
                        )
                    )
        # Handle the virtual module case for data creation (all zeroes)
        elif self._state_view.config.use_virtual_modules:
            start_time = finish_time = datetime.now()
            if abs_reader_substate.configured_wavelengths is not None:
                for wavelength in abs_reader_substate.configured_wavelengths:
                    converted_values = (
                        self._state_view.modules.convert_absorbance_reader_data_points(
                            data=[0] * 96
                        )
                    )
                    asbsorbance_result[wavelength] = converted_values
                    transform_results.append(
                        ReadData.model_construct(
                            wavelength=wavelength, data=converted_values
                        )
                    )
            else:
                raise CannotPerformModuleAction(
                    "Plate Reader data cannot be requested with a module that has not been initialized."
                )

        state_update.set_absorbance_reader_data(
            module_id=abs_reader_substate.module_id, read_result=asbsorbance_result
        )
        # TODO (cb, 10-17-2024): FILE PROVIDER - Some day we may want to break the file provider behavior into a seperate API function.
        # When this happens, we probably will to have the change the command results handler we utilize to track file IDs in engine.
        # Today, the action handler for the FileStore looks for a ReadAbsorbanceResult command action, this will need to be delinked.

        # Begin interfacing with the file provider if the user provided a filename
        file_ids: list[str] = []
        if params.fileName is not None:
            # Create the Plate Reader Transform
            plate_read_result = PlateReaderData.model_construct(
                read_results=transform_results,
                reference_wavelength=abs_reader_substate.reference_wavelength,
                start_time=start_time,
                finish_time=finish_time,
                serial_number=abs_reader.serial_number
                if (abs_reader is not None and abs_reader.serial_number is not None)
                else "VIRTUAL_SERIAL",
            )

            if isinstance(plate_read_result, PlateReaderData):
                # Write a CSV file for each of the measurements taken
                for measurement in plate_read_result.read_results:
                    file_id = await self._file_provider.write_csv(
                        write_data=plate_read_result.build_generic_csv(
                            filename=params.fileName,
                            measurement=measurement,
                        )
                    )
                    file_ids.append(file_id)

                state_update.files_added = update_types.FilesAddedUpdate(
                    file_ids=file_ids
                )
                # Return success data to api
                return SuccessData(
                    public=ReadAbsorbanceResult(
                        data=asbsorbance_result,
                        fileIds=file_ids,
                    ),
                    state_update=state_update,
                )

        state_update.files_added = update_types.FilesAddedUpdate(file_ids=file_ids)

        return SuccessData(
            public=ReadAbsorbanceResult(
                data=asbsorbance_result,
                fileIds=file_ids,
            ),
            state_update=state_update,
        )


class ReadAbsorbance(
    BaseCommand[ReadAbsorbanceParams, ReadAbsorbanceResult, ErrorOccurrence]
):
    """A command to execute an Absorbance Reader measurement."""

    commandType: ReadAbsorbanceCommandType = "absorbanceReader/read"
    params: ReadAbsorbanceParams
    result: Optional[ReadAbsorbanceResult] = None

    _ImplementationCls: Type[ReadAbsorbanceImpl] = ReadAbsorbanceImpl


class ReadAbsorbanceCreate(BaseCommandCreate[ReadAbsorbanceParams]):
    """A request to execute an Absorbance Reader measurement."""

    commandType: ReadAbsorbanceCommandType = "absorbanceReader/read"
    params: ReadAbsorbanceParams

    _CommandCls: Type[ReadAbsorbance] = ReadAbsorbance
