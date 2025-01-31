from datetime import datetime
import pytest
from pydantic import ValidationError

from robot_server.service.session.models import command, command_definitions


@pytest.mark.parametrize(
    argnames="command_def",
    argvalues=[
        command_definitions.ProtocolCommand.start_run,
        command_definitions.CalibrationCommand.move_to_deck,
        command_definitions.CheckCalibrationCommand.compare_point,
    ],
)
def test_empty(command_def: command_definitions.CommandDefinition):
    """Test creation of empty command request and response."""
    request = command.CommandRequest.model_validate(
        {"data": {"command": command_def.value, "data": {}}}
    )
    assert request.data.command == command_def
    assert request.data.data == command.EmptyModel()

    dt = datetime(2000, 1, 1)

    response = request.data.make_response(
        identifier="id",
        status=command.CommandStatus.executed,
        created_at=dt,
        started_at=None,
        completed_at=None,
        result=None,
    )

    assert response.command == command_def
    assert response.data == command.EmptyModel()
    assert response.id == "id"
    assert response.createdAt == dt
    assert response.startedAt is None
    assert response.completedAt is None
    assert response.result is None


@pytest.mark.parametrize(
    argnames="command_def",
    argvalues=[
        command_definitions.EquipmentCommand.load_labware,
        command_definitions.EquipmentCommand.load_pipette,
        command_definitions.PipetteCommand.aspirate,
        command_definitions.PipetteCommand.dispense,
        command_definitions.PipetteCommand.drop_tip,
        command_definitions.PipetteCommand.pick_up_tip,
        command_definitions.CalibrationCommand.jog,
        command_definitions.CalibrationCommand.set_has_calibration_block,
    ],
)
def test_requires_data(command_def: command_definitions.CommandDefinition):
    """Test creation of command requiring data will fail with empty body."""
    with pytest.raises(ValidationError):
        command.CommandRequest.model_validate(
            {"data": {"command": command_def.value, "data": {}}}
        )
