"""Tests for the APIs around waste chutes and trash bins."""


from opentrons import protocol_api
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.api_support.util import UnsupportedAPIError

import contextlib
from typing import ContextManager, Optional, Type
import re

import pytest


@pytest.mark.parametrize(
    ("simulated_protocol_context", "expected_trash_class"),
    [
        (("2.13", "OT-2"), protocol_api.Labware),
        (("2.14", "OT-2"), protocol_api.Labware),
        (("2.15", "OT-2"), protocol_api.Labware),
        pytest.param(
            ("2.15", "Flex"),
            protocol_api.Labware,
            marks=pytest.mark.ot3_only,  # Simulating a Flex protocol requires a Flex hardware API.
        ),
        pytest.param(
            ("2.16", "OT-2"),
            protocol_api.TrashBin,
        ),
        pytest.param(
            ("2.16", "Flex"),
            None,
            marks=pytest.mark.ot3_only,  # Simulating a Flex protocol requires a Flex hardware API.
        ),
    ],
    indirect=["simulated_protocol_context"],
)
def test_fixed_trash_presence(
    simulated_protocol_context: protocol_api.ProtocolContext,
    expected_trash_class: Optional[Type[object]],
) -> None:
    """Test the presence of the fixed trash.

    Certain combinations of API version and robot type have a fixed trash.
    For those that do, ProtocolContext.fixed_trash and InstrumentContext.trash_container
    should point to it. The type of the object depends on the API version.
    """
    instrument = simulated_protocol_context.load_instrument(
        "p300_single_gen2"
        if simulated_protocol_context._core.robot_type == "OT-2 Standard"
        else "flex_1channel_50",
        mount="left",
    )

    if expected_trash_class is None:
        with pytest.raises(
            UnsupportedAPIError,
            match=re.escape(
                "Error 4002 API_REMOVED (UnsupportedAPIError): Fixed Trash is not available after API version 2.16."
                " You are currently using API version 2.16. Fixed trash is no longer supported on Flex protocols."
            ),
        ):
            simulated_protocol_context.fixed_trash
        with pytest.raises(Exception, match="No trash container has been defined"):
            instrument.trash_container

    else:
        assert isinstance(simulated_protocol_context.fixed_trash, expected_trash_class)
        assert instrument.trash_container is simulated_protocol_context.fixed_trash


@pytest.mark.ot3_only  # Simulating a Flex protocol requires a Flex hardware API.
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.16", "Flex")], indirect=True
)
def test_trash_search(simulated_protocol_context: protocol_api.ProtocolContext) -> None:
    """Test the automatic trash search for protocols without a fixed trash."""
    instrument = simulated_protocol_context.load_instrument(
        "flex_1channel_50", mount="left"
    )

    # By default, there should be no trash.
    with pytest.raises(
        UnsupportedAPIError,
        match=re.escape(
            "Error 4002 API_REMOVED (UnsupportedAPIError): Fixed Trash is not available after API version 2.16."
            " You are currently using API version 2.16. Fixed trash is no longer supported on Flex protocols."
        ),
    ):
        simulated_protocol_context.fixed_trash
    with pytest.raises(Exception, match="No trash container has been defined"):
        instrument.trash_container

    loaded_first = simulated_protocol_context.load_trash_bin("A1")
    loaded_second = simulated_protocol_context.load_trash_bin("B1")

    # After loading some trashes, there should still be no protocol.fixed_trash...
    with pytest.raises(
        UnsupportedAPIError,
        match=re.escape(
            "Error 4002 API_REMOVED (UnsupportedAPIError): Fixed Trash is not available after API version 2.16."
            " You are currently using API version 2.16. Fixed trash is no longer supported on Flex protocols."
        ),
    ):
        simulated_protocol_context.fixed_trash
    # ...but instrument.trash_container should automatically update to point to
    # the first trash that we loaded.
    assert instrument.trash_container is loaded_first

    # You should be able to override instrument.trash_container explicitly.
    instrument.trash_container = loaded_second
    assert instrument.trash_container is loaded_second


@pytest.mark.parametrize(
    ("simulated_protocol_context", "expect_load_to_succeed"),
    [
        pytest.param(
            ("2.13", "OT-2"),
            False,
            # This xfail (the system does let you load a labware onto slot 12, and does not raise)
            # is surprising to me. It may be be a bug in old PAPI versions.
            marks=pytest.mark.xfail(strict=True, raises=pytest.fail.Exception),
        ),
        (("2.14", "OT-2"), False),
        (("2.15", "OT-2"), False),
        pytest.param(
            ("2.15", "Flex"),
            False,
            marks=pytest.mark.ot3_only,  # Simulating a Flex protocol requires a Flex hardware API.
        ),
        pytest.param(
            ("2.16", "OT-2"),
            False,
        ),
        pytest.param(
            ("2.16", "Flex"),
            True,
            marks=pytest.mark.ot3_only,  # Simulating a Flex protocol requires a Flex hardware API.
        ),
    ],
    indirect=["simulated_protocol_context"],
)
def test_fixed_trash_load_conflicts(
    simulated_protocol_context: protocol_api.ProtocolContext,
    expect_load_to_succeed: bool,
) -> None:
    """Test loading something onto the location historically used for the fixed trash.

    In configurations where there is a fixed trash, this should be disallowed.
    In configurations without a fixed trash, this should be allowed.
    """
    if expect_load_to_succeed:
        expected_error: ContextManager[object] = contextlib.nullcontext()
    else:
        # If we're expecting an error, it'll be a LocationIsOccupied for 2.15 and below, otherwise
        # it will fail with an IncompatibleAddressableAreaError, since slot 12 will not be in the deck config
        if simulated_protocol_context.api_version < APIVersion(2, 16):
            error_name = "LocationIsOccupiedError"
        else:
            error_name = "IncompatibleAddressableAreaError"

        expected_error = pytest.raises(
            Exception,
            # Exact message doesn't matter, as long as it's definitely a labware load or addressable area conflict.
            match=error_name,
        )

    with expected_error:
        simulated_protocol_context.load_labware(
            "opentrons_96_wellplate_200ul_pcr_full_skirt", 12
        )
