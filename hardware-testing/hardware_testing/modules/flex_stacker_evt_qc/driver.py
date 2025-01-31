"""FLEX Stacker Driver."""
from typing import Tuple
from dataclasses import dataclass
import serial  # type: ignore[import]
from serial.tools.list_ports import comports  # type: ignore[import]
import re
from enum import Enum

STACKER_VID = 0x483
STACKER_PID = 0xEF24
STACKER_FREQ = 115200


class HardwareRevision(Enum):
    """Hardware Revision."""

    NFF = "nff"
    EVT = "a1"


@dataclass
class StackerInfo:
    """Stacker Info."""

    fw: str
    hw: HardwareRevision
    sn: str


class StackerAxis(Enum):
    """Stacker Axis."""

    X = "X"
    Z = "Z"
    L = "L"

    def __str__(self) -> str:
        """Name."""
        return self.name


class PlatformStatus(Enum):
    """Platform Status."""

    REMOVED = 0
    EXTENTED = 1
    RETRACTED = 2
    ERROR = 4

    @classmethod
    def from_tuple(cls, status: Tuple[int, int]) -> "PlatformStatus":
        """Get platform status from tuple."""
        if status == (0, 0):
            return PlatformStatus.REMOVED
        if status == (1, 0):
            return PlatformStatus.EXTENTED
        if status == (0, 1):
            return PlatformStatus.RETRACTED
        return PlatformStatus.ERROR


class Direction(Enum):
    """Direction."""

    RETRACT = 0
    EXTENT = 1

    def __str__(self) -> str:
        """Convert to tag for clear logging."""
        return "negative" if self == Direction.RETRACT else "positive"

    def opposite(self) -> "Direction":
        """Get opposite direction."""
        return Direction.EXTENT if self == Direction.RETRACT else Direction.RETRACT

    def distance(self, distance: float) -> float:
        """Get signed distance, where retract direction is negative."""
        return distance * -1 if self == Direction.RETRACT else distance


@dataclass
class MoveParams:
    """Move Parameters."""

    max_speed: float | None = None
    acceleration: float | None = None
    max_speed_discont: float | None = None

    def __str__(self) -> str:
        """Convert to string."""
        v = "V" + str(self.max_speed) if self.max_speed else ""
        a = "A" + str(self.acceleration) if self.acceleration else ""
        d = "D" + str(self.max_speed_discont) if self.max_speed_discont else ""
        return f"{v} {a} {d}".strip()


