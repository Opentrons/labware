from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Dict

from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    LiquidClassSchemaV1,
)

from ._liquid_properties import (
    TransferProperties,
    build_transfer_properties,
)


@dataclass(frozen=True)
class Liquid:
    """A liquid to load into a well.

    Attributes:
        name: A human-readable name for the liquid.
        description: An optional description.
        display_color: An optional display color for the liquid.

    .. versionadded:: 2.14
    """

    _id: str
    name: str
    description: Optional[str]
    display_color: Optional[str]


@dataclass
class LiquidClass:
    """A data class that contains properties of a specific class of liquids."""

    _name: str
    _display_name: str
    _by_pipette_setting: Dict[str, Dict[str, TransferProperties]]

    @classmethod
    def create(cls, liquid_class_definition: LiquidClassSchemaV1) -> "LiquidClass":
        """Liquid class factory method."""

        by_pipette_settings: Dict[str, Dict[str, TransferProperties]] = {}
        for by_pipette in liquid_class_definition.byPipette:
            tip_settings: Dict[str, TransferProperties] = {}
            for tip_type in by_pipette.byTipType:
                tip_settings[tip_type.tiprack] = build_transfer_properties(tip_type)
            by_pipette_settings[by_pipette.pipetteModel] = tip_settings

        return cls(
            _name=liquid_class_definition.liquidClassName,
            _display_name=liquid_class_definition.displayName,
            _by_pipette_setting=by_pipette_settings,
        )

    @property
    def name(self) -> str:
        return self._name

    @property
    def display_name(self) -> str:
        return self._display_name

    def get_for(self, pipette: str, tiprack: str) -> TransferProperties:
        """Get liquid class transfer properties for the specified pipette and tip."""
        try:
            settings_for_pipette = self._by_pipette_setting[pipette]
        except KeyError:
            raise ValueError(
                f"No properties found for {pipette} in {self._name} liquid class"
            )
        try:
            transfer_properties = settings_for_pipette[tiprack]
        except KeyError:
            raise ValueError(
                f"No properties found for {tiprack} in {self._name} liquid class"
            )
        return transfer_properties
