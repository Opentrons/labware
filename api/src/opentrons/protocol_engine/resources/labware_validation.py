"""Validation file for labware role and location checking functions."""

from opentrons_shared_data.labware.labware_definition import LabwareRole
from opentrons.protocols.models import LabwareDefinition


def is_flex_trash(load_name: str) -> bool:
    """Check if a labware is a large trash."""
    return load_name == "opentrons_1_trash_3200ml_fixed"


def is_absorbance_reader_lid(load_name: str) -> bool:
    """Check if a labware is an absorbance reader lid."""
    return load_name == "opentrons_flex_lid_absorbance_plate_reader_module"


def is_evotips(load_name: str) -> bool:
    """Check if a labware is an evotips tiprack."""
    return load_name == "evotips_opentrons_96_labware"


def validate_definition_is_labware(definition: LabwareDefinition) -> bool:
    """Validate that one of the definition's allowed roles is `labware`.

    An empty `allowedRoles` is equivalent to `labware` being the only allowed role.
    """
    return not definition.allowedRoles or LabwareRole.labware in definition.allowedRoles


def validate_definition_is_adapter(definition: LabwareDefinition) -> bool:
    """Validate that one of the definition's allowed roles is `adapter`."""
    return LabwareRole.adapter in definition.allowedRoles


def validate_definition_is_lid(definition: LabwareDefinition) -> bool:
    """Validate that one of the definition's allowed roles is `lid`."""
    return LabwareRole.lid in definition.allowedRoles


def validate_definition_is_system(definition: LabwareDefinition) -> bool:
    """Validate that one of the definition's allowed roles is `system`."""
    return LabwareRole.system in definition.allowedRoles


def validate_labware_can_be_stacked(
    top_labware_definition: LabwareDefinition, below_labware_load_name: str
) -> bool:
    """Validate that the labware being loaded onto is in the above labware's stackingOffsetWithLabware definition."""
    return below_labware_load_name in top_labware_definition.stackingOffsetWithLabware


def validate_labware_can_be_ondeck(definition: LabwareDefinition) -> bool:
    """Validate that the labware being loaded onto the deck can sit in a slot."""
    return (
        definition.parameters.quirks is None
        or "stackingOnly" not in definition.parameters.quirks
    )


def validate_gripper_compatible(definition: LabwareDefinition) -> bool:
    """Validate that the labware definition does not have a quirk disallowing movement with gripper."""
    return (
        definition.parameters.quirks is None
        or "gripperIncompatible" not in definition.parameters.quirks
    )
