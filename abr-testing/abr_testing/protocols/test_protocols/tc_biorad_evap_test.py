"""Test TC Disposable Lid with BioRad Plate."""

from opentrons.protocol_api import (
    ProtocolContext,
    ParameterContext,
    Well,
    Labware,
    InstrumentContext,
)
from typing import List
from abr_testing.protocols import helpers
from opentrons.protocol_api.module_contexts import ThermocyclerContext
from opentrons.hardware_control.modules.types import ThermocyclerStep

metadata = {"protocolName": "Tough Auto Seal Lid Evaporation Test"}
requirements = {"robotType": "Flex", "apiLevel": "2.21"}


def add_parameters(parameters: ParameterContext) -> None:
    """Add Parameters."""
    helpers.create_single_pipette_mount_parameter(parameters)
    helpers.create_tc_lid_deck_riser_parameter(parameters)
    helpers.create_tc_compatible_labware_parameter(parameters)


def _pcr_cycle(thermocycler: ThermocyclerContext) -> None:
    """30x cycles of: 70° for 30s 72° for 30s 95° for 10s."""
    profile_TAG2: List[ThermocyclerStep] = [
        {"temperature": 70, "hold_time_seconds": 30},
        {"temperature": 72, "hold_time_seconds": 30},
        {"temperature": 95, "hold_time_seconds": 10},
    ]
    thermocycler.execute_profile(
        steps=profile_TAG2, repetitions=30, block_max_volume=50
    )


def _fill_with_liquid_and_measure(
    protocol: ProtocolContext,
    pipette: InstrumentContext,
    reservoir: Labware,
    plate_in_cycler: Labware,
) -> None:
    """Fill plate with 10 ul per well."""
    locations: List[Well] = [
        plate_in_cycler["A1"],
        plate_in_cycler["A2"],
        plate_in_cycler["A3"],
        plate_in_cycler["A4"],
        plate_in_cycler["A5"],
        plate_in_cycler["A6"],
        plate_in_cycler["A7"],
        plate_in_cycler["A8"],
        plate_in_cycler["A9"],
        plate_in_cycler["A10"],
        plate_in_cycler["A11"],
        plate_in_cycler["A12"],
    ]
    volumes = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]
    protocol.pause("Weight Armadillo Plate, place on thermocycler")
    # pipette 10uL into Armadillo wells
    source_well: Well = reservoir["A1"]
    pipette.distribute(
        volume=volumes,
        source=source_well,
        dest=locations,
        return_tips=True,
        blow_out=False,
    )
    protocol.pause("Weight Armadillo Plate, place on thermocycler, put on lid")


def run(ctx: ProtocolContext) -> None:
    """Evaporation Test."""
    pipette_mount = ctx.params.pipette_mount  # type: ignore[attr-defined]
    deck_riser = ctx.params.deck_riser  # type: ignore[attr-defined]
    labware_tc_compatible = ctx.params.labware_tc_compatible  # type: ignore[attr-defined]
    tiprack_50 = ctx.load_labware("opentrons_flex_96_tiprack_50ul", "B2")
    ctx.load_trash_bin("A3")
    tc_mod: ThermocyclerContext = ctx.load_module(
        helpers.tc_str
    )  # type: ignore[assignment]
    plate_in_cycler = tc_mod.load_labware(labware_tc_compatible)
    p50 = ctx.load_instrument("flex_8channel_50", pipette_mount, tip_racks=[tiprack_50])
    unused_lids = helpers.load_disposable_lids(ctx, 5, ["D2"], deck_riser)
    top_lid = unused_lids[0]
    reservoir = ctx.load_labware("nest_12_reservoir_15ml", "A2")
    tc_mod.open_lid()
    tc_mod.set_block_temperature(4)
    tc_mod.set_lid_temperature(105)

    # hold at 95° for 3 minutes
    profile_TAG: List[ThermocyclerStep] = [{"temperature": 95, "hold_time_minutes": 3}]
    # hold at 72° for 5min
    profile_TAG3: List[ThermocyclerStep] = [{"temperature": 72, "hold_time_minutes": 5}]
    tc_mod.open_lid()
    _fill_with_liquid_and_measure(ctx, p50, reservoir, plate_in_cycler)
    ctx.move_labware(top_lid, plate_in_cycler, use_gripper=True)
    tc_mod.close_lid()
    tc_mod.execute_profile(steps=profile_TAG, repetitions=1, block_max_volume=50)
    _pcr_cycle(tc_mod)
    tc_mod.execute_profile(steps=profile_TAG3, repetitions=1, block_max_volume=50)
    # # # Cool to 4°
    tc_mod.set_block_temperature(4)
    tc_mod.set_lid_temperature(105)
    # Open lid
    tc_mod.open_lid()
    ctx.move_labware(top_lid, "C2", use_gripper=True)
    ctx.move_labware(top_lid, unused_lids[1], use_gripper=True)
