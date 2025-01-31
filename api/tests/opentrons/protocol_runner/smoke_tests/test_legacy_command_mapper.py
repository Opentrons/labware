"""Test legacy command mapping in an end-to-end environment.

Legacy ProtocolContext objects are prohibitively difficult to instansiate
and mock in an isolated unit test environment.
"""
from datetime import datetime
from pathlib import Path
from textwrap import dedent
from typing import List

import pytest
from decoy import matchers

from opentrons.protocol_engine import (
    EngineStatus,
    commands,
    DeckSlotLocation,
    ModuleModel,
    ModuleLocation,
    DeckPoint,
)
from opentrons.protocol_reader import ProtocolReader
from opentrons.protocol_runner.create_simulating_orchestrator import (
    create_simulating_orchestrator,
)
from opentrons.protocol_runner.legacy_command_mapper import LegacyCommandParams
from opentrons.types import MountType, DeckSlotName
from opentrons_shared_data.pipette.types import PipetteNameType


async def simulate_and_get_commands(protocol_file: Path) -> List[commands.Command]:
    """Simulate a protocol, make sure it succeeds, and return its commands."""
    protocol_reader = ProtocolReader()
    protocol_source = await protocol_reader.read_saved(
        files=[protocol_file],
        directory=None,
    )
    subject = await create_simulating_orchestrator(
        robot_type="OT-2 Standard", protocol_config=protocol_source.config
    )
    result = await subject.run(deck_configuration=[], protocol_source=protocol_source)
    assert result.state_summary.errors == []
    assert result.state_summary.status == EngineStatus.SUCCEEDED
    return result.commands


# TODO(mm, 2023-01-09): Split this up into smaller, more focused tests.
BIG_PROTOCOL = """\
from opentrons.types import Location, Point

metadata = {
    "apiLevel": "2.1",
}

def run(ctx):
    # Labware and module loads:
    tip_rack_1 = ctx.load_labware(
        load_name="opentrons_96_tiprack_300ul",
        location="1",
    )
    tip_rack_2 = ctx.load_labware(
        load_name="opentrons_96_tiprack_300ul",
        location="2",
    )
    module_1 = ctx.load_module("tempdeck", "4")
    well_plate_1 = ctx.load_labware(
        load_name="opentrons_96_aluminumblock_nest_wellplate_100ul",
        location="3",
    )
    module_plate_1 = module_1.load_labware(
        "opentrons_96_aluminumblock_nest_wellplate_100ul"
    )

    # Pipette loads:
    pipette_left = ctx.load_instrument(
        instrument_name="p300_single",
        mount="left",
        tip_racks=[tip_rack_1],
    )
    pipette_right = ctx.load_instrument(
        instrument_name="p300_multi",
        mount="right",
    )

    # Tip pickups and drops with different kinds of locations:
    pipette_left.pick_up_tip(
        location=tip_rack_1.wells_by_name()["A1"],
    )
    pipette_right.pick_up_tip(
        location=tip_rack_2.wells_by_name()["A1"].top(),
    )
    pipette_left.drop_tip()
    pipette_left.pick_up_tip()

    # Liquid handling commands:
    pipette_left.aspirate(
        volume=40,
        rate=1.0,
        location=module_plate_1["A1"],
    )
    pipette_left.dispense(
        volume=35,
        rate=1.2,
        location=well_plate_1["B1"],
    )
    pipette_left.aspirate(
        volume=40,
        location=well_plate_1.wells_by_name()["A1"],
    )
    pipette_left.dispense(
        volume=35,
        location=module_plate_1.wells_by_name()["B1"],
    )
    pipette_left.blow_out(
        location=well_plate_1.wells_by_name()["B1"].top(),
    )
    pipette_left.aspirate(50)
    pipette_left.dispense(50)
    pipette_left.blow_out(
        location=module_plate_1["B1"].top(),
    )
    pipette_left.aspirate()
    pipette_left.dispense()
    pipette_left.blow_out()
    pipette_left.move_to(Location(point=Point(100, 100, 10),labware=None))
    pipette_left.aspirate()
    pipette_left.dispense()
    pipette_left.blow_out()
    pipette_left.aspirate(50, well_plate_1["D1"].bottom().move(point=Point(100, 10, 0)))
    pipette_left.dispense(50, well_plate_1["F1"].top().move(point=Point(10, 10, 0)))
    pipette_left.aspirate(50, Location(point=Point(100, 100, 10), labware=well_plate_1))
    pipette_left.dispense(50, Location(point=Point(100, 100, 10), labware=well_plate_1))

    pipette_left.drop_tip(
        location=tip_rack_1.wells_by_name()["A1"]
    )
"""


