"""The interface that implements InstrumentContext."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Generic, List, NamedTuple, Optional, TypeVar, Dict

from opentrons_shared_data.labware.types import (
    LabwareUri,
    LabwareParameters as LabwareParametersDict,
    LabwareDefinition as LabwareDefinitionDict,
)

from opentrons.types import DeckSlotName, Point, NozzleMapInterface
from .._liquid import Liquid

from .well import WellCoreType


class LabwareLoadParams(NamedTuple):
    """Unique load parameters of a labware."""

    namespace: str
    load_name: str
    version: int

    def as_uri(self) -> LabwareUri:
        """Get the labware's definition URI from the load parameters."""
        return LabwareUri(f"{self.namespace}/{self.load_name}/{self.version}")

    @classmethod
    def from_uri(cls, uri: LabwareUri) -> LabwareLoadParams:
        namespace, load_name, version_str = uri.split("/")
        return cls(namespace, load_name, int(version_str))


class AbstractLabware(ABC, Generic[WellCoreType]):
    """Labware implementation core interface."""

    @property
    @abstractmethod
    def load_name(self) -> str:
        """Get the labware's load name."""

    @property
    @abstractmethod
    def highest_z(self) -> float:
        """Get the Z coordinate of the labware's highest point"""

    @abstractmethod
    def get_uri(self) -> str:
        """Get the URI string string of the labware's definition.

        The URI is unique for a given namespace, load name, and definition version.
        """

    @abstractmethod
    def get_load_params(self) -> LabwareLoadParams:
        ...

    @abstractmethod
    def get_display_name(self) -> str:
        """Get a display name for the labware, falling back to the definition."""

    @abstractmethod
    def get_user_display_name(self) -> Optional[str]:
        """Get the user-specified display name of the labware, if set."""

    @abstractmethod
    def get_name(self) -> str:
        ...

    @abstractmethod
    def get_definition(self) -> LabwareDefinitionDict:
        """Get the labware's definition as a plain dictionary."""

    @abstractmethod
    def get_parameters(self) -> LabwareParametersDict:
        """Get the labware's definition's `parameters` field as a plain dictionary."""

    @abstractmethod
    def get_quirks(self) -> List[str]:
        ...

    @abstractmethod
    def set_calibration(self, delta: Point) -> None:
        ...

    @abstractmethod
    def get_calibrated_offset(self) -> Point:
        ...

    @abstractmethod
    def is_tip_rack(self) -> bool:
        """Whether the labware is a tip rack."""

    @abstractmethod
    def is_adapter(self) -> bool:
        """Whether the labware is an adapter."""

    @abstractmethod
    def is_lid(self) -> bool:
        """Whether the labware is a lid."""

    @abstractmethod
    def is_fixed_trash(self) -> bool:
        """Whether the labware is a fixed trash."""

    @abstractmethod
    def get_tip_length(self) -> float:
        ...

    @abstractmethod
    def reset_tips(self) -> None:
        ...

    @abstractmethod
    def get_next_tip(
        self,
        num_tips: int,
        starting_tip: Optional[WellCoreType],
        nozzle_map: Optional[NozzleMapInterface],
    ) -> Optional[str]:
        """Get the name of the next available tip(s) in the rack, if available."""

    @abstractmethod
    def get_well_columns(self) -> List[List[str]]:
        """Get the all well names, organized by column, from the labware's definition."""

    @abstractmethod
    def get_well_core(self, well_name: str) -> WellCoreType:
        """Get a well core interface to a given well in this labware."""

    @abstractmethod
    def get_deck_slot(self) -> Optional[DeckSlotName]:
        """Get the deck slot the labware or its parent is in, if any."""

    @abstractmethod
    def load_liquid(self, volumes: Dict[str, float], liquid: Liquid) -> None:
        """Load liquid into wells of the labware."""

    @abstractmethod
    def load_empty(self, wells: List[str]) -> None:
        """Mark wells of the labware as empty."""


LabwareCoreType = TypeVar("LabwareCoreType", bound=AbstractLabware[Any])
