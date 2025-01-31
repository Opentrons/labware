"""Basic well data state and store."""

from dataclasses import dataclass
from typing import Dict, List, Union, Iterator, Optional, Tuple, overload, TypeVar

from opentrons.protocol_engine.types import (
    ProbedHeightInfo,
    ProbedVolumeInfo,
    LoadedVolumeInfo,
    WellInfoSummary,
    WellLiquidInfo,
)

from . import update_types
from ._abstract_store import HasState, HandlesActions
from ..actions import Action
from ..actions.get_state_update import get_state_updates


LabwareId = str
WellName = str


@dataclass
class WellState:
    """State of all wells."""

    loaded_volumes: Dict[LabwareId, Dict[WellName, LoadedVolumeInfo]]
    probed_heights: Dict[LabwareId, Dict[WellName, ProbedHeightInfo]]
    probed_volumes: Dict[LabwareId, Dict[WellName, ProbedVolumeInfo]]


class WellStore(HasState[WellState], HandlesActions):
    """Well state container."""

    _state: WellState

    def __init__(self) -> None:
        """Initialize a well store and its state."""
        self._state = WellState(loaded_volumes={}, probed_heights={}, probed_volumes={})

    def handle_action(self, action: Action) -> None:
        """Modify state in reaction to an action."""
        for state_update in get_state_updates(action):
            if state_update.liquid_loaded != update_types.NO_CHANGE:
                self._handle_liquid_loaded_update(state_update.liquid_loaded)
            if state_update.liquid_probed != update_types.NO_CHANGE:
                self._handle_liquid_probed_update(state_update.liquid_probed)
            if state_update.liquid_operated != update_types.NO_CHANGE:
                self._handle_liquid_operated_update(state_update.liquid_operated)

    def _handle_liquid_loaded_update(
        self, state_update: update_types.LiquidLoadedUpdate
    ) -> None:
        labware_id = state_update.labware_id
        if labware_id not in self._state.loaded_volumes:
            self._state.loaded_volumes[labware_id] = {}
        for well, volume in state_update.volumes.items():
            self._state.loaded_volumes[labware_id][well] = LoadedVolumeInfo(
                volume=_none_from_clear(volume),
                last_loaded=state_update.last_loaded,
                operations_since_load=0,
            )

    def _handle_liquid_probed_update(
        self, state_update: update_types.LiquidProbedUpdate
    ) -> None:
        labware_id = state_update.labware_id
        well_name = state_update.well_name
        if labware_id not in self._state.probed_heights:
            self._state.probed_heights[labware_id] = {}
        if labware_id not in self._state.probed_volumes:
            self._state.probed_volumes[labware_id] = {}
        self._state.probed_heights[labware_id][well_name] = ProbedHeightInfo(
            height=_none_from_clear(state_update.height),
            last_probed=state_update.last_probed,
        )
        self._state.probed_volumes[labware_id][well_name] = ProbedVolumeInfo(
            volume=_none_from_clear(state_update.volume),
            last_probed=state_update.last_probed,
            operations_since_probe=0,
        )

    def _handle_liquid_operated_update(
        self, state_update: update_types.LiquidOperatedUpdate
    ) -> None:
        for well_name in state_update.well_names:
            self._handle_well_operated(
                state_update.labware_id, well_name, state_update.volume_added
            )

    def _handle_well_operated(
        self,
        labware_id: str,
        well_name: str,
        volume_added: float | update_types.ClearType,
    ) -> None:
        if (
            labware_id in self._state.loaded_volumes
            and well_name in self._state.loaded_volumes[labware_id]
        ):
            if volume_added is update_types.CLEAR:
                del self._state.loaded_volumes[labware_id][well_name]
            else:
                prev_loaded_vol_info = self._state.loaded_volumes[labware_id][well_name]
                assert prev_loaded_vol_info.volume is not None
                self._state.loaded_volumes[labware_id][well_name] = LoadedVolumeInfo(
                    volume=prev_loaded_vol_info.volume + volume_added,
                    last_loaded=prev_loaded_vol_info.last_loaded,
                    operations_since_load=prev_loaded_vol_info.operations_since_load
                    + 1,
                )
        if (
            labware_id in self._state.probed_heights
            and well_name in self._state.probed_heights[labware_id]
        ):
            del self._state.probed_heights[labware_id][well_name]
        if (
            labware_id in self._state.probed_volumes
            and well_name in self._state.probed_volumes[labware_id]
        ):
            if volume_added is update_types.CLEAR:
                del self._state.probed_volumes[labware_id][well_name]
            else:
                prev_probed_vol_info = self._state.probed_volumes[labware_id][well_name]
                if prev_probed_vol_info.volume is None:
                    new_vol_info: float | None = None
                else:
                    new_vol_info = prev_probed_vol_info.volume + volume_added
                self._state.probed_volumes[labware_id][well_name] = ProbedVolumeInfo(
                    volume=new_vol_info,
                    last_probed=prev_probed_vol_info.last_probed,
                    operations_since_probe=prev_probed_vol_info.operations_since_probe
                    + 1,
                )


