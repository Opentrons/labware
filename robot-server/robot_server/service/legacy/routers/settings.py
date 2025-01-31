import aiohttp
import logging
from dataclasses import asdict
from typing import cast, Annotated, Any, Dict, List, Optional, Union
from starlette import status
from fastapi import APIRouter, Depends

from opentrons_shared_data.errors import ErrorCodes
from opentrons.hardware_control import (
    HardwareControlAPI,
    dev_types as hardware_dev_types,
    API,
)
from opentrons.hardware_control.types import HardwareFeatureFlags
from opentrons_shared_data.pipette import (
    mutable_configurations,
    types as pip_types,
    pipette_load_name_conversions as pip_names,
)
from opentrons.config import (
    reset as reset_util,
    robot_configs,
    advanced_settings,
    feature_flags as ff,
    get_opentrons_path,
)
from robot_server.deck_configuration.fastapi_dependencies import (
    get_deck_configuration_store_failsafe,
)
from robot_server.deck_configuration.store import DeckConfigurationStore

from robot_server.errors.error_responses import LegacyErrorResponse
from robot_server.hardware import (
    get_hardware,
    get_robot_type_enum,
    get_ot2_hardware,
)
from robot_server.service.legacy import reset_odd
from robot_server.service.legacy.models import V1BasicResponse
from robot_server.service.legacy.models.settings import (
    AdvancedSettingsResponse,
    LogLevel,
    FactoryResetOptions,
    PipetteSettings,
    PipetteSettingsUpdate,
    RobotConfigs,
    MultiPipetteSettings,
    PipetteSettingsInfo,
    PipetteSettingsFields,
    FactoryResetOption,
    AdvancedSettingRequest,
    Links,
    AdvancedSetting,
)
from robot_server.persistence.fastapi_dependencies import (
    get_persistence_resetter,
)
from robot_server.persistence.persistence_directory import PersistenceResetter
from opentrons_shared_data.robot.types import RobotTypeEnum

log = logging.getLogger(__name__)

router = APIRouter()


# TODO: (ba, 2024-04-11): We should have a proper IPC mechanism to talk between
# the servers instead of one off endpoint calls like these.
async def _set_oem_mode_request(enable: bool) -> int:
    """PUT request to set the OEM Mode for the system server."""
    async with aiohttp.ClientSession() as session:
        async with session.put(
            "http://127.0.0.1:31950/system/oem_mode/enable", json={"enable": enable}
        ) as resp:
            return resp.status


@router.post(
    path="/settings",
    summary="Change a setting",
    description="Change an advanced setting (feature flag)",
    response_model=AdvancedSettingsResponse,
    response_model_exclude_unset=True,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": LegacyErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": LegacyErrorResponse},
    },
)
async def post_settings(
    update: AdvancedSettingRequest,
    hardware: Annotated[HardwareControlAPI, Depends(get_hardware)],
    robot_type: Annotated[RobotTypeEnum, Depends(get_robot_type_enum)],
) -> AdvancedSettingsResponse:
    """Update advanced setting (feature flag)"""
    try:
        # send request to system server if this is the enableOEMMode setting
        if update.id == "enableOEMMode" and robot_type == RobotTypeEnum.FLEX:
            resp = await _set_oem_mode_request(
                # Unlike opentrons.advanced_settings, system-server cannot store
                # `None`/`null` to restore to default. Storing `False` instead is close
                # enough.
                update.value
                if update.value is not None
                else False
            )
            if resp != 200:
                # TODO: raise correct error here
                raise Exception(f"Something went wrong setting OEM Mode. err: {resp}")

        await advanced_settings.set_adv_setting(update.id, update.value)
        hardware.hardware_feature_flags = HardwareFeatureFlags.build_from_ff()
        await hardware.set_status_bar_enabled(ff.status_bar_enabled())
    except ValueError as e:
        raise LegacyErrorResponse.from_exc(e).as_error(status.HTTP_400_BAD_REQUEST)
    except advanced_settings.SettingException as e:
        # Severe internal error
        raise LegacyErrorResponse.from_exc(e).as_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    return _create_settings_response(robot_type)


