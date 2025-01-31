# noqa: D100

from opentrons.protocol_engine import LabwareOffset, ModuleModel
from opentrons.types import DeckSlotName


# todo(mm, 2024-12-06): Convert to be SQL-based and persistent instead of in-memory.
# https://opentrons.atlassian.net/browse/EXEC-1015
class LabwareOffsetStore:
    """A persistent store for labware offsets, to support the `/labwareOffsets` endpoints."""

    def __init__(self) -> None:
        self._offsets_by_id: dict[str, LabwareOffset] = {}

    def add(self, offset: LabwareOffset) -> None:
        """Store a new labware offset."""
        assert offset.id not in self._offsets_by_id
        self._offsets_by_id[offset.id] = offset

    def search(
        self,
        id_filter: str | None,
        definition_uri_filter: str | None,
        location_slot_name_filter: DeckSlotName | None,
        location_module_model_filter: ModuleModel | None,
        location_definition_uri_filter: str | None,
        # todo(mm, 2024-12-06): Support pagination (cursor & pageLength query params).
        # The logic for that is currently duplicated across several places in
        # robot-server and api. We should try to clean that up, or at least avoid
        # making it worse.
    ) -> list[LabwareOffset]:
        """Return all matching labware offsets in order from oldest-added to newest."""

        def is_match(candidate: LabwareOffset) -> bool:
            return (
                id_filter in (None, candidate.id)
                and definition_uri_filter in (None, candidate.definitionUri)
                and location_slot_name_filter in (None, candidate.location.slotName)
                and location_module_model_filter
                in (None, candidate.location.moduleModel)
                and location_definition_uri_filter
                in (None, candidate.location.definitionUri)
            )

        return [
            candidate
            for candidate in self._offsets_by_id.values()
            if is_match(candidate)
        ]

    def delete(self, offset_id: str) -> LabwareOffset:
        """Delete a labware offset by its ID. Return what was just deleted."""
        try:
            return self._offsets_by_id.pop(offset_id)
        except KeyError:
            raise LabwareOffsetNotFoundError(bad_offset_id=offset_id) from None

    def delete_all(self) -> None:
        """Delete all labware offsets."""
        self._offsets_by_id.clear()


class LabwareOffsetNotFoundError(KeyError):
    """Raised when trying to access a labware offset that doesn't exist."""

    def __init__(self, bad_offset_id: str) -> None:
        super().__init__(bad_offset_id)
        self.bad_offset_id = bad_offset_id
