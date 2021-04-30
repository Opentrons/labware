"""Basic labware data state and store."""
from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple

from typing_extensions import final

from opentrons_shared_data.labware.dev_types import (
    LabwareDefinition,
    WellDefinition,
)
from opentrons.calibration_storage.helpers import uri_from_definition, \
    uri_from_details

from .. import errors
from ..resources import DeckFixedLabware
from ..commands import (
    CompletedCommandType,
    LoadLabwareResult,
    AddLabwareDefinitionResult,
    AddLabwareDefinitionRequest
)
from ..types import LabwareLocation, Dimensions
from .substore import Substore, CommandReactive


@final
@dataclass(frozen=True)
class LabwareData:
    """Labware data entry."""

    location: LabwareLocation
    definition: LabwareDefinition
    calibration: Tuple[float, float, float]


class LabwareState:
    """Basic labware data state and getter methods."""

    _labware_by_id: Dict[str, LabwareData]
    _labware_definitions_by_uri: Dict[str, LabwareDefinition]

    def __init__(self, deck_fixed_labware: Sequence[DeckFixedLabware]) -> None:
        """Initialize a LabwareState instance."""
        self._labware_by_id = {
            fixed_labware.labware_id: LabwareData(
                location=fixed_labware.location,
                definition=fixed_labware.definition,
                calibration=(0, 0, 0),
            )
            for fixed_labware in deck_fixed_labware
        }
        self._labware_definitions_by_uri = {}

    def get_labware_data_by_id(self, labware_id: str) -> LabwareData:
        """Get labware data by the labware's unique identifier."""
        try:
            return self._labware_by_id[labware_id]
        except KeyError:
            raise errors.LabwareDoesNotExistError(f"Labware {labware_id} not found.")

    def get_definition(self, labware_id: str) -> LabwareDefinition:
        """Get labware definition by the labware's unique identifier."""
        return self.get_labware_data_by_id(labware_id).definition

    def get_labware_location(self, labware_id: str) -> LabwareLocation:
        """Get labware location by the labware's unique identifier."""
        return self.get_labware_data_by_id(labware_id).location

    def get_all_labware(self) -> List[Tuple[str, LabwareData]]:
        """Get a list of all labware entries in state."""
        return [entry for entry in self._labware_by_id.items()]

    def get_labware_definition(
            self, load_name: str, namespace: str, version: int
    ) -> LabwareDefinition:
        """Get the labware definition matching loadName namespace and version."""
        try:
            uri = uri_from_details(
                namespace=namespace, load_name=load_name, version=version
            )
            return self._labware_definitions_by_uri[uri]
        except KeyError:
            raise errors.LabwareDefinitionDoesNotExistError(
                f"Labware definition for {load_name}, {namespace}, {version} not found.")

    def get_labware_has_quirk(self, labware_id: str, quirk: str) -> bool:
        """Get if a labware has a certain quirk."""
        return quirk in self.get_quirks(labware_id=labware_id)

    def get_quirks(self, labware_id: str) -> List[str]:
        """Get a labware's quirks."""
        data = self.get_labware_data_by_id(labware_id)
        return data.definition["parameters"].get("quirks", [])

    def get_well_definition(
        self,
        labware_id: str,
        well_name: str,
    ) -> WellDefinition:
        """Get a well's definition by labware and well identifier."""
        labware_data = self.get_labware_data_by_id(labware_id)

        try:
            return labware_data.definition["wells"][well_name]
        except KeyError:
            raise errors.WellDoesNotExistError(
                f"{well_name} does not exist in {labware_id}."
            )

    def get_tip_length(self, labware_id: str) -> float:
        """Get the tip length of a tip rack."""
        data = self.get_labware_data_by_id(labware_id)
        try:
            return data.definition["parameters"]["tipLength"]
        except KeyError:
            raise errors.LabwareIsNotTipRackError(
                f"Labware {labware_id} has no tip length defined."
            )

    def get_definition_uri(self, labware_id: str) -> str:
        """Get a labware's definition URI."""
        return uri_from_definition(self.get_labware_data_by_id(labware_id).definition)

    def is_tiprack(self, labware_id: str) -> bool:
        """Get whether labware is a tiprack."""
        labware_data = self.get_labware_data_by_id(labware_id)
        return labware_data.definition["parameters"]["isTiprack"]

    def get_load_name(self, labware_id: str) -> str:
        """Get the labware's load name."""
        labware_data = self.get_labware_data_by_id(labware_id)
        return labware_data.definition["parameters"]["loadName"]

    def get_dimensions(self, labware_id: str) -> Dimensions:
        """Get the labware's dimensions."""
        labware_data = self.get_labware_data_by_id(labware_id)
        dims = labware_data.definition["dimensions"]

        return Dimensions(
            x=dims["xDimension"],
            y=dims["yDimension"],
            z=dims["zDimension"],
        )


class LabwareStore(Substore[LabwareState], CommandReactive):
    """Labware state container."""

    _state: LabwareState

    def __init__(self, deck_fixed_labware: Sequence[DeckFixedLabware]) -> None:
        """Initialize a labware store and its state."""
        self._state = LabwareState(deck_fixed_labware=deck_fixed_labware)

    def handle_completed_command(self, command: CompletedCommandType) -> None:
        """Modify state in reaction to a completed command."""
        if isinstance(command.result, LoadLabwareResult):
            uri = uri_from_details(
                namespace=command.request.namespace,
                load_name=command.request.loadName,
                version=command.request.version
            )
            self._state._labware_definitions_by_uri[uri] = \
                command.result.definition
            self._state._labware_by_id[command.result.labwareId] = LabwareData(
                location=command.request.location,
                definition=command.result.definition,
                calibration=command.result.calibration,
            )
        elif isinstance(command.request, AddLabwareDefinitionRequest) and \
                isinstance(command.result, AddLabwareDefinitionResult):
            uri = uri_from_details(
                namespace=command.result.namespace,
                load_name=command.result.loadName,
                version=command.result.version
            )
            self._state._labware_definitions_by_uri[uri] = \
                command.request.labware_definition.dict(exclude_defaults=True)
