"""Driver settings."""
from typing_extensions import Final, TypedDict
from typing import Optional
from pydantic import Field

from opentrons_shared_data.errors.exceptions import CANBusConfigurationError

from math import floor
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_INTERFACE: Final = "socketcan"

DEFAULT_BITRATE: Final[int] = 500000

DEFAULT_FDCAN_CLK: Final[int] = 20  # MHz
DEFAULT_SAMPLE_RATE: Final[float] = 80
DEFAULT_JUMP_WIDTH_SEG: Final[int] = 1
SYNC_QUANTUM: Final[int] = 1
TIME_QUANTUM_DURATION_NS: Final[int] = 100
SECOND_TO_MICROSECOND: Final[int] = 1000000

MAX_FCAN_CLK: Final[int] = 80  # MHz
MAX_BRP: Final[int] = 1024
MAX_SJW: Final[int] = 128
MAX_TSEG1: Final[int] = 256
MAX_TSEG2: Final[int] = 128


DEFAULT_CHANNEL: Final = "can0"

DEFAULT_HOST: Final = "localhost"

DEFAULT_PORT: Final = 9898

OPENTRONS_INTERFACE: Final = "opentrons_sock"

US_TO_NS: Final = 1000


class PCANParameters(TypedDict):
    """FDCan parameters for PCAN."""

    f_clock_mhz: int
    nom_brp: int
    nom_tseg1: int
    nom_tseg2: int
    nom_sjw: int


class DriverSettings(BaseSettings):
    """Settings for driver building."""

    interface: str = Field(
        default=DEFAULT_INTERFACE,
        description=f"Can either be {OPENTRONS_INTERFACE} for simple socket "
        f"or a python can interface.",
    )
    bit_rate: int = Field(
        default=DEFAULT_BITRATE,
        description=f"Bit rate. Not applicable to {OPENTRONS_INTERFACE} interface.",
    )
    channel: str = Field(default=DEFAULT_CHANNEL, description="The SocketCan channel.")

    host: str = Field(default=DEFAULT_HOST, description=f"{OPENTRONS_INTERFACE} only.")
    port: int = Field(default=DEFAULT_PORT, description=f"{OPENTRONS_INTERFACE} only.")
    fcan_clock: int = Field(default=DEFAULT_FDCAN_CLK, description="pcan only.")
    sample_rate: float = Field(default=DEFAULT_SAMPLE_RATE, description="pcan only.")
    jump_width: int = Field(default=DEFAULT_JUMP_WIDTH_SEG, description="pcan only.")
    model_config = SettingsConfigDict(env_prefix="OT3_CAN_DRIVER_")


def _check_calculated_bit_timing_values(
    brp: float, tseg_1: float, tseg_2: float
) -> None:
    if not brp.is_integer():
        raise CANBusConfigurationError(
            message=f"BRP is {brp} and must be an integer", detail={"brp": str(brp)}
        )
    if brp > MAX_BRP:
        raise CANBusConfigurationError(
            message=f"Calculated BRP {brp} exceeds max value {MAX_BRP}",
            detail={"brp": str(brp), "max": str(MAX_BRP)},
        )
    if tseg_1 > MAX_TSEG1:
        raise CANBusConfigurationError(
            message=f"Calculated TSEG1 {tseg_1} exceeds max value {MAX_TSEG1}",
            detail={"tseg1": str(tseg_1), "max": str(MAX_TSEG1)},
        )
    if tseg_2 > MAX_TSEG2:
        raise CANBusConfigurationError(
            message=f"Calculated TSEG2 {tseg_2} exceeds max value {MAX_TSEG2}",
            detail={"tseg2": str(tseg_2), "max": str(MAX_TSEG2)},
        )


def calculate_fdcan_parameters(
    fcan_clock: Optional[int],
    bitrate: Optional[int],
    sample_rate: Optional[float],
    jump_width: Optional[int],
) -> PCANParameters:
    """Calculate FDCAN Timing Parameters.

    Args:
        fcan_clock: The clock used by the analyzer
        bitrate: The bitrate of data transfer
        sample_rate: When to sample the data.
        jump_width: The max time the sampling period can be lengthened or shortened


    """
    if not fcan_clock:
        fcan_clock = DEFAULT_FDCAN_CLK
    if not bitrate:
        bitrate = DEFAULT_BITRATE
    if not sample_rate:
        sample_rate = DEFAULT_SAMPLE_RATE
    if not jump_width:
        jump_width = DEFAULT_JUMP_WIDTH_SEG

    if fcan_clock > MAX_FCAN_CLK:
        raise CANBusConfigurationError(
            message=f"Clock value {fcan_clock} exceeds max value of {MAX_FCAN_CLK}",
            detail={"clock": str(fcan_clock), "max": str(MAX_FCAN_CLK)},
        )
    if jump_width > MAX_SJW:
        raise CANBusConfigurationError(
            message=f"Jump width value {jump_width} exceeds max value of {MAX_SJW}",
            detail={"sjw": str(jump_width), "max": str(MAX_SJW)},
        )

    sample_rate_percent = sample_rate / 100
    bit_time_us = (1 / bitrate) * SECOND_TO_MICROSECOND
    time_quantum_us = 1 / fcan_clock
    time_quanta_count = (bit_time_us * US_TO_NS) // TIME_QUANTUM_DURATION_NS

    # Given a sample rate, we can say that
    # (sync_quantum + TSEG1)/(sync_quantum + TSEG1 + TSEG2) = sample_rate
    # and also that (sync_quantum + TSEG1 + TSEG2) = time_quanta_count (tq)
    tseg_1 = (sample_rate_percent * time_quanta_count) - SYNC_QUANTUM
    tseg_2 = time_quanta_count - SYNC_QUANTUM - tseg_1
    brp = TIME_QUANTUM_DURATION_NS / (
        time_quantum_us * US_TO_NS
    )  # clock prescaler (unitless)
    _check_calculated_bit_timing_values(brp, tseg_1, tseg_2)

    return PCANParameters(
        f_clock_mhz=fcan_clock,
        nom_brp=int(brp),
        nom_tseg1=floor(tseg_1),
        nom_tseg2=floor(tseg_2),
        nom_sjw=jump_width,
    )
