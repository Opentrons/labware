"""Tests for Protocol API input validation."""

from typing import ContextManager, List, Type, Union, Optional, Dict, Sequence, Any
from contextlib import nullcontext as do_not_raise

from decoy import Decoy
import pytest
import re

from opentrons.protocols.advanced_control.transfers.common import TransferTipPolicyV2
from opentrons_shared_data.labware.labware_definition import (
    LabwareRole,
    Parameters as LabwareDefinitionParameters,
)
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.robot.types import RobotType

from opentrons.types import (
    Mount,
    DeckSlotName,
    AxisType,
    AxisMapType,
    StringAxisMap,
    StagingSlotName,
    Location,
    Point,
)
from opentrons.hardware_control.modules.types import (
    ModuleModel,
    MagneticModuleModel,
    TemperatureModuleModel,
    ThermocyclerModuleModel,
    HeaterShakerModuleModel,
    ThermocyclerStep,
)
from opentrons.protocols.models import LabwareDefinition
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.api_support.util import APIVersionError
from opentrons.protocol_api import (
    validation as subject,
    Well,
    Labware,
    TrashBin,
    WasteChute,
)


@pytest.mark.parametrize(
    ["input_mount", "input_pipette", "expected"],
    [
        # Different string capitalizations:
        ("left", PipetteNameType.P300_MULTI_GEN2, Mount.LEFT),
        ("right", PipetteNameType.P300_MULTI_GEN2, Mount.RIGHT),
        ("LeFt", PipetteNameType.P300_MULTI_GEN2, Mount.LEFT),
        # Passing in a Mount:
        (Mount.LEFT, PipetteNameType.P300_MULTI_GEN2, Mount.LEFT),
        (Mount.RIGHT, PipetteNameType.P300_MULTI_GEN2, Mount.RIGHT),
        # Special handling for the 96-channel:
        ("left", PipetteNameType.P1000_96, Mount.LEFT),
        ("right", PipetteNameType.P1000_96, Mount.LEFT),
        (None, PipetteNameType.P1000_96, Mount.LEFT),
    ],
)
def test_ensure_mount(
    input_mount: Union[str, Mount, None],
    input_pipette: PipetteNameType,
    expected: Mount,
) -> None:
    """It should properly map strings and mounts."""
    result = subject.ensure_mount_for_pipette(input_mount, input_pipette)
    assert result == expected


def test_ensure_mount_input_invalid() -> None:
    """It should raise if given invalid mount input."""
    with pytest.raises(
        subject.InvalidPipetteMountError, match="must be 'left' or 'right'"
    ):
        subject.ensure_mount_for_pipette("oh no", PipetteNameType.P300_MULTI_GEN2)

    # Any mount is valid for the 96-Channel, but it needs to be a valid mount.
    with pytest.raises(
        subject.InvalidPipetteMountError, match="must be 'left' or 'right'"
    ):
        subject.ensure_mount_for_pipette("oh no", PipetteNameType.P1000_96)

    with pytest.raises(
        subject.PipetteMountTypeError,
        match="'left', 'right', or an opentrons.types.Mount",
    ):
        subject.ensure_mount_for_pipette(42, PipetteNameType.P300_MULTI_GEN2)  # type: ignore[arg-type]

    with pytest.raises(
        subject.InvalidPipetteMountError, match="Use the left or right mounts instead"
    ):
        subject.ensure_mount_for_pipette(
            Mount.EXTENSION, PipetteNameType.P300_MULTI_GEN2
        )

    with pytest.raises(
        subject.InvalidPipetteMountError, match="You must specify a left or right mount"
    ):
        subject.ensure_mount_for_pipette(None, PipetteNameType.P300_MULTI_GEN2)


