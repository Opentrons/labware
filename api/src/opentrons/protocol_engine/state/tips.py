"""Tip state tracking."""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Optional, List, Union

from opentrons.types import NozzleMapInterface
from opentrons.protocol_engine.state import update_types

from ._abstract_store import HasState, HandlesActions
from ._well_math import wells_covered_dense
from ..actions import Action, ResetTipsAction, get_state_updates

from opentrons.hardware_control.nozzle_manager import NozzleMap


class TipRackWellState(Enum):
    """The state of a single tip in a tip rack's well."""

    CLEAN = "clean"
    USED = "used"


TipRackStateByWellName = Dict[str, TipRackWellState]


# todo(mm, 2024-10-10): This info is duplicated between here and PipetteState because
# TipStore is using it to compute which tips a PickUpTip removes from the tip rack,
# given the pipette's current nozzle map. We could avoid this duplication by moving the
# computation to TipView, calling it from PickUpTipImplementation, and passing the
# precomputed list of wells to TipStore.
@dataclass
class _PipetteInfo:
    channels: int
    active_channels: int
    nozzle_map: NozzleMap


@dataclass
class TipState:
    """State of all tips."""

    tips_by_labware_id: Dict[str, TipRackStateByWellName]
    column_by_labware_id: Dict[str, List[List[str]]]

    pipette_info_by_pipette_id: Dict[str, _PipetteInfo]


class TipStore(HasState[TipState], HandlesActions):
    """Tip state container."""

    _state: TipState

    def __init__(self) -> None:
        """Initialize a liquid store and its state."""
        self._state = TipState(
            tips_by_labware_id={},
            column_by_labware_id={},
            pipette_info_by_pipette_id={},
        )

    def handle_action(self, action: Action) -> None:
        """Modify state in reaction to an action."""
        for state_update in get_state_updates(action):
            self._handle_state_update(state_update)

        if isinstance(action, ResetTipsAction):
            labware_id = action.labware_id

            for well_name in self._state.tips_by_labware_id[labware_id].keys():
                self._state.tips_by_labware_id[labware_id][
                    well_name
                ] = TipRackWellState.CLEAN

    def _handle_state_update(self, state_update: update_types.StateUpdate) -> None:
        if state_update.pipette_config != update_types.NO_CHANGE:
            self._state.pipette_info_by_pipette_id[
                state_update.pipette_config.pipette_id
            ] = _PipetteInfo(
                channels=state_update.pipette_config.config.channels,
                active_channels=state_update.pipette_config.config.channels,
                nozzle_map=state_update.pipette_config.config.nozzle_map,
            )

        if state_update.tips_used != update_types.NO_CHANGE:
            self._set_used_tips(
                pipette_id=state_update.tips_used.pipette_id,
                labware_id=state_update.tips_used.labware_id,
                well_name=state_update.tips_used.well_name,
            )

        if state_update.pipette_nozzle_map != update_types.NO_CHANGE:
            pipette_info = self._state.pipette_info_by_pipette_id[
                state_update.pipette_nozzle_map.pipette_id
            ]
            pipette_info.active_channels = (
                state_update.pipette_nozzle_map.nozzle_map.tip_count
            )
            pipette_info.nozzle_map = state_update.pipette_nozzle_map.nozzle_map

        if state_update.loaded_labware != update_types.NO_CHANGE:
            labware_id = state_update.loaded_labware.labware_id
            definition = state_update.loaded_labware.definition
            if definition.parameters.isTiprack:
                self._state.tips_by_labware_id[labware_id] = {
                    well_name: TipRackWellState.CLEAN
                    for column in definition.ordering
                    for well_name in column
                }
                self._state.column_by_labware_id[labware_id] = [
                    column for column in definition.ordering
                ]

    def _set_used_tips(self, pipette_id: str, well_name: str, labware_id: str) -> None:
        columns = self._state.column_by_labware_id.get(labware_id, [])
        wells = self._state.tips_by_labware_id.get(labware_id, {})
        nozzle_map = self._state.pipette_info_by_pipette_id[pipette_id].nozzle_map
        for well in wells_covered_dense(nozzle_map, well_name, columns):
            wells[well] = TipRackWellState.USED