@router.get(
    "/settings",
    summary="Get settings",
    description="Get a list of available advanced settings (feature "
    "flags) and their values",
    response_model=AdvancedSettingsResponse,
    response_model_exclude_unset=True,
)
async def get_settings(
    robot_type: Annotated[RobotTypeEnum, Depends(get_robot_type_enum)],
) -> AdvancedSettingsResponse:
    """Get advanced setting (feature flags)"""
    return _create_settings_response(robot_type)


def _create_settings_response(robot_type: RobotTypeEnum) -> AdvancedSettingsResponse:
    """Create the feature flag settings response object"""
    data = advanced_settings.get_all_adv_settings(robot_type)

    if advanced_settings.is_restart_required():
        links = Links(restart="/server/restart")
    else:
        links = Links()

    return AdvancedSettingsResponse(
        links=links,
        settings=[
            AdvancedSetting(
                id=s.definition.id,
                old_id=s.definition.old_id,
                title=s.definition.title,
                description=s.definition.description,
                restart_required=s.definition.restart_required,
                value=s.value,
            )
            for s in data.values()
            if s.definition.should_show()
        ],
    )


@router.post(
    path="/settings/log_level/local",
    summary="Set the local log level",
    description="Set the minimum level of logs saved locally",
    response_model=V1BasicResponse,
    responses={
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"model": LegacyErrorResponse},
    },
)
async def post_log_level_local(
    log_level: LogLevel, hardware: Annotated[HardwareControlAPI, Depends(get_hardware)]
) -> V1BasicResponse:
    """Update local log level"""
    level = log_level.log_level
    if not level:
        raise LegacyErrorResponse(
            message="log_level must be set",
            errorCode=ErrorCodes.GENERAL_ERROR.value.code,
        ).as_error(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
    # Level name is upper case
    level_name = level.value.upper()
    # Set the log levels
    for logger_name in ("opentrons", "robot_server", "uvicorn"):
        logging.getLogger(logger_name).setLevel(level.level_id)
    # Update and save settings
    await hardware.update_config(log_level=level_name)
    robot_configs.save_robot_settings(hardware.config)

    return V1BasicResponse(message=f"log_level set to {level}")


@router.post(
    path="/settings/log_level/upstream",
    summary="Set the upstream log level",
    description=(
        "Set the minimum level of logs sent upstream via"
        " syslog-ng to Opentrons."
        " Removed in robot software v7.2.0."
    ),
    response_model=LegacyErrorResponse,
    deprecated=True,
)
async def post_log_level_upstream(log_level: LogLevel) -> V1BasicResponse:
    raise LegacyErrorResponse(
        message="API Discontinued - log streaming removed",
        errorCode=str(ErrorCodes.API_REMOVED),
    ).as_error(status.HTTP_410_GONE)


@router.get(
    "/settings/reset/options",
    summary="Get the things that can be reset",
    description="Get the robot settings and data that can be reset through `POST /settings/reset`.",
    response_model=FactoryResetOptions,
)
async def get_settings_reset_options(
    robot_type: Annotated[RobotTypeEnum, Depends(get_robot_type_enum)],
) -> FactoryResetOptions:
    reset_options = reset_util.reset_options(robot_type).items()
    return FactoryResetOptions(
        options=[
            FactoryResetOption(id=k, name=v.name, description=v.description)
            for k, v in reset_options
        ]
    )


@router.post(
    "/settings/reset",
    summary="Reset specific settings or data",
    description=(
        "Perform a reset of the requested robot settings or data."
        "\n\n"
        "The valid properties are given by `GET /settings/reset/options`."
        "\n\n"
        "You should always restart the robot after using this endpoint to"
        " reset something."
    ),
    responses={
        status.HTTP_403_FORBIDDEN: {"model": LegacyErrorResponse},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": LegacyErrorResponse},
    },
)
async def post_settings_reset_options(
    factory_reset_commands: Dict[reset_util.ResetOptionId, bool],
    persistence_resetter: Annotated[
        PersistenceResetter, Depends(get_persistence_resetter)
    ],
    deck_configuration_store: Annotated[
        Optional[DeckConfigurationStore], Depends(get_deck_configuration_store_failsafe)
    ],
    robot_type: Annotated[RobotTypeEnum, Depends(get_robot_type_enum)],
) -> V1BasicResponse:
    reset_options = reset_util.reset_options(robot_type)
    not_allowed_options = [
        option.value
        for option in list(factory_reset_commands.keys())
        if option not in reset_options.keys()
    ]
    if not_allowed_options:
        not_allowed_array_to_str = " ".join(not_allowed_options)
        raise LegacyErrorResponse(
            message=f"{not_allowed_array_to_str} is not a valid reset option.",
            errorCode=ErrorCodes.GENERAL_ERROR.value.code,
        ).as_error(status.HTTP_403_FORBIDDEN)

    options = set(k for k, v in factory_reset_commands.items() if v)

    failed_commands: List[reset_util.ResetOptionId] = []

    reset_util.reset(options, robot_type)

    if factory_reset_commands.get(reset_util.ResetOptionId.runs_history, False):
        await persistence_resetter.mark_directory_reset()

    if factory_reset_commands.get(reset_util.ResetOptionId.on_device_display, False):
        await reset_odd.mark_odd_for_reset_next_boot()

    if factory_reset_commands.get(reset_util.ResetOptionId.deck_configuration, False):
        if deck_configuration_store:
            await deck_configuration_store.delete()
        else:
            failed_commands.append(reset_util.ResetOptionId.deck_configuration)

    if failed_commands:
        raise LegacyErrorResponse(
            message=f"Some options could not be reset: {failed_commands}",
            errorCode=ErrorCodes.GENERAL_ERROR.value.code,
        ).as_error(
            # 503 because this condition can happen if someone tries to reset something
            # before our persistence layer has fully initialized. It will start working
            # after initialization finishes.
            status.HTTP_503_SERVICE_UNAVAILABLE
        )
    else:
        # TODO (tz, 5-24-22): The order of a set is undefined because set's aren't ordered.
        # The message returned to the client will be printed in the wrong order.
        message = (
            "Options '{}' were reset".format(", ".join(o.name for o in options))
            if options
            else "Nothing to do"
        )
        return V1BasicResponse(message=message)


@router.get(
    "/settings/robot",
    description="Get the current robot config",
    response_model=RobotConfigs,
)
async def get_robot_settings(
    hardware: Annotated[HardwareControlAPI, Depends(get_hardware)],
) -> RobotConfigs:
    return asdict(hardware.config)


@router.get(
    "/settings/pipettes",
    description="List all settings for all known pipettes by id. Only available on OT-2.",
    response_model=MultiPipetteSettings,
    response_model_by_alias=True,
    response_model_exclude_unset=True,
)
async def get_pipette_settings(
    hardware: Annotated[API, Depends(get_ot2_hardware)],
) -> MultiPipetteSettings:
    res = {}
    attached_pipettes = hardware.attached_pipettes
    for pipette_id in mutable_configurations.known_pipettes(
        get_opentrons_path("pipette_config_overrides_dir")
    ):
        # Have to convert to dict using by_alias due to bug in fastapi
        res[pipette_id] = _pipette_settings_from_known_id(
            pipette_id,
        )
    for dct in attached_pipettes.values():
        if "pipette_id" not in dct:
            continue
        res[dct["pipette_id"]] = _pipette_settings_with_defaults_from_attached_pipette(
            dct
        )
    return res


@router.get(
    path="/settings/pipettes/{pipette_id}",
    description="Get the settings of a specific pipette by ID. Only available on OT-2.",
    response_model=PipetteSettings,
    response_model_by_alias=True,
    response_model_exclude_unset=True,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": LegacyErrorResponse},
    },
)
async def get_pipette_setting(
    pipette_id: str, hardware: Annotated[API, Depends(get_ot2_hardware)]
) -> PipetteSettings:
    attached_pipettes = hardware.attached_pipettes
    known_ids = mutable_configurations.known_pipettes(
        get_opentrons_path("pipette_config_overrides_dir")
    )
    if pipette_id in known_ids:
        return _pipette_settings_from_known_id(pipette_id)
    for dct in attached_pipettes.values():
        if dct.get("pipette_id") == pipette_id:
            return _pipette_settings_with_defaults_from_attached_pipette(dct)
    raise LegacyErrorResponse(
        message=f"{pipette_id} is not a valid pipette id",
        errorCode=ErrorCodes.PIPETTE_NOT_PRESENT.value.code,
    ).as_error(status.HTTP_404_NOT_FOUND)


