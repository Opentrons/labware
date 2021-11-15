from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from opentrons_shared_data.labware.dev_types import LabwareDefinition

from opentrons.types import Mount, DeckSlotName, DeckLocation


@dataclass(frozen=True)
class LabwareLoadInfo:
    """For Opentrons internal use only.

    :meta private:

    Information about a successful labware load.

    This is a separate class from the main user-facing `Labware` class
    because this is easier to construct in unit tests.
    """

    labware_definition: "LabwareDefinition"
    # todo(mm, 2021-10-11): Namespace, load name, and version can be derived from the
    # definition. Should they be removed from here?
    labware_namespace: str
    labware_load_name: str
    labware_version: int
    deck_slot: DeckSlotName


@dataclass(frozen=True)
class LabwareLoadOnModuleInfo:
    """For Opentrons internal use only.

    :meta private:

    Information about a successful labware load on a module.

    Like `LabwareLoadInfo`, but for loading labware on modules
    """

    labware_definition: "LabwareDefinition"
    # todo(spp, 2021-11-15): same note about namespace, load name, version as above.
    labware_namespace: str
    labware_load_name: str
    labware_version: int
    moduleId: str


@dataclass(frozen=True)
class InstrumentLoadInfo:
    """For Opentrons internal use only.

    :meta private:

    Like `LabwareLoadInfo`, but for instruments (pipettes).
    """

    instrument_load_name: str
    mount: Mount


@dataclass(frozen=True)
class ModuleLoadInfo:
    """For Opentrons internal use only.

    :meta private:

    Like `LabwareLoadInfo`, but for hardware modules.
    """

    module_name: str
    module_id: str
    location: Optional[DeckLocation]
    configuration: Optional[str]
