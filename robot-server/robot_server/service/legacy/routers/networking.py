import logging
import os
import re
import subprocess
from typing import Annotated, Optional

from starlette import status
from starlette.responses import JSONResponse
from fastapi import APIRouter, HTTPException, File, Path, UploadFile, Query

from opentrons_shared_data.errors import ErrorCodes
from opentrons.system import nmcli, wifi
from robot_server.errors.error_responses import LegacyErrorResponse
from robot_server.service.legacy.models import V1BasicResponse
from robot_server.service.legacy.models.networking import (
    NetworkingStatus,
    WifiNetworks,
    WifiNetwork,
    WifiConfiguration,
    WifiConfigurationResponse,
    WifiKeyFiles,
    WifiKeyFile,
    EapOptions,
    EapVariant,
    EapConfigOption,
    EapConfigOptionType,
    WifiNetworkFull,
    AddWifiKeyFileResponse,
    ConnectivityStatus,
)

log = logging.getLogger(__name__)


router = APIRouter()


@router.get(
    "/networking/status",
    summary="Query the current network connectivity state",
    description="Gets information about the robot's network interfaces "
    "including their connectivity, their "
    "addresses, and their networking info",
    response_model=NetworkingStatus,
)
async def get_networking_status() -> NetworkingStatus:
    try:
        connectivity = await nmcli.is_connected()

        async def _permissive_get_iface(
            i: nmcli.NETWORK_IFACES,
        ) -> dict[str, dict[str, str | None]]:
            try:
                return {i.value: await nmcli.iface_info(i)}
            except ValueError:
                log.warning(f"Could not get state of iface {i.value}")
                return {}

        interfaces: dict[str, dict[str, str | None]] = {}
        for interface in nmcli.NETWORK_IFACES:
            this_iface = await _permissive_get_iface(interface)
            interfaces.update(this_iface)
        log.debug(f"Connectivity: {connectivity}")
        log.debug(f"Interfaces: {interfaces}")
        return NetworkingStatus(
            status=ConnectivityStatus(connectivity),
            interfaces=interfaces,  # type: ignore[arg-type]
        )
    except (subprocess.CalledProcessError, FileNotFoundError, ValueError) as e:
        log.exception("Failed calling nmcli")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(e))


@router.get(
    "/wifi/list",
    summary="Scan for visible Wi-Fi networks",
    description="Returns the list of the visible wifi networks "
    "along with some data about their security and strength.",
    response_model=WifiNetworks,
)
async def get_wifi_networks(
    rescan: Annotated[
        Optional[bool],
        Query(
            description=(
                "If `true`, forces a rescan for beaconing Wi-Fi networks. "
                "This is an expensive operation that can take ~10 seconds, "
                'so only do it based on user needs like clicking a "scan network" '
                "button, not just to poll. "
                "If `false`, returns the cached Wi-Fi networks, "
                "letting the system decide when to do a rescan."
            ),
        ),
    ] = False,
) -> WifiNetworks:
    networks = await nmcli.available_ssids(rescan)
    return WifiNetworks(list=[WifiNetworkFull(**n) for n in networks])


def _massage_nmcli_error(error_string: str) -> str:
    """Raises a better-formatted error message from an nmcli error string."""
    if re.search("password.*802-11-wireless-security\\.psk.*not given", error_string):
        return "Could not connect to network. Please double-check network credentials."
    return error_string


@router.post(
    path="/wifi/configure",
    summary="Configure the robot's Wi-Fi",
    description=(
        "Configures the wireless network interface to " "connect to a network"
    ),
    status_code=status.HTTP_201_CREATED,
    response_model=WifiConfigurationResponse,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": LegacyErrorResponse},
        status.HTTP_401_UNAUTHORIZED: {"model": LegacyErrorResponse},
    },
)
async def post_wifi_configure(
    configuration: WifiConfiguration,
) -> WifiConfigurationResponse:
    try:
        psk = configuration.psk.get_secret_value() if configuration.psk else None
        ok, message = await nmcli.configure(
            ssid=configuration.ssid,
            securityType=nmcli.SECURITY_TYPES(configuration.securityType),
            eapConfig=configuration.eapConfig,
            hidden=configuration.hidden is True,
            psk=psk,
        )
        log.debug(f"Wifi configure result: {message}")
    except (ValueError, TypeError) as e:
        # Indicates an unexpected kwarg; check is done here to avoid keeping
        # the _check_configure_args signature up to date with nmcli.configure
        raise LegacyErrorResponse.from_exc(e).as_error(status.HTTP_400_BAD_REQUEST)

    if not ok:
        raise LegacyErrorResponse(
            message=_massage_nmcli_error(message),
            errorCode=ErrorCodes.GENERAL_ERROR.value.code,
        ).as_error(status.HTTP_401_UNAUTHORIZED)

    return WifiConfigurationResponse(message=message, ssid=configuration.ssid)


