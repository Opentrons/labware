"""Pipetting execution handler."""

import pytest
from decoy import Decoy, matchers

from typing import Dict, ContextManager, Optional, OrderedDict
from contextlib import nullcontext as does_not_raise

from opentrons.types import Mount, MountType, Point
from opentrons.hardware_control import API as HardwareAPI
from opentrons.hardware_control.types import TipStateType
from opentrons.hardware_control.protocols.types import OT2RobotType, FlexRobotType

from opentrons.protocols.models import LabwareDefinition
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.types import TipGeometry, TipPresenceStatus
from opentrons.protocol_engine.resources import LabwareDataProvider
from opentrons.protocol_engine.errors.exceptions import TipNotAttachedError
from opentrons_shared_data.errors.exceptions import (
    CommandPreconditionViolated,
    CommandParameterLimitViolated,
)
from opentrons.protocol_engine.execution.tip_handler import (
    HardwareTipHandler,
    VirtualTipHandler,
    create_tip_handler,
)
from opentrons.hardware_control.nozzle_manager import NozzleMap
from opentrons_shared_data.pipette.pipette_definition import ValidNozzleMaps


@pytest.fixture
def mock_hardware_api(decoy: Decoy) -> HardwareAPI:
    """Get a mock in the shape of a HardwareAPI."""
    mock = decoy.mock(cls=HardwareAPI)
    decoy.when(mock.get_robot_type()).then_return(OT2RobotType)
    return mock


@pytest.fixture
def mock_state_view(decoy: Decoy) -> StateView:
    """Get a mock in the shape of a StateStore."""
    return decoy.mock(cls=StateView)


@pytest.fixture
def mock_labware_data_provider(decoy: Decoy) -> LabwareDataProvider:
    """Get a mock LabwareDataProvider."""
    return decoy.mock(cls=LabwareDataProvider)


@pytest.fixture
def tip_rack_definition() -> LabwareDefinition:
    """Get a tip rack defintion value object."""
    return LabwareDefinition.model_construct(namespace="test", version=42)  # type: ignore[call-arg]


MOCK_MAP = NozzleMap.build(
    physical_nozzles=OrderedDict({"A1": Point(0, 0, 0)}),
    physical_rows=OrderedDict({"A": ["A1"]}),
    physical_columns=OrderedDict({"1": ["A1"]}),
    starting_nozzle="A1",
    back_left_nozzle="A1",
    front_right_nozzle="A1",
    valid_nozzle_maps=ValidNozzleMaps(maps={"Full": ["A1"]}),
)


async def test_create_tip_handler(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
) -> None:
    """It should return virtual or real tip handlers depending on config."""
    decoy.when(mock_state_view.config.use_virtual_pipettes).then_return(False)
    assert isinstance(
        create_tip_handler(
            state_view=mock_state_view,
            hardware_api=mock_hardware_api,
        ),
        HardwareTipHandler,
    )

    decoy.when(mock_state_view.config.use_virtual_pipettes).then_return(True)
    assert isinstance(
        create_tip_handler(
            state_view=mock_state_view,
            hardware_api=mock_hardware_api,
        ),
        VirtualTipHandler,
    )


