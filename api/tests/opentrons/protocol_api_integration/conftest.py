"""Fixtures for protocol api integration tests."""

import pytest
from _pytest.fixtures import SubRequest
from typing import Generator

from opentrons import simulate, protocol_api
from opentrons.protocol_api.core.engine import ENGINE_CORE_API_VERSION


@pytest.fixture
def simulated_protocol_context(
    request: SubRequest,
) -> Generator[protocol_api.ProtocolContext, None, None]:
    """Return a protocol context with requested version and robot."""
    version, robot_type = request.param
    context = simulate.get_protocol_api(version=version, robot_type=robot_type)
    try:
        yield context
    finally:
        if context.api_version >= ENGINE_CORE_API_VERSION:
            # TODO(jbl, 2024-11-14) this is a hack of a hack to close the hardware and the PE thread when a test is
            #  complete. At some point this should be replaced with a more holistic way of safely cleaning up these
            #  threads so they don't leak and cause tests to fail when `get_protocol_api` is called too many times.
            simulate._LIVE_PROTOCOL_ENGINE_CONTEXTS.close()
        else:
            # If this is a non-PE context we need to clean up the hardware thread manually
            context._hw_manager.hardware.clean_up()
