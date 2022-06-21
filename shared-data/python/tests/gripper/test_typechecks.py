import pytest
from opentrons_shared_data import gripper
from opentrons_shared_data.gripper import dev_types


GRIPPER_DEF = {
    "$otSharedSchema": "gripper/schemas/1",
    "model": "gripperV1",
    "displayName": "Gripper GEN1",
    "idleZCurrent": {
        "defaultValue": 0.1,
        "min": 0.02,
        "max": 1.0,
        "units": "amps",
        "type": "float",
    },
    "activeZCurrent": {
        "defaultValue": 0.8,
        "min": 0.02,
        "max": 2.0,
        "units": "amps",
        "type": "float",
    },
    "jawReferenceVoltage": {
        "defaultValue": 2.6,
        "min": 0.5,
        "max": 3.3,
        "units": "volts",
        "type": "float",
    },
    "jawForcePerDutyCycle": [
        [0.92, 4],
        [1.48, 5],
        [2.86, 7],
        [3.72, 9],
        [5.64, 12],
        [7.66, 17],
        [8.76, 20],
        [10.06, 23],
        [12.42, 34],
        [16.2, 54],
        [23, 80],
        [25.7, 90],
    ],
    "baseOffsetFromMount": {"x": 6.775, "y": 87.325, "z": 32.05},
    "jawCenterOffsetFromBase": {"x": 8.5, "y": 2.5, "z": 86},
    "pinOneOffsetFromBase": {"x": 23, "y": 73.37920159, "z": 95},
    "pinTwoOffsetFromBase": {"x": 23, "y": 78.37920159, "z": 95},
    "quirks": [],
}


def test_gripper_definition() -> None:
    gripper_def = gripper.load_definition(
        dev_types.GripperSchemaVersion.V1, dev_types.GripperModel.V1
    )
    assert isinstance(gripper_def, dev_types.GripperDefinitionV1)


def test_gripper_definition_type() -> None:
    assert dev_types.GripperDefinitionV1.from_dict(GRIPPER_DEF)

    # missing key
    del GRIPPER_DEF["idleZCurrent"]
    with pytest.raises(dev_types.InvalidGripperDefinition):
        assert dev_types.GripperDefinitionV1.from_dict(GRIPPER_DEF)

    # add back in missing values
    GRIPPER_DEF["idleZCurrent"] = {
        "defaultValue": 0.01,
        "min": 0.02,
        "max": 1.0,
        "units": "amps",
        "type": "float",
    }
    assert dev_types.GripperDefinitionV1.from_dict(GRIPPER_DEF)