@pytest.mark.parametrize("tip_state", [TipStateType.PRESENT, TipStateType.ABSENT])
async def test_flex_pick_up_tip_state(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_labware_data_provider: LabwareDataProvider,
    tip_rack_definition: LabwareDefinition,
    tip_state: TipStateType,
    mock_hardware_api: HardwareAPI,
) -> None:
    """Test the protocol engine's pick_up_tip logic."""
    subject = HardwareTipHandler(
        state_view=mock_state_view,
        hardware_api=mock_hardware_api,
        labware_data_provider=mock_labware_data_provider,
    )
    decoy.when(mock_state_view.pipettes.get_mount("pipette-id")).then_return(
        MountType.LEFT
    )
    decoy.when(mock_state_view.pipettes.get_serial_number("pipette-id")).then_return(
        "pipette-serial"
    )
    decoy.when(mock_state_view.labware.get_definition("labware-id")).then_return(
        tip_rack_definition
    )
    decoy.when(
        mock_state_view.pipettes.get_nozzle_configuration("pipette-id")
    ).then_return(MOCK_MAP)
    decoy.when(
        mock_state_view.geometry.get_nominal_tip_geometry(
            pipette_id="pipette-id",
            labware_id="labware-id",
            well_name="B2",
        )
    ).then_return(TipGeometry(length=50, diameter=5, volume=300))

    decoy.when(
        await mock_labware_data_provider.get_calibrated_tip_length(
            pipette_serial="pipette-serial",
            labware_definition=tip_rack_definition,
            nominal_fallback=50,
        )
    ).then_return(42)

    if tip_state == TipStateType.PRESENT:
        await subject.pick_up_tip(
            pipette_id="pipette-id",
            labware_id="labware-id",
            well_name="B2",
        )
        decoy.verify(mock_hardware_api.cache_tip(Mount.LEFT, 42), times=1)
    else:
        decoy.when(
            await subject.verify_tip_presence(
                pipette_id="pipette-id", expected=TipPresenceStatus.PRESENT
            )
        ).then_raise(TipNotAttachedError())
        # if a TipNotAttchedError is caught, we should not add any tip information
        with pytest.raises(TipNotAttachedError):
            await subject.pick_up_tip(
                pipette_id="pipette-id",
                labware_id="labware-id",
                well_name="B2",
            )
        decoy.verify(
            mock_hardware_api.cache_tip(
                mount=matchers.Anything(),
                tip_length=matchers.Anything(),
            ),
            ignore_extra_args=True,
            times=0,
        )


async def test_pick_up_tip(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    mock_labware_data_provider: LabwareDataProvider,
    tip_rack_definition: LabwareDefinition,
) -> None:
    """It should use the hardware API to pick up a tip."""
    subject = HardwareTipHandler(
        state_view=mock_state_view,
        hardware_api=mock_hardware_api,
        labware_data_provider=mock_labware_data_provider,
    )

    decoy.when(mock_state_view.labware.get_definition("labware-id")).then_return(
        tip_rack_definition
    )

    decoy.when(mock_state_view.pipettes.get_serial_number("pipette-id")).then_return(
        "pipette-serial"
    )

    decoy.when(mock_state_view.pipettes.get_mount("pipette-id")).then_return(
        MountType.LEFT
    )

    decoy.when(
        mock_state_view.pipettes.get_nozzle_configuration(pipette_id="pipette-id")
    ).then_return(MOCK_MAP)

    decoy.when(
        mock_state_view.geometry.get_nominal_tip_geometry(
            pipette_id="pipette-id",
            labware_id="labware-id",
            well_name="B2",
        )
    ).then_return(TipGeometry(length=50, diameter=5, volume=300))

    decoy.when(
        await mock_labware_data_provider.get_calibrated_tip_length(
            pipette_serial="pipette-serial",
            labware_definition=tip_rack_definition,
            nominal_fallback=50,
        )
    ).then_return(42)

    result = await subject.pick_up_tip(
        pipette_id="pipette-id",
        labware_id="labware-id",
        well_name="B2",
    )

    assert result == TipGeometry(length=42, diameter=5, volume=300)

    decoy.verify(
        await mock_hardware_api.tip_pickup_moves(
            mount=Mount.LEFT,
            presses=None,
            increment=None,
        ),
        mock_hardware_api.set_current_tiprack_diameter(
            mount=Mount.LEFT,
            tiprack_diameter=5,
        ),
        mock_hardware_api.set_working_volume(mount=Mount.LEFT, tip_volume=300),
    )


# todo(mm, 2024-10-17): Test that when verify_tip_presence raises,
# the hardware API state is NOT updated.
async def test_drop_tip(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    mock_labware_data_provider: LabwareDataProvider,
) -> None:
    """It should use the hardware API to drop a tip."""
    subject = HardwareTipHandler(
        state_view=mock_state_view,
        hardware_api=mock_hardware_api,
        labware_data_provider=mock_labware_data_provider,
    )

    decoy.when(mock_state_view.pipettes.get_mount("pipette-id")).then_return(
        MountType.RIGHT
    )
    decoy.when(
        mock_state_view.pipettes.get_nozzle_configuration("pipette-id")
    ).then_return(MOCK_MAP)

    await subject.drop_tip(pipette_id="pipette-id", home_after=True)

    decoy.verify(
        await mock_hardware_api.tip_drop_moves(
            mount=Mount.RIGHT, ignore_plunger=False, home_after=True
        )
    )
    decoy.verify(mock_hardware_api.remove_tip(mount=Mount.RIGHT))
    decoy.verify(
        mock_hardware_api.set_current_tiprack_diameter(
            mount=Mount.RIGHT, tiprack_diameter=0
        )
    )