@pytest.mark.parametrize(
    ["input_value", "expected"],
    [
        # Every OT-2 pipette:
        ("p10_single", PipetteNameType.P10_SINGLE),
        ("p10_multi", PipetteNameType.P10_MULTI),
        ("p50_single", PipetteNameType.P50_SINGLE),
        ("p50_multi", PipetteNameType.P50_MULTI),
        ("p300_single", PipetteNameType.P300_SINGLE),
        ("p300_multi", PipetteNameType.P300_MULTI),
        ("p1000_single", PipetteNameType.P1000_SINGLE),
        ("p20_single_gen2", PipetteNameType.P20_SINGLE_GEN2),
        ("p20_multi_gen2", PipetteNameType.P20_MULTI_GEN2),
        ("p300_single_gen2", PipetteNameType.P300_SINGLE_GEN2),
        ("p300_multi_gen2", PipetteNameType.P300_MULTI_GEN2),
        ("p1000_single_gen2", PipetteNameType.P1000_SINGLE_GEN2),
        # Every Flex pipette:
        ("flex_1channel_50", PipetteNameType.P50_SINGLE_FLEX),
        ("flex_8channel_50", PipetteNameType.P50_MULTI_FLEX),
        ("flex_1channel_1000", PipetteNameType.P1000_SINGLE_FLEX),
        ("flex_8channel_1000", PipetteNameType.P1000_MULTI_FLEX),
        ("flex_96channel_1000", PipetteNameType.P1000_96),
        # Weird capitalization:
        ("P300_muLTI_gen2", PipetteNameType.P300_MULTI_GEN2),
    ],
)
def test_ensure_pipette_name(input_value: str, expected: PipetteNameType) -> None:
    """It should properly map strings and PipetteNameType enums."""
    result = subject.ensure_pipette_name(input_value)
    assert result == expected


@pytest.mark.parametrize(
    "input_value",
    [
        "oh-no",  # Not even remotely a pipette name.
        "p1000_single_gen3",  # Obsolete name for Flex pipette.
        "p1000_single_flex",  # Internal-only name for Flex pipette.
        "p1000_96",  # Internal-only name for Flex pipette.
    ],
)
def test_ensure_pipette_input_invalid(input_value: str) -> None:
    """It should raise a ValueError if given an invalid name."""
    with pytest.raises(
        ValueError,
        match=f"Cannot resolve {input_value} to pipette, must be given valid pipette name",
    ):
        subject.ensure_pipette_name(input_value)


@pytest.mark.parametrize(
    ["input_value", "input_api_version", "input_robot_type", "expected"],
    [
        # Integer or integer-as-string slots:
        ("1", APIVersion(2, 0), "OT-2 Standard", DeckSlotName.SLOT_1),
        ("1", APIVersion(2, 0), "OT-3 Standard", DeckSlotName.SLOT_D1),
        (1, APIVersion(2, 0), "OT-2 Standard", DeckSlotName.SLOT_1),
        (1, APIVersion(2, 0), "OT-3 Standard", DeckSlotName.SLOT_D1),
        ("12", APIVersion(2, 0), "OT-2 Standard", DeckSlotName.FIXED_TRASH),
        (12, APIVersion(2, 0), "OT-3 Standard", DeckSlotName.SLOT_A3),
        # Coordinate slots:
        ("d1", APIVersion(2, 15), "OT-2 Standard", DeckSlotName.SLOT_1),
        ("d1", APIVersion(2, 15), "OT-3 Standard", DeckSlotName.SLOT_D1),
        ("D1", APIVersion(2, 15), "OT-2 Standard", DeckSlotName.SLOT_1),
        ("D1", APIVersion(2, 15), "OT-3 Standard", DeckSlotName.SLOT_D1),
        ("a3", APIVersion(2, 15), "OT-2 Standard", DeckSlotName.FIXED_TRASH),
        ("a3", APIVersion(2, 15), "OT-3 Standard", DeckSlotName.SLOT_A3),
        ("A3", APIVersion(2, 15), "OT-2 Standard", DeckSlotName.FIXED_TRASH),
        ("A3", APIVersion(2, 15), "OT-3 Standard", DeckSlotName.SLOT_A3),
        # Staging slots:
        ("A4", APIVersion(2, 16), "OT-3 Standard", StagingSlotName.SLOT_A4),
        ("b4", APIVersion(2, 16), "OT-3 Standard", StagingSlotName.SLOT_B4),
        ("C4", APIVersion(2, 16), "OT-3 Standard", StagingSlotName.SLOT_C4),
        ("d4", APIVersion(2, 16), "OT-3 Standard", StagingSlotName.SLOT_D4),
    ],
)
def test_ensure_and_convert_deck_slot(
    input_value: Union[str, int],
    input_api_version: APIVersion,
    input_robot_type: RobotType,
    expected: DeckSlotName,
) -> None:
    """It should map strings and ints to DeckSlotName values."""
    result = subject.ensure_and_convert_deck_slot(
        input_value, input_api_version, input_robot_type
    )
    assert result == expected