class TipView:
    """Read-only tip state view."""

    _state: TipState

    def __init__(self, state: TipState) -> None:
        """Initialize the computed view of liquid state.

        Arguments:
            state: Liquid state dataclass used for all calculations.
        """
        self._state = state

    def get_next_tip(  # noqa: C901
        self,
        labware_id: str,
        num_tips: int,
        starting_tip_name: Optional[str],
        nozzle_map: Optional[NozzleMapInterface],
    ) -> Optional[str]:
        """Get the next available clean tip. Does not support use of a starting tip if the pipette used is in a partial configuration."""
        wells = self._state.tips_by_labware_id.get(labware_id, {})
        columns = self._state.column_by_labware_id.get(labware_id, [])

        # TODO(sf): I'm pretty sure this can be replaced with wells_covered_96 but I'm not quite sure how
        def _identify_tip_cluster(
            active_columns: int,
            active_rows: int,
            critical_column: int,
            critical_row: int,
            entry_well: str,
        ) -> Optional[List[str]]:
            tip_cluster: list[str] = []
            for i in range(active_columns):
                if entry_well == "A1" or entry_well == "H1":
                    if critical_column - i >= 0:
                        column = columns[critical_column - i]
                    else:
                        return None
                elif entry_well == "A12" or entry_well == "H12":
                    if critical_column + i < len(columns):
                        column = columns[critical_column + i]
                    else:
                        return None
                else:
                    raise ValueError(
                        f"Invalid entry well {entry_well} for tip cluster identification."
                    )
                for j in range(active_rows):
                    if entry_well == "A1" or entry_well == "A12":
                        if critical_row - j >= 0:
                            well = column[critical_row - j]
                        else:
                            return None
                    elif entry_well == "H1" or entry_well == "H12":
                        if critical_row + j < len(column):
                            well = column[critical_row + j]
                        else:
                            return None
                    tip_cluster.append(well)

            if any(well not in [*wells] for well in tip_cluster):
                return None

            return tip_cluster

        def _validate_tip_cluster(
            active_columns: int, active_rows: int, tip_cluster: List[str]
        ) -> Union[str, int, None]:
            if not any(wells[well] == TipRackWellState.USED for well in tip_cluster):
                return tip_cluster[0]
            elif all(wells[well] == TipRackWellState.USED for well in tip_cluster):
                return None
            else:
                # In the case of an 8ch pipette where a column has mixed state tips we may simply progress to the next column in our search
                if nozzle_map is not None and nozzle_map.physical_nozzle_count == 8:
                    return None

                # In the case of a 96ch we can attempt to index in by singular rows and columns assuming that indexed direction is safe
                # The tip cluster list is ordered: Each row from a column in order by columns
                tip_cluster_final_column: list[str] = []
                for i in range(active_rows):
                    tip_cluster_final_column.append(
                        tip_cluster[((active_columns * active_rows) - 1) - i]
                    )
                tip_cluster_final_row: list[str] = []
                for i in range(active_columns):
                    tip_cluster_final_row.append(
                        tip_cluster[(active_rows - 1) + (i * active_rows)]
                    )
                if all(
                    wells[well] == TipRackWellState.USED
                    for well in tip_cluster_final_column
                ):
                    return None
                elif all(
                    wells[well] == TipRackWellState.USED
                    for well in tip_cluster_final_row
                ):
                    return None
                else:
                    # Tiprack has no valid tip selection, cannot progress
                    return -1

        # Search through the tiprack beginning at A1
        def _cluster_search_A1(active_columns: int, active_rows: int) -> Optional[str]:
            critical_column = active_columns - 1
            critical_row = active_rows - 1

            while critical_column < len(columns):
                tip_cluster = _identify_tip_cluster(
                    active_columns, active_rows, critical_column, critical_row, "A1"
                )
                if tip_cluster is not None:
                    result = _validate_tip_cluster(
                        active_columns, active_rows, tip_cluster
                    )
                    if isinstance(result, str):
                        return result
                    elif isinstance(result, int) and result == -1:
                        return None
                if critical_row + 1 < len(columns[0]):
                    critical_row = critical_row + 1
                else:
                    critical_column += 1
                    critical_row = active_rows - 1
            return None

        # Search through the tiprack beginning at A12
        def _cluster_search_A12(active_columns: int, active_rows: int) -> Optional[str]:
            critical_column = len(columns) - active_columns
            critical_row = active_rows - 1

            while critical_column >= 0:
                tip_cluster = _identify_tip_cluster(
                    active_columns, active_rows, critical_column, critical_row, "A12"
                )
                if tip_cluster is not None:
                    result = _validate_tip_cluster(
                        active_columns, active_rows, tip_cluster
                    )
                    if isinstance(result, str):
                        return result
                    elif isinstance(result, int) and result == -1:
                        return None
                if critical_row + 1 < len(columns[0]):
                    critical_row = critical_row + 1
                else:
                    critical_column -= 1
                    critical_row = active_rows - 1
            return None

        # Search through the tiprack beginning at H1
        def _cluster_search_H1(active_columns: int, active_rows: int) -> Optional[str]:
            critical_column = active_columns - 1
            critical_row = len(columns[critical_column]) - active_rows

            while critical_column <= len(columns):  # change to max size of labware
                tip_cluster = _identify_tip_cluster(
                    active_columns, active_rows, critical_column, critical_row, "H1"
                )
                if tip_cluster is not None:
                    result = _validate_tip_cluster(
                        active_columns, active_rows, tip_cluster
                    )
                    if isinstance(result, str):
                        return result
                    elif isinstance(result, int) and result == -1:
                        return None
                if critical_row - 1 >= 0:
                    critical_row = critical_row - 1
                else:
                    critical_column += 1
                    if critical_column >= len(columns):
                        return None
                    critical_row = len(columns[critical_column]) - active_rows
            return None

        # Search through the tiprack beginning at H12
        def _cluster_search_H12(active_columns: int, active_rows: int) -> Optional[str]:
            critical_column = len(columns) - active_columns
            critical_row = len(columns[critical_column]) - active_rows

            while critical_column >= 0:
                tip_cluster = _identify_tip_cluster(
                    active_columns, active_rows, critical_column, critical_row, "H12"
                )
                if tip_cluster is not None:
                    result = _validate_tip_cluster(
                        active_columns, active_rows, tip_cluster
                    )
                    if isinstance(result, str):
                        return result
                    elif isinstance(result, int) and result == -1:
                        return None
                if critical_row - 1 >= 0:
                    critical_row = critical_row - 1
                else:
                    critical_column -= 1
                    if critical_column < 0:
                        return None
                    critical_row = len(columns[critical_column]) - active_rows
            return None

        if starting_tip_name is None and nozzle_map is not None and columns:
            num_channels = nozzle_map.physical_nozzle_count
            num_nozzle_cols = len(nozzle_map.columns)
            num_nozzle_rows = len(nozzle_map.rows)
            # Each pipette's cluster search is determined by the point of entry for a given pipette/configuration:
            # - Single channel pipettes always search a tiprack top to bottom, left to right
            # - Eight channel pipettes will begin at the top if the primary nozzle is H1 and at the bottom if
            #   it is A1. The eight channel will always progress across the columns left to right.
            # - 96 Channel pipettes will begin in the corner opposite their primary/starting nozzle (if starting nozzle = A1, enter tiprack at H12)
            #   The 96 channel will then progress towards the opposite corner, either going up or down, left or right depending on configuration.

            if num_channels == 1:
                return _cluster_search_A1(num_nozzle_cols, num_nozzle_rows)
            elif num_channels == 8:
                if nozzle_map.starting_nozzle == "A1":
                    return _cluster_search_H1(num_nozzle_cols, num_nozzle_rows)
                elif nozzle_map.starting_nozzle == "H1":
                    return _cluster_search_A1(num_nozzle_cols, num_nozzle_rows)
            elif num_channels == 96:
                if nozzle_map.starting_nozzle == "A1":
                    return _cluster_search_H12(num_nozzle_cols, num_nozzle_rows)
                elif nozzle_map.starting_nozzle == "A12":
                    return _cluster_search_H1(num_nozzle_cols, num_nozzle_rows)
                elif nozzle_map.starting_nozzle == "H1":
                    return _cluster_search_A12(num_nozzle_cols, num_nozzle_rows)
                elif nozzle_map.starting_nozzle == "H12":
                    return _cluster_search_A1(num_nozzle_cols, num_nozzle_rows)
                else:
                    raise ValueError(
                        f"Nozzle {nozzle_map.starting_nozzle} is an invalid starting tip for automatic tip pickup."
                    )
            else:
                raise RuntimeError(
                    "Invalid number of channels for automatic tip tracking."
                )
        else:
            if columns and num_tips == len(columns[0]):  # Get next tips for 8-channel
                column_head = [column[0] for column in columns]
                starting_column_index = 0

                if starting_tip_name:
                    for idx, column in enumerate(columns):
                        if starting_tip_name in column:
                            if starting_tip_name not in column_head:
                                starting_column_index = idx + 1
                            else:
                                starting_column_index = idx

                for column in columns[starting_column_index:]:
                    if not any(wells[well] == TipRackWellState.USED for well in column):
                        return column[0]

            elif num_tips == len(wells.keys()):  # Get next tips for 96 channel
                if starting_tip_name and starting_tip_name != columns[0][0]:
                    return None

                if not any(
                    tip_state == TipRackWellState.USED for tip_state in wells.values()
                ):
                    return next(iter(wells))

            else:  # Get next tips for single channel
                if starting_tip_name is not None:
                    wells = _drop_wells_before_starting_tip(wells, starting_tip_name)

                for well_name, tip_state in wells.items():
                    if tip_state == TipRackWellState.CLEAN:
                        return well_name
        return None

    def get_pipette_channels(self, pipette_id: str) -> int:
        """Return the given pipette's number of channels."""
        return self._state.pipette_info_by_pipette_id[pipette_id].channels

    def get_pipette_active_channels(self, pipette_id: str) -> int:
        """Get the number of channels being used in the given pipette's configuration."""
        return self._state.pipette_info_by_pipette_id[pipette_id].active_channels

    def get_pipette_nozzle_map(self, pipette_id: str) -> NozzleMap:
        """Get the current nozzle map the given pipette's configuration."""
        return self._state.pipette_info_by_pipette_id[pipette_id].nozzle_map

    def get_pipette_nozzle_maps(self) -> Dict[str, NozzleMap]:
        """Get current nozzle maps keyed by pipette id."""
        return {
            pipette_id: pipette_info.nozzle_map
            for pipette_id, pipette_info in self._state.pipette_info_by_pipette_id.items()
        }

    def has_clean_tip(self, labware_id: str, well_name: str) -> bool:
        """Get whether a well in a labware has a clean tip.

        Args:
            labware_id: The labware ID to check.
            well_name: The well name to check.

        Returns:
            True if the labware is a tip rack and the well has a clean tip,
            otherwise False.
        """
        tip_rack = self._state.tips_by_labware_id.get(labware_id)
        well_state = tip_rack.get(well_name) if tip_rack else None

        return well_state == TipRackWellState.CLEAN


def _drop_wells_before_starting_tip(
    wells: TipRackStateByWellName, starting_tip_name: str
) -> TipRackStateByWellName:
    """Drop any wells that come before the starting tip and return the remaining ones after."""
    seen_starting_well = False
    remaining_wells = {}
    for well_name, tip_state in wells.items():
        if well_name == starting_tip_name:
            seen_starting_well = True
        if seen_starting_well:
            remaining_wells[well_name] = tip_state
    return remaining_wells
