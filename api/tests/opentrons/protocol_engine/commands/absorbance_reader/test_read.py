"""Test absorbance reader initilize command."""
import pytest
from decoy import Decoy

from opentrons.drivers.types import ABSMeasurementMode, ABSMeasurementConfig
from opentrons.hardware_control.modules import AbsorbanceReader
from opentrons.protocol_engine.errors import (
    CannotPerformModuleAction,
    StorageLimitReachedError,
)

from opentrons.protocol_engine.execution import EquipmentHandler
from opentrons.protocol_engine.resources import FileProvider
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.module_substates import (
    AbsorbanceReaderSubState,
    AbsorbanceReaderId,
)
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.absorbance_reader import (
    ReadAbsorbanceResult,
    ReadAbsorbanceParams,
)
from opentrons.protocol_engine.commands.absorbance_reader.read import (
    ReadAbsorbanceImpl,
)


async def test_absorbance_reader_implementation(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    file_provider: FileProvider,
) -> None:
    """It should validate, find hardware module if not virtualized, and disengage."""
    subject = ReadAbsorbanceImpl(
        state_view=state_view, equipment=equipment, file_provider=file_provider
    )

    params = ReadAbsorbanceParams(
        moduleId="unverified-module-id",
    )

    mabsorbance_module_substate = decoy.mock(cls=AbsorbanceReaderSubState)
    absorbance_module_hw = decoy.mock(cls=AbsorbanceReader)
    verified_module_id = AbsorbanceReaderId("module-id")
    asbsorbance_result = {1: {"A1": 1.2}}

    decoy.when(
        state_view.modules.get_absorbance_reader_substate("unverified-module-id")
    ).then_return(mabsorbance_module_substate)

    decoy.when(mabsorbance_module_substate.module_id).then_return(verified_module_id)

    decoy.when(equipment.get_module_hardware_api(verified_module_id)).then_return(
        absorbance_module_hw
    )

    decoy.when(await absorbance_module_hw.start_measure()).then_return([[1.2, 1.3]])
    decoy.when(absorbance_module_hw._measurement_config).then_return(
        ABSMeasurementConfig(
            measure_mode=ABSMeasurementMode.SINGLE,
            sample_wavelengths=[1, 2],
            reference_wavelength=None,
        )
    )
    decoy.when(
        state_view.modules.convert_absorbance_reader_data_points([1.2, 1.3])
    ).then_return({"A1": 1.2})

    result = await subject.execute(params=params)

    assert result == SuccessData(
        public=ReadAbsorbanceResult(
            data=asbsorbance_result,
            fileIds=[],
        ),
        state_update=update_types.StateUpdate(
            files_added=update_types.FilesAddedUpdate(file_ids=[]),
            absorbance_reader_state_update=update_types.AbsorbanceReaderStateUpdate(
                module_id="module-id",
                absorbance_reader_data=update_types.AbsorbanceReaderDataUpdate(
                    read_result=asbsorbance_result
                ),
            ),
        ),
    )


async def test_read_raises_cannot_preform_action(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    file_provider: FileProvider,
) -> None:
    """It should raise CannotPerformModuleAction when not configured/lid is not on."""
    subject = ReadAbsorbanceImpl(
        state_view=state_view, equipment=equipment, file_provider=file_provider
    )

    params = ReadAbsorbanceParams(
        moduleId="unverified-module-id",
    )

    mabsorbance_module_substate = decoy.mock(cls=AbsorbanceReaderSubState)
    absorbance_module_hw = decoy.mock(cls=AbsorbanceReader)

    verified_module_id = AbsorbanceReaderId("module-id")

    decoy.when(
        state_view.modules.get_absorbance_reader_substate("unverified-module-id")
    ).then_return(mabsorbance_module_substate)

    decoy.when(mabsorbance_module_substate.module_id).then_return(verified_module_id)

    decoy.when(equipment.get_module_hardware_api(verified_module_id)).then_return(
        absorbance_module_hw
    )

    decoy.when(mabsorbance_module_substate.configured).then_return(False)

    with pytest.raises(CannotPerformModuleAction):
        await subject.execute(params=params)

    decoy.when(mabsorbance_module_substate.configured).then_return(True)

    decoy.when(mabsorbance_module_substate.is_lid_on).then_return(False)

    with pytest.raises(CannotPerformModuleAction):
        await subject.execute(params=params)


async def test_read_raises_storage_limit(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    file_provider: FileProvider,
) -> None:
    """It should raise StorageLimitReachedError when not configured/lid is not on."""
    subject = ReadAbsorbanceImpl(
        state_view=state_view, equipment=equipment, file_provider=file_provider
    )

    params = ReadAbsorbanceParams(moduleId="unverified-module-id", fileName="test")

    mabsorbance_module_substate = decoy.mock(cls=AbsorbanceReaderSubState)
    absorbance_module_hw = decoy.mock(cls=AbsorbanceReader)

    verified_module_id = AbsorbanceReaderId("module-id")

    decoy.when(
        state_view.modules.get_absorbance_reader_substate("unverified-module-id")
    ).then_return(mabsorbance_module_substate)

    decoy.when(mabsorbance_module_substate.module_id).then_return(verified_module_id)

    decoy.when(equipment.get_module_hardware_api(verified_module_id)).then_return(
        absorbance_module_hw
    )
    decoy.when(await absorbance_module_hw.start_measure()).then_return([[1.2, 1.3]])

    decoy.when(absorbance_module_hw._measurement_config).then_return(
        ABSMeasurementConfig(
            measure_mode=ABSMeasurementMode.SINGLE,
            sample_wavelengths=[1, 2],
            reference_wavelength=None,
        )
    )
    decoy.when(mabsorbance_module_substate.configured_wavelengths).then_return(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    )

    decoy.when(state_view.files.get_filecount()).then_return(390)
    with pytest.raises(StorageLimitReachedError):
        await subject.execute(params=params)
