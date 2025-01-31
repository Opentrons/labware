"""Test load-liquid command."""
import pytest
from decoy import Decoy
from datetime import datetime

from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands import (
    LoadLiquidResult,
    LoadLiquidImplementation,
    LoadLiquidParams,
)
from opentrons.protocol_engine.errors import InvalidLiquidError
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.resources.model_utils import ModelUtils
from opentrons.protocol_engine.state import update_types


@pytest.fixture
def mock_state_view(decoy: Decoy) -> StateView:
    """Mock StateView."""
    return decoy.mock(cls=StateView)


@pytest.fixture
def subject(
    mock_state_view: StateView, model_utils: ModelUtils
) -> LoadLiquidImplementation:
    """Load liquid implementation test subject."""
    return LoadLiquidImplementation(state_view=mock_state_view, model_utils=model_utils)


async def test_load_liquid_implementation(
    decoy: Decoy,
    subject: LoadLiquidImplementation,
    mock_state_view: StateView,
    model_utils: ModelUtils,
) -> None:
    """Test LoadLiquid command execution."""
    data = LoadLiquidParams(
        labwareId="labware-id",
        liquidId="liquid-id",
        volumeByWell={"A1": 30, "B2": 100},
    )

    timestamp = datetime(year=2020, month=1, day=2)
    decoy.when(model_utils.get_timestamp()).then_return(timestamp)

    result = await subject.execute(data)

    assert result == SuccessData(
        public=LoadLiquidResult(),
        state_update=update_types.StateUpdate(
            liquid_loaded=update_types.LiquidLoadedUpdate(
                labware_id="labware-id",
                volumes={"A1": 30, "B2": 100},
                last_loaded=timestamp,
            )
        ),
    )

    decoy.verify(mock_state_view.liquid.validate_liquid_id("liquid-id"))

    decoy.verify(
        mock_state_view.labware.validate_liquid_allowed_in_labware(
            "labware-id", {"A1": 30.0, "B2": 100.0}
        )
    )


async def test_load_empty_liquid_requires_zero_volume(
    decoy: Decoy,
    subject: LoadLiquidImplementation,
    mock_state_view: StateView,
    model_utils: ModelUtils,
) -> None:
    """Test that loadLiquid requires empty liquids to have 0 volume."""
    data = LoadLiquidParams(
        labwareId="labware-id", liquidId="EMPTY", volumeByWell={"A1": 1.0}
    )
    timestamp = datetime(year=2020, month=1, day=2)
    decoy.when(model_utils.get_timestamp()).then_return(timestamp)

    with pytest.raises(InvalidLiquidError):
        await subject.execute(data)

    decoy.verify(mock_state_view.liquid.validate_liquid_id("EMPTY"))

    data2 = LoadLiquidParams(
        labwareId="labware-id", liquidId="EMPTY", volumeByWell={"A1": 0.0}
    )
    result = await subject.execute(data2)
    assert result == SuccessData(
        public=LoadLiquidResult(),
        state_update=update_types.StateUpdate(
            liquid_loaded=update_types.LiquidLoadedUpdate(
                labware_id="labware-id",
                volumes=data2.volumeByWell,
                last_loaded=timestamp,
            )
        ),
    )
