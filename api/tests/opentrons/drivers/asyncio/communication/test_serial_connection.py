from typing import Type, Union, AsyncGenerator
import pytest
from _pytest.fixtures import SubRequest
from mock import AsyncMock, call
import mock

from opentrons.drivers.asyncio.communication.async_serial import AsyncSerial
from opentrons.drivers.asyncio.communication.serial_connection import (
    SerialConnection,
    AsyncResponseSerialConnection,
)
from opentrons.drivers.asyncio.communication import (
    NoResponse,
    AlarmResponse,
    ErrorResponse,
    UnhandledGcode,
)


@pytest.fixture
def mock_serial_port() -> AsyncMock:
    return AsyncMock(spec=AsyncSerial)


@pytest.fixture
def ack() -> str:
    return "ack"


SerialKind = Union[AsyncResponseSerialConnection, SerialConnection]


# Async because SerialConnection.__init__() needs an event loop,
# so this fixture needs to run in an event loop.
@pytest.fixture(
    params=[AsyncResponseSerialConnection, SerialConnection],  # type: ignore[return]
)
async def subject(
    request: SubRequest, mock_serial_port: AsyncMock, ack: str
) -> SerialKind:
    """Create the test subject."""
    serial_class = request.param
    serial_class.RETRY_WAIT_TIME = 0
    if serial_class == AsyncResponseSerialConnection:
        return serial_class(  # type: ignore[no-any-return]
            serial=mock_serial_port,
            ack=ack,
            name="name",
            port="port",
            retry_wait_time_seconds=0,
            error_keyword="err",
            alarm_keyword="alarm",
            async_error_ack="async",
        )
    elif serial_class == SerialConnection:
        return serial_class(  # type: ignore[no-any-return]
            serial=mock_serial_port,
            ack=ack,
            name="name",
            port="port",
            retry_wait_time_seconds=0,
            error_keyword="error",
            alarm_keyword="alarm",
        )


@pytest.fixture
async def async_subject(
    mock_serial_port: AsyncMock, ack: str
) -> AsyncResponseSerialConnection:
    """Create the test async subject."""
    AsyncResponseSerialConnection.RETRY_WAIT_TIME = 0  # type: ignore[attr-defined]
    return AsyncResponseSerialConnection(
        serial=mock_serial_port,
        ack=ack,
        name="name",
        port="port",
        retry_wait_time_seconds=0,
        error_keyword="err",
        alarm_keyword="alarm",
        async_error_ack="async",
    )


@pytest.fixture
async def subject_raise_on_error_patched(
    async_subject: AsyncResponseSerialConnection,
) -> AsyncGenerator[AsyncResponseSerialConnection, None]:
    raise_on_error_mock = mock.MagicMock()
    with mock.patch.object(async_subject, "raise_on_error", raise_on_error_mock):
        yield async_subject


async def test_send_command(
    mock_serial_port: AsyncMock, subject: SerialKind, ack: str
) -> None:
    """It should send a command."""
    serial_response = "response data " + ack
    mock_serial_port.read_until.return_value = serial_response.encode()

    await subject.send_data(data="send data")

    mock_serial_port.timeout_override.assert_called_once_with("timeout", None)
    mock_serial_port.write.assert_called_once_with(data=b"send data")
    mock_serial_port.read_until.assert_called_once_with(match=ack.encode())


async def test_send_command_with_retry(
    mock_serial_port: AsyncMock, subject: SerialKind, ack: str
) -> None:
    """It should retry sending after a read failure."""
    serial_response = "response data " + ack
    mock_serial_port.read_until.side_effect = (b"", serial_response.encode())

    await subject.send_data(data="send data", retries=1)

    mock_serial_port.timeout_override.assert_called_once_with("timeout", None)
    mock_serial_port.write.assert_has_calls(
        calls=[call(data=b"send data"), call(data=b"send data")]
    )
    mock_serial_port.read_until.assert_has_calls(
        calls=[
            call(match=ack.encode()),
            call(match=ack.encode()),
        ]
    )


