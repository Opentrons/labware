"""Protocols."""
from opentrons.protocol_api import ParameterContext

from opentrons.protocols.labware import get_all_labware_definitions
from typing import List
from opentrons.protocols.parameters.types import ParameterChoice


def create_trials_parameter(parameters: ParameterContext) -> None:
    """Create parameter for number of trials."""
    # NOTE: Place function inside def add_parameters(parameters) in protocol.
    # NOTE: Copy ctx.params.num_of_trials, ctx.params.right_mount # type: ignore[attr-defined]
    parameters.add_int(
        variable_name="num_of_trials",
        display_name="Number of Trials",
        minimum=1,
        maximum=100,
        default=3,
    )


def create_pipette_parameters(parameters: ParameterContext) -> None:
    """Create parameter for pipettes."""
    # NOTE: Place function inside def add_parameters(parameters) in protocol.
    # NOTE: Copy ctx.params.left mount, ctx.params.right_mount # type: ignore[attr-defined]
    # to get result
    # Left Mount
    parameters.add_str(
        variable_name="left_mount",
        display_name="Left Mount",
        description="Pipette Type on Left Mount.",
        choices=[
            {"display_name": "8ch 50ul", "value": "flex_8channel_50"},
            {"display_name": "8ch 1000ul", "value": "flex_8channel_1000"},
            {"display_name": "1ch 50ul", "value": "flex_1channel_50"},
            {"display_name": "1ch 1000ul", "value": "flex_1channel_1000"},
            {"display_name": "96ch 1000ul", "value": "flex_96channel_1000"},
            {"display_name": "None", "value": "none"},
        ],
        default="flex_1channel_50",
    )
    # Right Mount
    parameters.add_str(
        variable_name="right_mount",
        display_name="Right Mount",
        description="Pipette Type on Right Mount.",
        choices=[
            {"display_name": "8ch 50ul", "value": "flex_8channel_50"},
            {"display_name": "8ch 1000ul", "value": "flex_8channel_1000"},
            {"display_name": "1ch 50ul", "value": "flex_1channel_50"},
            {"display_name": "1ch 1000ul", "value": "flex_1channel_1000"},
            {"display_name": "None", "value": "none"},
        ],
        default="flex_1channel_1000",
    )


def create_labware_parameters(parameters: ParameterContext) -> None:
    """Create parameters for Labware Type."""
    # NOTE: Place function inside def add_parameters(parameters) in protocol.
    # NOTE: Copy ctx.params.labware_type # type: ignore[attr-defined] to get result

    labware_list = get_all_labware_definitions()
    available_labware_choices: List[ParameterChoice] = []
    # Filter out labwaer containing the following strings
    # TODO: change get_all_labware_definitions function to one
    #       that can filter labware by type and not by string
    labware_filter_words = [
        "trash",
        "adapter",
        "tiprack",
        "etips",
        "lid",
        "calibrationblock",
    ]
    filtered_labware = [
        labware
        for labware in labware_list
        if not any(filter_word in labware for filter_word in labware_filter_words)
    ]

    # Add labware to choices list
    filtered_labware.sort()
    for labware in filtered_labware:
        shorten_opentrons_str = labware.replace("opentrons", "opt")
        available_labware_choices.append(
            {
                "display_name": shorten_opentrons_str.replace("_", "").title()[:30],
                "value": labware,
            }
        )

    # Create Parameter
    parameters.add_str(
        variable_name="labware_type",
        display_name="Labware",
        description="Labware to probe.",
        choices=available_labware_choices,
        default="opentrons_10_tuberack_nest_4x50ml_6x15ml_conical",
    )


def create_liquid_parameter(parameters: ParameterContext) -> None:
    """Create parameter to specify liquid type."""
    # NOTE: Place function inside def add_parameters(parameters) in protocol.
    # NOTE: Copy ctx.params.liquid_type # type: ignore[attr-defined] to get result

    parameters.add_str(
        variable_name="liquid_type",
        display_name="Liquid Type",
        description="Liquid being tested.",
        choices=[
            {"display_name": "Water", "value": "water"},
            {"display_name": "Ethanol", "value": "ethanol"},
        ],
        default="water",
    )


def create_tube_volume_parameter(parameters: ParameterContext) -> None:
    """Select if reagent tube should be 15 ml or 50 ml."""
    # NOTE: Place function inside def add_parameters(parameters) in protocol.
    # NOTE: Copy ctx.params.tube_volume # type: ignore[attr-defined] to get result
    parameters.add_int(
        variable_name="tube_volume",
        display_name="Tube Volume",
        default=15,
        minimum=15,
        maximum=50,
        unit="mL",
    )
