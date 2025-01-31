"""Test absorbance reader initilize command."""
import pytest
from decoy import Decoy
from typing import List

from opentrons.drivers.types import ABSMeasurementMode
from opentrons.hardware_control.modules import AbsorbanceReader
from opentrons.protocol_engine.errors import InvalidWavelengthError

from opentrons.protocol_engine.execution import EquipmentHandler
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.module_substates import (
    AbsorbanceReaderSubState,
    AbsorbanceReaderId,
)
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.absorbance_reader import (
    InitializeParams,
    InitializeResult,
)
from opentrons.protocol_engine.commands.absorbance_reader.initialize import (
    InitializeImpl,
)


@pytest.fixture
def subject(
    state_view: StateView,
    equipment: EquipmentHandler,
) -> InitializeImpl:
    """Subject command implementation to test."""
    return InitializeImpl(state_view=state_view, equipment=equipment)


@pytest.mark.parametrize(
    "input_sample_wave_length, input_measure_mode", [([1, 2], "multi"), ([1], "single")]
)
async def test_absorbance_reader_implementation(
    decoy: Decoy,
    input_sample_wave_length: List[int],
    input_measure_mode: str,
    subject: InitializeImpl,
    state_view: StateView,
    equipment: EquipmentHandler,
) -> None:
    """It should validate, find hardware module if not virtualized, and disengage."""
    params = InitializeParams(
        moduleId="unverified-module-id",
        measureMode=input_measure_mode,  # type: ignore[arg-type]
        sampleWavelengths=input_sample_wave_length,
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

    decoy.when((absorbance_module_hw.supported_wavelengths)).then_return([1, 2])

    result = await subject.execute(params=params)

    decoy.verify(
        await absorbance_module_hw.set_sample_wavelength(
            ABSMeasurementMode(params.measureMode),
            params.sampleWavelengths,
            reference_wavelength=params.referenceWavelength,
        ),
        times=1,
    )
    assert result == SuccessData(
        public=InitializeResult(),
        state_update=update_types.StateUpdate(
            absorbance_reader_state_update=update_types.AbsorbanceReaderStateUpdate(
                module_id="module-id",
                initialize_absorbance_reader_update=update_types.AbsorbanceReaderInitializeUpdate(
                    measure_mode=input_measure_mode,  # type: ignore[arg-type]
                    sample_wave_lengths=input_sample_wave_length,
                    reference_wave_length=None,
                ),
            )
        ),
    )


@pytest.mark.parametrize(
    "input_sample_wave_length, input_measure_mode",
    [([1, 2, 3], "multi"), ([3], "single")],
)
async def test_initialize_raises_invalid_wave_length(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: InitializeImpl,
    input_sample_wave_length: List[int],
    input_measure_mode: str,
) -> None:
    """Should raise an InvalidWavelengthError error."""
    params = InitializeParams(
        moduleId="unverified-module-id",
        measureMode=input_measure_mode,  # type: ignore[arg-type]
        sampleWavelengths=input_sample_wave_length,
    )

    mabsorbance_module_substate = decoy.mock(cls=AbsorbanceReaderSubState)
    verified_module_id = AbsorbanceReaderId("module-id")
    absorbance_module_hw = decoy.mock(cls=AbsorbanceReader)

    decoy.when(
        state_view.modules.get_absorbance_reader_substate("unverified-module-id")
    ).then_return(mabsorbance_module_substate)

    decoy.when(mabsorbance_module_substate.module_id).then_return(verified_module_id)

    decoy.when(equipment.get_module_hardware_api(verified_module_id)).then_return(
        absorbance_module_hw
    )

    decoy.when((absorbance_module_hw.supported_wavelengths)).then_return([1, 2])

    with pytest.raises(InvalidWavelengthError):
        await subject.execute(params=params)


@pytest.mark.parametrize(
    "input_sample_wave_length, input_measure_mode",
    [([], "multi"), ([], "single")],
)
async def test_initialize_raises_measure_mode_not_matching(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: InitializeImpl,
    input_sample_wave_length: List[int],
    input_measure_mode: str,
) -> None:
    """Should raise an error that the measure mode does not match sample wave."""
    params = InitializeParams(
        moduleId="unverified-module-id",
        measureMode=input_measure_mode,  # type: ignore[arg-type]
        sampleWavelengths=input_sample_wave_length,
    )

    mabsorbance_module_substate = decoy.mock(cls=AbsorbanceReaderSubState)
    verified_module_id = AbsorbanceReaderId("module-id")
    absorbance_module_hw = decoy.mock(cls=AbsorbanceReader)

    decoy.when(
        state_view.modules.get_absorbance_reader_substate("unverified-module-id")
    ).then_return(mabsorbance_module_substate)

    decoy.when(mabsorbance_module_substate.module_id).then_return(verified_module_id)

    decoy.when(equipment.get_module_hardware_api(verified_module_id)).then_return(
        absorbance_module_hw
    )

    decoy.when((absorbance_module_hw.supported_wavelengths)).then_return([1, 2])

    with pytest.raises(ValueError):
        await subject.execute(params=params)


async def test_initialize_single_raises_reference_wave_length_not_matching(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: InitializeImpl,
) -> None:
    """Should raise an error that the measure mode does not match sample wave."""
    params = InitializeParams(
        moduleId="unverified-module-id",
        measureMode="single",
        sampleWavelengths=[1],
        referenceWavelength=3,
    )

    mabsorbance_module_substate = decoy.mock(cls=AbsorbanceReaderSubState)
    verified_module_id = AbsorbanceReaderId("module-id")
    absorbance_module_hw = decoy.mock(cls=AbsorbanceReader)

    decoy.when(
        state_view.modules.get_absorbance_reader_substate("unverified-module-id")
    ).then_return(mabsorbance_module_substate)

    decoy.when(mabsorbance_module_substate.module_id).then_return(verified_module_id)

    decoy.when(equipment.get_module_hardware_api(verified_module_id)).then_return(
        absorbance_module_hw
    )

    decoy.when((absorbance_module_hw.supported_wavelengths)).then_return([1, 2])

    with pytest.raises(InvalidWavelengthError):
        await subject.execute(params=params)


async def test_initialize_multi_raises_no_reference_wave_length(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    subject: InitializeImpl,
) -> None:
    """Should raise an error that the measure mode does not match sample wave."""
    params = InitializeParams(
        moduleId="unverified-module-id",
        measureMode="multi",
        sampleWavelengths=[1, 2],
        referenceWavelength=3,
    )

    mabsorbance_module_substate = decoy.mock(cls=AbsorbanceReaderSubState)
    verified_module_id = AbsorbanceReaderId("module-id")
    absorbance_module_hw = decoy.mock(cls=AbsorbanceReader)

    decoy.when(
        state_view.modules.get_absorbance_reader_substate("unverified-module-id")
    ).then_return(mabsorbance_module_substate)

    decoy.when(mabsorbance_module_substate.module_id).then_return(verified_module_id)

    decoy.when(equipment.get_module_hardware_api(verified_module_id)).then_return(
        absorbance_module_hw
    )

    decoy.when((absorbance_module_hw.supported_wavelengths)).then_return([1, 2])

    with pytest.raises(ValueError):
        await subject.execute(params=params)
