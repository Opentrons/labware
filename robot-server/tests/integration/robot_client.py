from __future__ import annotations

import asyncio
import concurrent.futures
import contextlib
from pathlib import Path
from typing import Any, AsyncGenerator, BinaryIO, Dict, List, Optional, Tuple, Union

import httpx
from httpx import Response


_STARTUP_WAIT = 40
_SHUTDOWN_WAIT = 20

_RUN_POLL_INTERVAL = 0.1
_ANALYSIS_POLL_INTERVAL = 0.1


class RobotClient:
    """Client for the robot's HTTP API.

    This is mostly a thin wrapper, where most methods have a 1:1 correspondence
    with HTTP endpoints. See the robot server's OpenAPI specification for
    details on semantics and request/response shapes.
    """

    def __init__(
        self,
        httpx_client: httpx.AsyncClient,
        worker_executor: concurrent.futures.ThreadPoolExecutor,
        base_url: str,
    ) -> None:
        """Initialize the client."""
        self.httpx_client = httpx_client
        self.worker_executor = worker_executor
        self.base_url = base_url

    @staticmethod
    @contextlib.asynccontextmanager
    async def make(base_url: str, version: str) -> AsyncGenerator[RobotClient, None]:
        with concurrent.futures.ThreadPoolExecutor() as worker_executor:
            async with httpx.AsyncClient(
                headers={"opentrons-version": version},
                # Set the default timeout high enough for our heaviest requests
                # (like fetching a large protocol analysis) to fit comfortably.
                # If an individual test wants to shorten this timeout, it should wrap
                # its request in anyio.fail_after().
                timeout=30,
            ) as httpx_client:
                yield RobotClient(
                    httpx_client=httpx_client,
                    worker_executor=worker_executor,
                    base_url=base_url,
                )

    async def dead(self) -> bool:
        """Is /health unreachable?"""
        try:
            await self.get_health()
        except httpx.ConnectError:
            return True
        except httpx.HTTPStatusError:
            # If it's alive enough to return an error code, it's not dead.
            return False
        else:
            # If it's alive enough to return a success code, it's super not dead.
            return False

    async def _poll_for_ready(self) -> None:
        """Retry GET /health until ready."""
        while True:
            try:
                await self.get_health()
            except httpx.ConnectError:
                await asyncio.sleep(0.1)  # Wait, then keep polling.
            except httpx.HTTPStatusError as e:
                error_is_because_still_initializing = e.response.status_code == 503
                if error_is_because_still_initializing:
                    await asyncio.sleep(0.1)  # Wait, then keep polling.
                else:
                    raise
            else:
                return

    async def wait_until_ready(self, timeout_sec: float = _STARTUP_WAIT) -> None:
        """Wait until the server is ready to handle general requests.

        "Ready to handle general requests" means it's accepting HTTP connections
        and it's returning a "ready" status from its `/health` endpoint.

        If the `/health` endpoint returns a "still busy initializing" response, this
        will keep waiting. If it returns any other kind of error response, this
        will interpret it as a fatal initialization error and raise an exception.
        """
        await asyncio.wait_for(self._poll_for_ready(), timeout=timeout_sec)

    async def get_health(self) -> Response:
        """GET /health."""
        response = await self.httpx_client.get(url=f"{self.base_url}/health")
        response.raise_for_status()
        return response

    async def get_protocols(self) -> Response:
        """GET /protocols."""
        response = await self.httpx_client.get(url=f"{self.base_url}/protocols")
        response.raise_for_status()
        return response

    async def get_protocol(self, protocol_id: str) -> Response:
        """GET /protocols/{protocol_id}."""
        response = await self.httpx_client.get(
            url=f"{self.base_url}/protocols/{protocol_id}"
        )
        return response

    async def post_protocol(
        self, files: List[Union[Path, Tuple[str, bytes]]]
    ) -> Response:
        """POST /protocols.

        Params:
            files: The files to upload, representing the protocol, custom labware, etc.
                Each file file can be provided as a Path, in which case it's read
                from the filesystem, or as a (name, contents) tuple.
        """
        multipart_upload_name = "files"

        with contextlib.ExitStack() as file_exit_stack:
            opened_files: List[
                Union[BinaryIO, Tuple[str, bytes]],
            ] = []

            for file in files:
                if isinstance(file, Path):
                    opened_file = file_exit_stack.enter_context(file.open("rb"))
                    opened_files.append(opened_file)
                else:
                    opened_files.append(file)

            response = await self.httpx_client.post(
                url=f"{self.base_url}/protocols",
                files=[(multipart_upload_name, f) for f in opened_files],
            )

        response.raise_for_status()
        return response

    async def get_runs(self, length: Optional[int] = None) -> Response:
        """GET /runs."""
        response = await self.httpx_client.get(
            url=f"{self.base_url}/runs"
            if length is None
            else f"{self.base_url}/runs?pageLength={length}"
        )
        response.raise_for_status()
        return response

    async def post_run(self, req_body: Dict[str, object]) -> Response:
        """POST /runs."""
        response = await self.httpx_client.post(
            url=f"{self.base_url}/runs", json=req_body
        )
        response.raise_for_status()
        return response

    async def patch_run(self, run_id: str, req_body: Dict[str, object]) -> Response:
        """POST /runs."""
        response = await self.httpx_client.patch(
            url=f"{self.base_url}/runs/{run_id}",
            json=req_body,
        )
        response.raise_for_status()
        return response

    async def get_run(self, run_id: str) -> Response:
        """GET /runs/:run_id."""
        response = await self.httpx_client.get(url=f"{self.base_url}/runs/{run_id}")
        response.raise_for_status()
        return response

    async def post_run_command(
        self,
        run_id: str,
        req_body: Dict[str, object],
        params: Dict[str, Any],
    ) -> Response:
        """POST /runs/:run_id/commands."""
        response = await self.httpx_client.post(
            url=f"{self.base_url}/runs/{run_id}/commands",
            json=req_body,
            params=params,
        )
        response.raise_for_status()
        return response

    async def get_run_commands(
        self,
        run_id: str,
        cursor: Optional[int] = None,
        page_length: Optional[int] = None,
    ) -> Response:
        """GET /runs/:run_id/commands."""
        query_params = {}
        if cursor is not None:
            query_params["cursor"] = cursor
        if page_length is not None:
            query_params["pageLength"] = page_length

        response = await self.httpx_client.get(
            url=f"{self.base_url}/runs/{run_id}/commands", params=query_params
        )
        response.raise_for_status()
        return response

    async def get_run_command(self, run_id: str, command_id: str) -> Response:
        """GET /runs/:run_id/commands/:command_id."""
        response = await self.httpx_client.get(
            url=f"{self.base_url}/runs/{run_id}/commands/{command_id}",
        )
        response.raise_for_status()
        return response

    async def get_preserialized_commands(self, run_id: str) -> Response:
        """GET /runs/:run_id/commandsAsPreSerializedList."""
        response = await self.httpx_client.get(
            url=f"{self.base_url}/runs/{run_id}/commandsAsPreSerializedList",
        )
        response.raise_for_status()
        return response

    async def post_labware_offset(
        self,
        run_id: str,
        req_body: Dict[str, object],
    ) -> Response:
        """POST /runs/:run_id/labware_offsets."""
        response = await self.httpx_client.post(
            url=f"{self.base_url}/runs/{run_id}/labware_offsets",
            json=req_body,
        )
        response.raise_for_status()
        return response

    async def post_run_action(
        self,
        run_id: str,
        req_body: Dict[str, object],
    ) -> Response:
        """POST /runs/:run_id/commands."""
        response = await self.httpx_client.post(
            url=f"{self.base_url}/runs/{run_id}/actions",
            json=req_body,
        )
        response.raise_for_status()
        return response

    async def get_analyses(self, protocol_id: str) -> Response:
        """GET /protocols/{protocol_id}/analyses."""
        response = await self.httpx_client.get(
            url=f"{self.base_url}/protocols/{protocol_id}/analyses"
        )
        response.raise_for_status()
        return response

    async def get_analysis(self, protocol_id: str, analysis_id: str) -> Response:
        """GET /protocols/{protocol_id}/analyses/{analysis_id}."""
        response = await self.httpx_client.get(
            url=f"{self.base_url}/protocols/{protocol_id}/analyses/{analysis_id}"
        )
        response.raise_for_status()
        return response

    async def get_analysis_as_document(
        self, protocol_id: str, analysis_id: str
    ) -> Response:
        """GET /protocols/{protocol_id}/analyses/{analysis_id}/asDocument."""
        response = await self.httpx_client.get(
            url=f"{self.base_url}/protocols/{protocol_id}/analyses/{analysis_id}/asDocument"
        )
        response.raise_for_status()
        return response

    async def delete_run(self, run_id: str) -> Response:
        """DELETE /runs/{run_id}."""
        response = await self.httpx_client.delete(f"{self.base_url}/runs/{run_id}")
        response.raise_for_status()
        return response

    async def delete_protocol(self, protocol_id: str) -> Response:
        """DELETE /protocols/{protocol_id}."""
        response = await self.httpx_client.delete(
            f"{self.base_url}/protocols/{protocol_id}"
        )
        response.raise_for_status()
        return response

    async def post_setting_reset_options(
        self,
        req_body: Dict[str, bool],
    ) -> Response:
        """POST /settings/reset."""
        response = await self.httpx_client.post(
            url=f"{self.base_url}/settings/reset",
            json=req_body,
        )
        response.raise_for_status()
        return response

    async def get_sessions(self) -> Response:
        """GET /sessions."""
        response = await self.httpx_client.get(url=f"{self.base_url}/sessions")
        response.raise_for_status()
        return response

    async def delete_session(self, session_id: str) -> Response:
        """DELETE /sessions/{session_id}."""
        response = await self.httpx_client.delete(
            url=f"{self.base_url}/sessions/{session_id}"
        )
        response.raise_for_status()
        return response

    async def get_deck_configuration(self) -> Response:
        """PUT /deck_configuration."""
        response = await self.httpx_client.get(
            url=f"{self.base_url}/deck_configuration",
        )
        response.raise_for_status()
        return response

    async def put_deck_configuration(
        self,
        req_body: Dict[str, object],
    ) -> Response:
        """PUT /deck_configuration."""
        response = await self.httpx_client.put(
            url=f"{self.base_url}/deck_configuration",
            json=req_body,
        )
        response.raise_for_status()
        return response

    async def post_data_files(self, req_body: Dict[str, object]) -> Response:
        """POST /dataFiles"""
        response = await self.httpx_client.post(
            url=f"{self.base_url}/dataFiles",
            data=req_body,
        )
        response.raise_for_status()
        return response

    async def get_data_files(self) -> Response:
        """GET /dataFiles."""
        response = await self.httpx_client.get(url=f"{self.base_url}/dataFiles")
        response.raise_for_status()
        return response

    async def delete_data_file(self, file_id: str) -> Response:
        """DELETE /dataFiles/{file_id}."""
        response = await self.httpx_client.delete(
            f"{self.base_url}/dataFiles/{file_id}"
        )
        response.raise_for_status()
        return response

    async def get_data_files_download(self, data_file_id: str) -> Response:
        """GET /dataFiles/{data_file_id}/download"""
        response = await self.httpx_client.get(
            url=f"{self.base_url}/dataFiles/{data_file_id}/download",
        )
        response.raise_for_status()
        return response

    async def delete_all_client_data(self) -> Response:
        response = await self.httpx_client.delete(url=f"{self.base_url}/clientData")
        response.raise_for_status()
        return response

    async def delete_error_recovery_settings(self) -> Response:
        response = await self.httpx_client.delete(
            url=f"{self.base_url}/errorRecovery/settings"
        )
        response.raise_for_status()
        return response

    async def delete_all_labware_offsets(self) -> Response:
        response = await self.httpx_client.delete(url=f"{self.base_url}/labwareOffsets")
        response.raise_for_status()
        return response


