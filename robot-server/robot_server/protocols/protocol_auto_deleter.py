"""Auto-delete old resources to make room for new ones."""


from logging import getLogger
from typing import Optional

from robot_server.deletion_planner import ProtocolDeletionPlanner
from robot_server.protocols.protocol_models import ProtocolKind
from .protocol_store import ProtocolStore


_log = getLogger(__name__)


class ProtocolAutoDeleter:  # noqa: D101
    def __init__(
        self,
        protocol_store: ProtocolStore,
        deletion_planner: ProtocolDeletionPlanner,
    ) -> None:
        self._protocol_store = protocol_store
        self._deletion_planner = deletion_planner

    def make_room_for_new_protocol(
        self, exclude_kind: Optional[ProtocolKind] = None
    ) -> None:
        """Finds unused protocols and deletes them.

        arg: exclude_kind: Excludes the this ProtocolKind from being deleted

        """
        protocol_run_usage_info = self._protocol_store.get_usage_info()
        exclude_protocols = {
            p.protocol_id
            for p in self._protocol_store.get_all()
            if p.protocol_kind == exclude_kind
        }

        protocol_ids_to_delete = self._deletion_planner.plan_for_new_protocol(
            existing_protocols=protocol_run_usage_info,
        )

        protocol_ids_to_delete = protocol_ids_to_delete - exclude_protocols
        if protocol_ids_to_delete:
            _log.info(
                f"Auto-deleting these protocols to make room for a new one:"
                f" {protocol_ids_to_delete}"
            )
        for protocol_id in protocol_ids_to_delete:
            self._protocol_store.remove(protocol_id=protocol_id)
