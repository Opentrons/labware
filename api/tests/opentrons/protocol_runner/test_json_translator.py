"""Tests for the JSON JsonTranslator interface."""
import pytest
from typing import Dict, List

from opentrons_shared_data.labware.labware_definition import (
    LabwareDefinition,
    Parameters,
    Metadata,
    DisplayCategory,
    BrandData,
    CornerOffsetFromSlot,
    Dimensions,
    Group,
    Metadata1,
    WellDefinition,
)
from opentrons_shared_data.protocol.models import (
    protocol_schema_v6,
    protocol_schema_v7,
    Liquid,
    Labware,
)
from opentrons_shared_data.pipette.dev_types import PipetteNameType
from opentrons.types import DeckSlotName, MountType
from opentrons.protocol_runner.json_translator import JsonTranslator
from opentrons.protocol_engine import (
    commands as pe_commands,
    DeckPoint,
    DeckSlotLocation,
    WellLocation,
    DropTipWellLocation,
    WellOrigin,
    DropTipWellOrigin,
    WellOffset,
    ModuleModel,
    ModuleLocation,
    Liquid as PE_Liquid,
)
from opentrons.protocol_engine.types import HexColor

VALID_TEST_PARAMS = [
    (
        protocol_schema_v6.Command(
            commandType="aspirate",
            key=None,
            params=protocol_schema_v6.Params(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                volume=1.23,
                # todo (Max and Tamar 3/17/22):needs to be added to the aspirate command
                #  https://github.com/Opentrons/opentrons/issues/8204
                flowRate=4.56,
                wellName="A1",
                wellLocation=protocol_schema_v6.WellLocation(
                    origin="bottom",
                    offset=protocol_schema_v6.OffsetVector(x=0, y=0, z=7.89),
                ),
            ),
        ),
        protocol_schema_v7.Command(
            commandType="aspirate",
            key=None,
            params=protocol_schema_v7.Params(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                volume=1.23,
                # todo (Max and Tamar 3/17/22):needs to be added to the aspirate command
                #  https://github.com/Opentrons/opentrons/issues/8204
                flowRate=4.56,
                wellName="A1",
                wellLocation=protocol_schema_v7.WellLocation(
                    origin="bottom",
                    offset=protocol_schema_v7.OffsetVector(x=0, y=0, z=7.89),
                ),
            ),
        ),
        pe_commands.AspirateCreate(
            key=None,
            params=pe_commands.AspirateParams(
                # todo: id
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                volume=1.23,
                flowRate=4.56,
                wellName="A1",
                wellLocation=WellLocation(
                    origin=WellOrigin.BOTTOM,
                    offset=WellOffset(x=0, y=0, z=7.89),
                ),
            ),
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="dispense",
            key="dispense-key",
            params=protocol_schema_v6.Params(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                volume=1.23,
                flowRate=4.56,
                wellName="A1",
                wellLocation=protocol_schema_v6.WellLocation(
                    origin="bottom",
                    offset=protocol_schema_v6.OffsetVector(x=0, y=0, z=7.89),
                ),
            ),
        ),
        protocol_schema_v7.Command(
            commandType="dispense",
            key="dispense-key",
            params=protocol_schema_v7.Params(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                volume=1.23,
                flowRate=4.56,
                wellName="A1",
                wellLocation=protocol_schema_v7.WellLocation(
                    origin="bottom",
                    offset=protocol_schema_v7.OffsetVector(x=0, y=0, z=7.89),
                ),
            ),
        ),
        pe_commands.DispenseCreate(
            key="dispense-key",
            params=pe_commands.DispenseParams(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                volume=1.23,
                flowRate=4.56,
                wellName="A1",
                wellLocation=WellLocation(
                    origin=WellOrigin.BOTTOM,
                    offset=WellOffset(x=0, y=0, z=7.89),
                ),
            ),
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="dropTip",
            params=protocol_schema_v6.Params(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                wellName="A1",
            ),
        ),
        protocol_schema_v7.Command(
            commandType="dropTip",
            params=protocol_schema_v7.Params(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                wellName="A1",
            ),
        ),
        pe_commands.DropTipCreate(
            params=pe_commands.DropTipParams(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                wellName="A1",
                wellLocation=DropTipWellLocation(
                    origin=DropTipWellOrigin.DEFAULT,
                    offset=WellOffset(x=0, y=0, z=0),
                ),
            )
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="pickUpTip",
            params=protocol_schema_v6.Params(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                wellName="A1",
            ),
        ),
        protocol_schema_v7.Command(
            commandType="pickUpTip",
            params=protocol_schema_v7.Params(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                wellName="A1",
            ),
        ),
        pe_commands.PickUpTipCreate(
            params=pe_commands.PickUpTipParams(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                wellName="A1",
                wellLocation=WellLocation(),
            )
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="touchTip",
            params=protocol_schema_v6.Params(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                wellName="A1",
                wellLocation=protocol_schema_v6.WellLocation(
                    origin="bottom",
                    offset=protocol_schema_v6.OffsetVector(x=0, y=0, z=-1.23),
                ),
            ),
        ),
        protocol_schema_v7.Command(
            commandType="touchTip",
            params=protocol_schema_v7.Params(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                wellName="A1",
                wellLocation=protocol_schema_v7.WellLocation(
                    origin="bottom",
                    offset=protocol_schema_v7.OffsetVector(x=0, y=0, z=-1.23),
                ),
            ),
        ),
        pe_commands.TouchTipCreate(
            params=pe_commands.TouchTipParams(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                wellName="A1",
                wellLocation=WellLocation(
                    origin=WellOrigin.BOTTOM,
                    offset=WellOffset(x=0, y=0, z=-1.23),
                ),
            )
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="loadPipette",
            params=protocol_schema_v6.Params(pipetteId="pipette-id-1", mount="left"),
        ),
        protocol_schema_v7.Command(
            commandType="loadPipette",
            params=protocol_schema_v7.Params(
                pipetteId="pipette-id-1", mount="left", pipetteName="p10_single"
            ),
        ),
        pe_commands.LoadPipetteCreate(
            params=pe_commands.LoadPipetteParams(
                pipetteId="pipette-id-1",
                pipetteName=PipetteNameType("p10_single"),
                mount=MountType("left"),
            )
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="loadModule",
            params=protocol_schema_v6.Params(
                moduleId="module-id-1",
                location=protocol_schema_v6.Location(slotName="3"),
            ),
        ),
        protocol_schema_v7.Command(
            commandType="loadModule",
            params=protocol_schema_v7.Params(
                moduleId="module-id-1",
                model="magneticModuleV2",
                location=protocol_schema_v7.Location(slotName="3"),
            ),
        ),
        pe_commands.LoadModuleCreate(
            params=pe_commands.LoadModuleParams(
                model=ModuleModel("magneticModuleV2"),
                moduleId="module-id-1",
                location=DeckSlotLocation(slotName=(DeckSlotName("3"))),
            )
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="loadLabware",
            params=protocol_schema_v6.Params(
                labwareId="labware-id-2",
                location=protocol_schema_v6.Location(moduleId="temperatureModuleId"),
            ),
        ),
        protocol_schema_v7.Command(
            commandType="loadLabware",
            params=protocol_schema_v7.Params(
                labwareId="labware-id-2",
                version=1,
                namespace="example",
                loadName="foo_8_plate_33ul",
                location=protocol_schema_v7.Location(moduleId="temperatureModuleId"),
                displayName="Trash",
            ),
        ),
        pe_commands.LoadLabwareCreate(
            params=pe_commands.LoadLabwareParams(
                loadName="foo_8_plate_33ul",
                displayName="Trash",
                labwareId="labware-id-2",
                location=ModuleLocation(moduleId="temperatureModuleId"),
                version=1,
                namespace="example",
            )
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="blowout",
            params=protocol_schema_v6.Params(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                wellName="A1",
                wellLocation=protocol_schema_v6.WellLocation(
                    origin="bottom",
                    offset=protocol_schema_v6.OffsetVector(x=0, y=0, z=7.89),
                ),
                flowRate=1.23,
            ),
        ),
        protocol_schema_v7.Command(
            commandType="blowout",
            params=protocol_schema_v7.Params(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                wellName="A1",
                wellLocation=protocol_schema_v7.WellLocation(
                    origin="bottom",
                    offset=protocol_schema_v7.OffsetVector(x=0, y=0, z=7.89),
                ),
                flowRate=1.23,
            ),
        ),
        pe_commands.BlowOutCreate(
            params=pe_commands.BlowOutParams(
                pipetteId="pipette-id-1",
                labwareId="labware-id-2",
                wellName="A1",
                wellLocation=WellLocation(
                    origin=WellOrigin.BOTTOM,
                    offset=WellOffset(x=0, y=0, z=7.89),
                ),
                flowRate=1.23,
            )
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="delay",
            params=protocol_schema_v6.Params(waitForResume=True, message="hello world"),
        ),
        protocol_schema_v7.Command(
            commandType="delay",
            params=protocol_schema_v7.Params(waitForResume=True, message="hello world"),
        ),
        pe_commands.WaitForResumeCreate(
            params=pe_commands.WaitForResumeParams(message="hello world")
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="delay",
            params=protocol_schema_v6.Params(seconds=12.34, message="hello world"),
        ),
        protocol_schema_v7.Command(
            commandType="delay",
            params=protocol_schema_v7.Params(seconds=12.34, message="hello world"),
        ),
        pe_commands.WaitForDurationCreate(
            params=pe_commands.WaitForDurationParams(
                seconds=12.34,
                message="hello world",
            )
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="waitForResume",
            params=protocol_schema_v6.Params(message="hello world"),
        ),
        protocol_schema_v7.Command(
            commandType="waitForResume",
            params=protocol_schema_v7.Params(message="hello world"),
        ),
        pe_commands.WaitForResumeCreate(
            params=pe_commands.WaitForResumeParams(message="hello world")
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="waitForDuration",
            params=protocol_schema_v6.Params(seconds=12.34, message="hello world"),
        ),
        protocol_schema_v7.Command(
            commandType="waitForDuration",
            params=protocol_schema_v7.Params(seconds=12.34, message="hello world"),
        ),
        pe_commands.WaitForDurationCreate(
            params=pe_commands.WaitForDurationParams(
                seconds=12.34,
                message="hello world",
            )
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="moveToCoordinates",
            params=protocol_schema_v6.Params(
                pipetteId="pipette-id-1",
                coordinates=protocol_schema_v6.OffsetVector(x=1.1, y=2.2, z=3.3),
                minimumZHeight=123.4,
                forceDirect=True,
            ),
        ),
        protocol_schema_v7.Command(
            commandType="moveToCoordinates",
            params=protocol_schema_v7.Params(
                pipetteId="pipette-id-1",
                coordinates=protocol_schema_v7.OffsetVector(x=1.1, y=2.2, z=3.3),
                minimumZHeight=123.4,
                forceDirect=True,
            ),
        ),
        pe_commands.MoveToCoordinatesCreate(
            params=pe_commands.MoveToCoordinatesParams(
                pipetteId="pipette-id-1",
                coordinates=DeckPoint(x=1.1, y=2.2, z=3.3),
                minimumZHeight=123.4,
                forceDirect=True,
            )
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="thermocycler/runProfile",
            params=protocol_schema_v6.Params(
                moduleId="module-id-2",
                blockMaxVolumeUl=1.11,
                profile=[
                    protocol_schema_v6.ProfileStep(
                        celsius=2.22,
                        holdSeconds=3.33,
                    ),
                    protocol_schema_v6.ProfileStep(
                        celsius=4.44,
                        holdSeconds=5.55,
                    ),
                ],
            ),
        ),
        protocol_schema_v7.Command(
            commandType="thermocycler/runProfile",
            params=protocol_schema_v7.Params(
                moduleId="module-id-2",
                blockMaxVolumeUl=1.11,
                profile=[
                    protocol_schema_v7.ProfileStep(
                        celsius=2.22,
                        holdSeconds=3.33,
                    ),
                    protocol_schema_v7.ProfileStep(
                        celsius=4.44,
                        holdSeconds=5.55,
                    ),
                ],
            ),
        ),
        pe_commands.thermocycler.RunProfileCreate(
            params=pe_commands.thermocycler.RunProfileParams(
                moduleId="module-id-2",
                blockMaxVolumeUl=1.11,
                profile=[
                    pe_commands.thermocycler.RunProfileStepParams(
                        celsius=2.22, holdSeconds=3.33
                    ),
                    pe_commands.thermocycler.RunProfileStepParams(
                        celsius=4.44, holdSeconds=5.55
                    ),
                ],
            ),
        ),
    ),
    (
        protocol_schema_v6.Command(
            commandType="loadLiquid",
            key=None,
            params=protocol_schema_v6.Params(
                labwareId="labware-id-2",
                liquidId="liquid-id-555",
                volumeByWell={"A1": 32, "B2": 50},
            ),
        ),
        protocol_schema_v7.Command(
            commandType="loadLiquid",
            key=None,
            params=protocol_schema_v7.Params(
                labwareId="labware-id-2",
                liquidId="liquid-id-555",
                volumeByWell={"A1": 32, "B2": 50},
            ),
        ),
        pe_commands.LoadLiquidCreate(
            key=None,
            params=pe_commands.LoadLiquidParams(
                labwareId="labware-id-2",
                liquidId="liquid-id-555",
                volumeByWell={"A1": 32, "B2": 50},
            ),
        ),
    ),
]


