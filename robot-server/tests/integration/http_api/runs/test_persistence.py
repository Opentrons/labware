import json
from copy import deepcopy
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, NamedTuple, cast

import anyio
import pytest

from tests.conftest import zulu_iso8601_to_datetime
from tests.integration.dev_server import DevServer
from tests.integration.robot_client import RobotClient


class ClientServerFixture(NamedTuple):
    client: RobotClient
    server: DevServer

    async def restart(self) -> None:
        self.server.stop()
        assert await self.client.dead(), "Server did not stop."
        self.server.start()
        await self.client.wait_until_ready()


@pytest.fixture
def port() -> str:
    """Get a port to run the dev server on."""
    return "15555"


@pytest.fixture
async def client_and_server(port: str) -> AsyncGenerator[ClientServerFixture, None]:
    """Get a dev server and a client to that server."""
    async with RobotClient.make(
        base_url=f"http://localhost:{port}",
        version="*",
    ) as client:
        assert await client.dead(), "Server is running and must not be."

        with DevServer(port=port) as server:
            server.start()
            await client.wait_until_ready()

            yield ClientServerFixture(client=client, server=server)


async def _wait_until_status(
    robot_client: RobotClient,
    run_id: str,
    expected_status: str,
) -> Dict[str, Any]:
    """Wait until a run achieves the expected status, returning its data."""
    with anyio.fail_after(1.0):
        get_run_response = await robot_client.get_run(run_id=run_id)

        while get_run_response.json()["data"]["status"] != expected_status:
            await anyio.sleep(0.1)
            get_run_response = await robot_client.get_run(run_id=run_id)

    return cast(Dict[str, Any], get_run_response.json()["data"])


async def _assert_run_persisted(
    robot_client: RobotClient, expected_run_data: Dict[str, Any]
) -> None:
    """Fetch a run through various endpoints to ensure it was persisted.

    Note: This only checks the fields of the run resource itself.
    It does not check the run's commands, which are accessed through
    separate endpoints.
    """
    run_id = expected_run_data["id"]
    get_all_persisted_runs_response = await robot_client.get_runs()
    get_persisted_run_response = await robot_client.get_run(run_id)
    assert get_all_persisted_runs_response.json()["data"] == [expected_run_data]
    assert get_persisted_run_response.json()["data"] == expected_run_data


async def test_untimely_restart_marks_runs_bad(
    client_and_server: ClientServerFixture,
) -> None:
    """Test that a run persists even if the server was restarted before the run was
    gracefully closed out."""
    client, server = client_and_server

    # create a run
    create_run_response = await client.post_run(req_body={"data": {}})
    run_id = create_run_response.json()["data"]["id"]

    run = (await client.get_run(run_id)).json()["data"]
    assert run["status"] == "idle"
    assert run["current"] is True
    # Some loss of state is expected.
    expected_run = deepcopy(run)
    expected_run["status"] = "stopped"
    expected_run["current"] = False
    expected_run["ok"] = False
    expected_run["dataError"] = {
        "id": "RunDataError",
        "title": "Run Data Error",
        "detail": "There was no engine state data for this run.",
        "meta": {
            "code": "4008",
            "detail": {},
            "message": "There was no engine state data for this run.",
            "type": "InvalidStoredData",
            "wrapping": [],
        },
        "errorCode": "4008",
    }

    # reboot the server
    await client_and_server.restart()

    await _assert_run_persisted(robot_client=client, expected_run_data=expected_run)


async def test_runs_persist_via_patch(client_and_server: ClientServerFixture) -> None:
    """Test that runs are persisted through dev server restart."""
    client, server = client_and_server

    # create a run
    create_run_response = await client.post_run(req_body={"data": {}})
    run_id = create_run_response.json()["data"]["id"]

    # persist the run by setting current: false
    archive_run_response = await client.patch_run(
        run_id=run_id, req_body={"data": {"current": False}}
    )
    expected_run = archive_run_response.json()["data"]

    # reboot the server
    await client_and_server.restart()

    # make sure the run persisted as we expect
    await _assert_run_persisted(robot_client=client, expected_run_data=expected_run)


async def test_runs_persist_via_actions_router(
    client_and_server: ClientServerFixture,
) -> None:
    """Test that runs commands and state
    are persisted when calling play action through dev server restart."""
    client, server = client_and_server

    # create a run
    create_run_response = await client.post_run(req_body={"data": {}})
    run_id = create_run_response.json()["data"]["id"]

    # persist the run by hitting the actions router
    await client.post_run_action(
        run_id=run_id,
        req_body={"data": {"actionType": "play"}},
    )

    # wait for the run to succeed due to the run completed
    completed_run_data = await _wait_until_status(client, run_id, "succeeded")

    # our expected run is the last fetched run, with current: false
    # since it's a persisted, historical run
    expected_run = dict(completed_run_data, current=False)

    # reboot the server
    await client_and_server.restart()

    # make sure the run persisted as we expect
    await _assert_run_persisted(robot_client=client, expected_run_data=expected_run)