@pytest.mark.parametrize(
    ["input_value", "input_api_version", "expected_error_type", "expected_error_match"],
    [
        ("0", APIVersion(2, 0), ValueError, "not a valid deck slot"),
        (0, APIVersion(2, 0), ValueError, "not a valid deck slot"),
        ("13", APIVersion(2, 0), ValueError, "not a valid deck slot"),
        (13, APIVersion(2, 0), ValueError, "not a valid deck slot"),
        ("b7", APIVersion(2, 0), ValueError, "not a valid deck slot"),
        ("B7", APIVersion(2, 0), ValueError, "not a valid deck slot"),
        (1.23, APIVersion(2, 0), TypeError, "must be a string or integer"),
        (
            "A1",
            APIVersion(2, 0),
            APIVersionError,
            re.escape(
                "Error 4011 INCORRECT_API_VERSION (APIVersionError): Specifying a deck slot like 'A1' is not available until API version 2.15. You are currently using API version 2.0. Increase your protocol's apiLevel, or use slot '10' instead."
            ),
        ),
        ("A4", APIVersion(2, 15), APIVersionError, "Using a staging deck slot"),
    ],
)
@pytest.mark.parametrize("input_robot_type", ["OT-2 Standard", "OT-3 Standard"])
def test_ensure_deck_slot_invalid(
    input_value: object,
    input_api_version: APIVersion,
    input_robot_type: RobotType,
    expected_error_type: Type[Exception],
    expected_error_match: str,
) -> None:
    """It should raise an exception if given an invalid name."""
    with pytest.raises(expected_error_type, match=expected_error_match):
        subject.ensure_and_convert_deck_slot(
            input_value,  # type: ignore[arg-type]
            input_api_version,
            input_robot_type,
        )


def test_ensure_lowercase_name() -> None:
    """It should properly map strings and PipetteNameType enums."""
    result = subject.ensure_lowercase_name("aBcDeFg")
    assert result == "abcdefg"


def test_ensure_lowercase_name_invalid() -> None:
    """It should raise a ValueError if given an invalid name."""
    with pytest.raises(TypeError, match="must be a string"):
        subject.ensure_lowercase_name(101)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("definition", "expected_raise"),
    [
        (
            LabwareDefinition.model_construct(  # type: ignore[call-arg]
                allowedRoles=[LabwareRole.labware],
                parameters=LabwareDefinitionParameters.model_construct(loadName="Foo"),  # type: ignore[call-arg]
            ),
            do_not_raise(),
        ),
        (
            LabwareDefinition.model_construct(  # type: ignore[call-arg]
                allowedRoles=[],
                parameters=LabwareDefinitionParameters.model_construct(loadName="Foo"),  # type: ignore[call-arg]
            ),
            do_not_raise(),
        ),
        (
            LabwareDefinition.model_construct(  # type: ignore[call-arg]
                allowedRoles=[LabwareRole.adapter],
                parameters=LabwareDefinitionParameters.model_construct(loadName="Foo"),  # type: ignore[call-arg]
            ),
            pytest.raises(subject.LabwareDefinitionIsNotLabwareError),
        ),
    ],
)
def test_ensure_definition_is_labware(
    definition: LabwareDefinition, expected_raise: ContextManager[Any]
) -> None:
    """It should check if the Labware Definition is defined as a regular labware."""
    with expected_raise:
        subject.ensure_definition_is_labware(definition)


@pytest.mark.parametrize(
    ("definition", "expected_raise"),
    [
        (
            LabwareDefinition.model_construct(  # type: ignore[call-arg]
                allowedRoles=[LabwareRole.adapter],
                parameters=LabwareDefinitionParameters.model_construct(loadName="Foo"),  # type: ignore[call-arg]
            ),
            do_not_raise(),
        ),
        (
            LabwareDefinition.model_construct(  # type: ignore[call-arg]
                allowedRoles=[],
                parameters=LabwareDefinitionParameters.model_construct(loadName="Foo"),  # type: ignore[call-arg]
            ),
            pytest.raises(subject.LabwareDefinitionIsNotAdapterError),
        ),
        (
            LabwareDefinition.model_construct(  # type: ignore[call-arg]
                allowedRoles=[LabwareRole.labware],
                parameters=LabwareDefinitionParameters.model_construct(loadName="Foo"),  # type: ignore[call-arg]
            ),
            pytest.raises(subject.LabwareDefinitionIsNotAdapterError),
        ),
    ],
)
def test_ensure_definition_is_adapter(
    definition: LabwareDefinition, expected_raise: ContextManager[Any]
) -> None:
    """It should check if the Labware Definition is defined as an adapter."""
    with expected_raise:
        subject.ensure_definition_is_adapter(definition)