@pytest.fixture
def big_protocol_file(tmp_path: Path) -> Path:
    """Put the big test protocol on disk."""
    path = tmp_path / "protocol-name.py"
    path.write_text(BIG_PROTOCOL)
    return path


async def test_big_protocol_commands(big_protocol_file: Path) -> None:
    """It should map commands from the Python protocol."""
    commands_result = await simulate_and_get_commands(big_protocol_file)

    tiprack_1_result_captor = matchers.Captor()
    tiprack_2_result_captor = matchers.Captor()
    module_1_result_captor = matchers.Captor()
    well_plate_1_result_captor = matchers.Captor()
    module_plate_1_result_captor = matchers.Captor()
    pipette_left_result_captor = matchers.Captor()
    pipette_right_result_captor = matchers.Captor()

    assert len(commands_result) == 32

    assert commands_result[0] == commands.Home.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.HomeParams(axes=None),
        notes=[],
        result=commands.HomeResult(),
    )
    assert commands_result[1] == commands.LoadLabware.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.LoadLabwareParams(
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            loadName="opentrons_96_tiprack_300ul",
            namespace="opentrons",
            version=1,
        ),
        notes=[],
        result=tiprack_1_result_captor,
    )
    assert commands_result[2] == commands.LoadLabware.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.LoadLabwareParams(
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_2),
            loadName="opentrons_96_tiprack_300ul",
            namespace="opentrons",
            version=1,
        ),
        notes=[],
        result=tiprack_2_result_captor,
    )
    assert commands_result[3] == commands.LoadModule.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.LoadModuleParams(
            model=ModuleModel.TEMPERATURE_MODULE_V1,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
            moduleId="module-0",
        ),
        notes=[],
        result=module_1_result_captor,
    )
    assert commands_result[4] == commands.LoadLabware.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.LoadLabwareParams(
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
            loadName="opentrons_96_aluminumblock_nest_wellplate_100ul",
            namespace="opentrons",
            version=1,
        ),
        notes=[],
        result=well_plate_1_result_captor,
    )
    assert commands_result[5] == commands.LoadLabware.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.LoadLabwareParams(
            location=ModuleLocation(moduleId="module-0"),
            loadName="opentrons_96_aluminumblock_nest_wellplate_100ul",
            namespace="opentrons",
            version=1,
        ),
        notes=[],
        result=module_plate_1_result_captor,
    )

    assert commands_result[6] == commands.LoadPipette.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.LoadPipetteParams(
            pipetteName=PipetteNameType.P300_SINGLE, mount=MountType.LEFT
        ),
        notes=[],
        result=pipette_left_result_captor,
    )

    assert commands_result[7] == commands.LoadPipette.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.LoadPipetteParams(
            pipetteName=PipetteNameType.P300_MULTI, mount=MountType.RIGHT
        ),
        notes=[],
        result=pipette_right_result_captor,
    )

    tiprack_1_id = tiprack_1_result_captor.value.labwareId
    tiprack_2_id = tiprack_2_result_captor.value.labwareId
    well_plate_1_id = well_plate_1_result_captor.value.labwareId
    module_plate_1_id = module_plate_1_result_captor.value.labwareId
    pipette_left_id = pipette_left_result_captor.value.pipetteId
    pipette_right_id = pipette_right_result_captor.value.pipetteId

    assert commands_result[8] == commands.PickUpTip.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.PickUpTipParams(
            pipetteId=pipette_left_id,
            labwareId=tiprack_1_id,
            wellName="A1",
        ),
        notes=[],
        result=commands.PickUpTipResult(
            tipVolume=300.0, tipLength=51.83, position=DeckPoint(x=0, y=0, z=0)
        ),
    )
    assert commands_result[9] == commands.PickUpTip.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.PickUpTipParams(
            pipetteId=pipette_right_id,
            labwareId=tiprack_2_id,
            wellName="A1",
        ),
        notes=[],
        result=commands.PickUpTipResult(
            tipVolume=300.0, tipLength=51.83, position=DeckPoint(x=0, y=0, z=0)
        ),
    )

    assert commands_result[10] == commands.DropTip.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.DropTipParams(
            pipetteId=pipette_left_id,
            labwareId="fixedTrash",
            wellName="A1",
        ),
        notes=[],
        result=commands.DropTipResult(position=DeckPoint(x=0, y=0, z=0)),
    )

    assert commands_result[11] == commands.PickUpTip.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.PickUpTipParams(
            pipetteId=pipette_left_id,
            labwareId=tiprack_1_id,
            wellName="B1",
        ),
        notes=[],
        result=commands.PickUpTipResult(
            tipVolume=300.0, tipLength=51.83, position=DeckPoint(x=0, y=0, z=0)
        ),
    )
    assert commands_result[12] == commands.Aspirate.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.AspirateParams(
            pipetteId=pipette_left_id,
            labwareId=module_plate_1_id,
            wellName="A1",
            volume=40,
            flowRate=150,
        ),
        notes=[],
        result=commands.AspirateResult(volume=40, position=DeckPoint(x=0, y=0, z=0)),
    )
    assert commands_result[13] == commands.Dispense.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.DispenseParams(
            pipetteId=pipette_left_id,
            labwareId=well_plate_1_id,
            wellName="B1",
            volume=35,
            flowRate=360,
        ),
        notes=[],
        result=commands.DispenseResult(volume=35, position=DeckPoint(x=0, y=0, z=0)),
    )
    assert commands_result[14] == commands.Aspirate.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.AspirateParams(
            pipetteId=pipette_left_id,
            labwareId=well_plate_1_id,
            wellName="A1",
            volume=40,
            flowRate=150.0,
        ),
        notes=[],
        result=commands.AspirateResult(volume=40, position=DeckPoint(x=0, y=0, z=0)),
    )
    assert commands_result[15] == commands.Dispense.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.DispenseParams(
            pipetteId=pipette_left_id,
            labwareId=module_plate_1_id,
            wellName="B1",
            volume=35,
            flowRate=300,
        ),
        notes=[],
        result=commands.DispenseResult(volume=35, position=DeckPoint(x=0, y=0, z=0)),
    )
    assert commands_result[16] == commands.BlowOut.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.BlowOutParams(
            pipetteId=pipette_left_id,
            labwareId=well_plate_1_id,
            wellName="B1",
            flowRate=1000.0,
        ),
        notes=[],
        result=commands.BlowOutResult(position=DeckPoint(x=0, y=0, z=0)),
    )
    assert commands_result[17] == commands.Aspirate.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.AspirateParams(
            pipetteId=pipette_left_id,
            labwareId=well_plate_1_id,
            wellName="B1",
            volume=50,
            flowRate=150,
        ),
        notes=[],
        result=commands.AspirateResult(volume=50, position=DeckPoint(x=0, y=0, z=0)),
    )
    assert commands_result[18] == commands.Dispense.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.DispenseParams(
            pipetteId=pipette_left_id,
            labwareId=well_plate_1_id,
            wellName="B1",
            volume=50,
            flowRate=300,
        ),
        notes=[],
        result=commands.DispenseResult(volume=50, position=DeckPoint(x=0, y=0, z=0)),
    )
    assert commands_result[19] == commands.BlowOut.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.BlowOutParams(
            pipetteId=pipette_left_id,
            labwareId=module_plate_1_id,
            wellName="B1",
            flowRate=1000.0,
        ),
        notes=[],
        result=commands.BlowOutResult(position=DeckPoint(x=0, y=0, z=0)),
    )
    assert commands_result[20] == commands.Aspirate.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.AspirateParams(
            pipetteId=pipette_left_id,
            labwareId=module_plate_1_id,
            wellName="B1",
            volume=300,
            flowRate=150,
        ),
        notes=[],
        result=commands.AspirateResult(volume=300, position=DeckPoint(x=0, y=0, z=0)),
    )
    assert commands_result[21] == commands.Dispense.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.DispenseParams(
            pipetteId=pipette_left_id,
            labwareId=module_plate_1_id,
            wellName="B1",
            volume=300,
            flowRate=300,
        ),
        notes=[],
        result=commands.DispenseResult(volume=300, position=DeckPoint(x=0, y=0, z=0)),
    )
    assert commands_result[22] == commands.BlowOut.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.BlowOutParams(
            pipetteId=pipette_left_id,
            labwareId=module_plate_1_id,
            wellName="B1",
            flowRate=1000.0,
        ),
        notes=[],
        result=commands.BlowOutResult(position=DeckPoint(x=0, y=0, z=0)),
    )
    #   TODO:(jr, 15.08.2022): this should map to move_to when move_to is mapped in a followup ticket RSS-62
    assert commands_result[23] == commands.Custom.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=LegacyCommandParams(
            legacyCommandText="Moving to (100, 100, 10)",
            legacyCommandType="command.MOVE_TO",
        ),
        notes=[],
        result=commands.CustomResult(),
    )
    #   TODO:(jr, 15.08.2022): aspirate commands with no labware get filtered
    #   into custom. Refactor this in followup legacy command mapping
    assert commands_result[24] == commands.Custom.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=LegacyCommandParams(
            legacyCommandText="Aspirating 300.0 uL from (100, 100, 10) at 150.0 uL/sec",
            legacyCommandType="command.ASPIRATE",
        ),
        notes=[],
        result=commands.CustomResult(),
    )
    #   TODO:(jr, 15.08.2022): dispense commands with no labware get filtered
    #   into custom. Refactor this in followup legacy command mapping
    assert commands_result[25] == commands.Custom.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=LegacyCommandParams(
            legacyCommandText="Dispensing 300.0 uL into (100, 100, 10) at 300.0 uL/sec",
            legacyCommandType="command.DISPENSE",
        ),
        notes=[],
        result=commands.CustomResult(),
    )
    #   TODO:(jr, 15.08.2022): blow_out commands with no labware get filtered
    #   into custom. Refactor this in followup legacy command mapping
    assert commands_result[26] == commands.Custom.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=LegacyCommandParams(
            legacyCommandText="Blowing out at (100, 100, 10)",
            legacyCommandType="command.BLOW_OUT",
        ),
        notes=[],
        result=commands.CustomResult(),
    )
    assert commands_result[27] == commands.Aspirate.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.AspirateParams(
            pipetteId=pipette_left_id,
            labwareId=well_plate_1_id,
            wellName="D1",
            volume=50,
            flowRate=150,
        ),
        notes=[],
        result=commands.AspirateResult(volume=50, position=DeckPoint(x=0, y=0, z=0)),
    )
    assert commands_result[28] == commands.Dispense.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.DispenseParams(
            pipetteId=pipette_left_id,
            labwareId=well_plate_1_id,
            wellName="F1",
            volume=50,
            flowRate=300,
        ),
        notes=[],
        result=commands.DispenseResult(volume=50, position=DeckPoint(x=0, y=0, z=0)),
    )
    #   TODO:(jr, 15.08.2022): aspirate commands with no labware get filtered
    #   into custom. Refactor this in followup legacy command mapping
    assert commands_result[29] == commands.Custom.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=LegacyCommandParams(
            legacyCommandText="Aspirating 50.0 uL from Opentrons 96 Well Aluminum Block with NEST Well Plate 100 µL on 3 at 150.0 uL/sec",
            legacyCommandType="command.ASPIRATE",
        ),
        notes=[],
        result=commands.CustomResult(),
    )
    #   TODO:(jr, 15.08.2022): dispense commands with no labware get filtered
    #   into custom. Refactor this in followup legacy command mapping
    assert commands_result[30] == commands.Custom.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=LegacyCommandParams(
            legacyCommandText="Dispensing 50.0 uL into Opentrons 96 Well Aluminum Block with NEST Well Plate 100 µL on 3 at 300.0 uL/sec",
            legacyCommandType="command.DISPENSE",
        ),
        notes=[],
        result=commands.CustomResult(),
    )
    assert commands_result[31] == commands.DropTip.model_construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.DropTipParams(
            pipetteId=pipette_left_id,
            labwareId=tiprack_1_id,
            wellName="A1",
        ),
        notes=[],
        result=commands.DropTipResult(position=DeckPoint(x=0, y=0, z=0)),
    )


