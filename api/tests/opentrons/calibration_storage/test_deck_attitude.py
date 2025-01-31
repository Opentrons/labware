import pytest
import importlib
import opentrons
from typing import Any, TYPE_CHECKING
from opentrons.calibration_storage import (
    save_robot_belt_attitude,
    get_robot_belt_attitude,
    delete_robot_belt_attitude,
)
from opentrons.calibration_storage import (
    save_robot_deck_attitude,
    get_robot_deck_attitude,
    delete_robot_deck_attitude,
)

# needed for proper type checking unfortunately
from opentrons.calibration_storage.ot3.models.v1 import (
    BeltCalibrationModel as OT3BeltCalModel,
)
from opentrons.calibration_storage.ot2.models.v1 import (
    DeckCalibrationModel as OT2DeckCalModel,
)

if TYPE_CHECKING:
    from opentrons_shared_data.deck.types import RobotModel


@pytest.fixture(autouse=True)
def reload_module(robot_model: "RobotModel") -> None:
    importlib.reload(opentrons.calibration_storage)


@pytest.fixture
def starting_ot2_calibration_data(ot_config_tempdir: Any) -> None:
    """Starting OT-2 deck calibration data fixture."""
    save_robot_deck_attitude(
        [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        "pip1",
        "mytiprack",
    )


@pytest.fixture
def starting_ot3_calibration_data(ot_config_tempdir: Any) -> None:
    """Starting OT-3 belt calibration data fixture."""
    save_robot_belt_attitude(
        [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        "pip1",
    )


def test_save_ot2_deck_attitude(ot_config_tempdir: Any) -> None:
    """Test saving an OT-2 deck attitude calibration."""
    assert get_robot_deck_attitude() is None
    save_robot_deck_attitude(
        [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        "pip1",
        "mytiprack",
    )
    assert get_robot_deck_attitude() is not None


def test_save_ot3_deck_attitude(ot_config_tempdir: Any) -> None:
    """Test saving an OT-3 belt attitude calibration."""
    assert get_robot_belt_attitude() is None
    save_robot_belt_attitude(
        [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        "pip1",
    )
    assert get_robot_belt_attitude() != {}


def test_get_ot2_deck_calibration(starting_ot2_calibration_data: Any) -> None:
    """Test ability to get an OT-2 deck calibration model."""
    robot_deck = get_robot_deck_attitude()
    assert robot_deck
    assert robot_deck == OT2DeckCalModel(
        attitude=[[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        last_modified=robot_deck.last_modified,
        source=robot_deck.source,
        pipette_calibrated_with="pip1",
        tiprack="mytiprack",
    )


def test_get_ot3_deck_calibration(starting_ot3_calibration_data: Any) -> None:
    """Test ability to get an OT-3 belt calibration model."""
    robot_belt = get_robot_belt_attitude()
    assert robot_belt
    assert robot_belt == OT3BeltCalModel(
        attitude=[[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        lastModified=robot_belt.lastModified,
        source=robot_belt.source,
        pipetteCalibratedWith="pip1",
    )


def test_delete_ot2_deck_calibration(starting_ot2_calibration_data: Any) -> None:
    """Test delete OT-2 deck calibration data."""
    robot_deck = get_robot_deck_attitude()
    assert robot_deck
    assert robot_deck.attitude == [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    delete_robot_deck_attitude()
    assert get_robot_deck_attitude() is None


def test_delete_ot3_deck_calibration(starting_ot3_calibration_data: Any) -> None:
    """Test delete OT-3 belt calibration data."""
    robot_belt = get_robot_belt_attitude()
    assert robot_belt
    assert robot_belt.attitude == [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    delete_robot_belt_attitude()
    assert get_robot_belt_attitude() is None
