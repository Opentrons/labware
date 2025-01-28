from typing import List, Optional, Dict

from opentrons.calibration_storage import helpers
from opentrons.protocols.geometry.labware_geometry import LabwareGeometry
from opentrons.protocols.api_support.tip_tracker import TipTracker

from opentrons.types import DeckSlotName, Location, Point, NozzleMapInterface

from opentrons_shared_data.labware.types import LabwareParameters, LabwareDefinition

from ..._liquid import Liquid
from ..labware import AbstractLabware, LabwareLoadParams
from .legacy_well_core import LegacyWellCore
from .well_geometry import WellGeometry


# URIs of labware whose definitions accidentally specify an engage height
# in units of half-millimeters instead of millimeters.
_MAGDECK_HALF_MM_LABWARE = {
    "opentrons/biorad_96_wellplate_200ul_pcr/1",
    "opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1",
    "opentrons/usascientific_96_wellplate_2.4ml_deep/1",
}


class LegacyLabwareCore(AbstractLabware[LegacyWellCore]):
    """Labware implementation core based on legacy PAPIv2 behavior.

    Args:
        definition: The labware definition, as a dict.
        parent: The location of the labware's origin point.
            A labware's origin is its front and left most corner.
            Usually a slot or a module location.
        label: Optional display label.
    """

    def __init__(
        self,
        definition: LabwareDefinition,
        parent: Location,
        label: Optional[str] = None,
    ) -> None:
        self._label: Optional[str] = None
        if label:
            dn = self._label = label
            self._name = dn
        else:
            dn = definition["metadata"]["displayName"]
            self._name = definition["parameters"]["loadName"]

        self._display_name = f"{dn} on {str(parent.labware)}"
        # Directly from definition
        self._well_definition = definition["wells"]
        self._parameters = definition["parameters"]
        self._definition = definition

        self._geometry = LabwareGeometry(definition, parent)
        self._calibrated_offset = Point(
            x=self._geometry.offset.x,
            y=self._geometry.offset.y,
            z=self._geometry.offset.z,
        )

        # flatten list of list of well names.
        self._wells_by_name = {
            well_name: LegacyWellCore(
                well_geometry=WellGeometry(
                    well_props=self._well_definition[well_name],
                    parent_point=self._calibrated_offset,
                    parent_object=self,
                ),
                display_name=f"{well_name} of {self._display_name}",
                has_tip=self.is_tip_rack(),
                name=well_name,
            )
            for column in self.get_well_columns()
            for well_name in column
        }

        self._tip_tracker = TipTracker(
            columns=[
                [self._wells_by_name[well_name] for well_name in column]
                for column in self.get_well_columns()
            ]
        )

    def get_uri(self) -> str:
        return helpers.uri_from_definition(self._definition)

    def get_load_params(self) -> LabwareLoadParams:
        return LabwareLoadParams(
            namespace=self._definition["namespace"],
            load_name=self._definition["parameters"]["loadName"],
            version=self._definition["version"],
        )

    def get_display_name(self) -> str:
        return self._display_name

    def get_user_display_name(self) -> Optional[str]:
        return self._label

    def get_name(self) -> str:
        return self._name

    def set_name(self, new_name: str) -> None:
        self._name = new_name

    def get_definition(self) -> LabwareDefinition:
        return self._definition

    def get_parameters(self) -> LabwareParameters:
        return self._parameters

    def get_quirks(self) -> List[str]:
        return self._parameters.get("quirks", [])

    def set_calibration(self, delta: Point) -> None:
        self._calibrated_offset = Point(
            x=self._geometry.offset.x + delta.x,
            y=self._geometry.offset.y + delta.y,
            z=self._geometry.offset.z + delta.z,
        )

        # Rebuild well geometry with new offset
        for well_name, well_core in self._wells_by_name.items():
            well_core.geometry = WellGeometry(
                well_props=self._well_definition[well_name],
                parent_point=self._calibrated_offset,
                parent_object=self,
            )

    def get_calibrated_offset(self) -> Point:
        return self._calibrated_offset

    def is_tip_rack(self) -> bool:
        return self._parameters["isTiprack"]

    def is_adapter(self) -> bool:
        return False  # Adapters were introduced in v2.15 and not supported in legacy protocols

    def is_lid(self) -> bool:
        return (
            False  # Lids were introduced in v2.21 and not supported in legacy protocols
        )

    def is_fixed_trash(self) -> bool:
        """Whether the labware is fixed trash."""
        return "fixedTrash" in self.get_quirks()

    def get_tip_length(self) -> float:
        return self._parameters["tipLength"]

    def set_tip_length(self, length: float) -> None:
        self._parameters["tipLength"] = length

    def reset_tips(self) -> None:
        if self.is_tip_rack():
            for well in self._wells_by_name.values():
                well.set_has_tip(True)

    def get_next_tip(
        self,
        num_tips: int,
        starting_tip: Optional[LegacyWellCore],
        nozzle_map: Optional[NozzleMapInterface],
    ) -> Optional[str]:
        if nozzle_map is not None:
            raise ValueError(
                "Nozzle Map cannot be provided to calls for next tip in legacy protocols."
            )
        next_well = self._tip_tracker.next_tip(num_tips, starting_tip)
        return next_well.get_name() if next_well else None

    def get_tip_tracker(self) -> TipTracker:
        return self._tip_tracker

    def get_well_columns(self) -> List[List[str]]:
        """Get the all well names, organized by column, from the labware's definition."""
        return self._definition["ordering"]

    def get_geometry(self) -> LabwareGeometry:
        return self._geometry

    @property
    def highest_z(self) -> float:
        return self._geometry.z_dimension + self._calibrated_offset.z

    @property
    def load_name(self) -> str:
        return self._parameters["loadName"]

    # TODO(mc, 2022-09-26): codify "from labware's base" in definition schema
    # https://opentrons.atlassian.net/browse/RSS-110
    def get_default_magnet_engage_height(
        self, preserve_half_mm: bool = False
    ) -> Optional[float]:
        """Get the labware's default magnet engage height, if defined.

        Value returned is in real millimeters from the labware's base,
        unless `preserve_half_mm` is used, in which case
        some definitions will return half-millimeters.
        """
        is_compatible = self._parameters.get("isMagneticModuleCompatible", False)
        default_engage_height = self._parameters.get("magneticModuleEngageHeight")

        if not is_compatible or default_engage_height is None:
            return None

        if self.get_uri() in _MAGDECK_HALF_MM_LABWARE and not preserve_half_mm:
            # TODO(mc, 2022-09-26): this value likely _also_ needs a few mm subtracted
            # https://opentrons.atlassian.net/browse/RSS-111
            return default_engage_height / 2.0

        return default_engage_height

    def get_well_core(self, well_name: str) -> LegacyWellCore:
        return self._wells_by_name[well_name]

    def get_deck_slot(self) -> Optional[DeckSlotName]:
        """Get the deck slot the labware is in, if in a deck slot."""
        slot = self._geometry.parent.labware.first_parent()
        return DeckSlotName.from_primitive(slot) if slot is not None else None

    def load_liquid(self, volumes: Dict[str, float], liquid: Liquid) -> None:
        """Load liquid into wells of the labware."""
        assert False, "load_liquid only supported in API version 2.22 & later"

    def load_empty(self, wells: List[str]) -> None:
        """Mark wells of the labware as empty."""
        assert False, "load_empty only supported in API version 2.22 & later"