@pytest.fixture
def subject() -> JsonTranslator:
    """Get a JsonTranslator test subject."""
    return JsonTranslator()


def _load_labware_definition_data() -> LabwareDefinition:
    return LabwareDefinition(
        version=1,
        namespace="example",
        schemaVersion=2,
        ordering=[["A1", "B1", "C1", "D1"], ["A2", "B2", "C2", "D2"]],
        groups=[Group(wells=["A1"], metadata=Metadata1())],
        wells={
            "A1": WellDefinition(
                depth=25,
                x=18.21,
                y=75.43,
                z=75,
                totalLiquidVolume=1100000,
                shape="rectangular",
            )
        },
        dimensions=Dimensions(yDimension=85.5, zDimension=100, xDimension=127.75),
        cornerOffsetFromSlot=CornerOffsetFromSlot(x=0, y=0, z=0),
        brand=BrandData(brand="foo"),
        metadata=Metadata(
            displayName="Foo 8 Well Plate 33uL",
            displayCategory=DisplayCategory("wellPlate"),
            displayVolumeUnits="µL",
        ),
        parameters=Parameters(
            loadName="foo_8_plate_33ul",
            isTiprack=False,
            isMagneticModuleCompatible=False,
            format="irregular",
        ),
    )


def _make_v6_json_protocol(
    *,
    pipettes: Dict[str, protocol_schema_v6.Pipette] = {
        "pipette-id-1": protocol_schema_v6.Pipette(name="p10_single"),
    },
    labware_definitions: Dict[str, LabwareDefinition] = {
        "example/plate/1": _load_labware_definition_data(),
        "example/trash/1": _load_labware_definition_data(),
    },
    labware: Dict[str, Labware] = {
        "labware-id-1": Labware(
            displayName="Source Plate", definitionId="example/plate/1"
        ),
        "labware-id-2": Labware(displayName="Trash", definitionId="example/trash/1"),
    },
    commands: List[protocol_schema_v6.Command] = [],
    modules: Dict[str, protocol_schema_v6.Module] = {
        "module-id-1": protocol_schema_v6.Module(model="magneticModuleV2"),
        "module-id-2": protocol_schema_v6.Module(model="thermocyclerModuleV2"),
    },
    liquids: Dict[str, Liquid] = {
        "liquid-id-555": Liquid(
            displayName="water", description="water description", displayColor="#F00"
        )
    },
) -> protocol_schema_v6.ProtocolSchemaV6:
    """Return a minimal JsonProtocol with the given elements, to use as test input."""
    return protocol_schema_v6.ProtocolSchemaV6(
        # schemaVersion is arbitrary. Currently (2021-06-28), JsonProtocol.parse_obj()
        # isn't smart enough to validate differently depending on this field.
        otSharedSchema="#/protocol/schemas/6",
        schemaVersion=6,
        metadata=protocol_schema_v6.Metadata(),
        robot=protocol_schema_v6.Robot(model="OT-2 Standard", deckId="ot2_standard"),
        pipettes=pipettes,
        labwareDefinitions=labware_definitions,
        labware=labware,
        commands=commands,
        liquids=liquids,
        modules=modules,
    )