ZERO_VOLUME_ASPIRATE_DISPENSE_PROTOCOL = """\
metadata = {"apiLevel": "2.0"}

def run(ctx):
    # Prep:
    tip_rack = ctx.load_labware("opentrons_96_tiprack_300ul", 1)
    well_plate = ctx.load_labware("biorad_96_wellplate_200ul_pcr", 2)
    pipette = ctx.load_instrument("p300_single_gen2", mount="left", tip_racks=[tip_rack])
    pipette.pick_up_tip()

    # Test:

    # Not providing a volume tells pipette.dispense() to use the pipette's current
    # volume, which will be 0 because this is the first command.
    pipette.dispense(location=well_plate["D6"])

    # Aspirate the max available volume.
    pipette.aspirate(location=well_plate["D7"])
    # Aspirate the max available volume again, which should now be 0.
    pipette.aspirate(location=well_plate["D7"])
"""


@pytest.fixture
def zero_volume_aspirate_dispense_protocol_file(tmp_path: Path) -> Path:
    """Return a file containing the zero-volume aspirate/dispense protocol."""
    path = tmp_path / "protocol-name.py"
    path.write_text(ZERO_VOLUME_ASPIRATE_DISPENSE_PROTOCOL)
    return path


async def test_zero_volume_dispense_commands(
    zero_volume_aspirate_dispense_protocol_file: Path,
) -> None:
    """It should map zero-volume dispenses to moveToWell commands."""
    result_commands = await simulate_and_get_commands(
        zero_volume_aspirate_dispense_protocol_file
    )

    [
        initial_home,
        load_tip_rack,
        load_well_plate,
        load_pipette,
        pick_up_tip,
        dispense_as_move_to_well,
        aspirate_1,
        aspirate_2_as_move_to_well,
    ] = result_commands
    assert isinstance(initial_home, commands.Home)
    assert isinstance(load_tip_rack, commands.LoadLabware)
    assert isinstance(load_well_plate, commands.LoadLabware)
    assert isinstance(load_pipette, commands.LoadPipette)
    assert isinstance(pick_up_tip, commands.PickUpTip)
    assert isinstance(dispense_as_move_to_well, commands.MoveToWell)
    assert isinstance(aspirate_1, commands.Aspirate)
    assert isinstance(aspirate_2_as_move_to_well, commands.MoveToWell)

    assert load_well_plate.result is not None
    assert load_pipette.result is not None
    assert dispense_as_move_to_well.params == commands.MoveToWellParams(
        pipetteId=load_pipette.result.pipetteId,
        labwareId=load_well_plate.result.labwareId,
        wellName="D6",
    )
    assert aspirate_2_as_move_to_well.params == commands.MoveToWellParams(
        pipetteId=load_pipette.result.pipetteId,
        labwareId=load_well_plate.result.labwareId,
        wellName="D7",
    )