class WellView:
    """Read-only well state view."""

    _state: WellState

    def __init__(self, state: WellState) -> None:
        """Initialize the computed view of well state.

        Arguments:
            state: Well state dataclass used for all calculations.
        """
        self._state = state

    def get_well_liquid_info(self, labware_id: str, well_name: str) -> WellLiquidInfo:
        """Return all the liquid info for a well."""
        if (
            labware_id not in self._state.loaded_volumes
            or well_name not in self._state.loaded_volumes[labware_id]
        ):
            loaded_volume_info = None
        else:
            loaded_volume_info = self._state.loaded_volumes[labware_id][well_name]
        if (
            labware_id not in self._state.probed_heights
            or well_name not in self._state.probed_heights[labware_id]
        ):
            probed_height_info = None
        else:
            probed_height_info = self._state.probed_heights[labware_id][well_name]
        if (
            labware_id not in self._state.probed_volumes
            or well_name not in self._state.probed_volumes[labware_id]
        ):
            probed_volume_info = None
        else:
            probed_volume_info = self._state.probed_volumes[labware_id][well_name]
        return WellLiquidInfo(
            loaded_volume=loaded_volume_info,
            probed_height=probed_height_info,
            probed_volume=probed_volume_info,
        )

    def get_all(self) -> List[WellInfoSummary]:
        """Get all well liquid info summaries."""

        def _all_well_combos() -> Iterator[Tuple[str, str, str]]:
            for labware, lv_wells in self._state.loaded_volumes.items():
                for well_name in lv_wells.keys():
                    yield f"{labware}{well_name}", labware, well_name
            for labware, ph_wells in self._state.probed_heights.items():
                for well_name in ph_wells.keys():
                    yield f"{labware}{well_name}", labware, well_name
            for labware, pv_wells in self._state.probed_volumes.items():
                for well_name in pv_wells.keys():
                    yield f"{labware}{well_name}", labware, well_name

        wells = {
            key: (labware_id, well_name)
            for key, labware_id, well_name in _all_well_combos()
        }
        return [
            self._summarize_well(labware_id, well_name)
            for labware_id, well_name in wells.values()
        ]

    def _summarize_well(self, labware_id: str, well_name: str) -> WellInfoSummary:
        well_liquid_info = self.get_well_liquid_info(labware_id, well_name)
        return WellInfoSummary(
            labware_id=labware_id,
            well_name=well_name,
            loaded_volume=_volume_from_info(well_liquid_info.loaded_volume),
            probed_volume=_volume_from_info(well_liquid_info.probed_volume),
            probed_height=_height_from_info(well_liquid_info.probed_height),
        )


@overload
def _volume_from_info(info: Optional[ProbedVolumeInfo]) -> Optional[float]:
    ...


@overload
def _volume_from_info(info: Optional[LoadedVolumeInfo]) -> Optional[float]:
    ...


def _volume_from_info(
    info: Union[ProbedVolumeInfo, LoadedVolumeInfo, None],
) -> Optional[float]:
    if info is None:
        return None
    return info.volume


def _height_from_info(info: Optional[ProbedHeightInfo]) -> Optional[float]:
    if info is None:
        return None
    return info.height


MaybeClear = TypeVar("MaybeClear")


def _none_from_clear(inval: MaybeClear | update_types.ClearType) -> MaybeClear | None:
    if inval == update_types.CLEAR:
        return None
    return inval