@router.get(
    "/wifi/keys",
    summary="Get Wi-Fi keys",
    description="Get a list of key files known to the system",
    response_model=WifiKeyFiles,
    response_model_by_alias=True,
)
async def get_wifi_keys():
    keys = [
        WifiKeyFile(
            uri=f"/wifi/keys/{key.directory}",
            id=key.directory,
            name=os.path.basename(key.file),
        )
        for key in wifi.list_keys()
    ]
    # Why not create a WifiKeyFiles? Because validation fails when there's a
    # pydantic model with attribute named keys. Deep in the guts of pydantic
    # there's a call to `dict(model)` which raises an exception because `keys`
    # is not callable, like the `keys` member of dict.
    # A problem for another time.
    return {"keys": keys}


@router.post(
    "/wifi/keys",
    summary="Add a Wi-Fi key",
    description="Send a new key file to the robot",
    responses={
        status.HTTP_200_OK: {"model": AddWifiKeyFileResponse},
        status.HTTP_400_BAD_REQUEST: {"model": LegacyErrorResponse},
    },
    response_model=AddWifiKeyFileResponse,
    status_code=status.HTTP_201_CREATED,
    response_model_exclude_unset=True,
)
async def post_wifi_key(key: UploadFile = File(...)):
    key_name = key.filename
    if not key_name:
        raise LegacyErrorResponse(
            message="No name for key", errorCode=ErrorCodes.GENERAL_ERROR.value.code
        ).as_error(status.HTTP_400_BAD_REQUEST)

    add_key_result = wifi.add_key(key_name, key.file.read())

    response = AddWifiKeyFileResponse(
        uri=f"/wifi/keys/{add_key_result.key.directory}",
        id=add_key_result.key.directory,
        name=os.path.basename(add_key_result.key.file),
    )
    if add_key_result.created:
        return response
    else:
        # We return a JSONResponse because we want the 200 status code.
        response.message = "Key file already present"
        return JSONResponse(content=response.model_dump())


@router.delete(
    path="/wifi/keys/{key_uuid}",
    summary="Delete a Wi-Fi key",
    description="Delete a key file from the robot",
    response_model=V1BasicResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": LegacyErrorResponse},
    },
)
async def delete_wifi_key(
    key_uuid: Annotated[
        str,
        Path(
            ...,
            description="The ID of key to delete, as determined by a previous"
            " call to GET /wifi/keys",
        ),
    ],
) -> V1BasicResponse:
    """Delete wifi key handler"""
    deleted_file = wifi.remove_key(key_uuid)
    if not deleted_file:
        raise LegacyErrorResponse(
            message=f"No such key file {key_uuid}",
            errorCode=ErrorCodes.GENERAL_ERROR.value.code,
        ).as_error(status.HTTP_404_NOT_FOUND)
    return V1BasicResponse(message=f"Key file {deleted_file} deleted")


@router.get(
    "/wifi/eap-options",
    summary="Get EAP options",
    description="Get the supported EAP variants and their " "configuration parameters",
    response_model=EapOptions,
)
async def get_eap_options() -> EapOptions:
    options = [
        EapVariant(
            name=m.qualified_name(),
            displayName=m.display_name(),
            options=[
                EapConfigOption(
                    # TODO(mc, 2020-09-17): dict.get returns Optional but
                    # EapConfigOption parameters are required
                    name=o.get("name"),  # type: ignore[arg-type]
                    displayName=o.get("displayName"),  # type: ignore[arg-type]
                    required=o.get("required"),  # type: ignore[arg-type]
                    type=EapConfigOptionType(o.get("type")),
                )
                for o in m.args()
            ],
        )
        for m in nmcli.EAP_TYPES
    ]
    result = EapOptions(options=options)
    return result


@router.post(
    "/wifi/disconnect",
    summary="Disconnect the robot from Wi-Fi",
    description="Deactivates the Wi-Fi connection and removes it "
    "from known connections",
    response_model=V1BasicResponse,
    responses={status.HTTP_200_OK: {"model": V1BasicResponse}},
    status_code=status.HTTP_207_MULTI_STATUS,
)
async def post_wifi_disconnect(wifi_ssid: WifiNetwork):
    ok, message = await nmcli.wifi_disconnect(wifi_ssid.ssid)

    result = V1BasicResponse(message=message)
    if ok:
        # TODO have nmcli interpret error messages rather than exposing them
        #  all the way up here.
        stat = (
            status.HTTP_200_OK
            if "successfully deleted" in message
            else status.HTTP_207_MULTI_STATUS
        )
    else:
        stat = status.HTTP_500_INTERNAL_SERVER_ERROR
    return JSONResponse(status_code=stat, content=result.model_dump())
