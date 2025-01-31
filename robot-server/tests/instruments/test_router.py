"""Tests for /instruments routes."""
from __future__ import annotations

import pytest
from typing import TYPE_CHECKING, cast
from decoy import Decoy

from opentrons.calibration_storage.types import CalibrationStatus, SourceType
from opentrons.hardware_control import (
    HardwareControlAPI,
    API,
)
from opentrons.hardware_control.dev_types import (
    PipetteDict,
    GripperDict,
)
from opentrons.hardware_control.instruments.ot3.instrument_calibration import (
    GripperCalibrationOffset,
    PipetteOffsetSummary,
)
from opentrons.hardware_control.types import GripperJawState, OT3Mount
from opentrons.protocol_engine.types import Vec3f
from opentrons.types import Point, Mount
from opentrons_shared_data.gripper.gripper_definition import (
    GripperModelStr,
    GripperModel,
)
from opentrons_shared_data.pipette.types import PipetteName, PipetteModel
from opentrons.hardware_control.protocols.types import FlexRobotType, OT2RobotType

from robot_server.instruments.instrument_models import (
    Gripper,
    GripperData,
    Pipette,
    PipetteData,
    InstrumentCalibrationData,
    BadPipette,
    BadGripper,
    PipetteState,
)
from robot_server.instruments.router import (
    get_attached_instruments,
)
from robot_server.subsystems.models import SubSystem
from opentrons.hardware_control.types import SubSystem as HWSubSystem, SubSystemState

if TYPE_CHECKING:
    from opentrons.hardware_control.ot3api import OT3API


@pytest.fixture
def ot2_hardware_api(decoy: Decoy) -> HardwareControlAPI:
    """Get a mock hardware control API."""
    mock = decoy.mock(cls=API)
    decoy.when(mock.get_robot_type()).then_return(OT2RobotType)
    return mock


def get_sample_pipette_dict(
    name: PipetteName, model: PipetteModel, pipette_id: str, subsystem: SubSystem
) -> PipetteDict:
    """Return a sample PipetteDict."""
    pipette_dict: PipetteDict = {  # type: ignore [typeddict-item]
        "name": name,
        "model": model,
        "pipette_id": pipette_id,
        "back_compat_names": ["p10_single"],
        "min_volume": 1,
        "max_volume": 1,
        "channels": 1,
        "subsystem": subsystem,
    }
    return pipette_dict


@pytest.mark.ot3_only
@pytest.fixture
def ot3_hardware_api(decoy: Decoy) -> HardwareControlAPI:
    """Get a mocked out OT3API."""
    try:
        from opentrons.hardware_control.ot3api import OT3API

        mock = decoy.mock(cls=OT3API)
        decoy.when(mock.get_robot_type()).then_return(FlexRobotType)
        return mock
    except ImportError:
        return None  # type: ignore[return-value]


@pytest.mark.ot3_only
async def test_get_instruments_empty(
    decoy: Decoy,
    ot3_hardware_api: OT3API,
) -> None:
    """It should get an empty instruments list from hardware API."""
    decoy.when(ot3_hardware_api.attached_gripper).then_return(None)
    decoy.when(ot3_hardware_api.attached_pipettes).then_return({})
    result = await get_attached_instruments(hardware=ot3_hardware_api)
    assert result.content.data == []
    assert result.status_code == 200