@pytest.mark.parametrize(
    ("load_name", "expected_model"),
    [
        ("magdeck", MagneticModuleModel.MAGNETIC_V1),
        ("MaGdEcK", MagneticModuleModel.MAGNETIC_V1),
        ("magnetic module", MagneticModuleModel.MAGNETIC_V1),
        ("magneticModuleV1", MagneticModuleModel.MAGNETIC_V1),
        ("magnetic module gen2", MagneticModuleModel.MAGNETIC_V2),
        ("magneticModuleV2", MagneticModuleModel.MAGNETIC_V2),
        ("tempdeck", TemperatureModuleModel.TEMPERATURE_V1),
        ("tEmpDeCk", TemperatureModuleModel.TEMPERATURE_V1),
        ("temperatureModuleV1", TemperatureModuleModel.TEMPERATURE_V1),
        ("temperature module", TemperatureModuleModel.TEMPERATURE_V1),
        ("temperature module gen2", TemperatureModuleModel.TEMPERATURE_V2),
        ("temperatureModuleV2", TemperatureModuleModel.TEMPERATURE_V2),
        ("thermocycler", ThermocyclerModuleModel.THERMOCYCLER_V1),
        ("ThErMoCyClEr", ThermocyclerModuleModel.THERMOCYCLER_V1),
        ("thermocycler module", ThermocyclerModuleModel.THERMOCYCLER_V1),
        ("thermocyclerModuleV1", ThermocyclerModuleModel.THERMOCYCLER_V1),
        ("thermocycler module gen2", ThermocyclerModuleModel.THERMOCYCLER_V2),
        ("thermocyclerModuleV2", ThermocyclerModuleModel.THERMOCYCLER_V2),
        ("heaterShakerModuleV1", HeaterShakerModuleModel.HEATER_SHAKER_V1),
    ],
)
def test_ensure_module_model(load_name: str, expected_model: ModuleModel) -> None:
    """It should map an module load name to a specific model."""
    result = subject.ensure_module_model(load_name)
    assert result == expected_model


def test_ensure_module_model_invalid() -> None:
    """It should reject invalid module load names."""
    with pytest.raises(ValueError, match="not a valid module load name"):
        subject.ensure_module_model("spline reticulator")

    with pytest.raises(TypeError, match="must be a string"):
        subject.ensure_module_model(42)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ["seconds", "minutes", "expected"],
    [
        (42.42, None, 42.42),
        (None, 1.2, 72.0),
        (42.42, 1.2, 114.42),
        (None, None, 0),
    ],
)
def test_ensure_hold_time_seconds(
    seconds: Optional[float], minutes: Optional[float], expected: float
) -> None:
    """It should ensure hold time is in seconds only."""
    result = subject.ensure_hold_time_seconds(seconds=seconds, minutes=minutes)
    assert result == expected


@pytest.mark.parametrize(
    ["repetitions", "expected"],
    [
        (1, 1),
        (2, 2),
        (999, 999),
    ],
)
def test_ensure_thermocycler_repetition_count(repetitions: int, expected: int) -> None:
    """It should return a given positive integer."""
    result = subject.ensure_thermocycler_repetition_count(repetitions)
    assert result == expected


@pytest.mark.parametrize(
    "repetitions",
    [
        0,
        -1,
        -999,
    ],
)
def test_ensure_thermocycler_repetition_count_raises(repetitions: int) -> None:
    """It should raise if repetitions is zero or negative."""
    with pytest.raises(ValueError):
        subject.ensure_thermocycler_repetition_count(repetitions)


