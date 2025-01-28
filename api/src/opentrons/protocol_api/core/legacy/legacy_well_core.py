"""Legacy Well core implementation."""
from typing import Optional

from opentrons_shared_data.labware.constants import WELL_NAME_PATTERN

from opentrons.protocols.api_support.util import APIVersionError

from opentrons.types import Point

from .well_geometry import WellGeometry
from ..well import AbstractWellCore
from ..._liquid import Liquid


class LegacyWellCore(AbstractWellCore):
    """Well implementation core based on legacy PAPIv2 behavior.

    Args:
        well_geometry: Information about the well's geometry.
        display_name: User-facing display name.
        has_tip: Whether the well contains a tip.
        name: Unique well name inside its labware, e.g. `A1`.
            Must match pattern /^([A-Z]+)([0-9]+)$/.
    """

    def __init__(
        self, well_geometry: WellGeometry, display_name: str, has_tip: bool, name: str
    ) -> None:
        self._display_name = display_name
        self._has_tip = has_tip
        self._name = name

        match = WELL_NAME_PATTERN.match(name)
        assert match, f"could not match '{name}' using pattern '{WELL_NAME_PATTERN}'"
        self._row_name = match.group(1)
        self._column_name = match.group(2)
        self._geometry = well_geometry

    @property
    def geometry(self) -> WellGeometry:
        """Get the well's geometry information interface."""
        return self._geometry

    @geometry.setter
    def geometry(self, well_geometry: WellGeometry) -> None:
        """Update the well's geometry interface."""
        self._geometry = well_geometry

    @property
    def diameter(self) -> Optional[float]:
        """Get the well's diameter, if circular."""
        return self._geometry.diameter

    @property
    def length(self) -> Optional[float]:
        """Get the well's length, if rectangular."""
        return self._geometry.length

    @property
    def width(self) -> Optional[float]:
        """Get the well's width, if rectangular."""
        return self._geometry.width

    @property
    def depth(self) -> float:
        """Get the well's depth."""
        return self._geometry.depth

    def has_tip(self) -> bool:
        """Whether the well contains a tip."""
        return self._has_tip

    def set_has_tip(self, value: bool) -> None:
        """Set the well as containing or not containing a tip."""
        self._has_tip = value

    def get_display_name(self) -> str:
        """Get the full display name of the well (e.g. "A1 of Some Labware on 5")."""
        return self._display_name

    def get_name(self) -> str:
        """Get the name of the well (e.g. "A1")."""
        return self._name

    def get_column_name(self) -> str:
        """Get the column portion of the well name (e.g. "1")."""
        return self._column_name

    def get_row_name(self) -> str:
        """Get the row portion of the well name (e.g. "A")."""
        return self._row_name

    def get_max_volume(self) -> float:
        """Get the well's maximum liquid volume."""
        return self._geometry.max_volume

    def get_top(self, z_offset: float) -> Point:
        """Get the coordinate of the well's top, with an z-offset."""
        return self._geometry.top(z_offset)

    def get_bottom(self, z_offset: float) -> Point:
        """Get the coordinate of the well's bottom, with an z-offset."""
        return self._geometry.bottom(z_offset)

    def get_center(self) -> Point:
        """Get the coordinate of the well's center."""
        return self._geometry.center()

    def load_liquid(
        self,
        liquid: Liquid,
        volume: float,
    ) -> None:
        """Load liquid into a well."""
        raise APIVersionError(api_element="Loading a liquid")

    def from_center_cartesian(self, x: float, y: float, z: float) -> Point:
        """Gets point in deck coordinates based on percentage of the radius of each axis."""
        return self._geometry.from_center_cartesian(x, y, z)

    def estimate_liquid_height_after_pipetting(
        self,
        starting_liquid_height: float,
        operation_volume: float,
    ) -> float:
        """Estimate what the liquid height will be after pipetting, without raising an error."""
        return 0.0

    def current_liquid_height(self) -> float:
        """Get the current liquid height."""
        return 0.0

    # TODO(mc, 2022-10-28): is this used and/or necessary?
    def __repr__(self) -> str:
        """Use the well's display name as its repr."""
        return self.get_display_name()

    # TODO(mc, 2022-08-24): comparing only names seems insufficient
    def __eq__(self, other: object) -> bool:
        """Assume that if name is the same then it's the same well."""
        return isinstance(other, LegacyWellCore) and self.get_name() == other.get_name()
