"""Test get next tip in place commands."""
from decoy import Decoy

from opentrons.types import NozzleConfigurationType
from opentrons.protocol_engine import StateView
from opentrons.protocol_engine.types import NextTipInfo, NoTipAvailable, NoTipReason
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.get_next_tip import (
    GetNextTipParams,
    GetNextTipResult,
    GetNextTipImplementation,
)

from opentrons.hardware_control.nozzle_manager import NozzleMap


async def test_get_next_tip_implementation(
    decoy: Decoy,
    state_view: StateView,
) -> None:
    """A GetNextTip command should have an execution implementation."""
    subject = GetNextTipImplementation(state_view=state_view)
    params = GetNextTipParams(
        pipetteId="abc", labwareIds=["123"], startingTipWell="xyz"
    )
    mock_nozzle_map = decoy.mock(cls=NozzleMap)

    decoy.when(state_view.tips.get_pipette_active_channels("abc")).then_return(42)
    decoy.when(state_view.tips.get_pipette_nozzle_map("abc")).then_return(
        mock_nozzle_map
    )
    decoy.when(mock_nozzle_map.configuration).then_return(NozzleConfigurationType.FULL)

    decoy.when(
        state_view.tips.get_next_tip(
            labware_id="123",
            num_tips=42,
            starting_tip_name="xyz",
            nozzle_map=mock_nozzle_map,
        )
    ).then_return("foo")

    result = await subject.execute(params)

    assert result == SuccessData(
        public=GetNextTipResult(
            nextTipInfo=NextTipInfo(labwareId="123", tipStartingWell="foo")
        ),
    )


async def test_get_next_tip_implementation_multiple_tip_racks(
    decoy: Decoy,
    state_view: StateView,
) -> None:
    """A GetNextTip command with multiple tip racks should not apply starting tip to the following ones."""
    subject = GetNextTipImplementation(state_view=state_view)
    params = GetNextTipParams(
        pipetteId="abc", labwareIds=["123", "456"], startingTipWell="xyz"
    )
    mock_nozzle_map = decoy.mock(cls=NozzleMap)

    decoy.when(state_view.tips.get_pipette_active_channels("abc")).then_return(42)
    decoy.when(state_view.tips.get_pipette_nozzle_map("abc")).then_return(
        mock_nozzle_map
    )
    decoy.when(mock_nozzle_map.configuration).then_return(NozzleConfigurationType.FULL)

    decoy.when(
        state_view.tips.get_next_tip(
            labware_id="456",
            num_tips=42,
            starting_tip_name=None,
            nozzle_map=mock_nozzle_map,
        )
    ).then_return("foo")

    result = await subject.execute(params)

    assert result == SuccessData(
        public=GetNextTipResult(
            nextTipInfo=NextTipInfo(labwareId="456", tipStartingWell="foo")
        ),
    )


async def test_get_next_tip_implementation_no_tips(
    decoy: Decoy,
    state_view: StateView,
) -> None:
    """A GetNextTip command should return with NoTipAvailable if there are no available tips."""
    subject = GetNextTipImplementation(state_view=state_view)
    params = GetNextTipParams(
        pipetteId="abc", labwareIds=["123", "456"], startingTipWell="xyz"
    )
    mock_nozzle_map = decoy.mock(cls=NozzleMap)

    decoy.when(state_view.tips.get_pipette_active_channels("abc")).then_return(42)
    decoy.when(state_view.tips.get_pipette_nozzle_map("abc")).then_return(
        mock_nozzle_map
    )
    decoy.when(mock_nozzle_map.configuration).then_return(NozzleConfigurationType.FULL)

    result = await subject.execute(params)

    assert result == SuccessData(
        public=GetNextTipResult(
            nextTipInfo=NoTipAvailable(
                noTipReason=NoTipReason.NO_AVAILABLE_TIPS,
                message="No available tips for given pipette, nozzle configuration and provided tip racks.",
            )
        ),
    )


async def test_get_next_tip_implementation_partial_with_starting_tip(
    decoy: Decoy,
    state_view: StateView,
) -> None:
    """A GetNextTip command should return with NoTipAvailable if there's a starting tip and a partial config."""
    subject = GetNextTipImplementation(state_view=state_view)
    params = GetNextTipParams(
        pipetteId="abc", labwareIds=["123", "456"], startingTipWell="xyz"
    )
    mock_nozzle_map = decoy.mock(cls=NozzleMap)

    decoy.when(state_view.tips.get_pipette_active_channels("abc")).then_return(42)
    decoy.when(state_view.tips.get_pipette_nozzle_map("abc")).then_return(
        mock_nozzle_map
    )
    decoy.when(mock_nozzle_map.configuration).then_return(NozzleConfigurationType.ROW)

    result = await subject.execute(params)

    assert result == SuccessData(
        public=GetNextTipResult(
            nextTipInfo=NoTipAvailable(
                noTipReason=NoTipReason.STARTING_TIP_WITH_PARTIAL,
                message="Cannot automatically resolve next tip with starting tip and partial tip configuration.",
            )
        ),
    )