@pytest.mark.parametrize(
    ["steps", "expected"],
    [
        (
            [
                {
                    "temperature": 42.0,
                    "hold_time_minutes": 12.3,
                    "hold_time_seconds": 45.6,
                }
            ],
            [{"temperature": 42.0, "hold_time_seconds": 783.6}],
        ),
        (
            [{"temperature": 42.0, "hold_time_seconds": 45.6}],
            [{"temperature": 42.0, "hold_time_seconds": 45.6}],
        ),
        (
            [{"temperature": 42.0, "hold_time_minutes": 12.3}],
            [{"temperature": 42.0, "hold_time_seconds": 738.0}],
        ),
        (
            [
                {"temperature": 42.0, "hold_time_seconds": 12.3},
                {"temperature": 52.0, "hold_time_minutes": 12.3},
            ],
            [
                {"temperature": 42.0, "hold_time_seconds": 12.3},
                {"temperature": 52.0, "hold_time_seconds": 738.0},
            ],
        ),
        ([], []),
    ],
)
def test_ensure_thermocycler_profile_steps(
    steps: List[ThermocyclerStep], expected: List[ThermocyclerStep]
) -> None:
    """It should ensure thermocycler profile steps are valid and hold time is expressed in seconds only."""
    result = subject.ensure_thermocycler_profile_steps(steps)
    assert result == expected


@pytest.mark.parametrize(
    "steps",
    [
        [{"hold_time_minutes": 12.3, "hold_time_seconds": 45.6}],
        [{"temperature": 42.0}],
    ],
)
def test_ensure_thermocycler_profile_steps_invalid(
    steps: List[ThermocyclerStep],
) -> None:
    """It should raise a ValueError when given invalid thermocycler profile steps."""
    with pytest.raises(ValueError):
        subject.ensure_thermocycler_profile_steps(steps)


@pytest.mark.parametrize("offset", [{}, [1, 2, 3], 1, {"a", "b", "c"}, "abc"])
def test_ensure_valid_labware_offset_vector(offset: Dict[str, float]) -> None:
    """It should raise ValueError when given offset is invalid."""
    assert subject.ensure_valid_labware_offset_vector({"x": 1.1, "y": 2, "z": 3.3}) == (
        1.1,
        2,
        3.3,
    )
    with pytest.raises(TypeError):
        subject.ensure_valid_labware_offset_vector(offset)


def test_validate_well_no_location(decoy: Decoy) -> None:
    """Should return a WellTarget with no location."""
    input_location = decoy.mock(cls=Well)
    expected_result = subject.WellTarget(
        well=input_location, location=None, in_place=False
    )

    result = subject.validate_location(location=input_location, last_location=None)

    assert result == expected_result


def test_validate_well_coordinates(decoy: Decoy) -> None:
    """Should return a WellTarget with no location."""
    input_location = Location(point=Point(x=1, y=1, z=2), labware=None)
    expected_result = subject.PointTarget(location=input_location, in_place=False)

    result = subject.validate_location(location=input_location, last_location=None)

    assert result == expected_result


def test_validate_in_place(decoy: Decoy) -> None:
    """Should return an `in_place` PointTarget."""
    input_last_location = Location(point=Point(x=1, y=1, z=2), labware=None)
    expected_result = subject.PointTarget(location=input_last_location, in_place=True)

    result = subject.validate_location(location=None, last_location=input_last_location)

    assert result == expected_result


def test_validate_location_with_well(decoy: Decoy) -> None:
    """Should return a WellTarget with location."""
    mock_well = decoy.mock(cls=Well)
    input_location = Location(point=Point(x=1, y=1, z=1), labware=mock_well)
    expected_result = subject.WellTarget(
        well=mock_well, location=input_location, in_place=False
    )

    result = subject.validate_location(location=input_location, last_location=None)

    assert result == expected_result


def test_validate_last_location(decoy: Decoy) -> None:
    """Should return a WellTarget with location."""
    mock_well = decoy.mock(cls=Well)
    input_last_location = Location(point=Point(x=1, y=1, z=1), labware=mock_well)
    expected_result = subject.WellTarget(
        well=mock_well, location=input_last_location, in_place=True
    )

    result = subject.validate_location(location=None, last_location=input_last_location)

    assert result == expected_result


