"""HTTP request and response models for /health endpoints."""
import typing
from pydantic import BaseModel, Field
from opentrons_shared_data.deck.types import RobotModel
from robot_server.service.json_api import BaseResponseBody


class HealthLinks(BaseModel):
    """Useful server links."""

    apiLog: str = Field(
        ...,
        description=(
            "The path to the API logs endpoint."
            " Deprecated: Use the `logs` field of the `GET /health` response"
            " or refer to the OpenAPI specification of the `/logs` endpoint, instead."
        ),
        examples=["/logs/api.log"],
        json_schema_extra={"deprecated": True},
    )
    serialLog: str = Field(
        ...,
        description=(
            "The path to the motor control serial communication logs endpoint."
            " Deprecated: Use the `logs` field of the `GET /health` response"
            " or refer to the OpenAPI specification of the `/logs` endpoint, instead."
        ),
        examples=["/logs/serial.log"],
        json_schema_extra={"deprecated": True},
    )
    serverLog: str = Field(
        ...,
        description=(
            "The path to the HTTP server logs endpoint."
            " Deprecated: Use the `logs` field of the `GET /health` response"
            " or refer to the OpenAPI specification of the `/logs` endpoint, instead."
        ),
        examples=["/logs/server.log"],
        json_schema_extra={"deprecated": True},
    )
    oddLog: typing.Optional[str] = Field(
        default=None,
        description=(
            "The path to the on-device display app logs endpoint"
            " (only present on the Opentrons Flex)."
            " Deprecated: Use the `logs` field of the `GET /health` response"
            " or refer to the OpenAPI specification of the `/logs` endpoint, instead."
        ),
        examples=["/logs/touchscreen.log"],
        json_schema_extra={"deprecated": True},
    )
    apiSpec: str = Field(
        ...,
        description="The path to the OpenAPI specification of the server",
        examples=["/openapi.json"],
    )
    systemTime: str = Field(
        ...,
        description="The path to the system time endpoints",
        examples=["/system/time"],
    )


class Health(BaseResponseBody):
    """Information about the server and system."""

    name: str = Field(
        ...,
        description="The robot's name. In most cases the same as its "
        "mDNS advertisement domain name, but this can get out "
        "of sync. Mostly useful for user-facing titles.",
        examples=["Otie"],
    )
    robot_model: RobotModel = Field(
        ...,
        description="Which model of Opentrons robot this is",
    )
    api_version: str = Field(
        ...,
        description="The API server's software version",
        examples=["3.15.2"],
    )
    fw_version: str = Field(
        ...,
        description="The motor controller's firmware version. Doesn't "
        "follow a pattern; suitable only for display or exact matching.",
        examples=["v2.15.0"],
    )
    board_revision: str = Field(
        ...,
        description="The hardware revision of the OT-2's central routing board.",
        examples=["2.1"],
    )
    logs: typing.List[str] = Field(
        ...,
        description="List of paths at which to find log endpoints",
        examples=[["/logs/serial.log", "/logs/api.log"]],
    )
    system_version: str = Field(
        ..., description="The robot's operating system version.", examples=["1.2.1"]
    )
    maximum_protocol_api_version: typing.List[int] = Field(
        ...,
        description="The system's maximum supported Protocol API version, "
        "in the format `[major_version, minor_version]`",
        min_length=2,
        max_length=2,
        examples=[[2, 8]],
    )
    minimum_protocol_api_version: typing.List[int] = Field(
        ...,
        description="The system's minimum supported Protocol API version, "
        "in the format `[major_version, minor_version]`",
        min_length=2,
        max_length=2,
        examples=[[2, 0]],
    )
    robot_serial: typing.Optional[str] = Field(
        default=None,
        description="The robot serial number. Should be used if present; if not present, use result of /server/update/health.",
        examples=["OT2CEP20190604A02"],
    )
    links: HealthLinks
