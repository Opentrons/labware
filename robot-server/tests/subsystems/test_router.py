"""Tests for /subsystems routes."""
from datetime import datetime
from typing import Set, Dict, TYPE_CHECKING, cast
from fastapi import Response, Request
from starlette.datastructures import URL, MutableHeaders

import pytest
from decoy import Decoy

from robot_server.subsystems.models import (
    UpdateState,
    UpdateProgressData,
    SubSystem,
    UpdateProgressSummary,
    PresentSubsystem,
)
from robot_server.subsystems.firmware_update_manager import (
    UpdateProcessHandle,
    ProcessDetails,
    UpdateProgress,
    FirmwareUpdateManager,
    UpdateIdNotFound as UpdateIdNotFoundExc,
    UpdateIdExists as UpdateIdExistsExc,
    UpdateInProgress as UpdateInProgressExc,
    SubsystemNotFound as SubsystemNotFoundExc,
    NoOngoingUpdate as NoOngoingUpdateExc,
)

from robot_server.subsystems.router import (
    begin_subsystem_update,
    get_update_process,
    get_update_processes,
    get_subsystem_update,
    get_subsystem_updates,
    get_attached_subsystem,
    get_attached_subsystems,
)

from robot_server.errors.error_responses import ApiError

from opentrons.hardware_control.types import (
    SubSystem as HWSubSystem,
    SubSystemState,
    UpdateState as HWUpdateState,
)
from opentrons.hardware_control import ThreadManagedHardware

if TYPE_CHECKING:
    from opentrons.hardware_control.ot3api import OT3API


@pytest.fixture
def update_manager(decoy: Decoy) -> FirmwareUpdateManager:
    """Build an update manager decoy dependency."""
    return decoy.mock(cls=FirmwareUpdateManager)


@pytest.fixture()
def ot3_hardware_api(decoy: Decoy) -> "OT3API":
    """Build a hardware controller decoy dependency."""
    try:
        from opentrons.hardware_control.ot3api import OT3API
    except ImportError:
        pytest.skip("Cannot run on OT-2 (for now)")
    return decoy.mock(cls=OT3API)


@pytest.fixture()
def thread_manager(decoy: Decoy, ot3_hardware_api: "OT3API") -> ThreadManagedHardware:
    """Mock thread manager."""
    try:
        from opentrons.hardware_control.ot3api import OT3API
    except ImportError:
        pytest.skip("Cannot run on OT-2 (for now)")
    manager = decoy.mock(cls=ThreadManagedHardware)
    decoy.when(manager.wrapped()).then_return(ot3_hardware_api)
    decoy.when(manager.wraps_instance(OT3API)).then_return(True)
    return cast(ThreadManagedHardware, manager)


def _build_attached_subsystem(
    subsystem: HWSubSystem,
    ok: bool = True,
    needs_update: bool = False,
    updating: bool = False,
) -> SubSystemState:
    return SubSystemState(
        ok=ok,
        current_fw_version=10,
        next_fw_version=10,
        fw_update_needed=needs_update,
        current_fw_sha="somesha",
        pcba_revision="hello",
        update_state=HWUpdateState.updating if updating else None,
    )


def _build_attached_subsystems(
    subsystems: Set[HWSubSystem],
) -> Dict[HWSubSystem, SubSystemState]:
    return {subsystem: _build_attached_subsystem(subsystem) for subsystem in subsystems}


def _build_subsystem_data(
    subsystem: SubSystem, state: SubSystemState
) -> PresentSubsystem:
    return PresentSubsystem.model_construct(
        name=subsystem,
        ok=state.ok,
        current_fw_version=str(state.current_fw_version),
        next_fw_version=str(state.next_fw_version),
        fw_update_needed=state.fw_update_needed,
        revision=str(state.pcba_revision),
    )