def test_validate_location_matches_last_location(decoy: Decoy) -> None:
    """Should return an in_place WellTarget."""
    mock_well = decoy.mock(cls=Well)
    input_last_location = Location(point=Point(x=1, y=1, z=1), labware=mock_well)
    input_location = Location(point=Point(x=1, y=1, z=1), labware=mock_well)
    expected_result = subject.WellTarget(
        well=mock_well, location=input_last_location, in_place=True
    )

    result = subject.validate_location(
        location=input_location, last_location=input_last_location
    )

    assert result == expected_result


def test_validate_with_wrong_location_with_last_location() -> None:
    """Should raise a LocationTypeError."""
    with pytest.raises(subject.LocationTypeError):
        subject.validate_location(
            location=42,  # type: ignore[arg-type]
            last_location=Location(point=Point(x=1, y=1, z=1), labware=None),
        )


def test_validate_with_wrong_location() -> None:
    """Should raise a LocationTypeError."""
    with pytest.raises(subject.LocationTypeError):
        subject.validate_location(
            location=42,  # type: ignore[arg-type]
            last_location=None,
        )


def test_validate_raises_no_location_error() -> None:
    """Should raise a NoLocationError."""
    with pytest.raises(subject.NoLocationError):
        subject.validate_location(location=None, last_location=None)


def test_validate_with_labware(decoy: Decoy) -> None:
    """Should return a PointTarget for a non-Well Location."""
    mock_labware = decoy.mock(cls=Labware)
    input_location = Location(point=Point(1, 1, 1), labware=mock_labware)

    result = subject.validate_location(location=input_location, last_location=None)

    assert result == subject.PointTarget(location=input_location, in_place=False)


def test_validate_last_location_with_labware(decoy: Decoy) -> None:
    """Should return a PointTarget for non-Well previous Location."""
    mock_labware = decoy.mock(cls=Labware)
    input_last_location = Location(point=Point(1, 1, 1), labware=mock_labware)

    result = subject.validate_location(location=None, last_location=input_last_location)

    assert result == subject.PointTarget(location=input_last_location, in_place=True)


def test_ensure_boolean() -> None:
    """It should return a boolean value."""
    assert subject.ensure_boolean(False) is False


@pytest.mark.parametrize("value", [0, "False", "f", 0.0])
def test_ensure_boolean_raises(value: Union[str, int, float]) -> None:
    """It should raise if the value is not a boolean."""
    with pytest.raises(ValueError, match="must be a boolean"):
        subject.ensure_boolean(value)  # type: ignore[arg-type]


@pytest.mark.parametrize("value", [-1.23, -1, 0, 0.0, 1, 1.23])
def test_ensure_float(value: Union[int, float]) -> None:
    """It should return a float value."""
    assert subject.ensure_float(value) == float(value)


def test_ensure_float_raises() -> None:
    """It should raise if the value is not a float or an integer."""
    with pytest.raises(ValueError, match="must be a floating point"):
        subject.ensure_float("1.23")  # type: ignore[arg-type]


@pytest.mark.parametrize("value", [0, 0.1, 1, 1.0])
def test_ensure_positive_float(value: Union[int, float]) -> None:
    """It should return a positive float."""
    assert subject.ensure_positive_float(value) == float(value)


@pytest.mark.parametrize("value", [-1, -1.0, float("inf"), float("-inf"), float("nan")])
def test_ensure_positive_float_raises(value: Union[int, float]) -> None:
    """It should raise if value is not a positive float."""
    with pytest.raises(ValueError, match="(non-infinite|positive float)"):
        subject.ensure_positive_float(value)


def test_ensure_positive_int() -> None:
    """It should return a positive int."""
    assert subject.ensure_positive_int(42) == 42


@pytest.mark.parametrize("value", [1.0, -1.0, -1])
def test_ensure_positive_int_raises(value: Union[int, float]) -> None:
    """It should raise if value is not a positive integer."""
    with pytest.raises(ValueError, match="integer"):
        subject.ensure_positive_int(value)  # type: ignore[arg-type]


def test_validate_coordinates() -> None:
    """It should validate the coordinates and return them as a tuple."""
    assert subject.validate_coordinates([1, 2.0, 3.3]) == (1.0, 2.0, 3.3)


