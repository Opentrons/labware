from fastapi import APIRouter, Query, Response
from typing import Annotated, Dict

from opentrons.system import log_control

from robot_server.service.legacy.models.logs import LogIdentifier, LogFormat

router = APIRouter()

IDENTIFIER_TO_SYSLOG_ID: Dict[LogIdentifier, str] = {
    LogIdentifier.api: "opentrons-api",
    LogIdentifier.serial: log_control.SERIAL_SPECIAL,
    LogIdentifier.server: "uvicorn",
    LogIdentifier.api_server: "opentrons-robot-server",
    LogIdentifier.update_server: "opentrons-update-server",
    LogIdentifier.touchscreen: "opentrons-robot-app",
    LogIdentifier.can: "opentrons-api-serial-can",
}


@router.get(
    path="/logs/{log_identifier}",
    summary="Get troubleshooting logs",
    description=(
        "Get the robot's troubleshooting logs."
        "\n\n"
        "If you want the list of steps executed in a protocol,"
        ' like "aspirated 5 µL from well A1...", you probably want the'
        " *protocol analysis commands* (`GET /protocols/{id}/analyses/{id}`)"
        " or *run commands* (`GET /runs/{id}/commands`) instead."
    ),
)
async def get_logs(
    log_identifier: LogIdentifier,
    response: Response,
    format: Annotated[LogFormat, Query(title="Log format type")] = LogFormat.text,
    records: Annotated[
        int,
        Query(
            title="Number of records to retrieve",
            gt=0,
            le=log_control.MAX_RECORDS,
        ),
    ] = log_control.DEFAULT_RECORDS,
) -> Response:
    syslog_id = IDENTIFIER_TO_SYSLOG_ID[log_identifier]
    modes = {
        LogFormat.json: ("json", "application/json"),
        LogFormat.text: ("short-precise", "text/plain"),
    }
    format_type, media_type = modes[format]
    output = await log_control.get_records_dumb(syslog_id, records, format_type)
    return Response(
        content=output.decode("utf-8"),
        media_type=media_type,
        headers=dict(response.headers),
    )