async def poll_until_run_completes(
    robot_client: RobotClient, run_id: str, poll_interval: float = _RUN_POLL_INTERVAL
) -> Any:
    """Wait until a run completes.

    You probably want to wrap this in an `anyio.fail_after()` timeout in case something causes
    the run to hang forever.

    Returns:
        The completed run response. You can inspect its `status` to see whether it
        succeeded, failed, or was stopped.
    """
    completed_run_statuses = {"stopped", "failed", "succeeded"}
    while True:
        run = (await robot_client.get_run(run_id=run_id)).json()
        status = run["data"]["status"]
        if status in completed_run_statuses:
            return run
        else:
            # The run is still ongoing. Wait a beat, then poll again.
            await asyncio.sleep(poll_interval)


async def poll_until_all_analyses_complete(
    robot_client: RobotClient, poll_interval: float = _ANALYSIS_POLL_INTERVAL
) -> None:
    """Wait until all pending analyses have completed.

    You probably want to wrap this in an `anyio.fail_after()` timeout in case something causes
    an analysis to hang forever.
    """

    async def _all_analyses_are_complete() -> bool:
        protocols = (await robot_client.get_protocols()).json()
        for protocol in protocols["data"]:
            for analysis_summary in protocol["analysisSummaries"]:
                if analysis_summary["status"] != "completed":
                    return False
        return True

    while not await _all_analyses_are_complete():
        await asyncio.sleep(poll_interval)