async def test_send_command_with_retry_exhausted(
    mock_serial_port: AsyncMock, subject: SerialKind
) -> None:
    """It should raise after retries exhausted."""
    mock_serial_port.read_until.side_effect = (b"", b"", b"")

    with pytest.raises(NoResponse):
        await subject.send_data(data="send data", retries=2)


async def test_send_command_response(
    mock_serial_port: AsyncMock, subject: SerialKind, ack: str
) -> None:
    """It should return response without the ack and stripped."""
    response_data = "response data"
    serial_response = f" {response_data}  {ack}"
    mock_serial_port.read_until.return_value = serial_response.encode()

    response = await subject.send_data(data="send data")

    assert response == response_data


@pytest.mark.parametrize(
    argnames=["response", "exception_type", "async_only"],
    argvalues=[
        ["error", ErrorResponse, False],
        ["Error", ErrorResponse, False],
        ["Error: was found.", ErrorResponse, False],
        ["alarm", AlarmResponse, False],
        ["ALARM", AlarmResponse, False],
        ["This is an Alarm", AlarmResponse, False],
        ["error:Alarm lock", AlarmResponse, False],
        ["alarm:error", AlarmResponse, False],
        ["ALARM: Hard limit -X", AlarmResponse, False],
        ["ERR003:unhandled gcode OK ", UnhandledGcode, True],
    ],
)
def test_raise_on_error(
    subject: SerialKind,
    response: str,
    exception_type: Type[Exception],
    async_only: bool,
) -> None:
    """It should raise an exception on error/alarm responses."""
    if isinstance(subject, SerialConnection) and async_only:
        pytest.skip()
    with pytest.raises(expected_exception=exception_type, match=response):
        subject.raise_on_error(response, "fake request")


async def test_on_retry(mock_serial_port: AsyncMock, subject: SerialKind) -> None:
    """It should try to re-open connection."""
    await subject.on_retry()

    mock_serial_port.close.assert_called_once()
    mock_serial_port.open.assert_called_once()


async def test_send_data_with_async_error_before(
    mock_serial_port: AsyncMock,
    subject_raise_on_error_patched: AsyncResponseSerialConnection,
    ack: str,
) -> None:
    """It should return response without the ack and stripped. It should also handle the async error."""
    error_response = "async ERR106:main motor:speedsensor failed"
    serial_error_response = f" {error_response}  {ack}"
    encoded_error_response = serial_error_response.encode()
    successful_response = "G28"
    data = "G28"
    serial_successful_response = f" {successful_response}  {ack}"
    encoded_successful_response = serial_successful_response.encode()
    mock_serial_port.read_until.side_effect = [
        encoded_error_response,
        encoded_successful_response,
    ]

    response = await subject_raise_on_error_patched._send_data(data=data)

    assert response == successful_response
    mock_serial_port.read_until.assert_has_calls(
        calls=[
            call(match=ack.encode()),
            call(match=ack.encode()),
        ]
    )
    subject_raise_on_error_patched.raise_on_error.assert_has_calls(  # type: ignore[attr-defined]
        calls=[
            call(response=error_response, request=data),
            call(response=successful_response, request=data),
        ]
    )


async def test_send_data_with_async_error_after(
    mock_serial_port: AsyncMock,
    subject_raise_on_error_patched: AsyncResponseSerialConnection,
    ack: str,
) -> None:
    """It should return response without the ack and stripped. It should not handle the async error."""
    error_response = "async ERR106:main motor:speedsensor failed"
    serial_error_response = f" {error_response}  {ack}"
    encoded_error_response = serial_error_response.encode()
    successful_response = "G28"
    data = "G28"
    serial_successful_response = f" {successful_response}  {ack}"
    encoded_successful_response = serial_successful_response.encode()
    mock_serial_port.read_until.side_effect = [
        encoded_successful_response,
        encoded_error_response,
    ]

    response = await subject_raise_on_error_patched._send_data(data=data)

    assert response == successful_response
    mock_serial_port.read_until.assert_has_calls(
        calls=[
            call(match=ack.encode()),
        ]
    )
    subject_raise_on_error_patched.raise_on_error.assert_has_calls(  # type: ignore[attr-defined]
        calls=[
            call(response=successful_response, request=data),
        ]
    )