@pytest.mark.parametrize("value", [[1, 2.0], [1, 2.0, 3.3, 4.2], ["1", 2, 3]])
def test_validate_coordinates_raises(value: Sequence[Union[int, float, str]]) -> None:
    """It should raise if value is not a valid sequence of three numbers."""
    with pytest.raises(ValueError, match="(exactly three|must be floats)"):
        subject.validate_coordinates(value)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    argnames=["axis_map", "robot_type", "is_96_channel", "expected_axis_map"],
    argvalues=[
        (
            {"x": 100, "Y": 50, "z_g": 80},
            "OT-3 Standard",
            True,
            {AxisType.X: 100, AxisType.Y: 50, AxisType.Z_G: 80},
        ),
        ({"z_r": 80}, "OT-2 Standard", False, {AxisType.Z_R: 80}),
        (
            {"Z_L": 19, "P_L": 20},
            "OT-2 Standard",
            False,
            {AxisType.Z_L: 19, AxisType.P_L: 20},
        ),
        ({"Q": 5}, "OT-3 Standard", True, {AxisType.Q: 5}),
    ],
)
def test_ensure_axis_map_type_success(
    axis_map: Union[AxisMapType, StringAxisMap],
    robot_type: RobotType,
    is_96_channel: bool,
    expected_axis_map: AxisMapType,
) -> None:
    """Check that axis map type validation returns the correct shape."""
    res = subject.ensure_axis_map_type(axis_map, robot_type, is_96_channel)
    assert res == expected_axis_map


@pytest.mark.parametrize(
    argnames=["axis_map", "robot_type", "is_96_channel", "error_message"],
    argvalues=[
        (
            {AxisType.X: 100, "y": 50},
            "OT-3 Standard",
            True,
            "Please provide an `axis_map` with only string or only AxisType keys",
        ),
        (
            {AxisType.Z_R: 60},
            "OT-3 Standard",
            True,
            "A 96 channel is attached. You cannot move the `Z_R` mount.",
        ),
        (
            {"Z_G": 19, "P_L": 20},
            "OT-2 Standard",
            False,
            "An OT-2 Robot only accepts the following axes ",
        ),
        (
            {"Q": 5},
            "OT-3 Standard",
            False,
            "A 96 channel is not attached. The clamp `Q` motor does not exist.",
        ),
    ],
)
def test_ensure_axis_map_type_failure(
    axis_map: Union[AxisMapType, StringAxisMap],
    robot_type: RobotType,
    is_96_channel: bool,
    error_message: str,
) -> None:
    """Check that axis_map validation occurs for the given scenarios."""
    with pytest.raises(subject.IncorrectAxisError, match=error_message):
        subject.ensure_axis_map_type(axis_map, robot_type, is_96_channel)


@pytest.mark.parametrize(
    argnames=["axis_map", "robot_type", "error_message"],
    argvalues=[
        (
            {AxisType.X: 100, AxisType.P_L: 50},
            "OT-3 Standard",
            "A critical point only accepts Flex gantry axes which are ",
        ),
        (
            {AxisType.Z_G: 60},
            "OT-2 Standard",
            "A critical point only accepts OT-2 gantry axes which are ",
        ),
    ],
)
def test_ensure_only_gantry_axis_map_type(
    axis_map: AxisMapType, robot_type: RobotType, error_message: str
) -> None:
    """Check that gantry axis_map validation occurs for the given scenarios."""
    with pytest.raises(subject.IncorrectAxisError, match=error_message):
        subject.ensure_only_gantry_axis_map_type(axis_map, robot_type)


@pytest.mark.parametrize(
    ["value", "expected_result"],
    [
        ("once", TransferTipPolicyV2.ONCE),
        ("NEVER", TransferTipPolicyV2.NEVER),
        ("alWaYs", TransferTipPolicyV2.ALWAYS),
        ("Per Source", TransferTipPolicyV2.PER_SOURCE),
    ],
)
def test_ensure_new_tip_policy(
    value: str, expected_result: TransferTipPolicyV2
) -> None:
    """It should return the expected tip policy."""
    assert subject.ensure_new_tip_policy(value) == expected_result


def test_ensure_new_tip_policy_raises() -> None:
    """It should raise ValueError for invalid new_tip value."""
    with pytest.raises(ValueError, match="is invalid value for 'new_tip'"):
        subject.ensure_new_tip_policy("blah")


