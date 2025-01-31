"""Tests for robot_server.modules.module_data_mapper."""
import pytest

from opentrons.protocol_engine import ModuleModel, DeckType
from opentrons.protocol_engine.types import Vec3f
from opentrons.drivers.rpi_drivers.types import USBPort as HardwareUSBPort, PortGroup
from opentrons.hardware_control.modules import (
    LiveData,
    ModuleType,
    MagneticStatus,
    TemperatureStatus,
    HeaterShakerStatus,
)


from robot_server.modules.module_identifier import ModuleIdentity
from robot_server.modules.module_data_mapper import ModuleDataMapper

from robot_server.modules.module_models import (
    UsbPort,
    MagneticModule,
    MagneticModuleData,
    TemperatureModule,
    TemperatureModuleData,
    ThermocyclerModule,
    ThermocyclerModuleData,
    HeaterShakerModule,
    HeaterShakerModuleData,
    ModuleCalibrationData,
)


@pytest.mark.parametrize(
    (
        "input_model",
        "deck_type",
        "input_data",
        "expected_output_data",
        "expected_compatible",
    ),
    [
        (
            "magneticModuleV1",
            DeckType("ot2_standard"),
            {"status": "disengaged", "data": {"engaged": False, "height": 0.0}},
            MagneticModuleData(
                status=MagneticStatus.DISENGAGED,
                engaged=False,
                height=-2.5,
            ),
            True,
        ),
        (
            "magneticModuleV1",
            DeckType("ot3_standard"),
            {"status": "disengaged", "data": {"engaged": False, "height": 0.0}},
            MagneticModuleData(
                status=MagneticStatus.DISENGAGED,
                engaged=False,
                height=-2.5,
            ),
            False,
        ),
        (
            "magneticModuleV1",
            DeckType("ot2_standard"),
            {"status": "engaged", "data": {"engaged": True, "height": 42}},
            MagneticModuleData(
                status=MagneticStatus.ENGAGED,
                engaged=True,
                height=18.5,
            ),
            True,
        ),
        (
            "magneticModuleV2",
            DeckType("ot2_standard"),
            {"status": "disengaged", "data": {"engaged": False, "height": 0.0}},
            MagneticModuleData(
                status=MagneticStatus.DISENGAGED,
                engaged=False,
                height=-2.5,
            ),
            True,
        ),
        (
            "magneticModuleV2",
            DeckType("ot3_standard"),
            {"status": "disengaged", "data": {"engaged": False, "height": 0.0}},
            MagneticModuleData(
                status=MagneticStatus.DISENGAGED,
                engaged=False,
                height=-2.5,
            ),
            False,
        ),
        (
            "magneticModuleV2",
            DeckType("ot2_standard"),
            {"status": "engaged", "data": {"engaged": True, "height": 42}},
            MagneticModuleData(
                status=MagneticStatus.ENGAGED,
                engaged=True,
                height=39.5,
            ),
            True,
        ),
    ],
)
def test_maps_magnetic_module_data(
    input_model: str,
    deck_type: DeckType,
    input_data: LiveData,
    expected_output_data: MagneticModuleData,
    expected_compatible: bool,
) -> None:
    """It should map hardware data to a magnetic module."""
    module_identity = ModuleIdentity(
        module_id="module-id",
        serial_number="serial-number",
        firmware_version="1.2.3",
        hardware_revision="4.5.6",
    )

    hardware_usb_port = HardwareUSBPort(
        name="abc",
        port_number=101,
        port_group=PortGroup.UNKNOWN,
        hub=False,
        hub_port=None,
        device_path="/dev/null",
    )

    subject = ModuleDataMapper(deck_type=deck_type)
    result = subject.map_data(
        model=input_model,
        module_identity=module_identity,
        has_available_update=True,
        live_data=input_data,
        usb_port=hardware_usb_port,
        module_offset=ModuleCalibrationData.model_construct(
            offset=Vec3f(x=0, y=0, z=0),
        ),
    )

    assert result == MagneticModule(
        id="module-id",
        serialNumber="serial-number",
        firmwareVersion="1.2.3",
        hardwareRevision="4.5.6",
        hasAvailableUpdate=True,
        moduleType=ModuleType.MAGNETIC,
        moduleModel=ModuleModel(input_model),  # type: ignore[arg-type]
        compatibleWithRobot=expected_compatible,
        usbPort=UsbPort(
            port=101,
            portGroup=PortGroup.UNKNOWN,
            hub=False,
            hubPort=None,
            path="/dev/null",
        ),
        data=expected_output_data,
        moduleOffset=ModuleCalibrationData(offset=Vec3f(x=0.0, y=0.0, z=0.0)),
    )


