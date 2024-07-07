"""Unit tests for `protocol_auto_deleter`."""


from datetime import datetime
import logging

import pytest
from decoy import Decoy

from robot_server.deletion_planner import ProtocolDeletionPlanner
from robot_server.protocols.protocol_auto_deleter import ProtocolAutoDeleter
from robot_server.protocols.protocol_models import ProtocolKind
from robot_server.protocols.protocol_store import (
    ProtocolResource,
    ProtocolStore,
    ProtocolUsageInfo,
)
from opentrons.protocol_reader import ProtocolSource


def test_make_room_for_new_protocol(
    decoy: Decoy, caplog: pytest.LogCaptureFixture
) -> None:
    """It should get a deletion plan and enact it on the store."""
    mock_protocol_source = decoy.mock(cls=ProtocolSource)
    mock_protocol_store = decoy.mock(cls=ProtocolStore)
    mock_deletion_planner = decoy.mock(cls=ProtocolDeletionPlanner)

    subject = ProtocolAutoDeleter(
        protocol_store=mock_protocol_store,
        deletion_planner=mock_deletion_planner,
    )

    usage_info = [
        ProtocolUsageInfo(protocol_id="protocol-id-1", is_used_by_run=True),
        ProtocolUsageInfo(protocol_id="protocol-id-2", is_used_by_run=False),
        ProtocolUsageInfo(protocol_id="protocol-id-3", is_used_by_run=True),
    ]

    deletion_plan = set(["protocol-id-4", "protocol-id-5"])

    stored_protocol_resources = [
        ProtocolResource(
            protocol_id=p.protocol_id,
            created_at=datetime(year=2020, month=1, day=1),
            source=mock_protocol_source,
            protocol_key=f"{p.protocol_id}{idx}",
            protocol_kind=ProtocolKind.STANDARD.value,
        )
        for idx, p in enumerate(usage_info)
    ]

    decoy.when(mock_protocol_store.get_all()).then_return(stored_protocol_resources)
    decoy.when(mock_protocol_store.get_usage_info()).then_return(usage_info)
    decoy.when(
        mock_deletion_planner.plan_for_new_protocol(existing_protocols=usage_info)
    ).then_return(deletion_plan)

    # Run the subject, capturing log messages at least as severe as INFO.
    with caplog.at_level(logging.INFO):
        subject.make_room_for_new_protocol()

    decoy.verify(mock_protocol_store.remove(protocol_id="protocol-id-4"))
    decoy.verify(mock_protocol_store.remove(protocol_id="protocol-id-5"))

    # It should log the protocols that it deleted.
    assert "protocol-id-4" in caplog.text
    assert "protocol-id-5" in caplog.text


def test_make_room_for_new_protocol_exclude_quick_transfer(
    decoy: Decoy, caplog: pytest.LogCaptureFixture
) -> None:
    """It should delete all but quick-transfer protocols from the store."""
    mock_protocol_source = decoy.mock(cls=ProtocolSource)
    mock_protocol_store = decoy.mock(cls=ProtocolStore)
    mock_deletion_planner = decoy.mock(cls=ProtocolDeletionPlanner)

    subject = ProtocolAutoDeleter(
        protocol_store=mock_protocol_store,
        deletion_planner=mock_deletion_planner,
    )

    usage_info_all = [
        ProtocolUsageInfo(protocol_id="protocol-id-1", is_used_by_run=True),
        ProtocolUsageInfo(protocol_id="protocol-id-2", is_used_by_run=False),
        ProtocolUsageInfo(protocol_id="protocol-id-3", is_used_by_run=True),
        ProtocolUsageInfo(protocol_id="protocol-id-4", is_used_by_run=False),
        ProtocolUsageInfo(protocol_id="protocol-id-5", is_used_by_run=False),
    ]

    usage_info_call = [
        p
        for p in usage_info_all
        if p.protocol_id not in ["protocol-id-4", "protocol-id-5"]
    ]
    deletion_plan = {"protocol-id-1", "protocol-id-2", "protocol-id-3"}

    stored_protocol_resources = [
        ProtocolResource(
            protocol_id=p.protocol_id,
            created_at=datetime(year=2020, month=1, day=1),
            source=mock_protocol_source,
            protocol_key=f"{p.protocol_id}{idx}",
            protocol_kind=ProtocolKind.STANDARD.value
            if idx not in [3, 4]
            else ProtocolKind.QUICK_TRANSFER.value,
        )
        for idx, p in enumerate(usage_info_all)
    ]

    decoy.when(mock_protocol_store.get_all()).then_return(stored_protocol_resources)
    decoy.when(mock_protocol_store.get_usage_info()).then_return(usage_info_all)
    decoy.when(
        mock_deletion_planner.plan_for_new_protocol(existing_protocols=usage_info_call)
    ).then_return(deletion_plan)

    # Run the subject, capturing log messages at least as severe as INFO.
    with caplog.at_level(logging.INFO):
        subject.make_room_for_new_protocol(exclude_kind=ProtocolKind.QUICK_TRANSFER)

    decoy.verify(mock_protocol_store.remove(protocol_id="protocol-id-1"))
    decoy.verify(mock_protocol_store.remove(protocol_id="protocol-id-2"))
    decoy.verify(mock_protocol_store.remove(protocol_id="protocol-id-3"))

    # It should log the protocols that it deleted.
    assert "protocol-id-1" in caplog.text
    assert "protocol-id-2" in caplog.text
    assert "protocol-id-3" in caplog.text
    assert "protocol-id-4" not in caplog.text
    assert "protocol-id-5" not in caplog.text
