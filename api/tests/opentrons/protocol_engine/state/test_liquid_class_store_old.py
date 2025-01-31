"""Liquid state store tests.

DEPRECATED: Testing LiquidClassStore independently of LiquidClassView is no
longer helpful. Try to add new tests to test_liquid_class_state.py, where they can be
tested together, treating LiquidClassState as a private implementation detail.
"""
import pytest

from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    LiquidClassSchemaV1,
)
from opentrons.protocol_engine import actions
from opentrons.protocol_engine.commands.load_liquid_class import LoadLiquidClass
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.liquid_classes import LiquidClassStore
from opentrons.protocol_engine.types import LiquidClassRecord


@pytest.fixture
def subject() -> LiquidClassStore:
    """The LiquidClassStore test subject."""
    return LiquidClassStore()


def test_handles_add_liquid_class(
    subject: LiquidClassStore, minimal_liquid_class_def2: LiquidClassSchemaV1
) -> None:
    """Should add the LiquidClassRecord to the store."""
    pipette_0 = minimal_liquid_class_def2.byPipette[0]
    by_tip_type_0 = pipette_0.byTipType[0]
    liquid_class_record = LiquidClassRecord(
        liquidClassName=minimal_liquid_class_def2.liquidClassName,
        pipetteModel=pipette_0.pipetteModel,
        tiprack=by_tip_type_0.tiprack,
        aspirate=by_tip_type_0.aspirate,
        singleDispense=by_tip_type_0.singleDispense,
        multiDispense=by_tip_type_0.multiDispense,
    )

    subject.handle_action(
        actions.SucceedCommandAction(
            command=LoadLiquidClass.model_construct(),  # type: ignore[call-arg]
            state_update=update_types.StateUpdate(
                liquid_class_loaded=update_types.LiquidClassLoadedUpdate(
                    liquid_class_id="liquid-class-id",
                    liquid_class_record=liquid_class_record,
                ),
            ),
        )
    )

    assert len(subject.state.liquid_class_record_by_id) == 1
    assert (
        subject.state.liquid_class_record_by_id["liquid-class-id"]
        == liquid_class_record
    )

    assert len(subject.state.liquid_class_record_to_id) == 1
    # Make sure that LiquidClassRecords are hashable, and that we can query for LiquidClassRecords by value:
    assert (
        subject.state.liquid_class_record_to_id[liquid_class_record]
        == "liquid-class-id"
    )
    # If this fails with an error like "TypeError: unhashable type: AspirateProperties", then you broke something.