@pytest.mark.parametrize(
    "subsystems",
    [
        {HWSubSystem.gantry_x, HWSubSystem.gantry_y, HWSubSystem.head},
        {HWSubSystem.gantry_x, HWSubSystem.pipette_left, HWSubSystem.gripper},
        {},
    ],
)
async def test_get_attached_subsystems(
    ot3_hardware_api: "OT3API",
    thread_manager: ThreadManagedHardware,
    subsystems: Set[HWSubSystem],
    decoy: Decoy,
) -> None:
    """It should return all subsystems the hardware says are present."""
    subsystem_state = _build_attached_subsystems(subsystems)
    decoy.when(ot3_hardware_api.attached_subsystems).then_return(subsystem_state)
    resp = await get_attached_subsystems(thread_manager)
    assert resp.status_code == 200
    responses = [
        _build_subsystem_data(SubSystem.from_hw(subsystem), state)
        for subsystem, state in subsystem_state.items()
    ]
    for data in resp.content.data:
        assert data in responses


@pytest.mark.parametrize(
    "subsystem",
    [
        SubSystem.gantry_x,
        SubSystem.pipette_left,
        SubSystem.motor_controller_board,
    ],
)
async def test_get_attached_subsystem(
    ot3_hardware_api: "OT3API",
    thread_manager: ThreadManagedHardware,
    subsystem: SubSystem,
    decoy: Decoy,
) -> None:
    """It should return data for present subsystems."""
    subsystems_dict = _build_attached_subsystems({subsystem.to_hw()})
    status = subsystems_dict[subsystem.to_hw()]
    decoy.when(ot3_hardware_api.attached_subsystems).then_return(subsystems_dict)
    response = await get_attached_subsystem(subsystem, thread_manager)
    assert response.status_code == 200
    assert response.content.data == PresentSubsystem(
        name=subsystem,
        ok=status.ok,
        current_fw_version=str(status.current_fw_version),
        next_fw_version=str(status.next_fw_version),
        fw_update_needed=status.fw_update_needed,
        revision=status.pcba_revision,
    )


async def test_get_attached_subsystem_handles_not_present_subsystem(
    ot3_hardware_api: "OT3API", thread_manager: ThreadManagedHardware, decoy: Decoy
) -> None:
    """It should return an error for a non-present subsystem."""
    decoy.when(ot3_hardware_api.attached_subsystems).then_return({})
    with pytest.raises(ApiError) as exc_info:
        await get_attached_subsystem(SubSystem.gantry_x, thread_manager)
    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "SubsystemNotPresent"


