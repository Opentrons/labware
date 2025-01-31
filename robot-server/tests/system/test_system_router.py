"""Tests for the /system router."""
from typing import Iterator

import pytest
from mock import MagicMock, patch
from datetime import datetime, timezone
from starlette.testclient import TestClient
from pydantic import TypeAdapter

from robot_server.service.json_api import ResourceLink, ResourceLinks, ResourceLinkKey
from robot_server.system import errors, router

from tests.conftest import datetime_to_zulu_iso8601


@pytest.fixture
def mock_system_time() -> datetime:
    """Get a fake system time value."""
    return datetime(2020, 8, 14, 21, 44, 16, tzinfo=timezone.utc)


@pytest.fixture
def mock_set_system_time(mock_system_time: datetime) -> Iterator[MagicMock]:
    """Patch set_system_time in time_utils."""
    with patch.object(router, "set_system_time") as p:
        yield p


ResourceLinksAdapter: TypeAdapter[ResourceLinks] = TypeAdapter(ResourceLinks)


@pytest.fixture
def response_links() -> ResourceLinks:
    """Get expected /system/time resource links."""
    return {ResourceLinkKey.self.value: ResourceLink(href="/system/time")}


def test_raise_system_synchronized_error(
    api_client: TestClient,
    mock_system_time: datetime,
    mock_set_system_time: MagicMock,
) -> None:
    """It should raise a SystemTimeAlreadySynchronized from set_system_time."""
    mock_set_system_time.side_effect = errors.SystemTimeAlreadySynchronized(
        "Cannot set system time; already synchronized with NTP or RTC"
    )

    response = api_client.put(
        "/system/time",
        json={"data": {"id": "time", "systemTime": mock_system_time.isoformat()}},
    )
    assert response.json() == {
        "errors": [
            {
                "id": "UncategorizedError",
                "detail": "Cannot set system time; already synchronized with NTP "
                "or RTC",
                "title": "Action Forbidden",
                "errorCode": "4000",
            }
        ]
    }
    assert response.status_code == 403


def test_raise_system_exception(
    api_client: TestClient,
    mock_system_time: datetime,
    mock_set_system_time: MagicMock,
) -> None:
    """It should raise a SystemSetTimeException from set_system_time."""
    mock_set_system_time.side_effect = errors.SystemSetTimeException(
        "Something went wrong"
    )

    response = api_client.put(
        "/system/time",
        json={"data": {"id": "time", "systemTime": mock_system_time.isoformat()}},
    )
    assert response.json() == {
        "errors": [
            {
                "id": "UncategorizedError",
                "detail": "Something went wrong",
                "title": "Internal Server Error",
                "errorCode": "4000",
            }
        ]
    }
    assert response.status_code == 500


def test_set_system_time(
    api_client: TestClient,
    mock_system_time: datetime,
    mock_set_system_time: MagicMock,
    response_links: ResourceLinks,
) -> None:
    """It should return the correct response if the request succeeds."""
    mock_set_system_time.return_value = mock_system_time

    # Correct request
    response = api_client.put(
        "/system/time",
        json={
            "data": {
                "systemTime": mock_system_time.isoformat(),
                "id": "time",
            },
        },
    )
    assert response.json() == {
        "data": {
            "systemTime": datetime_to_zulu_iso8601(mock_system_time),
            "id": "time",
        },
        "links": ResourceLinksAdapter.dump_python(response_links),
    }
    assert response.status_code == 200
