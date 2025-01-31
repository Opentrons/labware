from enum import Enum
import logging

from typing import Optional, List, Dict, Any, Union

from pydantic import field_validator, BaseModel, Field, create_model

from opentrons_shared_data.pipette import model_constants
from opentrons.config.reset import ResetOptionId


class AdvancedSetting(BaseModel):
    """An advanced setting (Feature Flag)"""

    id: str = Field(..., description="The machine-readable property ID")
    old_id: Optional[str] = Field(
        ...,
        description="The ID by which the property used to be known; not"
        " useful now and may contain spaces or hyphens",
        json_schema_extra={"deprecated": True},
    )
    title: str = Field(
        ...,
        description="A human-readable short string suitable for display"
        " as the title of the setting",
    )
    description: str = Field(
        ...,
        description="A human-readable long string suitable for display "
        "as a paragraph or two explaining the setting",
    )
    restart_required: bool = Field(
        ...,
        description="Whether a robot restart is required to make this "
        "change take effect",
    )
    value: Optional[bool] = Field(
        ...,
        description="Whether the setting is off by previous user choice"
        " (false), true by user choice (true), or off and "
        "has never been altered (null)",
    )


class Links(BaseModel):
    restart: Optional[str] = Field(
        None,
        description="A URI to POST to restart the robot. If this is present,"
        " it must be requested for any settings changes to take "
        "effect",
    )


class AdvancedSettingsResponse(BaseModel):
    """A dump of advanced settings and suitable links for next action"""

    settings: List[AdvancedSetting]
    links: Links


class AdvancedSettingRequest(BaseModel):
    """Configure the setting to change and the new value"""

    id: str = Field(
        ...,
        description="The ID of the setting to change (something returned by"
        " GET /settings)",
    )
    value: Optional[bool] = Field(
        None, description="The new value to set. If null, reset to default"
    )


class LogLevels(str, Enum):
    _level_id: int

    """Valid log levels"""

    def __new__(cls, value, level):
        # https://docs.python.org/3/library/enum.html#when-to-use-new-vs-init
        obj = str.__new__(cls, value)
        obj._value_ = value
        obj._level_id = level
        return obj

    debug = ("debug", logging.DEBUG)
    info = ("info", logging.INFO)
    warning = ("warning", logging.WARNING)
    error = ("error", logging.ERROR)

    @property
    def level_id(self):
        """The log level id as defined in logging lib"""
        return self._level_id


class LogLevel(BaseModel):
    log_level: Optional[LogLevels] = Field(
        None, description="The value to set (conforming to Python log levels)"
    )

    @field_validator("log_level", mode="before")
    @classmethod
    def lower_case_log_keys(cls, value):
        return value if value is None else LogLevels(value.lower(), None)


class FactoryResetOption(BaseModel):
    id: ResetOptionId = Field(
        ..., description="A short machine-readable id for the setting"
    )
    name: str = Field(..., description="A short human-readable name for the setting")
    description: str = Field(
        ..., description="A longer human-readable description of the " "setting"
    )


class FactoryResetOptions(BaseModel):
    """Available values to reset as factory reset"""

    options: List[FactoryResetOption]


RobotConfigs = Dict[str, Any]


class PipetteSettingsFieldType(str, Enum):
    """The type of the property"""

    float = "float"
    int = "int"


class PipetteSettingsField(BaseModel):
    """A pipette config element identified by the property's name"""

    units: Optional[str] = Field(
        None, description="The physical units this value is in (e.g. mm, uL)"
    )
    type: Optional[PipetteSettingsFieldType] = None
    min: float = Field(..., description="The minimum acceptable value of the property")
    max: float = Field(..., description="The maximum acceptable value of the property")
    default: float = Field(..., description="The default value of the property")
    value: float = Field(..., description="The current value of the property")


class PipetteSettingsInfo(BaseModel):
    """Metadata about this pipette"""

    name: str = Field(..., description='A pipette name (e.g. "p300_single")')
    model: str = Field(
        ..., description='The exact pipette model (e.g. "' 'p300_single_v1.5")'
    )


class BasePipetteSettingFields(BaseModel):
    quirks: Optional[Dict[str, bool]] = Field(
        None,
        description="Quirks are behavioral changes associated with "
        "pipettes. For instance, some models of pipette "
        "might need to run their drop tip behavior twice. "
        "Specific pipettes have which can then be enabled "
        "or disabled; quirks that are not originally "
        "defined as compatible with a specific kind of "
        "pipette cannot be added to an incompatible "
        "pipette. Because quirks are only defined as "
        "compatible for a pipette if they should be on, "
        "the default value for all quirks is true.",
    )


# A dynamic model of the possible fields in pipette configuration. It's
# generated from pipette_config module. It's derived from an object with the
# 'quirks` member.
PipetteSettingsFields = create_model(  # type: ignore[call-overload]
    "PipetteSettingsFields",
    __base__=BasePipetteSettingFields,
    **{
        conf: (PipetteSettingsField, None)
        for conf in model_constants.MUTABLE_CONFIGS_V1
        if conf != "quirks"
    },
)
PipetteSettingsFields.__doc__ = "The fields of the pipette settings"


class PipetteSettings(BaseModel):

    info: PipetteSettingsInfo
    setting_fields: PipetteSettingsFields = Field(..., alias="fields")  # type: ignore


MultiPipetteSettings = Dict[str, PipetteSettings]


class PipetteUpdateField(BaseModel):
    value: Union[None, bool, float] = Field(
        ...,
        description="Must be a boolean if this is a quirk. The "
        "format if this is not a quirk. Must be between max "
        "and min for this property. Null means reset.",
    )


class PipetteSettingsUpdate(BaseModel):
    setting_fields: Optional[Dict[str, Optional[PipetteUpdateField]]] = Field(
        None, alias="fields"
    )

    @field_validator("setting_fields")
    @classmethod
    def validate_fields(cls, v):
        """A validator to ensure that values for mutable configs are
        floats and booleans for quirks."""
        for key, value in v.items():
            if value is None:
                pass
            elif key in model_constants.MUTABLE_CONFIGS_V1:
                if value.value is not None:
                    # Must be a float for overriding a config field
                    value.value = float(value.value)
            elif key in model_constants.VALID_QUIRKS:
                if not isinstance(value.value, bool):
                    raise ValueError(
                        f"{key} quirk value must " f"be a boolean. Got {value.value}"
                    )
            else:
                raise ValueError(f"{key} is not a valid field or quirk name")
        return v
