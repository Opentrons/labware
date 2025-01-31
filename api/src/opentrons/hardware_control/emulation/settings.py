from typing import List
from opentrons.hardware_control.emulation.types import ModuleType
from opentrons.hardware_control.emulation.util import TEMPERATURE_ROOM
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class PipetteSettings(BaseModel):
    model: str = "p20_single_v2.0"
    id: str = "P20SV202020070101"


class SmoothieSettings(BaseModel):
    left: PipetteSettings = PipetteSettings(
        model="p20_multi_v2.0", id="P3HMV202020041605"
    )
    right: PipetteSettings = PipetteSettings(
        model="p20_single_v2.0", id="P20SV202020070101"
    )
    host: str = "0.0.0.0"
    port: int = 9996


class BaseModuleSettings(BaseModel):
    serial_number: str
    model: str
    version: str


class TemperatureModelSettings(BaseModel):
    degrees_per_tick: float = 2.0
    starting: float = float(TEMPERATURE_ROOM)


class RPMModelSettings(BaseModel):
    rpm_per_tick: float = 100.0
    starting: float = 0.0


class MagDeckSettings(BaseModuleSettings):
    pass


class TempDeckSettings(BaseModuleSettings):
    temperature: TemperatureModelSettings


class ThermocyclerSettings(BaseModuleSettings):
    lid_temperature: TemperatureModelSettings
    plate_temperature: TemperatureModelSettings


class HeaterShakerSettings(BaseModuleSettings):
    temperature: TemperatureModelSettings
    rpm: RPMModelSettings
    home_delay_time: int = 0


class ProxySettings(BaseModel):
    """Settings for a proxy."""

    host: str = "0.0.0.0"
    emulator_port: int
    driver_port: int
    use_local_host: bool = True


class ModuleServerSettings(BaseModel):
    """Settings for the module server"""

    host: str = "0.0.0.0"
    port: int = 8989


class Settings(BaseSettings):
    modules: List[ModuleType] = [
        ModuleType.Magnetic,
        ModuleType.Temperature,
        ModuleType.Thermocycler,
    ]
    smoothie: SmoothieSettings = SmoothieSettings()
    magdeck: MagDeckSettings = MagDeckSettings(
        serial_number="magnetic_emulator", model="mag_deck_v20", version="2.0.0"
    )
    tempdeck: TempDeckSettings = TempDeckSettings(
        serial_number="temperature_emulator",
        model="temp_deck_v20",
        version="v2.0.1",
        temperature=TemperatureModelSettings(starting=0.0),
    )
    thermocycler: ThermocyclerSettings = ThermocyclerSettings(
        serial_number="thermocycler_emulator",
        model="v02",
        version="v1.1.0",
        lid_temperature=TemperatureModelSettings(),
        plate_temperature=TemperatureModelSettings(),
    )
    heatershaker: HeaterShakerSettings = HeaterShakerSettings(
        serial_number="heater_shaker_emulator",
        model="v01",
        version="v0.0.1",
        temperature=TemperatureModelSettings(),
        rpm=RPMModelSettings(),
        home_delay_time=0,
    )

    heatershaker_proxy: ProxySettings = ProxySettings(
        emulator_port=9000, driver_port=9995
    )
    thermocycler_proxy: ProxySettings = ProxySettings(
        emulator_port=9002, driver_port=9997
    )
    temperature_proxy: ProxySettings = ProxySettings(
        emulator_port=9003, driver_port=9998
    )
    magdeck_proxy: ProxySettings = ProxySettings(emulator_port=9004, driver_port=9999)
    model_config = SettingsConfigDict(env_prefix="OT_EMULATOR_")

    module_server: ModuleServerSettings = ModuleServerSettings()
