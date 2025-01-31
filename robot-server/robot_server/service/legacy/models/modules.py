import typing
from pydantic import ConfigDict, BaseModel, Field


class TemperatureModuleLiveData(BaseModel):
    """Temperature Module live data"""

    currentTemp: float = Field(..., description="The current temperature of the module")
    targetTemp: typing.Optional[float] = Field(
        ..., description="The target temperature of the module if any"
    )


class MagneticModuleLiveData(BaseModel):
    """Magnetic Module live data"""

    engaged: bool = Field(..., description="Whether the magnets are raised or lowered")
    height: float = Field(
        ...,
        description="The height of the top of the magnets relative to "
        "their home position, in mm",
    )


class ThermocyclerModuleLiveData(BaseModel):
    """Thermocycler live data"""

    lid: str = Field(..., description="The current state of the lid")
    lidTarget: typing.Optional[float] = Field(
        ..., description="The target temperature of the lid temperature " "controller"
    )
    lidTemp: float = Field(..., description="The current temperature of the lid")
    currentTemp: float = Field(
        ..., description="The current temperature of the thermocycler block"
    )
    targetTemp: typing.Optional[float] = Field(
        ..., description="The target temperature of the thermocycler block"
    )
    holdTime: typing.Optional[float] = Field(
        ...,
        description="The time left in the current hold step, if any (in " "seconds)",
    )
    rampRate: typing.Optional[float] = Field(
        ...,
        description="The current ramp rate (in degC/s) for the " "thermocycler block",
    )
    currentCycleIndex: typing.Optional[int] = Field(
        ...,
        description="The index of the current cycle within the current "
        "programmed sequence",
    )
    totalCycleCount: typing.Optional[int] = Field(
        ..., description="The total number of cycles within the current " "sequence"
    )
    currentStepIndex: typing.Optional[int] = Field(
        ...,
        description="The index of the current step within the current "
        "programmed cycle",
    )
    totalStepCount: typing.Optional[int] = Field(
        ..., description="The total number of steps within the current cycle"
    )


class HeaterShakerModuleLiveData(BaseModel):
    """Heater-Shaker live data"""

    labwareLatchStatus: str = Field(
        ..., description="The current state of the Labware Latch"
    )
    speedStatus: str = Field(..., description="The current shake speed status")
    temperatureStatus: str = Field(..., description="The current temperature status")
    currentSpeed: int = Field(..., description="Current shake speed of plate in RPM")
    currentTemp: float = Field(..., description="Current plate temperature in Celsius")
    targetSpeed: typing.Optional[int] = Field(
        ..., description="Target shake speed in RPM"
    )
    targetTemp: typing.Optional[float] = Field(
        ..., description="Target temperature in Celsius"
    )
    errorDetails: typing.Optional[str] = Field(
        ..., description="Module error, if present"
    )


# ThermocyclerModuleLiveData must be first. The ordering in a Union has to go
# in order of specificity.
ModuleLiveData = typing.Union[
    HeaterShakerModuleLiveData,
    ThermocyclerModuleLiveData,
    TemperatureModuleLiveData,
    MagneticModuleLiveData,
]


class PhysicalPort(BaseModel):
    hub: bool = Field(
        ...,
        description="If a physical USB external hub is"
        " connected to the raspberry pi",
    )
    port: int = Field(
        ...,
        description="The USB port the module is plugged into."
        " If connected via a hub, ``port`` represents the port the hub is plugged into.",
    )
    portGroup: str = Field(
        ...,
        description="The physical USB port bank the module is plugged into.",
    )
    hubPort: typing.Optional[int] = Field(
        ...,
        description="If the module is connected via a USB hub,"
        " the port on the hub the module is plugged into.",
    )


class Module(BaseModel):
    """An object identifying a module"""

    name: str = Field(
        ...,
        description="A machine readable identifying name for a module. "
        "Deprecated. Prefer moduleModel",
    )
    displayName: str = Field(
        ...,
        description="A human-presentable name of the module. Deprecated."
        " Prefer lookup in the def",
    )
    moduleModel: str = Field(
        ..., description="The model of the module (e.g. magneticModuleV1)"
    )
    port: str = Field(
        ...,
        description="The virtual port to which the module is attached",
    )
    usbPort: PhysicalPort = Field(
        ..., description="The physical port to which the module is attached"
    )
    serial: str = Field(
        ...,
        description="The unique serial number of the module",
    )
    model: str = Field(
        ...,
        description="The model identifier (i.e. the part number). "
        "Deprecated. Prefer revision",
    )
    revision: str = Field(
        ..., description="The hardware identifier (i.e. the part number)"
    )
    fwVersion: str = Field(
        ...,
        description="The current firmware version",
    )
    hasAvailableUpdate: bool = Field(
        ..., description="If set, a module update is available"
    )
    status: str = Field(
        ...,
        description="A human-readable module-specific status",
    )
    data: ModuleLiveData


