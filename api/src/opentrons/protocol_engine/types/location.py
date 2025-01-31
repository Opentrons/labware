"""Protocol engine types to deal with locating things on the deck."""

from typing import Literal, Union

from pydantic import BaseModel, Field

from opentrons.types import DeckSlotName, StagingSlotName


class DeckSlotLocation(BaseModel):
    """The location of something placed in a single deck slot."""

    slotName: DeckSlotName = Field(
        ...,
        description=(
            # This description should be kept in sync with LegacyLabwareOffsetLocation.slotName.
            "A slot on the robot's deck."
            "\n\n"
            'The plain numbers like `"5"` are for the OT-2,'
            ' and the coordinates like `"C2"` are for the Flex.'
            "\n\n"
            "When you provide one of these values, you can use either style."
            " It will automatically be converted to match the robot."
            "\n\n"
            "When one of these values is returned, it will always match the robot."
        ),
    )


class StagingSlotLocation(BaseModel):
    """The location of something placed in a single staging slot."""

    slotName: StagingSlotName = Field(
        ...,
        description=(
            # This description should be kept in sync with LegacyLabwareOffsetLocation.slotName.
            "A slot on the robot's staging area."
            "\n\n"
            "These apply only to the Flex. The OT-2 has no staging slots."
        ),
    )


class AddressableAreaLocation(BaseModel):
    """The location of something place in an addressable area. This is a superset of deck slots."""

    addressableAreaName: str = Field(
        ...,
        description=(
            "The name of the addressable area that you want to use."
            " Valid values are the `id`s of `addressableArea`s in the"
            " [deck definition](https://github.com/Opentrons/opentrons/tree/edge/shared-data/deck)."
        ),
    )


class ModuleLocation(BaseModel):
    """The location of something placed atop a hardware module."""

    moduleId: str = Field(
        ...,
        description="The ID of a loaded module from a prior `loadModule` command.",
    )


class OnLabwareLocation(BaseModel):
    """The location of something placed atop another labware."""

    labwareId: str = Field(
        ...,
        description="The ID of a loaded Labware from a prior `loadLabware` command.",
    )


_OffDeckLocationType = Literal["offDeck"]
_SystemLocationType = Literal["systemLocation"]
OFF_DECK_LOCATION: _OffDeckLocationType = "offDeck"
SYSTEM_LOCATION: _SystemLocationType = "systemLocation"


class OnLabwareLocationSequenceComponent(BaseModel):
    """Labware on another labware."""

    kind: Literal["onLabware"] = "onLabware"
    labwareId: str
    lidId: str | None


class OnModuleLocationSequenceComponent(BaseModel):
    """Labware on a module."""

    kind: Literal["onModule"] = "onModule"
    moduleId: str


class OnAddressableAreaLocationSequenceComponent(BaseModel):
    """Labware on an addressable area."""

    kind: Literal["onAddressableArea"] = "onAddressableArea"
    addressableAreaName: str
    slotName: str | None


class NotOnDeckLocationSequenceComponent(BaseModel):
    """Labware on a system location."""

    kind: Literal["notOnDeck"] = "notOnDeck"
    logicalLocationName: _OffDeckLocationType | _SystemLocationType


LabwareLocationSequence = list[
    OnLabwareLocationSequenceComponent
    | OnModuleLocationSequenceComponent
    | OnAddressableAreaLocationSequenceComponent
    | NotOnDeckLocationSequenceComponent
]
"""Labware location specifier."""

LabwareLocation = Union[
    DeckSlotLocation,
    ModuleLocation,
    OnLabwareLocation,
    _OffDeckLocationType,
    _SystemLocationType,
    AddressableAreaLocation,
]
"""Union of all locations where it's legal to keep a labware."""

OnDeckLabwareLocation = Union[
    DeckSlotLocation, ModuleLocation, OnLabwareLocation, AddressableAreaLocation
]

NonStackedLocation = Union[
    DeckSlotLocation,
    AddressableAreaLocation,
    ModuleLocation,
    _OffDeckLocationType,
    _SystemLocationType,
]
"""Union of all locations where it's legal to keep a labware that can't be stacked on another labware"""


# TODO(mm, 2022-11-07): Deduplicate with Vec3f.
class DeckPoint(BaseModel):
    """Coordinates of a point in deck space."""

    x: float
    y: float
    z: float
