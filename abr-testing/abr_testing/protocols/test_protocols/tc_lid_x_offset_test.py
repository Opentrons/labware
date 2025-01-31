"""Protocol to Test the Stacking and Movement of Tough Auto Seal Lid."""
from opentrons.protocol_api import ParameterContext, ProtocolContext, Labware
from opentrons.protocol_api.module_contexts import (
    ThermocyclerContext,
)
from typing import List


metadata = {"protocolName": "5 Stack Test"}
requirements = {"robotType": "Flex", "apiLevel": "2.20"}


def add_parameters(parameters: ParameterContext) -> None:
    """Add parameters."""
    parameters.add_int(
        variable_name="lids_in_a_stack",
        display_name="Num of Lids in Stack",
        minimum=1,
        maximum=5,
        default=5,
    )
    parameters.add_float(
        variable_name="num_offset",
        display_name="Numerical Offset",
        choices=[
            {"display_name": "0.0", "value": 0.0},
            {"display_name": "0.1", "value": 0.1},
            {"display_name": "0.2", "value": 0.2},
            {"display_name": "0.3", "value": 0.3},
            {"display_name": "0.4", "value": 0.4},
            {"display_name": "0.5", "value": 0.5},
            {"display_name": "0.6", "value": 0.6},
            {"display_name": "0.7", "value": 0.7},
            {"display_name": "0.8", "value": 0.8},
            {"display_name": "0.9", "value": 0.9},
            {"display_name": "1.0", "value": 1.0},
            {"display_name": "1.1", "value": 1.1},
            {"display_name": "1.2", "value": 1.2},
            {"display_name": "1.3", "value": 1.3},
            {"display_name": "1.4", "value": 1.4},
            {"display_name": "1.5", "value": 1.5},
            {"display_name": "1.6", "value": 1.6},
            {"display_name": "1.7", "value": 1.7},
            {"display_name": "1.8", "value": 1.8},
            {"display_name": "1.9", "value": 1.9},
            {"display_name": "2", "value": 2},
        ],
        default=2,
    )
    parameters.add_bool(
        variable_name="negative",
        display_name="Negative",
        description="Turn on to make offset negative.",
        default=False,
    )
    parameters.add_str(
        variable_name="offset",
        display_name="Offset",
        choices=[
            {"display_name": "Z", "value": "Z"},
            {"display_name": "Y", "value": "Y"},
            {"display_name": "X", "value": "X"},
        ],
        default="X",
    )
    parameters.add_bool(
        variable_name="thermocycler_bool", display_name="thermocycler", default=False
    )


def run(protocol: ProtocolContext) -> None:
    """Runs protocol that moves lids and stacks them."""
    # Load Parameters
    lids_in_stack: int = protocol.params.lids_in_a_stack  # type: ignore[attr-defined]
    num_offset = protocol.params.num_offset  # type: ignore[attr-defined]

    offset = protocol.params.offset  # type: ignore[attr-defined]
    negative = protocol.params.negative  # type: ignore[attr-defined]
    thermocycler_bool = protocol.params.thermocycler_bool  # type: ignore[attr-defined]
    if negative:
        num_offset = num_offset * -1

    # Thermocycler
    if thermocycler_bool:
        thermocycler: ThermocyclerContext = protocol.load_module(
            "thermocyclerModuleV2"
        )  # type: ignore[assignment]
        plate_in_cycler: Labware = thermocycler.load_labware(
            "armadillo_96_wellplate_200ul_pcr_full_skirt"
        )
        thermocycler.open_lid()
    else:
        plate_in_cycler = protocol.load_labware(
            "armadillo_96_wellplate_200ul_pcr_full_skirt", "D2"
        )
    # Load Lids
    deck_riser_adapter = protocol.load_adapter("opentrons_flex_deck_riser", "D3")
    unused_lids: List[Labware] = [
        deck_riser_adapter.load_labware("opentrons_tough_pcr_auto_sealing_lid")
    ]
    if lids_in_stack > 1:
        for i in range(lids_in_stack - 1):
            unused_lids.append(
                unused_lids[-1].load_labware("opentrons_tough_pcr_auto_sealing_lid")
            )
    unused_lids.reverse()
    pick_up_offset = {
        "X": {"x": num_offset, "y": 0, "z": 0},
        "Y": {"x": 0, "y": num_offset, "z": 0},
        "Z": {"x": 0, "y": 0, "z": num_offset},
    }
    slot = 0
    if len(unused_lids) > 1:
        lid_to_move_back_to = unused_lids[1]  # stack back on top
    else:
        lid_to_move_back_to = deck_riser_adapter
    protocol.comment(f"{offset} Offset {num_offset}, Lid # {slot+1}")
    # move lid to plate in thermocycler
    protocol.move_labware(
        unused_lids[0],
        plate_in_cycler,
        use_gripper=True,
        pick_up_offset=pick_up_offset[offset],
    )
    protocol.move_labware(unused_lids[0], lid_to_move_back_to, use_gripper=True)