@pytest.mark.parametrize(
    "input_model,deck_type,expected_compatible",
    [
        ("temperatureModuleV1", DeckType("ot2_standard"), True),
        ("temperatureModuleV1", DeckType("ot3_standard"), False),
        ("temperatureModuleV2", DeckType("ot2_standard"), True),
        ("temperatureModuleV2", DeckType("ot3_standard"), True),
    ],
)
@pytest.mark.parametrize(
    "input_data",
    [
        {"status": "idle", "data": {"currentTemp": 42.0, "targetTemp": None}},
        {
            "status": "holding at target",
            "data": {"currentTemp": 84.0, "targetTemp": 84.0},
        },
    ],
)
def test_maps_temperature_module_data(
    input_model: str,
    deck_type: DeckType,
    expected_compatible: bool,
    input_data: LiveData,
) -> None:
    """It should map hardware data to a magnetic module."""
    module_identity = ModuleIdentity(
        module_id="module-id",
        serial_number="serial-number",
        firmware_version="1.2.3",
        hardware_revision="4.5.6",
    )

    hardware_usb_port = HardwareUSBPort(
        name="abc",
        port_number=101,
        port_group=PortGroup.UNKNOWN,
        hub=False,
        hub_port=None,
        device_path="/dev/null",
    )

    subject = ModuleDataMapper(deck_type=deck_type)
    result = subject.map_data(
        model=input_model,
        module_identity=module_identity,
        has_available_update=True,
        live_data=input_data,
        usb_port=hardware_usb_port,
        module_offset=ModuleCalibrationData.model_construct(
            offset=Vec3f(x=0, y=0, z=0),
        ),
    )

    assert result == TemperatureModule(
        id="module-id",
        serialNumber="serial-number",
        firmwareVersion="1.2.3",
        hardwareRevision="4.5.6",
        hasAvailableUpdate=True,
        moduleType=ModuleType.TEMPERATURE,
        compatibleWithRobot=expected_compatible,
        moduleModel=ModuleModel(input_model),  # type: ignore[arg-type]
        usbPort=UsbPort(
            port=101,
            portGroup=PortGroup.UNKNOWN,
            hub=False,
            hubPort=None,
            path="/dev/null",
        ),
        moduleOffset=ModuleCalibrationData(offset=Vec3f(x=0.0, y=0.0, z=0.0)),
        data=TemperatureModuleData(
            status=TemperatureStatus(input_data["status"]),
            currentTemperature=input_data["data"]["currentTemp"],  # type: ignore[arg-type]
            targetTemperature=input_data["data"]["targetTemp"],  # type: ignore[arg-type]
        ),
    )


@pytest.mark.parametrize(
    "input_model,deck_type,expected_compatible",
    [
        ("thermocyclerModuleV1", DeckType("ot2_standard"), True),
        ("thermocyclerModuleV1", DeckType("ot3_standard"), False),
        ("thermocyclerModuleV2", DeckType("ot2_standard"), True),
        ("thermocyclerModuleV2", DeckType("ot3_standard"), True),
    ],
)
@pytest.mark.parametrize(
    "input_data",
    [
        {
            "status": "idle",
            "data": {
                "lid": "open",
                "lidTarget": None,
                "lidTemp": None,
                "lidTempStatus": "idle",
                "currentTemp": None,
                "targetTemp": None,
                "holdTime": None,
                "rampRate": None,
                "currentCycleIndex": None,
                "totalCycleCount": None,
                "currentStepIndex": None,
                "totalStepCount": None,
            },
        },
        {
            "status": "heating",
            "data": {
                "lid": "open",
                "lidTarget": 1,
                "lidTemp": 2,
                "lidTempStatus": "heating",
                "currentTemp": 3,
                "targetTemp": 4,
                "holdTime": 5,
                "rampRate": 6,
                "currentCycleIndex": 7,
                "totalCycleCount": 8,
                "currentStepIndex": 9,
                "totalStepCount": 10,
            },
        },
    ],
)
def test_maps_thermocycler_module_data(
    input_model: str,
    deck_type: DeckType,
    expected_compatible: bool,
    input_data: LiveData,
) -> None:
    """It should map hardware data to a magnetic module."""
    module_identity = ModuleIdentity(
        module_id="module-id",
        serial_number="serial-number",
        firmware_version="1.2.3",
        hardware_revision="4.5.6",
    )

    hardware_usb_port = HardwareUSBPort(
        name="abc",
        port_number=101,
        port_group=PortGroup.UNKNOWN,
        hub=False,
        hub_port=None,
        device_path="/dev/null",
    )

    subject = ModuleDataMapper(deck_type=deck_type)
    result = subject.map_data(
        model=input_model,
        module_identity=module_identity,
        has_available_update=True,
        live_data=input_data,
        usb_port=hardware_usb_port,
        module_offset=ModuleCalibrationData.model_construct(
            offset=Vec3f(x=0, y=0, z=0),
        ),
    )

    assert result == ThermocyclerModule(
        id="module-id",
        serialNumber="serial-number",
        firmwareVersion="1.2.3",
        hardwareRevision="4.5.6",
        hasAvailableUpdate=True,
        moduleType=ModuleType.THERMOCYCLER,
        compatibleWithRobot=expected_compatible,
        moduleModel=ModuleModel(input_model),  # type: ignore[arg-type]
        usbPort=UsbPort(
            port=101,
            portGroup=PortGroup.UNKNOWN,
            hub=False,
            hubPort=None,
            path="/dev/null",
        ),
        moduleOffset=ModuleCalibrationData(offset=Vec3f(x=0.0, y=0.0, z=0.0)),
        data=ThermocyclerModuleData(
            status=TemperatureStatus(input_data["status"]),
            currentTemperature=input_data["data"]["currentTemp"],  # type: ignore[arg-type]
            targetTemperature=input_data["data"]["targetTemp"],  # type: ignore[arg-type]
            lidStatus=input_data["data"]["lid"],  # type: ignore[arg-type]
            lidTemperatureStatus=input_data["data"]["lidTempStatus"],  # type: ignore[arg-type]
            lidTemperature=input_data["data"]["lidTemp"],  # type: ignore[arg-type]
            lidTargetTemperature=input_data["data"]["lidTarget"],  # type: ignore[arg-type]
            holdTime=input_data["data"]["holdTime"],  # type: ignore[arg-type]
            rampRate=input_data["data"]["rampRate"],  # type: ignore[arg-type]
            currentCycleIndex=input_data["data"]["currentCycleIndex"],  # type: ignore[arg-type]
            totalCycleCount=input_data["data"]["totalCycleCount"],  # type: ignore[arg-type]
            currentStepIndex=input_data["data"]["currentStepIndex"],  # type: ignore[arg-type]
            totalStepCount=input_data["data"]["totalStepCount"],  # type: ignore[arg-type]
        ),
    )


