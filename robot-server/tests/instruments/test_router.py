"""Tests for /instruments routes."""
from __future__ import annotations

import pytest
from typing import TYPE_CHECKING
from typing_extensions import Final
from decoy import Decoy

from opentrons.calibration_storage.types import CalibrationStatus, SourceType
from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.dev_types import PipetteDict
from opentrons.hardware_control.instruments.ot3.instrument_calibration import (
    GripperCalibrationOffset,
)
from opentrons.hardware_control.types import GripperJawState
from opentrons.types import Point, Mount
from opentrons_shared_data.gripper.dev_types import GripperModel
from opentrons_shared_data.pipette.dev_types import PipetteName, PipetteModel

from robot_server.instruments.router import (
    get_attached_instruments,
    MountType,
    Gripper,
    GripperData,
    Pipette,
    PipetteData,
)

if TYPE_CHECKING:
    from opentrons.hardware_control.ot3api import OT3API

_HTTP_API_VERSION: Final = 4


@pytest.fixture()
def hardware_api(decoy: Decoy) -> HardwareControlAPI:
    """Get a mock hardware control API."""
    return decoy.mock(cls=HardwareControlAPI)


def get_sample_pipette_dict(
    name: PipetteName,
    model: PipetteModel,
    pipette_id: str,
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
    }
    return pipette_dict


@pytest.mark.ot3_only
@pytest.fixture
def ot3_hardware_api(decoy: Decoy) -> OT3API:
    """Get a mocked out OT3API."""
    try:
        from opentrons.hardware_control.ot3api import OT3API

        return decoy.mock(cls=OT3API)
    except ImportError:
        return None  # type: ignore[return-value]


@pytest.mark.ot3_only
async def test_get_instruments_empty(
    decoy: Decoy,
    ot3_hardware_api: OT3API,
) -> None:
    """It should get an empty instruments list from hardware API."""
    decoy.when(ot3_hardware_api.attached_gripper).then_return(None)
    result = await get_attached_instruments(
        requested_version=_HTTP_API_VERSION,
        hardware=ot3_hardware_api,
    )
    assert result.content.data == []
    assert result.status_code == 200


async def test_get_all_attached_instruments(
    decoy: Decoy,
    ot3_hardware_api: OT3API,
) -> None:
    """It should get data of all attached instruments."""
    decoy.when(ot3_hardware_api.attached_gripper).then_return(
        {
            "name": "gripper",
            "model": GripperModel.V1,
            "gripper_id": "GripperID321",
            "display_name": "my-special-gripper",
            "state": GripperJawState.UNHOMED,
            "calibration_offset": GripperCalibrationOffset(
                offset=Point(x=1, y=2, z=3),
                source=SourceType.default,
                status=CalibrationStatus(),
                last_modified=None,
            ),
        }
    )
    decoy.when(ot3_hardware_api.attached_pipettes).then_return(
        {
            Mount.LEFT: get_sample_pipette_dict(
                name="p10_multi",
                model=PipetteModel("abc"),
                pipette_id="my-pipette-id",
            ),
            Mount.RIGHT: get_sample_pipette_dict(
                name="p20_multi_gen2",
                model=PipetteModel("xyz"),
                pipette_id="my-other-pipette-id",
            ),
        }
    )
    result = await get_attached_instruments(
        requested_version=_HTTP_API_VERSION,
        hardware=ot3_hardware_api,
    )
    assert result.content.data == [
        Gripper(
            mount=MountType.EXTENSION,
            instrumentName="gripper",
            instrumentModel=GripperModel.V1,
            instrumentSerial="GripperID321",
            data=GripperData(
                jawState=GripperJawState.UNHOMED,
                calibratedOffset=GripperCalibrationOffset(
                    offset=Point(x=1, y=2, z=3),
                    source=SourceType.default,
                    status=CalibrationStatus(),
                    last_modified=None,
                ),
            ),
        ),
        Pipette(
            mount=MountType.LEFT,
            instrumentName="p10_multi",
            instrumentModel=PipetteModel("abc"),
            instrumentSerial="my-pipette-id",
            data=PipetteData(
                channels=1,
                min_volume=1,
                max_volume=1,
            ),
        ),
        Pipette(
            mount=MountType.RIGHT,
            instrumentName="p20_multi_gen2",
            instrumentModel=PipetteModel("xyz"),
            instrumentSerial="my-other-pipette-id",
            data=PipetteData(
                channels=1,
                min_volume=1,
                max_volume=1,
            ),
        ),
    ]