@pytest.mark.parametrize(
    ["target", "expected_raise"],
    [
        (
            "a",
            pytest.raises(
                ValueError, match="'a' is not a valid location for transfer."
            ),
        ),
        (
            ["a"],
            pytest.raises(
                ValueError, match="'a' is not a valid location for transfer."
            ),
        ),
        (
            [("a",)],
            pytest.raises(
                ValueError, match="'a' is not a valid location for transfer."
            ),
        ),
        (
            [],
            pytest.raises(
                ValueError, match="No target well\\(s\\) specified for transfer."
            ),
        ),
    ],
)
def test_ensure_valid_flat_wells_list_raises_for_invalid_targets(
    target: Any,
    expected_raise: ContextManager[Any],
) -> None:
    """It should raise an error if target location is invalid."""
    with expected_raise:
        subject.ensure_valid_flat_wells_list_for_transfer_v2(target)


def test_ensure_valid_flat_wells_list_raises_for_mixed_targets(decoy: Decoy) -> None:
    """It should raise appropriate error if target has mixed valid and invalid wells."""
    target1 = [decoy.mock(cls=Well), "a"]
    with pytest.raises(ValueError, match="'a' is not a valid location for transfer."):
        subject.ensure_valid_flat_wells_list_for_transfer_v2(target1)  # type: ignore[arg-type]

    target2 = [[decoy.mock(cls=Well)], ["a"]]
    with pytest.raises(ValueError, match="'a' is not a valid location for transfer."):
        subject.ensure_valid_flat_wells_list_for_transfer_v2(target2)  # type: ignore[arg-type]


def test_ensure_valid_flat_wells_list(decoy: Decoy) -> None:
    """It should convert the locations to flat lists correctly."""
    target1 = decoy.mock(cls=Well)
    target2 = decoy.mock(cls=Well)

    assert subject.ensure_valid_flat_wells_list_for_transfer_v2(target1) == [target1]
    assert subject.ensure_valid_flat_wells_list_for_transfer_v2([target1, target2]) == [
        target1,
        target2,
    ]
    assert subject.ensure_valid_flat_wells_list_for_transfer_v2(
        [
            [target1, target1],
            [target2, target2],
        ]
    ) == [target1, target1, target2, target2]
    assert subject.ensure_valid_flat_wells_list_for_transfer_v2((target1, target2)) == [
        target1,
        target2,
    ]
    assert subject.ensure_valid_flat_wells_list_for_transfer_v2(
        (
            [target1, target1],
            [target2, target2],
        )
    ) == [target1, target1, target2, target2]


def test_ensure_valid_tip_drop_location_for_transfer_v2(
    decoy: Decoy,
) -> None:
    """It should check that the tip drop location is valid."""
    mock_well = decoy.mock(cls=Well)
    mock_location = Location(point=Point(x=1, y=1, z=1), labware=mock_well)
    mock_trash_bin = decoy.mock(cls=TrashBin)
    mock_waste_chute = decoy.mock(cls=WasteChute)
    assert (
        subject.ensure_valid_tip_drop_location_for_transfer_v2(mock_well) == mock_well
    )
    assert (
        subject.ensure_valid_tip_drop_location_for_transfer_v2(mock_location)
        == mock_location
    )
    assert (
        subject.ensure_valid_tip_drop_location_for_transfer_v2(mock_trash_bin)
        == mock_trash_bin
    )
    assert (
        subject.ensure_valid_tip_drop_location_for_transfer_v2(mock_waste_chute)
        == mock_waste_chute
    )


def test_ensure_valid_tip_drop_location_for_transfer_v2_raises(decoy: Decoy) -> None:
    """It should raise an error for invalid tip drop locations."""
    with pytest.raises(TypeError, match="However, it is '\\['a'\\]'"):
        subject.ensure_valid_tip_drop_location_for_transfer_v2(["a"])  # type: ignore[arg-type]

    mock_labware = decoy.mock(cls=Labware)
    with pytest.raises(TypeError, match=f"However, it is '{mock_labware}'"):
        subject.ensure_valid_tip_drop_location_for_transfer_v2(mock_labware)  # type: ignore[arg-type]

    with pytest.raises(
        TypeError, match="However, the given location doesn't refer to any well."
    ):
        subject.ensure_valid_tip_drop_location_for_transfer_v2(
            Location(point=Point(x=1, y=1, z=1), labware=None)
        )
