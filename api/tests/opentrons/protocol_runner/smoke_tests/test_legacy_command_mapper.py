"""Test legacy command mapping in an end-to-end environment.

Legacy ProtocolContext objects are prohibitively difficult to instansiate
and mock in an isolated unit test environment.
"""
import pytest
import textwrap
from datetime import datetime
from decoy import matchers
from pathlib import Path

from opentrons.protocol_engine import commands
from opentrons.protocol_reader import ProtocolReader
from opentrons.protocol_runner import create_simulating_runner

from opentrons.protocol_engine.types import DeckSlotLocation
from opentrons.types import DeckSlotName
from opentrons.protocol_engine.types import PipetteName
from opentrons.types import MountType

LEGACY_COMMANDS_PROTOCOL = textwrap.dedent(
    """
    # my protocol
    metadata = {
        "apiLevel": "2.11",
    }

    def run(ctx):
        tip_rack_1 = ctx.load_labware(
            load_name="opentrons_96_tiprack_300ul",
            location="1",
        )
        tip_rack_2 = ctx.load_labware(
            load_name="opentrons_96_tiprack_300ul",
            location="2",
        )
        well_plate_1 = ctx.load_labware(
            load_name="opentrons_96_aluminumblock_nest_wellplate_100ul",
            location="3",
        )
        pipette_left = ctx.load_instrument(
            instrument_name="p300_single",
            mount="left",
            tip_racks=[tip_rack_1],
        )
        pipette_right = ctx.load_instrument(
            instrument_name="p300_multi",
            mount="right",
        )
        pipette_left.pick_up_tip(
            location=tip_rack_1.wells_by_name()["A1"],
        )
        pipette_right.pick_up_tip(
            location=tip_rack_2.wells_by_name()["A1"].top(),
        )
        pipette_left.drop_tip()
        pipette_left.pick_up_tip()
        pipette_left.aspirate(
            volume=40,
            rate=130,
            location=well_plate_1["A1"],
        )
        pipette_left.dispense(
            volume=35,
            rate=130,
            location=well_plate_1["B1"],
        )
        pipette_left.aspirate(
            volume=40,
            location=well_plate_1.wells_by_name()["A1"],
        )
        pipette_left.dispense(
            volume=35,
            location=well_plate_1.wells_by_name()["B1"],
        )
        pipette_left.blow_out(
            location=well_plate_1.wells_by_name()["B1"].top(),
        )
        pipette_left.aspirate(50)
        pipette_left.dispense(50)
        pipette_left.blow_out(
            location=well_plate_1["B1"].bottom(),
        )
        pipette_left.aspirate()
        pipette_left.dispense()
        pipette_left.blow_out()
        pipette_left.drop_tip(
            location=tip_rack_1.wells_by_name()["A1"]
        )
    """
)


@pytest.fixture
def legacy_commands_protocol_file(tmp_path: Path) -> Path:
    """Put the pick up tip mapping test protocol on disk."""
    path = tmp_path / "protocol-name.py"
    path.write_text(LEGACY_COMMANDS_PROTOCOL)
    return path


