import asyncio
import contextlib
import json
import time
from pathlib import Path
from typing import Any, Dict, Generator
from datetime import datetime

import pytest
import requests

from robot_server.versioning import API_VERSION_HEADER, LATEST_API_VERSION_HEADER_VALUE

from .dev_server import DevServer
from .robot_client import RobotClient


_SESSION_SERVER_SCHEME = "http://"
_SESSION_SERVER_HOST = "localhost"
_OT2_SESSION_SERVER_PORT = "31950"
_OT3_SESSION_SERVER_PORT = "31960"
_INTEGRATION_SERVER_STARTUP_TIMEOUT_S = 30


def pytest_tavern_beta_before_every_test_run(
    test_dict: Dict[str, Any],
    variables: Any,
) -> None:
    """Add Opentrons-Version header to requests that don't specify it."""
    for stage in test_dict["stages"]:
        headers = stage["request"].get("headers", {})
        headers.setdefault("Opentrons-Version", "*")
        stage["request"].update({"headers": headers})


def pytest_tavern_beta_after_every_response(
    expected: Any, response: requests.Response
) -> None:
    print(response.url)
    print(json.dumps(response.json(), indent=4))


@pytest.fixture
def ot2_server_base_url(_ot2_session_server: str) -> Generator[str, None, None]:
    """Return the URL for a running dev server.

    Because it can take several seconds to start up and shut down, one server is shared across all
    tests in the test session. This fixture softly "resets" it after each test by deleting all
    runs and protocols, which provides good enough isolation in practice.
    """
    yield _ot2_session_server
    _clean_server_state(_ot2_session_server)


@pytest.fixture
def ot3_server_base_url(_ot3_session_server: str) -> Generator[str, None, None]:
    """Like `ot2_server_base_url()`, but the server is configured as an OT-3 instead of an OT-2."""
    yield _ot3_session_server
    _clean_server_state(_ot3_session_server)


@pytest.fixture(scope="session")
def _ot2_session_server(server_temp_directory: str) -> Generator[str, None, None]:
    base_url = (
        f"{_SESSION_SERVER_SCHEME}{_SESSION_SERVER_HOST}:{_OT2_SESSION_SERVER_PORT}"
    )
    with DevServer(
        port=_OT2_SESSION_SERVER_PORT,
        ot_api_config_dir=Path(server_temp_directory),
    ) as dev_server:
        dev_server.start()
        _wait_until_ready(base_url)
        yield base_url


@pytest.fixture(scope="session")
def _ot3_session_server(server_temp_directory: str) -> Generator[str, None, None]:
    base_url = (
        f"{_SESSION_SERVER_SCHEME}{_SESSION_SERVER_HOST}:{_OT3_SESSION_SERVER_PORT}"
    )
    with DevServer(
        port=_OT3_SESSION_SERVER_PORT,
        is_ot3=True,
        ot_api_config_dir=Path(server_temp_directory),
    ) as dev_server:
        dev_server.start()
        _wait_until_ready(base_url)
        yield base_url


@contextlib.contextmanager
def _requests_session() -> Generator[requests.Session, None, None]:
    with requests.Session() as session:
        session.headers.update({API_VERSION_HEADER: LATEST_API_VERSION_HEADER_VALUE})
        yield session


def _wait_until_ready(base_url: str) -> None:
    with _requests_session() as requests_session:
        started = datetime.now()
        while True:
            now = datetime.now()
            if (now - started).total_seconds() > _INTEGRATION_SERVER_STARTUP_TIMEOUT_S:
                raise RuntimeError("Could not start dev server")
            try:
                health_response = requests_session.get(f"{base_url}/health")
            except requests.ConnectionError:
                # The server isn't up yet to accept requests. Keep polling.
                pass
            else:
                if health_response.status_code == 503:
                    # The server is accepting requests but reporting not ready. Keep polling.
                    pass
                else:
                    # The server's replied with something other than a busy indicator. Stop polling.
                    return

            time.sleep(0.1)


def _clean_server_state(base_url: str) -> None:
    async def _clean_server_state_async() -> None:
        async with RobotClient.make(base_url=base_url, version="*") as robot_client:
            # Delete runs -> protocols -> data_files in that order because
            # protocols can't be deleted if a run refers to them, and,
            # data files can't be deleted if runs or protocol analyses refer to them.
            await _delete_all_runs(robot_client)
            await _delete_all_protocols(robot_client)
            await _delete_all_data_files(robot_client)

            await _delete_all_sessions(robot_client)

            await _reset_deck_configuration(robot_client)
            await _reset_error_recovery_settings(robot_client)
            await _delete_client_data(robot_client)
            await _delete_labware_offsets(robot_client)

    asyncio.run(_clean_server_state_async())


async def _delete_all_runs(robot_client: RobotClient) -> None:
    """Delete all runs on the robot server."""
    response = await robot_client.get_runs()
    run_ids = [r["id"] for r in response.json()["data"]]
    for run_id in run_ids:
        await robot_client.delete_run(run_id)


async def _delete_all_protocols(robot_client: RobotClient) -> None:
    """Delete all protocols on the robot server."""
    response = await robot_client.get_protocols()
    protocol_ids = [p["id"] for p in response.json()["data"]]
    for protocol_id in protocol_ids:
        await robot_client.delete_protocol(protocol_id)


async def _delete_all_data_files(robot_client: RobotClient) -> None:
    """Delete all data files on the robot server."""
    response = await robot_client.get_data_files()
    file_ids = [file["id"] for file in response.json()["data"]]
    for file_id in file_ids:
        await robot_client.delete_data_file(file_id)


async def _delete_all_sessions(robot_client: RobotClient) -> None:
    all_sessions_response = await robot_client.get_sessions()
    session_ids = [s["id"] for s in all_sessions_response.json()["data"]]
    for session_id in session_ids:
        await robot_client.delete_session(session_id)


async def _delete_client_data(robot_client: RobotClient) -> None:
    await robot_client.delete_all_client_data()


async def _reset_deck_configuration(robot_client: RobotClient) -> None:
    await robot_client.post_setting_reset_options({"deckConfiguration": True})


async def _reset_error_recovery_settings(robot_client: RobotClient) -> None:
    await robot_client.delete_error_recovery_settings()


async def _delete_labware_offsets(robot_client: RobotClient) -> None:
    await robot_client.delete_all_labware_offsets()