class Modules(BaseModel):
    """A list of all attached modules and the status of each one"""

    modules: typing.List[Module]
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"modules": []},
                {
                    "modules": [
                        {
                            "name": "magdeck",
                            "displayName": "Magnetic Module",
                            "moduleModel": "magneticModuleV1",
                            "port": "tty01_magdeck",
                            "serial": "MDV2313121",
                            "model": "mag_deck_v4.0",
                            "revision": "mag_deck_v4.0",
                            "fwVersion": "2.1.3",
                            "status": "engaged",
                            "hasAvailableUpdate": True,
                            "data": {"engaged": True, "height": 10},
                        }
                    ]
                },
                {
                    "modules": [
                        {
                            "name": "tempdeck",
                            "displayName": "Temperature Module",
                            "moduleModel": "temperatureModuleV1",
                            "revision": "temp_deck_v10",
                            "port": "tty2_tempdeck",
                            "serial": "TDV10231231",
                            "model": "temp_deck_v10",
                            "hasAvailableUpdate": False,
                            "fwVersion": "1.2.0",
                            "status": "cooling",
                            "data": {"currentTemp": 25, "targetTemp": 10},
                        }
                    ]
                },
                {
                    "modules": [
                        {
                            "name": "thermocycler",
                            "displayName": "Thermocycler",
                            "revision": "thermocycler_v10",
                            "moduleModel": "thermocyclerModuleV1",
                            "port": "tty3_thermocycler",
                            "serial": "TCV1006052018",
                            "model": "thermocycler_v10",
                            "hasAvailableUpdate": True,
                            "fwVersion": "1.0.0",
                            "status": "cooling",
                            "data": {
                                "lid": "closed",
                                "lidTarget": 10,
                                "lidTemp": 15,
                                "currentTemp": 20,
                                "targetTemp": 10,
                                "holdTime": None,
                                "rampRate": 10,
                                "currentCycleIndex": None,
                                "totalCycleCount": None,
                                "currentStepIndex": None,
                                "totalStepCount": None,
                            },
                        }
                    ]
                },
                {
                    "modules": [
                        {
                            "name": "heatershaker",
                            "displayName": "heatershaker",
                            "fwVersion": "0.0.1",
                            "hasAvailableUpdate": True,
                            "model": "heater-shaker_v10",
                            "moduleModel": "heaterShakerModuleV1",
                            "port": "/dev/ot_module_heatershaker1",
                            "usbPort": {
                                "hub": False,
                                "port": 1,
                                "portGroup": "unknown",
                                "hubPort": None,
                            },
                            "revision": "heater-shaker_v10",
                            "serial": "HSnnnnnn",
                            "status": "running",
                            "data": {
                                "temperatureStatus": "heating",
                                "speedStatus": "holding at target",
                                "labwareLatchStatus": "closed",
                                "currentTemp": 25.5,
                                "targetTemp": 50,
                                "currentSpeed": 10,
                                "targetSpeed": 300,
                                "errorDetails": None,
                            },
                        }
                    ]
                },
            ]
        }
    )


class ModuleSerial(BaseModel):
    """Data from the module"""

    status: str = Field(..., description="A human-readable module-specific status")
    data: ModuleLiveData


class SerialCommand(BaseModel):
    """The serialized module call"""

    command_type: str = Field(
        ..., description="The name of the module function to call"
    )
    args: typing.Optional[typing.List[typing.Any]] = Field(
        None, description="The ordered args list for the call"
    )
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"command_type": "set_Temperature", "args": [60]}]
        }
    )


class SerialCommandResponse(BaseModel):
    """ "The result of a successful call"""

    message: str = Field(..., description="A human readable string")
    returnValue: typing.Optional[str] = Field(
        None, description="The return value from the call"
    )
    model_config = ConfigDict(
        json_schema_extra={"examples": [{"message": "Success", "returnValue": None}]}
    )