def test_add_tip(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    mock_labware_data_provider: LabwareDataProvider,
) -> None:
    """It should add a tip manually to the hardware API."""
    subject = HardwareTipHandler(
        state_view=mock_state_view,
        hardware_api=mock_hardware_api,
        labware_data_provider=mock_labware_data_provider,
    )

    tip = TipGeometry(
        length=50,
        diameter=5,
        volume=300,
    )

    decoy.when(mock_state_view.pipettes.get_mount("pipette-id")).then_return(
        MountType.LEFT
    )

    subject.cache_tip(pipette_id="pipette-id", tip=tip)

    decoy.verify(
        mock_hardware_api.cache_tip(mount=Mount.LEFT, tip_length=50),
        mock_hardware_api.set_current_tiprack_diameter(
            mount=Mount.LEFT,
            tiprack_diameter=5,
        ),
        mock_hardware_api.set_working_volume(mount=Mount.LEFT, tip_volume=300),
    )


def test_remove_tip(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    mock_labware_data_provider: LabwareDataProvider,
) -> None:
    """It should remove a tip manually from the hardware API."""
    subject = HardwareTipHandler(
        state_view=mock_state_view,
        hardware_api=mock_hardware_api,
        labware_data_provider=mock_labware_data_provider,
    )

    decoy.when(mock_state_view.pipettes.get_mount("pipette-id")).then_return(
        MountType.LEFT
    )

    subject.remove_tip(pipette_id="pipette-id")

    decoy.verify(
        mock_hardware_api.remove_tip(Mount.LEFT),
        mock_hardware_api.set_current_tiprack_diameter(Mount.LEFT, 0),
    )


@pytest.mark.parametrize(
    argnames=[
        "test_channels",
        "style",
        "primary_nozzle",
        "front_nozzle",
        "back_nozzle",
        "exception",
        "expected_result",
        "tip_result",
    ],
    argvalues=[
        [
            8,
            "COLUMN",
            "A1",
            None,
            None,
            does_not_raise(),
            {
                "primary_nozzle": "A1",
                "front_right_nozzle": "H1",
                "back_left_nozzle": "A1",
            },
            None,
        ],
        [
            8,
            "ROW",
            "A1",
            None,
            None,
            pytest.raises(CommandParameterLimitViolated),
            None,
            None,
        ],
        [
            8,
            "SINGLE",
            "A1",
            None,
            None,
            does_not_raise(),
            {"primary_nozzle": "A1"},
            None,
        ],
        [
            1,
            "SINGLE",
            "A1",
            None,
            None,
            pytest.raises(CommandPreconditionViolated),
            None,
            None,
        ],
        [
            8,
            "COLUMN",
            "A1",
            None,
            None,
            pytest.raises(CommandPreconditionViolated),
            None,
            TipGeometry(length=50, diameter=5, volume=300),
        ],
    ],
)
async def test_available_nozzle_layout(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    mock_labware_data_provider: LabwareDataProvider,
    test_channels: int,
    style: str,
    primary_nozzle: Optional[str],
    front_nozzle: Optional[str],
    back_nozzle: Optional[str],
    exception: ContextManager[None],
    expected_result: Optional[Dict[str, str]],
    tip_result: Optional[TipGeometry],
) -> None:
    """The virtual and hardware pipettes should return the same data and error at the same time."""
    hw_subject = HardwareTipHandler(
        state_view=mock_state_view,
        hardware_api=mock_hardware_api,
        labware_data_provider=mock_labware_data_provider,
    )
    virtual_subject = VirtualTipHandler(state_view=mock_state_view)
    decoy.when(mock_state_view.pipettes.get_channels("pipette-id")).then_return(
        test_channels
    )
    decoy.when(mock_state_view.pipettes.get_attached_tip("pipette-id")).then_return(
        tip_result
    )

    with exception:
        hw_result = await hw_subject.available_for_nozzle_layout(
            "pipette-id", style, primary_nozzle, front_nozzle, back_nozzle
        )
        virtual_result = await virtual_subject.available_for_nozzle_layout(
            "pipette-id", style, primary_nozzle, front_nozzle, back_nozzle
        )
        assert hw_result == virtual_result == expected_result