@pytest.mark.ot3_only
async def test_get_all_attached_instruments(
    decoy: Decoy,
    ot3_hardware_api: OT3API,
) -> None:
    """It should get data of all attached instruments."""
    left_pipette_dict = get_sample_pipette_dict(
        name="p10_multi",
        model=PipetteModel("abc"),
        pipette_id="my-pipette-id",
        subsystem=SubSystem.pipette_left,
    )
    right_pipette_dict = get_sample_pipette_dict(
        name="p20_multi_gen2",
        model=PipetteModel("xyz"),
        pipette_id="my-other-pipette-id",
        subsystem=SubSystem.pipette_right,
    )

    async def rehearse_instrument_retrievals(skip_if_would_block: bool = False) -> None:
        decoy.when(ot3_hardware_api.attached_gripper).then_return(
            cast(
                GripperDict,
                {
                    "model": GripperModel.v1,
                    "gripper_id": "GripperID321",
                    "display_name": "my-special-gripper",
                    "state": GripperJawState.UNHOMED,
                    "calibration_offset": GripperCalibrationOffset(
                        offset=Point(x=1, y=2, z=3),
                        source=SourceType.default,
                        status=CalibrationStatus(markedBad=False),
                        last_modified=None,
                    ),
                    "subsystem": HWSubSystem.gripper,
                },
            )
        )
        decoy.when(ot3_hardware_api.attached_pipettes).then_return(
            {
                Mount.LEFT: left_pipette_dict,
                Mount.RIGHT: right_pipette_dict,
            }
        )

        decoy.when(await ot3_hardware_api.get_instrument_state(Mount.LEFT)).then_return(
            {"tip_detected": True}
        )

        decoy.when(
            await ot3_hardware_api.get_instrument_state(Mount.RIGHT)
        ).then_return({"tip_detected": False})
        decoy.when(ot3_hardware_api.attached_subsystems).then_return(
            {
                HWSubSystem.pipette_left: SubSystemState(
                    ok=True,
                    current_fw_version=10,
                    next_fw_version=11,
                    fw_update_needed=False,
                    current_fw_sha="some-sha",
                    pcba_revision="A1",
                    update_state=None,
                ),
                HWSubSystem.pipette_right: SubSystemState(
                    ok=True,
                    current_fw_version=11,
                    next_fw_version=11,
                    fw_update_needed=False,
                    current_fw_sha="some-other-sha",
                    pcba_revision="A1",
                    update_state=None,
                ),
                HWSubSystem.gripper: SubSystemState(
                    ok=True,
                    current_fw_version=11,
                    next_fw_version=11,
                    fw_update_needed=False,
                    current_fw_sha="some-other-sha",
                    pcba_revision="A1",
                    update_state=None,
                ),
            }
        )

    # We use this convoluted way of testing to verify the important point that
    # cache_instruments is called before fetching attached pipette and gripper data.
    decoy.when(
        await ot3_hardware_api.cache_instruments(skip_if_would_block=True)
    ).then_do(rehearse_instrument_retrievals)
    decoy.when(ot3_hardware_api.get_instrument_offset(mount=OT3Mount.LEFT)).then_return(
        PipetteOffsetSummary(
            offset=Point(1, 2, 3),
            source=SourceType.default,
            status=CalibrationStatus(),
            last_modified=None,
            reasonability_check_failures=[],
        )
    )
    decoy.when(
        ot3_hardware_api.get_instrument_offset(mount=OT3Mount.RIGHT)
    ).then_return(
        PipetteOffsetSummary(
            offset=Point(4, 5, 6),
            source=SourceType.default,
            status=CalibrationStatus(),
            last_modified=None,
            reasonability_check_failures=[],
        )
    )
    result = await get_attached_instruments(hardware=ot3_hardware_api)

    assert result.content.data == [
        Pipette.model_construct(
            ok=True,
            mount="left",
            instrumentType="pipette",
            instrumentName="p10_multi",
            instrumentModel=PipetteModel("abc"),
            serialNumber="my-pipette-id",
            subsystem=SubSystem.pipette_left,
            firmwareVersion="10",
            data=PipetteData(
                channels=1,
                min_volume=1,
                max_volume=1,
                calibratedOffset=InstrumentCalibrationData(
                    offset=Vec3f(x=1, y=2, z=3),
                    source=SourceType.default,
                    last_modified=None,
                    reasonability_check_failures=[],
                ),
            ),
            state=PipetteState(tip_detected=True),
        ),
        Pipette.model_construct(
            ok=True,
            mount="right",
            firmwareVersion="11",
            instrumentType="pipette",
            instrumentName="p20_multi_gen2",
            instrumentModel=PipetteModel("xyz"),
            serialNumber="my-other-pipette-id",
            subsystem=SubSystem.pipette_right,
            data=PipetteData(
                channels=1,
                min_volume=1,
                max_volume=1,
                calibratedOffset=InstrumentCalibrationData(
                    offset=Vec3f(x=4, y=5, z=6),
                    source=SourceType.default,
                    last_modified=None,
                    reasonability_check_failures=[],
                ),
            ),
            state=PipetteState(tip_detected=False),
        ),
        Gripper.model_construct(
            ok=True,
            mount="extension",
            firmwareVersion="11",
            instrumentType="gripper",
            instrumentModel=GripperModelStr("gripperV1"),
            serialNumber="GripperID321",
            subsystem=SubSystem.gripper,
            data=GripperData(
                jawState="unhomed",
                calibratedOffset=InstrumentCalibrationData(
                    offset=Vec3f(x=1, y=2, z=3),
                    source=SourceType.default,
                    last_modified=None,
                    reasonability_check_failures=[],
                ),
            ),
        ),
    ]


async def test_get_ot2_instruments(
    decoy: Decoy,
    ot2_hardware_api: HardwareControlAPI,
) -> None:
    """It should return attached pipettes on OT2."""
    # Return empty data when no pipettes attached
    decoy.when(ot2_hardware_api.attached_instruments).then_return({})

    result1 = await get_attached_instruments(hardware=ot2_hardware_api)
    assert result1.content.data == []
    assert result1.status_code == 200

    # Return attached pipettes
    decoy.when(ot2_hardware_api.attached_instruments).then_return(
        {
            Mount.RIGHT: get_sample_pipette_dict(
                name="p20_multi_gen2",
                model=PipetteModel("xyz"),
                pipette_id="pipette-id",
                subsystem=SubSystem.pipette_right,
            ),
            Mount.LEFT: cast(PipetteDict, {}),
        }
    )
    result2 = await get_attached_instruments(hardware=ot2_hardware_api)
    decoy.verify(await ot2_hardware_api.cache_instruments(), times=0)
    assert result2.status_code == 200
    assert result2.content.data == [
        Pipette.model_construct(
            ok=True,
            mount="right",
            instrumentType="pipette",
            instrumentName="p20_multi_gen2",
            instrumentModel=PipetteModel("xyz"),
            serialNumber="pipette-id",
            data=PipetteData(
                channels=1,
                min_volume=1,
                max_volume=1,
            ),
            subsystem=SubSystem.pipette_right,
        )
    ]