async def test_air_gap(tmp_path: Path) -> None:
    """An `air_gap()` should be mapped to an `aspirate`.

    This covers RQA-2621.
    """
    path = tmp_path / "protocol.py"
    path.write_text(
        dedent(
            """\
            metadata = {"apiLevel": "2.13"}
            def run(protocol):
                    # Prep:
                    tip_rack = protocol.load_labware("opentrons_96_tiprack_300ul", 1)
                    well_plate = protocol.load_labware("biorad_96_wellplate_200ul_pcr", 2)
                    pipette = protocol.load_instrument("p300_single_gen2", mount="left", tip_racks=[tip_rack])
                    pipette.pick_up_tip()

                    # Test:
                    pipette.move_to(well_plate["A1"].top())
                    pipette.air_gap(100)
            """
        )
    )
    result_commands = await simulate_and_get_commands(path)
    [
        initial_home,
        load_tip_rack,
        load_well_plate,
        load_pipette,
        pick_up_tip,
        move_to_well,
        air_gap_aspirate,
    ] = result_commands
    assert isinstance(initial_home, commands.Home)
    assert isinstance(load_tip_rack, commands.LoadLabware)
    assert isinstance(load_well_plate, commands.LoadLabware)
    assert isinstance(load_pipette, commands.LoadPipette)
    assert isinstance(pick_up_tip, commands.PickUpTip)
    # TODO(mm, 2024-04-23): This commands.Custom looks wrong. This should be a commands.MoveToWell.
    assert isinstance(move_to_well, commands.Custom)
    assert isinstance(air_gap_aspirate, commands.Aspirate)


async def test_comment(tmp_path: Path) -> None:
    """A `ProtocolContext.comment()` should be mapped to a `comment` command."""
    path = tmp_path / "protocol.py"
    path.write_text(
        dedent(
            """\
            metadata = {"apiLevel": "2.13"}
            def run(protocol):
                protocol.comment("oy.")
            """
        )
    )
    result_commands = await simulate_and_get_commands(path)
    [initial_home, comment] = result_commands
    assert comment == commands.Comment.model_construct(
        status=commands.CommandStatus.SUCCEEDED,
        params=commands.CommentParams(message="oy."),
        notes=[],
        result=commands.CommentResult(),
        createdAt=matchers.Anything(),
        startedAt=matchers.Anything(),
        completedAt=matchers.Anything(),
        id=matchers.Anything(),
        key=matchers.Anything(),
    )
