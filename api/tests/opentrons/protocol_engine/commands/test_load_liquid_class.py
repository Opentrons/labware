"""Test load-liquid command."""
from decoy import Decoy
import pytest

from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    LiquidClassSchemaV1,
)
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.load_liquid_class import (
    LoadLiquidClassImplementation,
    LoadLiquidClassParams,
    LoadLiquidClassResult,
)
from opentrons.protocol_engine.errors import (
    LiquidClassDoesNotExistError,
    LiquidClassRedefinitionError,
)
from opentrons.protocol_engine.resources.model_utils import ModelUtils
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.types import LiquidClassRecord


@pytest.fixture
def liquid_class_record(
    minimal_liquid_class_def2: LiquidClassSchemaV1,
) -> LiquidClassRecord:
    """A dummy LiquidClassRecord for testing."""
    pipette_0 = minimal_liquid_class_def2.byPipette[0]
    by_tip_type_0 = pipette_0.byTipType[0]
    return LiquidClassRecord(
        liquidClassName=minimal_liquid_class_def2.liquidClassName,
        pipetteModel=pipette_0.pipetteModel,
        tiprack=by_tip_type_0.tiprack,
        aspirate=by_tip_type_0.aspirate,
        singleDispense=by_tip_type_0.singleDispense,
        multiDispense=by_tip_type_0.multiDispense,
    )


async def test_load_liquid_class_new_liquid_class_no_id(
    decoy: Decoy,
    state_view: StateView,
    model_utils: ModelUtils,
    liquid_class_record: LiquidClassRecord,
) -> None:
    """Load a new liquid class with no liquidClassId specified. Should assign a new ID."""
    subject = LoadLiquidClassImplementation(
        state_view=state_view, model_utils=model_utils
    )
    decoy.when(model_utils.generate_id()).then_return("new-generated-id")

    params = LoadLiquidClassParams(liquidClassRecord=liquid_class_record)
    result = await subject.execute(params)
    assert result == SuccessData(
        public=LoadLiquidClassResult(liquidClassId="new-generated-id"),
        state_update=update_types.StateUpdate(
            liquid_class_loaded=update_types.LiquidClassLoadedUpdate(
                liquid_class_id="new-generated-id",
                liquid_class_record=liquid_class_record,
            )
        ),
    )


async def test_load_liquid_class_existing_liquid_class_no_id(
    decoy: Decoy,
    state_view: StateView,
    model_utils: ModelUtils,
    liquid_class_record: LiquidClassRecord,
) -> None:
    """Load an existing liquid class with no liquidClassId specified. Should find and reuse existing ID."""
    subject = LoadLiquidClassImplementation(
        state_view=state_view, model_utils=model_utils
    )
    decoy.when(
        state_view.liquid_classes.get_id_for_liquid_class_record(liquid_class_record)
    ).then_return("existing-id")

    params = LoadLiquidClassParams(liquidClassRecord=liquid_class_record)
    result = await subject.execute(params)
    assert result == SuccessData(
        public=LoadLiquidClassResult(liquidClassId="existing-id"),
        state_update=update_types.StateUpdate(),  # no state change since liquid class already loaded
    )


async def test_load_liquid_class_new_liquid_class_specified_id(
    decoy: Decoy,
    state_view: StateView,
    model_utils: ModelUtils,
    liquid_class_record: LiquidClassRecord,
) -> None:
    """Load a new liquid class with the liquidClassId specified. Should store the new liquid class."""
    subject = LoadLiquidClassImplementation(
        state_view=state_view, model_utils=model_utils
    )
    decoy.when(state_view.liquid_classes.get("liquid-class-1")).then_raise(
        LiquidClassDoesNotExistError()
    )

    params = LoadLiquidClassParams(
        liquidClassId="liquid-class-1", liquidClassRecord=liquid_class_record
    )
    result = await subject.execute(params)
    assert result == SuccessData(
        public=LoadLiquidClassResult(liquidClassId="liquid-class-1"),
        state_update=update_types.StateUpdate(
            liquid_class_loaded=update_types.LiquidClassLoadedUpdate(
                liquid_class_id="liquid-class-1",
                liquid_class_record=liquid_class_record,
            )
        ),
    )


async def test_load_liquid_class_existing_liquid_class_specified_id(
    decoy: Decoy,
    state_view: StateView,
    model_utils: ModelUtils,
    liquid_class_record: LiquidClassRecord,
) -> None:
    """Load a liquid class with a liquidClassId that was already loaded before. Should be a no-op."""
    subject = LoadLiquidClassImplementation(
        state_view=state_view, model_utils=model_utils
    )
    decoy.when(state_view.liquid_classes.get("liquid-class-1")).then_return(
        liquid_class_record
    )

    params = LoadLiquidClassParams(
        liquidClassId="liquid-class-1", liquidClassRecord=liquid_class_record
    )
    result = await subject.execute(params)
    assert result == SuccessData(
        public=LoadLiquidClassResult(liquidClassId="liquid-class-1"),
        state_update=update_types.StateUpdate(),  # no state change since liquid class already loaded
    )


async def test_load_liquid_class_conflicting_definition_for_id(
    decoy: Decoy,
    state_view: StateView,
    model_utils: ModelUtils,
    liquid_class_record: LiquidClassRecord,
) -> None:
    """Should raise when we try to load a modified liquid class with the same liquidClassId."""
    subject = LoadLiquidClassImplementation(
        state_view=state_view, model_utils=model_utils
    )
    decoy.when(state_view.liquid_classes.get("liquid-class-1")).then_return(
        liquid_class_record
    )

    new_liquid_class_record = liquid_class_record.model_copy(deep=True)
    new_liquid_class_record.aspirate.offset.x += 123  # make it different
    params = LoadLiquidClassParams(
        liquidClassId="liquid-class-1", liquidClassRecord=new_liquid_class_record
    )
    with pytest.raises(LiquidClassRedefinitionError):
        await subject.execute(params)