class FlexStacker:
    """FLEX Stacker Driver."""

    @classmethod
    def build(cls, port: str = "") -> "FlexStacker":
        """Build FLEX Stacker driver."""
        if not port:
            for i in comports():
                if i.vid == STACKER_VID and i.pid == STACKER_PID:
                    port = i.device
                    break
        assert port, "could not find connected FLEX Stacker"
        return cls(port)

    @classmethod
    def build_simulator(cls, port: str = "") -> "FlexStacker":
        """Build FLEX Stacker simulator."""
        return cls(port, simulating=True)

    def __init__(self, port: str, simulating: bool = False) -> None:
        """Constructor."""
        self._simulating = simulating
        if not self._simulating:
            self._serial = serial.Serial(port, baudrate=STACKER_FREQ, timeout=60)

    def _send_and_recv(
        self, msg: str, guard_ret: str = "", response_required: bool = True
    ) -> str:
        """Internal utility to send a command and receive the response."""
        assert not self._simulating
        self._serial.reset_input_buffer()
        self._serial.write(msg.encode())
        if not response_required:
            return "OK\n"
        ret = self._serial.readline()
        if guard_ret:
            if not ret.startswith(guard_ret.encode()):
                raise RuntimeError(f"Incorrect Response: {ret}")
        if ret.startswith("ERR".encode()):
            raise RuntimeError(ret)
        return ret.decode()

    def get_device_info(self) -> StackerInfo:
        """Get Device Info."""
        if self._simulating:
            return StackerInfo(
                "STACKER-FW", HardwareRevision.EVT, "STACKER-SIMULATOR-SN"
            )

        _DEV_INFO_RE = re.compile(
            "^M115 FW:(?P<fw>.+) HW:Opentrons-flex-stacker-(?P<hw>.+) SerialNo:(?P<sn>.+) OK\n"
        )
        res = self._send_and_recv("M115\n", "M115 FW:")
        m = _DEV_INFO_RE.match(res)
        if not m:
            raise RuntimeError(f"Incorrect Response: {res}")
        return StackerInfo(
            m.group("fw"), HardwareRevision(m.group("hw")), m.group("sn")
        )

    def set_serial_number(self, sn: str) -> None:
        """Set Serial Number."""
        if self._simulating:
            return
        self._send_and_recv(f"M996 {sn}\n", "M996 OK")

    def stop_motor(self) -> None:
        """Stop motor movement."""
        if self._simulating:
            return
        self._send_and_recv("M0\n", response_required=False)

    def get_limit_switch(self, axis: StackerAxis, direction: Direction) -> bool:
        """Get limit switch status.

        :return: True if limit switch is triggered, False otherwise
        """
        if self._simulating:
            return True

        _LS_RE = re.compile(rf"^M119 .*{axis.name}{direction.name[0]}:(\d).* OK\n")
        res = self._send_and_recv("M119\n", "M119 XE:")
        match = _LS_RE.match(res)
        assert match, f"Incorrect Response for limit switch: {res}"
        return bool(int(match.group(1)))

    def get_platform_sensor(self, direction: Direction) -> bool:
        """Get platform sensor status.

        :return: True if platform is present, False otherwise
        """
        if self._simulating:
            return True

        _LS_RE = re.compile(rf"^M121 .*{direction.name[0]}:(\d).* OK\n")
        res = self._send_and_recv("M121\n", "M121 E:")
        match = _LS_RE.match(res)
        assert match, f"Incorrect Response for platform sensor: {res}"
        return bool(int(match.group(1)))

    def get_platform_status(self) -> PlatformStatus:
        """Get platform status."""
        if self._simulating:
            return PlatformStatus.REMOVED

        _LS_RE = re.compile(r"^M121 E:(\d) R:(\d) OK\n")
        res = self._send_and_recv("M121\n", "M121 ")
        match = _LS_RE.match(res)
        assert match, f"Incorrect Response for platform status: {res}"
        return PlatformStatus.from_tuple((int(match.group(1)), int(match.group(2))))

    def get_hopper_door_closed(self) -> bool:
        """Get whether or not door is closed.

        :return: True if door is closed, False otherwise
        """
        if self._simulating:
            return True

        _LS_RE = re.compile(r"^M122 (\d) OK\n")
        res = self._send_and_recv("M122\n", "M122 ")
        match = _LS_RE.match(res)
        assert match, f"Incorrect Response for hopper door switch: {res}"
        return bool(int(match.group(1)))

    def get_estop(self) -> bool:
        """Get E-Stop status.

        :return: True if E-Stop is triggered, False otherwise
        """
        if self._simulating:
            return True

        _LS_RE = re.compile(r"^M112 (\d) OK\n")
        res = self._send_and_recv("M112\n", "M112 ")
        match = _LS_RE.match(res)
        assert match, f"Incorrect Response for E-Stop switch: {res}"
        return bool(int(match.group(1)))

    def move_in_mm(
        self, axis: StackerAxis, distance: float, params: MoveParams | None = None
    ) -> None:
        """Move axis."""
        if self._simulating:
            return
        self._send_and_recv(f"G0 {axis.name}{distance} {params or ''}\n", "G0 OK")

    def move_to_limit_switch(
        self, axis: StackerAxis, direction: Direction, params: MoveParams | None = None
    ) -> None:
        """Move until limit switch is triggered."""
        if self._simulating:
            return
        self._send_and_recv(
            f"G5 {axis.name}{direction.value} {params or ''}\n", "G5 OK"
        )

    def __del__(self) -> None:
        """Close serial port."""
        if not self._simulating:
            self.stop_motor()
            self._serial.close()
