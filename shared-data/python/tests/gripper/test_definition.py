import pytest
from pydantic import ValidationError
import json
from opentrons_shared_data import gripper, load_shared_data
from opentrons_shared_data.gripper import (
    GripperDefinition,
    GripperModel,
)

GRIPPER_DEF = json.loads(load_shared_data("gripper/definitions/1/gripperV1.json"))


def test_gripper_definition() -> None:
    gripper_def = gripper.load_definition(GripperModel.v1)
    assert isinstance(gripper_def, GripperDefinition)
    assert gripper_def.schema_version == 1


def test_gripper_definition_type() -> None:
    assert GripperDefinition.model_validate(GRIPPER_DEF)

    # missing key
    del GRIPPER_DEF["gripForceProfile"]
    with pytest.raises(ValidationError):
        assert GripperDefinition.model_validate(GRIPPER_DEF)

    # no missing key but with incorrect value
    GRIPPER_DEF["geometry"]["gripForceProfile"] = {"min": 1.0, "max": "0.0"}
    with pytest.raises(ValidationError):
        assert GripperDefinition.model_validate(GRIPPER_DEF)