async def test_legacy_commands(legacy_commands_protocol_file: Path) -> None:
    """It should map legacy pick up tip commands."""
    protocol_reader = ProtocolReader()
    protocol_source = await protocol_reader.read_saved(
        files=[legacy_commands_protocol_file],
        directory=None,
    )

    subject = await create_simulating_runner()
    result = await subject.run(protocol_source)
    commands_result = result.commands

    tiprack_1_result_captor = matchers.Captor()
    tiprack_2_result_captor = matchers.Captor()
    well_plate_1_result_captor = matchers.Captor()
    pipette_left_result_captor = matchers.Captor()
    pipette_right_result_captor = matchers.Captor()

    assert len(commands_result) == 21

    assert commands_result[0] == commands.LoadLabware.construct(
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
        result=tiprack_1_result_captor,
    )
    assert commands_result[1] == commands.LoadLabware.construct(
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
        result=tiprack_2_result_captor,
    )
    assert commands_result[2] == commands.LoadLabware.construct(
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
        result=well_plate_1_result_captor,
    )

    assert commands_result[3] == commands.LoadPipette.construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.LoadPipetteParams(
            pipetteName=PipetteName.P300_SINGLE, mount=MountType.LEFT
        ),
        result=pipette_left_result_captor,
    )

    assert commands_result[4] == commands.LoadPipette.construct(
        id=matchers.IsA(str),
        key=matchers.IsA(str),
        status=commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=commands.LoadPipetteParams(
            pipetteName=PipetteName.P300_MULTI, mount=MountType.RIGHT
        ),
        result=pipette_right_result_captor,
    )

    # TODO(mc, 2021-11-11): not sure why I have to dict-access these properties
    # might be a bug in Decoy, might be something weird that Pydantic does
    tiprack_1_id = tiprack_1_result_captor.value["labwareId"]
    tiprack_2_id = tiprack_2_result_captor.value["labwareId"]
    well_plate_1_id = well_plate_1_result_captor.value["labwareId"]
    pipette_left_id = pipette_left_result_captor.value["pipetteId"]
    pipette_right_id = pipette_right_result_captor.value["pipetteId"]

    assert commands_result[5] == commands.PickUpTip.construct(
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
        result=commands.PickUpTipResult(),
    )
    assert commands_result[6] == commands.PickUpTip.construct(
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
        result=commands.PickUpTipResult(),
    )

    assert commands_result[7] == commands.DropTip.construct(
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
        result=commands.DropTipResult(),
    )

    assert commands_result[8] == commands.PickUpTip.construct(
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
        result=commands.PickUpTipResult(),
    )
    assert commands_result[9] == commands.Aspirate.construct(
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
            flowRate=130,
        ),
        result=commands.AspirateResult(volume=40),
    )
    assert commands_result[10] == commands.Dispense.construct(
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
            flowRate=130,
        ),
        result=commands.DispenseResult(volume=35),
    )
    assert commands_result[11] == commands.Aspirate.construct(
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
            flowRate=1.0,
        ),
        result=commands.AspirateResult(volume=40),
    )
    assert commands_result[12] == commands.Dispense.construct(
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
            flowRate=1.0,
        ),
        result=commands.DispenseResult(volume=35),
    )
    assert commands_result[13] == commands.BlowOut.construct(
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
        result=commands.BlowOutResult(),
    )
    assert commands_result[14] == commands.Aspirate.construct(
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
            flowRate=1.0,
        ),
        result=commands.AspirateResult(volume=50),
    )
    assert commands_result[15] == commands.Dispense.construct(
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
            flowRate=1.0,
        ),
        result=commands.DispenseResult(volume=50),
    )
    assert commands_result[16] == commands.BlowOut.construct(
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
        result=commands.BlowOutResult(),
    )
    assert commands_result[17] == commands.Aspirate.construct(
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
            volume=300,
            flowRate=1.0,
        ),
        result=commands.AspirateResult(volume=300),
    )
    assert commands_result[18] == commands.Dispense.construct(
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
            volume=300,
            flowRate=1.0,
        ),
        result=commands.DispenseResult(volume=300),
    )
    #   TODO:(jr, 12.08.2022): blow_out commands with no location get filtered
    #   into custom. Refactor this in followup legacy command mapping
    # assert commands_result[19] == commands.Custom.construct(
    #     id=matchers.IsA(str),
    #     key=matchers.IsA(str),
    #     status=commands.CommandStatus.SUCCEEDED,
    #     createdAt=matchers.IsA(datetime),
    #     startedAt=matchers.IsA(datetime),
    #     completedAt=matchers.IsA(datetime),
    #     params=LegacyCommandParams(
    #         legacyCommandText="Blowing out at B1 of Opentrons 96 Well Aluminum Block with NEST Well Plate 100 µL on 3",
    #         legacyCommandType="command.BLOW_OUT",
    #     ),
    #     result=commands.CustomResult(),
    # )
    assert commands_result[19] == commands.BlowOut.construct(
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
        result=commands.BlowOutResult(),
    )
    assert commands_result[20] == commands.DropTip.construct(
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
        result=commands.DropTipResult(),
    )
