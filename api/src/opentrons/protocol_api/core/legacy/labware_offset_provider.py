from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from opentrons.hardware_control.modules import ModuleModel as HardwareModuleModel
from opentrons.protocol_engine import (
    ProtocolEngine,
    LegacyLabwareOffsetLocation,
    ModuleModel,
)
from opentrons.types import DeckSlotName, Point

from ..labware import LabwareLoadParams


@dataclass
class ProvidedLabwareOffset:
    """A labware offset provided externally.

    Parameters:
        delta: The positional adjustment that should apply to all movements
            to this labware. Measured in deck coordinates, from the nominal
            position to the adjusted position.
        offset_id: An ID referencing the relevant external offset resource.
            `None` means no matching offset.
    """

    delta: Point
    offset_id: Optional[str]


class AbstractLabwareOffsetProvider(ABC):
    @abstractmethod
    def find(
        self,
        load_params: LabwareLoadParams,
        requested_module_model: Optional[HardwareModuleModel],
        deck_slot: DeckSlotName,
    ) -> ProvidedLabwareOffset:
        """Return the offset that should apply to a newly loaded labware.

        An APIv2 protocol's `ProtocolContext` should call this once for each labware,
        as it loads it.

        Args:
            labware_definition_uri: The labware's definition URI.
            requested_module_model: If the labware is atop a module,
                the model of that module.
                To ensure stability between simulation and execution,
                this is the model that the protocol requested,
                not the model that was actually found via the hardware API.
                (They can be different because of module compatibility.)
            deck_slot: The deck slot that the labware occupies. Or, if the labware is
                atop a module, the deck slot that the module occupies.
        """
        ...


class NullLabwareOffsetProvider(AbstractLabwareOffsetProvider):
    """Always provides (0, 0, 0)."""

    def find(
        self,
        load_params: LabwareLoadParams,
        requested_module_model: Optional[HardwareModuleModel],
        deck_slot: DeckSlotName,
    ) -> ProvidedLabwareOffset:
        return ProvidedLabwareOffset(delta=Point(0, 0, 0), offset_id=None)


class LabwareOffsetProvider(AbstractLabwareOffsetProvider):
    """Provides a `ProtocolEngine`'s labware offsets."""

    def __init__(self, engine: ProtocolEngine) -> None:
        """Initialize an offset provider with access to ProtocolEngine state."""
        self._labware_view = engine.state_view.labware

    def find(
        self,
        load_params: LabwareLoadParams,
        requested_module_model: Optional[HardwareModuleModel],
        deck_slot: DeckSlotName,
    ) -> ProvidedLabwareOffset:
        """Look up an offset in ProtocolEngine state and return it, if one exists.

        See the parent class for param details.
        """
        offset = self._labware_view.find_applicable_labware_offset_by_legacy_location(
            definition_uri=load_params.as_uri(),
            location=LegacyLabwareOffsetLocation(
                slotName=deck_slot,
                moduleModel=(
                    None
                    if requested_module_model is None
                    else ModuleModel(requested_module_model.value)
                ),
            ),
        )
        if offset is None:
            return ProvidedLabwareOffset(
                delta=Point(x=0, y=0, z=0),
                offset_id=None,
            )
        else:
            return ProvidedLabwareOffset(
                delta=Point(x=offset.vector.x, y=offset.vector.y, z=offset.vector.z),
                offset_id=offset.id,
            )