async def test_virtual_pick_up_tip(
    decoy: Decoy,
    mock_state_view: StateView,
    tip_rack_definition: LabwareDefinition,
) -> None:
    """It should use a virtual pipette to pick up a tip."""
    subject = VirtualTipHandler(state_view=mock_state_view)

    decoy.when(mock_state_view.labware.get_definition("labware-id")).then_return(
        tip_rack_definition
    )

    decoy.when(mock_state_view.pipettes.get_serial_number("pipette-id")).then_return(
        "pipette-serial"
    )

    decoy.when(
        mock_state_view.geometry.get_nominal_tip_geometry(
            pipette_id="pipette-id",
            labware_id="labware-id",
            well_name="B2",
        )
    ).then_return(TipGeometry(length=50, diameter=5, volume=300))

    result = await subject.pick_up_tip(
        pipette_id="pipette-id",
        labware_id="labware-id",
        well_name="B2",
    )

    assert result == TipGeometry(length=50, diameter=5, volume=300)

    decoy.verify(
        mock_state_view.pipettes.validate_tip_state("pipette-id", False),
        times=1,
    )


async def test_virtual_drop_tip(decoy: Decoy, mock_state_view: StateView) -> None:
    """It should use a virtual pipette to drop a tip."""
    subject = VirtualTipHandler(state_view=mock_state_view)

    await subject.drop_tip(pipette_id="pipette-id", home_after=None)

    decoy.verify(
        mock_state_view.pipettes.validate_tip_state("pipette-id", True),
        times=1,
    )


async def test_get_tip_presence_on_ot2(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    mock_labware_data_provider: LabwareDataProvider,
) -> None:
    """It should use the hardware API to  up a tip."""
    subject = HardwareTipHandler(
        state_view=mock_state_view,
        hardware_api=mock_hardware_api,
        labware_data_provider=mock_labware_data_provider,
    )

    result = await subject.get_tip_presence(pipette_id="pipette-id")
    assert result == TipPresenceStatus.UNKNOWN


@pytest.mark.parametrize("hw_tip_state", [TipStateType.ABSENT, TipStateType.PRESENT])
async def test_get_tip_presence_on_ot3(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_labware_data_provider: LabwareDataProvider,
    hw_tip_state: TipStateType,
) -> None:
    """It should use the hardware API to  up a tip."""
    try:
        from opentrons.hardware_control.ot3api import OT3API

        ot3_hardware_api = decoy.mock(cls=OT3API)
        decoy.when(ot3_hardware_api.get_robot_type()).then_return(FlexRobotType)

        subject = HardwareTipHandler(
            state_view=mock_state_view,
            hardware_api=ot3_hardware_api,
            labware_data_provider=mock_labware_data_provider,
        )

        decoy.when(mock_state_view.pipettes.get_mount("pipette-id")).then_return(
            MountType.LEFT
        )
        decoy.when(
            await ot3_hardware_api.get_tip_presence_status(Mount.LEFT)
        ).then_return(hw_tip_state)
        result = await subject.get_tip_presence(pipette_id="pipette-id")
        assert result == TipPresenceStatus.from_hw_state(hw_tip_state)

    except ImportError:
        pass


@pytest.mark.parametrize(
    "expected", [TipPresenceStatus.ABSENT, TipPresenceStatus.PRESENT]
)
async def test_verify_tip_presence_on_ot3(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_labware_data_provider: LabwareDataProvider,
    expected: TipPresenceStatus,
) -> None:
    """It should use the hardware API to  up a tip."""
    try:
        from opentrons.hardware_control.ot3api import OT3API

        ot3_hardware_api = decoy.mock(cls=OT3API)
        decoy.when(ot3_hardware_api.get_robot_type()).then_return(FlexRobotType)

        subject = HardwareTipHandler(
            state_view=mock_state_view,
            hardware_api=ot3_hardware_api,
            labware_data_provider=mock_labware_data_provider,
        )
        decoy.when(mock_state_view.pipettes.get_mount("pipette-id")).then_return(
            MountType.LEFT
        )

        decoy.when(
            mock_state_view.pipettes.get_nozzle_configuration("pipette-id")
        ).then_return(MOCK_MAP)

        await subject.verify_tip_presence("pipette-id", expected, None)

        decoy.verify(
            await ot3_hardware_api.verify_tip_presence(
                Mount.LEFT, expected.to_hw_state(), None
            )
        )

    except ImportError:
        pass