@pytest.mark.ot3_only
async def test_get_96_channel_instruments(
    decoy: Decoy, ot3_hardware_api: OT3API
) -> None:
    """It should correctly be able to construct a 96 channel pipette."""
    # Return attached pipettes
    decoy.when(ot3_hardware_api.attached_pipettes).then_return(
        {
            Mount.LEFT: cast(
                PipetteDict,
                {
                    "name": "p1000_96",
                    "model": PipetteModel("xyz"),
                    "pipette_id": "pipette-id",
                    "back_compat_names": [],
                    "min_volume": 1,
                    "max_volume": 1000,
                    "channels": 96,
                },
            ),
            Mount.RIGHT: cast(PipetteDict, {}),
        }
    )
    decoy.when(ot3_hardware_api.attached_gripper).then_return(None)
    result2 = await get_attached_instruments(hardware=ot3_hardware_api)
    decoy.when(ot3_hardware_api.get_instrument_offset(OT3Mount.LEFT)).then_return(None)
    decoy.when(ot3_hardware_api.get_instrument_offset(OT3Mount.RIGHT)).then_return(None)
    assert result2.status_code == 200
    assert result2.content.data == [
        Pipette.model_construct(
            ok=True,
            mount="left",
            instrumentType="pipette",
            instrumentName="p1000_96",
            instrumentModel=PipetteModel("xyz"),
            serialNumber="pipette-id",
            data=PipetteData(
                channels=96,
                min_volume=1,
                max_volume=1000,
            ),
            subsystem=SubSystem.pipette_left,
        )
    ]


@pytest.mark.ot3_only
async def test_get_instrument_not_ok(
    decoy: Decoy,
    ot3_hardware_api: OT3API,
) -> None:
    """It should return a BadPipette/BadGripper if an instrument needs an update."""
    left_pipette_dict = get_sample_pipette_dict(
        name="p10_multi",
        model=PipetteModel("abc"),
        pipette_id="my-pipette-id",
        subsystem=SubSystem.pipette_left,
    )

    decoy.when(ot3_hardware_api.attached_gripper).then_return(
        cast(
            GripperDict,
            {
                "model": GripperModel.v1,
                "gripper_id": "GripperID321",
                "display_name": "my-special-gripper",
                "state": GripperJawState.UNHOMED,
                "calibration_offset": GripperCalibrationOffset(
                    offset=Point(x=1, y=2, z=3),
                    source=SourceType.default,
                    status=CalibrationStatus(markedBad=False),
                    last_modified=None,
                ),
                "subsystem": HWSubSystem.gripper,
            },
        )
    )
    decoy.when(ot3_hardware_api.attached_pipettes).then_return(
        {
            Mount.LEFT: left_pipette_dict,
        }
    )
    decoy.when(ot3_hardware_api.attached_subsystems).then_return(
        {
            HWSubSystem.pipette_left: SubSystemState(
                ok=True,
                current_fw_version=10,
                next_fw_version=11,
                fw_update_needed=True,
                current_fw_sha="some-sha",
                pcba_revision="A1",
                update_state=None,
            ),
            HWSubSystem.pipette_right: SubSystemState(
                ok=False,
                current_fw_version=11,
                next_fw_version=11,
                fw_update_needed=True,
                current_fw_sha="some-other-sha",
                pcba_revision="A1",
                update_state=None,
            ),
            HWSubSystem.gripper: SubSystemState(
                ok=False,
                current_fw_version=11,
                next_fw_version=11,
                fw_update_needed=True,
                current_fw_sha="some-other-sha",
                pcba_revision="A1",
                update_state=None,
            ),
        }
    )
    response = await get_attached_instruments(ot3_hardware_api)
    assert response.status_code == 200
    assert response.content.data == [
        BadPipette(
            subsystem=SubSystem.pipette_left,
            status="/subsystems/status/pipette_left",
            update="/subsystems/updates/pipette_left",
            ok=False,
        ),
        BadPipette(
            subsystem=SubSystem.pipette_right,
            status="/subsystems/status/pipette_right",
            update="/subsystems/updates/pipette_right",
            ok=False,
        ),
        BadGripper(
            subsystem=SubSystem.gripper,
            status="/subsystems/status/gripper",
            update="/subsystems/updates/gripper",
            ok=False,
        ),
    ]