def _make_v7_json_protocol(
    *,
    labware_definitions: Dict[str, LabwareDefinition] = {
        "example/plate/1": _load_labware_definition_data(),
        "example/trash/1": _load_labware_definition_data(),
    },
    commands: List[protocol_schema_v7.Command] = [],
    modules: Dict[str, protocol_schema_v7.Module] = {
        "module-id-1": protocol_schema_v7.Module(model="magneticModuleV2"),
        "module-id-2": protocol_schema_v7.Module(model="thermocyclerModuleV2"),
    },
    liquids: Dict[str, Liquid] = {
        "liquid-id-555": Liquid(
            displayName="water", description="water description", displayColor="#F00"
        )
    },
) -> protocol_schema_v7.ProtocolSchemaV7:
    """Return a minimal JsonProtocol with the given elements, to use as test input."""
    return protocol_schema_v7.ProtocolSchemaV7(
        # schemaVersion is arbitrary. Currently (2021-06-28), JsonProtocol.parse_obj()
        # isn't smart enough to validate differently depending on this field.
        otSharedSchema="#/protocol/schemas/7",
        schemaVersion=7,
        metadata=protocol_schema_v7.Metadata(),
        robot=protocol_schema_v7.Robot(model="OT-2 Standard", deckId="ot2_standard"),
        labwareDefinitions=labware_definitions,
        commands=commands,
        liquids=liquids,
        modules=modules,
    )


@pytest.mark.parametrize(
    "test_v6_input, test_v7_input,expected_output", VALID_TEST_PARAMS
)
def test_load_command(
    subject: JsonTranslator,
    test_v6_input: protocol_schema_v6.Command,
    test_v7_input: protocol_schema_v7.Command,
    expected_output: pe_commands.CommandCreate,
) -> None:
    """Test translating v6 commands to protocol engine commands."""
    v6_output = subject.translate_commands(
        _make_v6_json_protocol(commands=[test_v6_input])
    )
    v7_output = subject.translate_v7_commands(
        _make_v7_json_protocol(commands=[test_v7_input])
    )
    assert v6_output == [expected_output]
    assert v7_output == [expected_output]


def test_load_liquid(
    subject: JsonTranslator,
) -> None:
    """Test translating v6 commands to protocol engine commands."""
    protocol = _make_v6_json_protocol()
    result = subject.translate_liquids(protocol)

    assert result == [
        PE_Liquid(
            id="liquid-id-555",
            displayName="water",
            description="water description",
            displayColor=HexColor(__root__="#F00"),
        )
    ]
