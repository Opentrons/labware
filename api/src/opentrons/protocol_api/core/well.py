"""Abstract interface for Well core implementations."""

from abc import ABC, abstractmethod
from typing import TypeVar, Optional

from opentrons.types import Point

from .._liquid import Liquid


class AbstractWellCore(ABC):
    """Well core interface."""

    @property
    @abstractmethod
    def diameter(self) -> Optional[float]:
        """Get the well's diameter, if circular."""

    @property
    @abstractmethod
    def length(self) -> Optional[float]:
        """Get the well's length, if rectangular."""

    @property
    @abstractmethod
    def width(self) -> Optional[float]:
        """Get the well's width, if rectangular."""

    @property
    @abstractmethod
    def depth(self) -> float:
        """Get the well's depth."""

    @abstractmethod
    def has_tip(self) -> bool:
        """Whether the well contains a tip."""

    @abstractmethod
    def set_has_tip(self, value: bool) -> None:
        """Set the well as containing or not containing a tip."""

    @abstractmethod
    def get_display_name(self) -> str:
        """Get the full display name of the well (e.g. "A1 of Some Labware on 5")."""

    @abstractmethod
    def get_name(self) -> str:
        """Get the name of the well (e.g. "A1")."""

    @abstractmethod
    def get_column_name(self) -> str:
        """Get the column portion of the well name (e.g. "1")."""

    @abstractmethod
    def get_row_name(self) -> str:
        """Get the row portion of the well name (e.g. "A")."""

    @abstractmethod
    def get_max_volume(self) -> float:
        """Get the well's maximum liquid volume."""

    @abstractmethod
    def get_top(self, z_offset: float) -> Point:
        """Get the coordinate of the well's top, with an z-offset."""

    @abstractmethod
    def get_bottom(self, z_offset: float) -> Point:
        """Get the coordinate of the well's bottom, with an z-offset."""

    @abstractmethod
    def get_center(self) -> Point:
        """Get the coordinate of the well's center."""

    @abstractmethod
    def load_liquid(
        self,
        liquid: Liquid,
        volume: float,
    ) -> None:
        """Load liquid into a well."""

    @abstractmethod
    def from_center_cartesian(self, x: float, y: float, z: float) -> Point:
        """Gets point in deck coordinates based on percentage of the radius of each axis."""

    @abstractmethod
    def estimate_liquid_height_after_pipetting(
        self,
        operation_volume: float,
    ) -> float:
        """Estimate what the liquid height will be after pipetting, without raising an error."""

    @abstractmethod
    def current_liquid_height(self) -> float:
        """Get the current liquid height."""

    @abstractmethod
    def get_well_volume(self) -> float:
        """Get the current volume within a well."""


WellCoreType = TypeVar("WellCoreType", bound=AbstractWellCore)