@router.patch(
    path="/settings/pipettes/{pipette_id}",
    description="Change the settings of a specific pipette. Only available on OT-2.",
    response_model=PipetteSettings,
    response_model_by_alias=True,
    response_model_exclude_unset=True,
    responses={
        status.HTTP_412_PRECONDITION_FAILED: {"model": LegacyErrorResponse},
    },
)
async def patch_pipette_setting(
    pipette_id: str,
    settings_update: PipetteSettingsUpdate,
    hardware: Annotated[None, Depends(get_ot2_hardware)],
) -> PipetteSettings:
    # Convert fields to dict of field name to value
    fields = settings_update.setting_fields or {}
    field_values = {k: None if v is None else v.value for k, v in fields.items()}
    if field_values:
        try:
            mutable_configurations.save_overrides(
                overrides=field_values,
                pipette_serial_number=pipette_id,
                pipette_override_path=get_opentrons_path(
                    "pipette_config_overrides_dir"
                ),
            )
        except ValueError as e:
            raise LegacyErrorResponse(
                message=str(e), errorCode=ErrorCodes.GENERAL_ERROR.value.code
            ).as_error(status.HTTP_412_PRECONDITION_FAILED)
    r = _pipette_settings_from_known_id(pipette_id)
    return r


def _pipette_settings_from_mutable_configs(
    mutable_configs: pip_types.OverrideType,
) -> PipetteSettings:
    converted_dict: Dict[str, Union[str, Dict[str, Any]]] = {}
    # TODO rather than doing this gross thing, we should
    # mess around with pydantic dataclasses.
    for k, v in mutable_configs.items():
        if isinstance(v, str):
            converted_dict[k] = v
        elif isinstance(v, pip_types.MutableConfig):
            converted_dict[k] = v.dict_for_encode()
        elif k == "quirks":
            converted_dict[k] = {q: b.dict_for_encode() for q, b in v.items()}
    fields = PipetteSettingsFields(**converted_dict)

    # TODO(mc, 2020-09-17): s/fields/setting_fields (?)
    # need model and name?
    return PipetteSettings(
        info=PipetteSettingsInfo(
            name=cast(str, mutable_configs.get("name", "")),
            model=cast(str, mutable_configs.get("model", "")),
        ),
        fields=fields,
    )


def _pipette_settings_from_known_id(pipette_id: str) -> PipetteSettings:
    """
    Create a PipetteSettings object from pipette config for single pipette

    :param pc: pipette config module
    :param pipette_id: pipette id
    :return: PipetteSettings object
    """
    mutable_configs = mutable_configurations.list_mutable_configs(
        pipette_serial_number=pipette_id,
        pipette_override_path=get_opentrons_path("pipette_config_overrides_dir"),
    )
    return _pipette_settings_from_mutable_configs(mutable_configs)


def _pipette_settings_with_defaults_from_attached_pipette(
    pipette_dict: hardware_dev_types.PipetteDict,
) -> PipetteSettings:
    """
    Create a PipetteSettings object from a pipette dict from hardware
    """
    pipette_id = pipette_dict["pipette_id"]
    pipette_model = pipette_dict["model"]
    pipette_modelversion = pip_names.convert_pipette_model(pipette_model)
    mutable_configs = mutable_configurations.list_mutable_configs_with_defaults(
        pipette_model=pipette_modelversion,
        pipette_serial_number=pipette_id,
        pipette_override_path=get_opentrons_path("pipette_config_overrides_dir"),
    )
    return _pipette_settings_from_mutable_configs(mutable_configs)
