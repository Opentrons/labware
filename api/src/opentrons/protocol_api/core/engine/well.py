"""ProtocolEngine-based Well core implementations."""
from typing import Optional

from opentrons_shared_data.labware.constants import WELL_NAME_PATTERN

from opentrons.protocol_engine import WellLocation, WellOrigin, WellOffset
from opentrons.protocol_engine import commands as cmd
from opentrons.protocol_engine.clients import SyncClient as EngineClient
from opentrons.protocols.api_support.util import UnsupportedAPIError
from opentrons.types import Point

from . import point_calculations
from . import stringify
from ..well import AbstractWellCore
from ..._liquid import Liquid


class WellCore(AbstractWellCore):
    """Well API core using a ProtocolEngine.

    Args:
        name: The well's name in the labware, e.g. `A1`.
        labware_id: The ProtocolEngine ID of the well's parent labware.
        engine_client: Synchronous ProtocolEngine client.
    """

    def __init__(self, name: str, labware_id: str, engine_client: EngineClient) -> None:
        self._labware_id = labware_id
        self._engine_client = engine_client
        self._definition = engine_client.state.labware.get_well_definition(
            labware_id=labware_id, well_name=name
        )

        name_match = WELL_NAME_PATTERN.match(name)
        self._name = name
        self._row_name = name_match.group(1) if name_match is not None else ""
        self._column_name = name_match.group(2) if name_match is not None else ""

    @property
    def labware_id(self) -> str:
        """Get the ID of the well's parent labware."""
        return self._labware_id

    @property
    def diameter(self) -> Optional[float]:
        """Get the well's diameter, if circular."""
        return self._definition.diameter

    @property
    def length(self) -> Optional[float]:
        """Get the well's length, if rectangular."""
        return self._definition.xDimension

    @property
    def width(self) -> Optional[float]:
        """Get the well's width, if rectangular."""
        return self._definition.yDimension

    @property
    def depth(self) -> float:
        """Get the well's depth."""
        return self._definition.depth

    def has_tip(self) -> bool:
        """Whether the well contains a tip."""
        return self._engine_client.state.tips.has_clean_tip(
            self._labware_id, self._name
        )

    def set_has_tip(self, value: bool) -> None:
        """Set the well as containing or not containing a tip."""
        raise UnsupportedAPIError(
            api_element="Manually setting the tip state of a well in a tip rack",
        )

    def get_display_name(self) -> str:
        """Get the full display name of the well (e.g. "A1 of Some Labware on 5")."""
        return stringify.well(
            engine_client=self._engine_client,
            well_name=self._name,
            labware_id=self._labware_id,
        )

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
        return self._definition.totalLiquidVolume

    def get_top(self, z_offset: float) -> Point:
        """Get the coordinate of the well's top, with a z-offset."""
        return self._engine_client.state.geometry.get_well_position(
            well_name=self._name,
            labware_id=self._labware_id,
            well_location=WellLocation(
                origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=z_offset)
            ),
        )

    def get_bottom(self, z_offset: float) -> Point:
        """Get the coordinate of the well's bottom, with a z-offset."""
        return self._engine_client.state.geometry.get_well_position(
            well_name=self._name,
            labware_id=self._labware_id,
            well_location=WellLocation(
                origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=z_offset)
            ),
        )

    def get_center(self) -> Point:
        """Get the coordinate of the well's center."""
        return self._engine_client.state.geometry.get_well_position(
            well_name=self._name,
            labware_id=self._labware_id,
            well_location=WellLocation(origin=WellOrigin.CENTER),
        )

    def load_liquid(
        self,
        liquid: Liquid,
        volume: float,
    ) -> None:
        """Load liquid into a well.

        If the well is known to be empty, use ``load_empty()`` instead of calling this with a 0.0 volume.
        """
        self._engine_client.execute_command(
            cmd.LoadLiquidParams(
                labwareId=self._labware_id,
                liquidId=liquid._id,
                volumeByWell={self._name: volume},
            )
        )

    def from_center_cartesian(self, x: float, y: float, z: float) -> Point:
        """Gets point in deck coordinates based on percentage of the radius of each axis."""
        well_size = self._engine_client.state.labware.get_well_size(
            labware_id=self.labware_id, well_name=self._name
        )

        return point_calculations.get_relative_offset(
            point=self.get_center(),
            size=well_size,
            x_ratio=x,
            y_ratio=y,
            z_ratio=z,
        )

    def estimate_liquid_height_after_pipetting(
        self,
        operation_volume: float,
    ) -> float:
        """Return an estimate of liquid height after pipetting without raising an error."""
        labware_id = self.labware_id
        well_name = self._name
        starting_liquid_height = self.current_liquid_height()
        projected_final_height = self._engine_client.state.geometry.get_well_height_after_liquid_handling_no_error(
            labware_id=labware_id,
            well_name=well_name,
            initial_height=starting_liquid_height,
            volume=operation_volume,
        )
        return projected_final_height

    def current_liquid_height(self) -> float:
        """Return the current liquid height within a well."""
        labware_id = self.labware_id
        well_name = self._name
        return self._engine_client.state.geometry.get_meniscus_height(
            labware_id=labware_id, well_name=well_name
        )

    def get_well_volume(self) -> float:
        """Return the current volume in a well."""
        labware_id = self.labware_id
        well_name = self._name
        return self._engine_client.state.geometry.get_current_well_volume(
            labware_id=labware_id, well_name=well_name
        )
