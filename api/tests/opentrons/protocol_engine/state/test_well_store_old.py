"""Well state store tests.

DEPRECATED: Testing WellStore independently of WellView is no longer helpful.
Try to add new tests to well_state.py, where they can be tested together,
treating WellState as a private implementation detail.
"""

import pytest
from datetime import datetime
from opentrons.protocol_engine.state.wells import WellStore
from opentrons.protocol_engine.actions.actions import SucceedCommandAction
from opentrons.protocol_engine.state import update_types

from .command_fixtures import (
    create_liquid_probe_command,
    create_load_liquid_command,
    create_aspirate_command,
)


@pytest.fixture
def subject() -> WellStore:
    """Well store test subject."""
    return WellStore()


def test_handles_liquid_probe_success(subject: WellStore) -> None:
    """It should add the well to the state after a successful liquid probe."""
    labware_id = "labware-id"
    well_name = "well-name"
    liquid_probe = create_liquid_probe_command()
    timestamp = datetime(year=2020, month=1, day=2)

    subject.handle_action(
        SucceedCommandAction(
            command=liquid_probe,
            state_update=update_types.StateUpdate(
                liquid_probed=update_types.LiquidProbedUpdate(
                    labware_id="labware-id",
                    well_name="well-name",
                    height=15.0,
                    volume=30.0,
                    last_probed=timestamp,
                )
            ),
        )
    )

    assert len(subject.state.probed_heights) == 1
    assert len(subject.state.probed_volumes) == 1

    assert subject.state.probed_heights[labware_id][well_name].height == 15.0
    assert subject.state.probed_heights[labware_id][well_name].last_probed == timestamp
    assert subject.state.probed_volumes[labware_id][well_name].volume == 30.0
    assert subject.state.probed_volumes[labware_id][well_name].last_probed == timestamp
    assert (
        subject.state.probed_volumes[labware_id][well_name].operations_since_probe == 0
    )


def test_handles_load_liquid_success(subject: WellStore) -> None:
    """It should add the well to the state after a successful load liquid."""
    labware_id = "labware-id"
    well_name_1 = "well-name-1"
    well_name_2 = "well-name-2"
    load_liquid = create_load_liquid_command(
        labware_id=labware_id, volume_by_well={well_name_1: 30, well_name_2: 100}
    )
    timestamp = datetime(year=2020, month=1, day=2)

    subject.handle_action(
        SucceedCommandAction(
            command=load_liquid,
            state_update=update_types.StateUpdate(
                liquid_loaded=update_types.LiquidLoadedUpdate(
                    labware_id=labware_id,
                    volumes={well_name_1: 30, well_name_2: 100},
                    last_loaded=timestamp,
                )
            ),
        )
    )

    assert len(subject.state.loaded_volumes) == 1
    assert len(subject.state.loaded_volumes[labware_id]) == 2

    assert subject.state.loaded_volumes[labware_id][well_name_1].volume == 30.0
    assert (
        subject.state.loaded_volumes[labware_id][well_name_1].last_loaded == timestamp
    )
    assert (
        subject.state.loaded_volumes[labware_id][well_name_1].operations_since_load == 0
    )
    assert subject.state.loaded_volumes[labware_id][well_name_2].volume == 100.0
    assert (
        subject.state.loaded_volumes[labware_id][well_name_2].last_loaded == timestamp
    )
    assert (
        subject.state.loaded_volumes[labware_id][well_name_2].operations_since_load == 0
    )


def test_handles_load_liquid_and_aspirate(subject: WellStore) -> None:
    """It should populate the well state after load liquid and update the well state after aspirate."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name_1 = "well-name-1"
    well_name_2 = "well-name-2"
    aspirated_volume = 10.0
    load_liquid = create_load_liquid_command(
        labware_id=labware_id, volume_by_well={well_name_1: 30, well_name_2: 100}
    )
    aspirate_1 = create_aspirate_command(
        pipette_id=pipette_id,
        volume=aspirated_volume,
        flow_rate=1.0,
        labware_id=labware_id,
        well_name=well_name_1,
    )
    aspirate_2 = create_aspirate_command(
        pipette_id=pipette_id,
        volume=aspirated_volume,
        flow_rate=1.0,
        labware_id=labware_id,
        well_name=well_name_2,
    )
    timestamp = datetime(year=2020, month=1, day=2)

    subject.handle_action(
        SucceedCommandAction(
            command=load_liquid,
            state_update=update_types.StateUpdate(
                liquid_loaded=update_types.LiquidLoadedUpdate(
                    labware_id=labware_id,
                    volumes={well_name_1: 30, well_name_2: 100},
                    last_loaded=timestamp,
                )
            ),
        )
    )
    subject.handle_action(
        SucceedCommandAction(
            command=aspirate_1,
            state_update=update_types.StateUpdate(
                liquid_operated=update_types.LiquidOperatedUpdate(
                    labware_id=labware_id,
                    well_names=[well_name_1, well_name_2],
                    volume_added=-aspirated_volume,
                )
            ),
        )
    )
    subject.handle_action(
        SucceedCommandAction(
            command=aspirate_2,
            state_update=update_types.StateUpdate(
                liquid_operated=update_types.LiquidOperatedUpdate(
                    labware_id=labware_id,
                    well_names=[well_name_2],
                    volume_added=-aspirated_volume,
                )
            ),
        )
    )

    assert len(subject.state.loaded_volumes) == 1
    assert len(subject.state.loaded_volumes[labware_id]) == 2

    assert subject.state.loaded_volumes[labware_id][well_name_1].volume == 20.0
    assert (
        subject.state.loaded_volumes[labware_id][well_name_1].last_loaded == timestamp
    )
    assert (
        subject.state.loaded_volumes[labware_id][well_name_1].operations_since_load == 1
    )
    assert subject.state.loaded_volumes[labware_id][well_name_2].volume == 80.0
    assert (
        subject.state.loaded_volumes[labware_id][well_name_2].last_loaded == timestamp
    )
    assert (
        subject.state.loaded_volumes[labware_id][well_name_2].operations_since_load == 2
    )


def test_handles_liquid_probe_and_aspirate(subject: WellStore) -> None:
    """It should populate the well state after liquid probe and update the well state after aspirate."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    aspirated_volume = 10.0
    liquid_probe = create_liquid_probe_command()
    aspirate = create_aspirate_command(
        pipette_id=pipette_id,
        volume=aspirated_volume,
        flow_rate=1.0,
        labware_id=labware_id,
        well_name=well_name,
    )
    timestamp = datetime(year=2020, month=1, day=2)

    subject.handle_action(
        SucceedCommandAction(
            command=liquid_probe,
            state_update=update_types.StateUpdate(
                liquid_probed=update_types.LiquidProbedUpdate(
                    labware_id="labware-id",
                    well_name="well-name",
                    height=15.0,
                    volume=30.0,
                    last_probed=timestamp,
                )
            ),
        )
    )
    subject.handle_action(
        SucceedCommandAction(
            command=aspirate,
            state_update=update_types.StateUpdate(
                liquid_operated=update_types.LiquidOperatedUpdate(
                    labware_id="labware-id",
                    well_names=["well-name"],
                    volume_added=-aspirated_volume,
                )
            ),
        )
    )

    assert len(subject.state.probed_heights[labware_id]) == 0
    assert len(subject.state.probed_volumes) == 1

    assert subject.state.probed_volumes[labware_id][well_name].volume == 20.0
    assert subject.state.probed_volumes[labware_id][well_name].last_probed == timestamp
    assert (
        subject.state.probed_volumes[labware_id][well_name].operations_since_probe == 1
    )