@pytest.mark.parametrize(
    "input_model,deck_type",
    [
        ("heaterShakerModuleV1", DeckType("ot2_standard")),
        ("heaterShakerModuleV1", DeckType("ot3_standard")),
    ],
)
@pytest.mark.parametrize(
    "input_data",
    [
        {
            "status": "idle",
            "data": {
                "temperatureStatus": "idle",
                "speedStatus": "idle",
                "labwareLatchStatus": "idle_open",
                "currentTemp": 42,
                "targetTemp": None,
                "currentSpeed": 1337,
                "targetSpeed": None,
                "errorDetails": None,
            },
        },
        {
            "status": "running",
            "data": {
                "temperatureStatus": "heating",
                "speedStatus": "speeding up",
                "labwareLatchStatus": "idle_closed",
                "currentTemp": 42,
                "targetTemp": 84,
                "currentSpeed": 1337,
                "targetSpeed": 9001,
                "errorDetails": "oh no",
            },
        },
    ],
)
def test_maps_heater_shaker_module_data(
    input_model: str, deck_type: DeckType, input_data: LiveData
) -> None:
    """It should map hardware data to a magnetic module."""
    module_identity = ModuleIdentity(
        module_id="module-id",
        serial_number="serial-number",
        firmware_version="1.2.3",
        hardware_revision="4.5.6",
    )

    hardware_usb_port = HardwareUSBPort(
        name="abc",
        port_number=101,
        port_group=PortGroup.UNKNOWN,
        hub=False,
        hub_port=None,
        device_path="/dev/null",
    )

    subject = ModuleDataMapper(deck_type=deck_type)
    result = subject.map_data(
        model=input_model,
        module_identity=module_identity,
        has_available_update=True,
        live_data=input_data,
        usb_port=hardware_usb_port,
        module_offset=ModuleCalibrationData.model_construct(
            offset=Vec3f(x=0, y=0, z=0),
        ),
    )

    assert result == HeaterShakerModule(
        id="module-id",
        serialNumber="serial-number",
        firmwareVersion="1.2.3",
        hardwareRevision="4.5.6",
        hasAvailableUpdate=True,
        moduleType=ModuleType.HEATER_SHAKER,
        compatibleWithRobot=True,
        moduleModel=ModuleModel(input_model),  # type: ignore[arg-type]
        usbPort=UsbPort(
            port=101,
            portGroup=PortGroup.UNKNOWN,
            hub=False,
            hubPort=None,
            path="/dev/null",
        ),
        moduleOffset=ModuleCalibrationData(offset=Vec3f(x=0.0, y=0.0, z=0.0)),
        data=HeaterShakerModuleData(
            status=HeaterShakerStatus(input_data["status"]),
            labwareLatchStatus=input_data["data"]["labwareLatchStatus"],  # type: ignore[arg-type]
            speedStatus=input_data["data"]["speedStatus"],  # type: ignore[arg-type]
            currentSpeed=input_data["data"]["currentSpeed"],  # type: ignore[arg-type]
            targetSpeed=input_data["data"]["targetSpeed"],  # type: ignore[arg-type]
            temperatureStatus=input_data["data"]["temperatureStatus"],  # type: ignore[arg-type]
            currentTemperature=input_data["data"]["currentTemp"],  # type: ignore[arg-type]
            targetTemperature=input_data["data"]["targetTemp"],  # type: ignore[arg-type]
            errorDetails=input_data["data"]["errorDetails"],  # type: ignore[arg-type]
        ),
    )