async def test_get_subsystem_updates_with_some(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should return data about ongoing subsystem updates."""
    x_process_details = ProcessDetails(
        created_at=datetime.now(),
        subsystem=SubSystem.gantry_x,
        update_id="mock-update-id-1",
    )
    y_process_details = ProcessDetails(
        created_at=datetime.now(),
        subsystem=SubSystem.gantry_y,
        update_id="mock-update-id-2",
    )
    head_process_details = ProcessDetails(
        created_at=datetime.now(),
        subsystem=SubSystem.head,
        update_id="mock-update-succeeded",
    )
    pipette_process_details = ProcessDetails(
        created_at=datetime.now(),
        subsystem=SubSystem.pipette_left,
        update_id="mock-update-failed",
    )
    x_state = UpdateState.updating
    y_state = UpdateState.queued
    head_state = UpdateState.done
    pipette_state = UpdateState.failed

    gantry_x_handler = decoy.mock(cls=UpdateProcessHandle)
    gantry_y_handler = decoy.mock(cls=UpdateProcessHandle)
    head_handler = decoy.mock(cls=UpdateProcessHandle)
    pipette_handler = decoy.mock(cls=UpdateProcessHandle)
    decoy.when(gantry_x_handler.process_details).then_return(x_process_details)
    decoy.when(gantry_y_handler.process_details).then_return(y_process_details)
    decoy.when(head_handler.process_details).then_return(head_process_details)
    decoy.when(pipette_handler.process_details).then_return(pipette_process_details)
    decoy.when(gantry_x_handler.cached_state).then_return(x_state)
    decoy.when(gantry_y_handler.cached_state).then_return(y_state)
    decoy.when(head_handler.cached_state).then_return(head_state)
    decoy.when(pipette_handler.cached_state).then_return(pipette_state)

    decoy.when(await update_manager.all_ongoing_processes()).then_return(
        [gantry_x_handler, gantry_y_handler, head_handler, pipette_handler]
    )

    response = await get_subsystem_updates(update_manager)
    assert response.content.data == [
        UpdateProgressSummary.model_construct(
            id=x_process_details.update_id,
            createdAt=x_process_details.created_at,
            subsystem=x_process_details.subsystem,
            updateStatus=x_state,
        ),
        UpdateProgressSummary.model_construct(
            id=y_process_details.update_id,
            createdAt=y_process_details.created_at,
            subsystem=y_process_details.subsystem,
            updateStatus=y_state,
        ),
        UpdateProgressSummary.model_construct(
            id=head_process_details.update_id,
            createdAt=head_process_details.created_at,
            subsystem=head_process_details.subsystem,
            updateStatus=head_state,
        ),
        UpdateProgressSummary.model_construct(
            id=pipette_process_details.update_id,
            createdAt=pipette_process_details.created_at,
            subsystem=pipette_process_details.subsystem,
            updateStatus=pipette_state,
        ),
    ]


async def test_get_subsystem_updates_with_none(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should return no data when there are no ongoing updates."""
    decoy.when(await update_manager.all_ongoing_processes()).then_return([])
    response = await get_subsystem_updates(update_manager)
    assert response.content.data == []


async def test_get_subsystem_update_succeeds(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should return data about an ongoing update."""
    subsystem = SubSystem.gantry_x
    handle = decoy.mock(cls=UpdateProcessHandle)
    details = ProcessDetails(
        created_at=datetime.now(),
        subsystem=subsystem,
        update_id="some-update-id",
    )
    progress = UpdateProgress(state=UpdateState.updating, progress=34, error=None)
    decoy.when(handle.process_details).then_return(details)
    decoy.when(await handle.get_progress()).then_return(progress)
    decoy.when(
        await update_manager.get_ongoing_update_process_handle_by_subsystem(subsystem)
    ).then_return(handle)
    response = await get_subsystem_update(subsystem, update_manager)
    assert response.content.data == UpdateProgressData.model_construct(
        id=details.update_id,
        createdAt=details.created_at,
        subsystem=details.subsystem,
        updateStatus=progress.state,
        updateProgress=progress.progress,
        updateError=None,
    )


async def test_get_subsystem_update_not_present(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should return an error when the subsystem is not being updated."""
    decoy.when(
        await update_manager.get_ongoing_update_process_handle_by_subsystem(
            SubSystem.gantry_x
        )
    ).then_raise(NoOngoingUpdateExc())
    with pytest.raises(ApiError) as exc_info:
        await get_subsystem_update(SubSystem.gantry_x, update_manager)
    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "NoOngoingUpdate"


async def test_get_subsystem_update_error(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should return details of the failure when an update fails."""
    subsystem = SubSystem.gantry_x
    handle = decoy.mock(cls=UpdateProcessHandle)
    details = ProcessDetails(
        created_at=datetime.now(),
        subsystem=subsystem,
        update_id="some-update-id",
    )
    progress = UpdateProgress(
        state=UpdateState.failed, progress=27, error=RuntimeError("oh no!")
    )
    decoy.when(handle.process_details).then_return(details)
    decoy.when(await handle.get_progress()).then_return(progress)
    decoy.when(
        await update_manager.get_ongoing_update_process_handle_by_subsystem(subsystem)
    ).then_return(handle)
    response = await get_subsystem_update(subsystem, update_manager)
    assert response.content.data == UpdateProgressData.model_construct(
        id=details.update_id,
        createdAt=details.created_at,
        subsystem=details.subsystem,
        updateProgress=progress.progress,
        updateStatus=progress.state,
        updateError="oh no!",
    )


async def test_get_all_updates_some(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should return all updates."""
    x_process_details = ProcessDetails(
        created_at=datetime.now(),
        subsystem=SubSystem.gantry_x,
        update_id="mock-update-id-1",
    )
    y_process_details = ProcessDetails(
        created_at=datetime.now(),
        subsystem=SubSystem.gantry_y,
        update_id="mock-update-id-2",
    )
    head_process_details = ProcessDetails(
        created_at=datetime.now(),
        subsystem=SubSystem.head,
        update_id="mock-update-succeeded",
    )
    pipette_process_details = ProcessDetails(
        created_at=datetime.now(),
        subsystem=SubSystem.pipette_left,
        update_id="mock-update-failed",
    )
    x_state = UpdateState.updating
    y_state = UpdateState.queued
    head_state = UpdateState.done
    pipette_state = UpdateState.failed

    gantry_x_handler = decoy.mock(cls=UpdateProcessHandle)
    gantry_y_handler = decoy.mock(cls=UpdateProcessHandle)
    head_handler = decoy.mock(cls=UpdateProcessHandle)
    pipette_handler = decoy.mock(cls=UpdateProcessHandle)
    decoy.when(gantry_x_handler.process_details).then_return(x_process_details)
    decoy.when(gantry_y_handler.process_details).then_return(y_process_details)
    decoy.when(head_handler.process_details).then_return(head_process_details)
    decoy.when(pipette_handler.process_details).then_return(pipette_process_details)
    decoy.when(gantry_x_handler.cached_state).then_return(x_state)
    decoy.when(gantry_y_handler.cached_state).then_return(y_state)
    decoy.when(head_handler.cached_state).then_return(head_state)
    decoy.when(pipette_handler.cached_state).then_return(pipette_state)

    decoy.when(update_manager.all_update_processes()).then_return(
        [gantry_x_handler, gantry_y_handler, head_handler, pipette_handler]
    )
    response = await get_update_processes(update_manager)
    assert response.content.data == [
        UpdateProgressSummary.model_construct(
            id=x_process_details.update_id,
            createdAt=x_process_details.created_at,
            subsystem=x_process_details.subsystem,
            updateStatus=x_state,
        ),
        UpdateProgressSummary.model_construct(
            id=y_process_details.update_id,
            createdAt=y_process_details.created_at,
            subsystem=y_process_details.subsystem,
            updateStatus=y_state,
        ),
        UpdateProgressSummary.model_construct(
            id=head_process_details.update_id,
            createdAt=head_process_details.created_at,
            subsystem=head_process_details.subsystem,
            updateStatus=head_state,
        ),
        UpdateProgressSummary.model_construct(
            id=pipette_process_details.update_id,
            createdAt=pipette_process_details.created_at,
            subsystem=pipette_process_details.subsystem,
            updateStatus=pipette_state,
        ),
    ]


async def test_get_all_updates_none(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should return nothing when there are no updates."""
    decoy.when(update_manager.all_update_processes()).then_return([])
    response = await get_update_processes(update_manager)
    assert response.content.data == []


async def test_get_update_process(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should return full details of a specified update."""
    mock_id = "some-fake-id"
    x_process_details = ProcessDetails(
        created_at=datetime.now(),
        subsystem=SubSystem.gantry_x,
        update_id=mock_id,
    )
    x_progress = UpdateProgress(state=UpdateState.updating, progress=25, error=None)
    gantry_x_handler = decoy.mock(cls=UpdateProcessHandle)
    decoy.when(gantry_x_handler.process_details).then_return(x_process_details)
    decoy.when(await gantry_x_handler.get_progress()).then_return(x_progress)
    decoy.when(update_manager.get_update_process_handle_by_id(mock_id)).then_return(
        gantry_x_handler
    )
    response = await get_update_process(mock_id, update_manager)
    assert response.content.data == UpdateProgressData(
        id=mock_id,
        createdAt=x_process_details.created_at,
        subsystem=x_process_details.subsystem,
        updateStatus=x_progress.state,
        updateProgress=x_progress.progress,
        updateError=None,
    )


async def test_get_update_process_error(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should return the details of a failed update."""
    mock_id = "some-fake-id"
    x_process_details = ProcessDetails(
        created_at=datetime.now(),
        subsystem=SubSystem.gantry_x,
        update_id=mock_id,
    )
    x_progress = UpdateProgress(
        state=UpdateState.failed, progress=27, error=RuntimeError("oh no!")
    )
    gantry_x_handler = decoy.mock(cls=UpdateProcessHandle)
    decoy.when(gantry_x_handler.process_details).then_return(x_process_details)
    decoy.when(await gantry_x_handler.get_progress()).then_return(x_progress)
    decoy.when(update_manager.get_update_process_handle_by_id(mock_id)).then_return(
        gantry_x_handler
    )
    response = await get_update_process(mock_id, update_manager)
    assert response.content.data == UpdateProgressData(
        id=mock_id,
        createdAt=x_process_details.created_at,
        subsystem=x_process_details.subsystem,
        updateStatus=x_progress.state,
        updateProgress=x_progress.progress,
        updateError="oh no!",
    )


async def test_get_update_process_rejects_bad_id(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should return an error if an update id does not exist."""
    mock_id = "some-fake-id"
    decoy.when(update_manager.get_update_process_handle_by_id(mock_id)).then_raise(
        UpdateIdNotFoundExc()
    )
    with pytest.raises(ApiError) as exc_info:
        await get_update_process(mock_id, update_manager)
    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "IDNotFound"


async def test_begin_update(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should begin an update given proper data."""
    request = decoy.mock(cls=Request)
    response = decoy.mock(cls=Response)
    subsystem = SubSystem.gantry_x
    url = URL("http://127.0.0.1:31950/subsystems/updates")
    decoy.when(request.url).then_return(url)
    headers = MutableHeaders()
    decoy.when(response.headers).then_return(headers)

    update_id = "some-id"
    created_at = datetime.now()
    details = ProcessDetails(
        created_at=created_at, subsystem=subsystem, update_id=update_id
    )
    progress = UpdateProgress(state=UpdateState.queued, progress=0, error=None)
    mock_handle = decoy.mock(cls=UpdateProcessHandle)
    decoy.when(await mock_handle.get_progress()).then_return(progress)
    decoy.when(mock_handle.process_details).then_return(details)
    decoy.when(
        await update_manager.start_update_process(update_id, subsystem, created_at)
    ).then_return(mock_handle)

    response_data = await begin_subsystem_update(
        subsystem, response, request, update_manager, update_id, created_at
    )
    assert (
        headers["Location"]
        == f"http://127.0.0.1:31950/subsystems/updates/current/{subsystem.value}"
    )
    assert response_data.content.data == UpdateProgressData.model_construct(
        id=update_id,
        createdAt=created_at,
        subsystem=subsystem,
        updateStatus=progress.state,
        updateProgress=progress.progress,
        updateError=None,
    )


async def test_begin_update_subsystem_not_found(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should return an error if a specified subsystem is not present."""
    request = decoy.mock(cls=Request)
    response = decoy.mock(cls=Response)
    subsystem = SubSystem.gantry_x

    update_id = "some-id"
    created_at = datetime.now()
    decoy.when(
        await update_manager.start_update_process(update_id, subsystem, created_at)
    ).then_raise(SubsystemNotFoundExc(subsystem))
    with pytest.raises(ApiError) as exc_info:
        await begin_subsystem_update(
            subsystem, response, request, update_manager, update_id, created_at
        )
    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "SubsystemNotPresent"


async def test_begin_update_update_in_progress(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should return a redirect if a subsystem is already being updated."""
    request = decoy.mock(cls=Request)
    response = decoy.mock(cls=Response)
    url = URL("http://127.0.0.1:31950/subsystems/updates")
    subsystem = SubSystem.gantry_x
    headers = MutableHeaders()
    decoy.when(request.url).then_return(url)
    decoy.when(response.headers).then_return(headers)

    update_id = "some-id"
    created_at = datetime.now()
    decoy.when(
        await update_manager.start_update_process(update_id, subsystem, created_at)
    ).then_raise(UpdateInProgressExc(subsystem))
    with pytest.raises(ApiError) as exc_info:
        await begin_subsystem_update(
            subsystem, response, request, update_manager, update_id, created_at
        )
    assert exc_info.value.status_code == 303
    assert exc_info.value.content["errors"][0]["id"] == "UpdateInProgress"
    assert (
        headers["Location"]
        == f"http://127.0.0.1:31950/subsystems/updates/current/{subsystem.name}"
    )


async def test_begin_update_id_exists(
    update_manager: FirmwareUpdateManager, decoy: Decoy
) -> None:
    """It should return an error if an update id is duplicated."""
    response = decoy.mock(cls=Response)
    request = decoy.mock(cls=Request)
    subsystem = SubSystem.gantry_x

    update_id = "some-id"
    created_at = datetime.now()
    decoy.when(
        await update_manager.start_update_process(update_id, subsystem, created_at)
    ).then_raise(UpdateIdExistsExc())
    with pytest.raises(ApiError) as exc_info:
        await begin_subsystem_update(
            subsystem, response, request, update_manager, update_id, created_at
        )
    assert exc_info.value.status_code == 500
    assert exc_info.value.content["errors"][0]["id"] == "UpdateInProgress"