async def test_run_actions_and_labware_offsets_persist(
    client_and_server: ClientServerFixture,
) -> None:
    """Test that run sub-resources are persisted through dev server restart."""
    client, server = client_and_server

    # create a run with offsets
    create_run_response = await client.post_run(
        req_body={
            "data": {
                "labwareOffsets": [
                    {
                        "definitionUri": "opentrons/opentrons_96_tiprack_300ul/1",
                        "location": {"slotName": "1"},
                        "vector": {"x": 1, "y": 2, "z": 3},
                    }
                ]
            }
        }
    )
    run_id = create_run_response.json()["data"]["id"]

    # add another labware offset and an action
    await client.post_labware_offset(
        run_id=run_id,
        req_body={
            "data": {
                "definitionUri": "opentrons/opentrons_96_tiprack_300ul/1",
                "location": {"slotName": "2"},
                "vector": {"x": 4, "y": 5, "z": 6},
            }
        },
    )
    await client.post_run_action(
        run_id=run_id,
        req_body={"data": {"actionType": "stop"}},
    )

    # wait for the stop action to take effect
    await _wait_until_status(client, run_id, "stopped")

    # persist the run by setting current: false
    archive_run_response = await client.patch_run(
        run_id=run_id, req_body={"data": {"current": False}}
    )

    # Other integration tests cover the fact that the actions and labware offsets
    # that we added will show up in this data.
    expected_run = archive_run_response.json()["data"]

    # reboot the server
    await client_and_server.restart()

    # make sure the run persisted as we expect
    await _assert_run_persisted(robot_client=client, expected_run_data=expected_run)


async def test_run_commands_persist(client_and_server: ClientServerFixture) -> None:
    """Test that run commands are persisted through restart."""
    client, server = client_and_server

    # create a run
    create_run_response = await client.post_run(req_body={"data": {}})
    run_id = create_run_response.json()["data"]["id"]

    # create a command in that run
    create_command_response = await client.post_run_command(
        run_id=run_id,
        req_body={"data": {"commandType": "home", "params": {}}},
        params={"waitUntilComplete": True},
    )
    expected_command = create_command_response.json()["data"]
    command_id = expected_command["id"]

    # persist the run by setting current: false
    await client.patch_run(run_id=run_id, req_body={"data": {"current": False}})

    # reboot the server
    await client_and_server.restart()

    # fetch the command again through various endpoints
    get_all_persisted_commands_response = await client.get_run_commands(run_id=run_id)
    get_persisted_command_response = await client.get_run_command(
        run_id=run_id, command_id=command_id
    )
    get_preserialized_commands_response = await client.get_preserialized_commands(
        run_id=run_id
    )

    # ensure the persisted commands still match the original ones
    assert get_all_persisted_commands_response.json()["data"] == [
        # NOTE: GET /run/:id/commands returns command summaries,
        # which are commands without the `result` key
        {k: v for k, v in expected_command.items() if k != "result"}
    ]
    assert get_persisted_command_response.json()["data"] == expected_command

    json_converted_command = json.loads(
        get_preserialized_commands_response.json()["data"][0]
    )
    assert json_converted_command == expected_command


async def test_runs_completed_started_at_persist_via_actions_router(
    client_and_server: ClientServerFixture,
) -> None:
    """Test that startedAt and completedAt are be persisted via play action."""
    client, server = client_and_server

    # create a run
    create_run_response = await client.post_run(req_body={"data": {}})
    run_id = create_run_response.json()["data"]["id"]

    # persist the run by hitting the actions router
    expected_started_at = datetime.now()
    await client.post_run_action(
        run_id=run_id,
        req_body={"data": {"actionType": "play"}},
    )

    # wait for the run to completed via play action
    await _wait_until_status(client, run_id, "succeeded")

    expected_completed_at = datetime.now()

    # reboot the server
    await client_and_server.restart()

    # fetch the updated run, which we expect to be persisted
    get_run_response = await client.get_run(run_id=run_id)
    run_data = get_run_response.json()["data"]

    assert zulu_iso8601_to_datetime(run_data["startedAt"]).timestamp() == pytest.approx(
        expected_started_at.timestamp(), abs=2
    )

    assert zulu_iso8601_to_datetime(
        run_data["completedAt"]
    ).timestamp() == pytest.approx(expected_completed_at.timestamp(), abs=2)

    # make sure the times are in order
    assert run_data["startedAt"] < run_data["completedAt"]


async def test_runs_completed_filled_started_at_none_persist(
    client_and_server: ClientServerFixture,
) -> None:
    """Test that completedAt is persisted via PATCH to not current."""
    client, server = client_and_server

    # create a run
    create_run_response = await client.post_run(req_body={"data": {}})
    run_id = create_run_response.json()["data"]["id"]

    # persist the run via PATCH
    await client.patch_run(run_id=run_id, req_body={"data": {"current": False}})
    expected_completed_at = datetime.now()

    # reboot the server
    await client_and_server.restart()

    # fetch the updated run, which we expect to be persisted
    get_run_response = await client.get_run(run_id=run_id)
    run_data = get_run_response.json()["data"]

    assert "startedAt" not in run_data
    assert zulu_iso8601_to_datetime(
        run_data["completedAt"]
    ).timestamp() == pytest.approx(expected_completed_at.timestamp(), abs=2)
