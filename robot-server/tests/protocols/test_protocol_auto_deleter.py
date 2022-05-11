from datetime import datetime
import logging

import pytest
from decoy import Decoy

from robot_server.deletion_planner import ProtocolDeletionPlanner
from robot_server.protocols.protocol_auto_deleter import ProtocolAutoDeleter
from robot_server.protocols.protocol_store import (
    ProtocolStore,
    ProtocolResource,
    ProtocolRunUsageInfo,
)


def test_make_room_for_new_protocol(
    decoy: Decoy, caplog: pytest.LogCaptureFixture
) -> None:
    mock_protocol_store = decoy.mock(cls=ProtocolStore)
    mock_deletion_planner = decoy.mock(cls=ProtocolDeletionPlanner)

    subject = ProtocolAutoDeleter(
        protocol_store=mock_protocol_store,
        deletion_planner=mock_deletion_planner,
    )

    run_usage_info = [
        ProtocolRunUsageInfo(protocol_id="protocol-id-1", is_used_by_run=True),
        ProtocolRunUsageInfo(protocol_id="protocol-id-2", is_used_by_run=False),
        ProtocolRunUsageInfo(protocol_id="protocol-id-3", is_used_by_run=True),
    ]

    deletion_plan = set(["protocol-id-4", "protocol-id-5"])

    decoy.when(mock_protocol_store.get_run_usage_info()).then_return(run_usage_info)
    decoy.when(
        mock_deletion_planner.plan_for_new_protocol(existing_protocols=run_usage_info)
    ).then_return(deletion_plan)

    # Capture log messages from the subject at least as severe as INFO.
    with caplog.at_level(logging.INFO):
        subject.make_room_for_new_protocol()

    decoy.verify(mock_protocol_store.remove(protocol_id="protocol-id-4"))
    decoy.verify(mock_protocol_store.remove(protocol_id="protocol-id-5"))

    # It should log the protocols that it plans to delete.
    assert "protocol-id-4" in caplog.text
    assert "protocol-id-5" in caplog.text
