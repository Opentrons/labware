"""Tests for the Protocol Context's synchronous engine adapter.

Since Python protocol execution happens off the main thread, these tests call
the subject's methods in a synchronous context in a child thread to ensure:

- In the Protocol execution thread, calls are synchronous and block until
    command execution is complete.
- In the main thread, the Protocol Engine does its work in the main event
    loop, without blocking.
"""

import pytest
from decoy import Decoy


from opentrons_shared_data.labware.types import LabwareUri
from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from opentrons.protocol_engine import commands
from opentrons.protocol_engine.clients import SyncClient, ChildThreadTransport
from opentrons.protocol_engine.types import DeckPoint, DeckSlotLocation, Liquid
from opentrons.types import DeckSlotName


@pytest.fixture
def transport(decoy: Decoy) -> ChildThreadTransport:
    """Get a stubbed out ChildThreadTransport."""
    return decoy.mock(cls=ChildThreadTransport)


@pytest.fixture
def subject(transport: ChildThreadTransport) -> SyncClient:
    """Get a SyncProtocolEngine test subject."""
    return SyncClient(transport=transport)


def test_execute_command(
    decoy: Decoy, transport: ChildThreadTransport, subject: SyncClient
) -> None:
    """It should map the command params and execute it."""
    params = commands.CommentParams(message="hewwo")
    expected_request = commands.CommentCreate(params=params)
    subject.execute_command(params)
    decoy.verify(transport.execute_command_wait_for_recovery(request=expected_request))


def test_execute_command_without_recovery(
    decoy: Decoy, transport: ChildThreadTransport, subject: SyncClient
) -> None:
    """It should map the command params and execute it."""
    params = commands.LoadLabwareParams(
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_A1),
        loadName="loadName",
        namespace="namespace",
        version=0,
    )
    expected_request = commands.LoadLabwareCreate(params=params)
    result_from_transport = commands.AspirateResult(
        position=DeckPoint(x=1, y=2, z=3), volume=4
    )
    decoy.when(transport.execute_command(expected_request)).then_return(
        result_from_transport
    )
    result_from_subject = subject.execute_command_without_recovery(params)
    assert result_from_subject == result_from_transport  # type: ignore[comparison-overlap]


def test_add_labware_definition(
    decoy: Decoy,
    transport: ChildThreadTransport,
    subject: SyncClient,
) -> None:
    """It should add a labware definition."""
    labware_definition = LabwareDefinition.model_construct(namespace="hello")  # type: ignore[call-arg]
    expected_labware_uri = LabwareUri("hello/world/123")

    decoy.when(
        transport.call_method(
            "add_labware_definition",
            definition=labware_definition,
        )
    ).then_return(expected_labware_uri)

    result = subject.add_labware_definition(labware_definition)

    assert result == expected_labware_uri


def test_add_addressable_area(
    decoy: Decoy,
    transport: ChildThreadTransport,
    subject: SyncClient,
) -> None:
    """It should add an addressable area."""
    subject.add_addressable_area(addressable_area_name="cool-area")

    decoy.verify(
        transport.call_method(
            "add_addressable_area",
            addressable_area_name="cool-area",
        ),
        times=1,
    )


def test_add_liquid(
    decoy: Decoy,
    transport: ChildThreadTransport,
    subject: SyncClient,
) -> None:
    """It should add a liquid to engine state."""
    liquid = Liquid.model_construct(displayName="water")  # type: ignore[call-arg]

    decoy.when(
        transport.call_method(
            "add_liquid",
            name="water",
            description="water desc",
            color="#fff",
        )
    ).then_return(liquid)

    result = subject.add_liquid(name="water", description="water desc", color="#fff")

    assert result == liquid


def test_reset_tips(
    decoy: Decoy, transport: ChildThreadTransport, subject: SyncClient
) -> None:
    """It should reset the tip tracking state of a labware."""
    subject.reset_tips(labware_id="cool-labware")

    decoy.verify(
        transport.call_method(
            "reset_tips",
            labware_id="cool-labware",
        ),
        times=1,
    )
