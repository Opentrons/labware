"""Asair sensor driver.

This library is for the temperature and humidity sensor used with the
pipette gravimetric fixture. The sensor outputs temperature and
relative humidity that is recorded onto the pipette results.
"""
import abc
import codecs
import logging
import time
from typing import Tuple
from abc import ABC
from dataclasses import dataclass
from . import list_ports_and_select
import serial  # type: ignore[import]
from serial.serialutil import SerialException  # type: ignore[import]
from hardware_testing.data import ui

from serial.tools.list_ports import comports  # type: ignore[import]

log = logging.getLogger(__name__)

USB_VID = 0x0403
USB_PID = 0x6001


addrs = {
    "01": "C40B",
    "02": "C438",
    "03": "C5E9",
    "04": "C45E",
    "05": "C58F",
    "06": "C5BC",
    "07": "C46D",
    "08": "C492",
    "09": "C543",
    "10": "C74A",
    "0A": "48d9",
}


class AsairSensorError(Exception):
    """Asair sensor error."""

    def __init__(self, ret_code: str = "") -> None:
        """Constructor."""
        super().__init__(ret_code)


@dataclass
class Reading:
    """An asair sensor reading."""

    temperature: float
    relative_humidity: float


class AsairSensorBase(ABC):
    """Abstract base class of sensor."""

    @classmethod
    def vid_pid(cls) -> Tuple[int, int]:
        """Asair sensor VID:PID."""
        return USB_VID, USB_PID

    @abc.abstractmethod
    def get_reading(self) -> Reading:
        """Get a temp and humidity reading."""
        ...

    @abc.abstractmethod
    def get_serial(self) -> str:
        """Read the device ID register."""
        ...


def BuildAsairSensor(
    simulate: bool, autosearch: bool = True, port_substr: str = ""
) -> AsairSensorBase:
    """Try to find and return an Asair sensor, if not found return a simulator."""
    ui.print_title("Connecting to Environmental sensor")
    if not simulate:
        if not autosearch:
            port = list_ports_and_select(
                device_name="Asair environmental sensor", port_substr=port_substr
            )
            sensor = AsairSensor.connect(port)
            ui.print_info(f"Found sensor on port {port}")
            return sensor
        else:
            ports = comports()
            assert ports
            for _port in ports:
                port = _port.device  # type: ignore[attr-defined]
                try:
                    ui.print_info(f"Trying to connect to env sensor on port {port}")
                    sensor = AsairSensor.connect(port)
                    ser_id = sensor.get_serial()
                    if ser_id == " ":
                        ui.print_info(f"Found env sensor {ser_id} on port {port}")
                        return sensor
                except:  # noqa: E722
                    pass
            use_sim = ui.get_user_answer("No env sensor found, use simulator?")
            if not use_sim:
                raise SerialException("No sensor found")
    ui.print_info("no sensor found returning simulator")
    return SimAsairSensor()


class AsairSensor(AsairSensorBase):
    """Asair sensor driver."""

    def __init__(self, connection: serial.Serial, sensor_address: str = "01") -> None:
        """Constructor.

        :param connection: The serial connection
        :param sensor_address: The sensor address
        """
        self._sensor_address = sensor_address
        self._th_sensor = connection

    @classmethod
    def connect(
        cls,
        port: str,
        baudrate: int = 9600,
        timeout: float = 5,
        sensor_address: str = "01",
    ) -> "AsairSensor":
        """Create a driver.

        :param port: Port to connect to
        :param baudrate: The baud rate
        :param timeout: Timeout
        :param sensor_address: The sensor address
        :return: Connected driver.
        """
        try:
            connection = serial.Serial(
                port=port,
                baudrate=baudrate,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                bytesize=serial.EIGHTBITS,
                timeout=timeout,
            )
            return cls(connection, sensor_address)
        except SerialException:
            error_msg = (
                "Unable to access Serial port to Scale: \n"
                "1. Check that the scale is plugged into the computer. \n"
                "2. Check if the assigned port is correct. \n"
            )
            raise SerialException(error_msg)

    def get_reading(self) -> Reading:
        """Get a reading."""
        data_packet = "{}0300000002{}".format(
            self._sensor_address, addrs[self._sensor_address]
        )
        log.debug(f"sending {data_packet}")
        command_bytes = codecs.decode(data_packet.encode(), "hex")
        try:
            self._th_sensor.flushInput()
            self._th_sensor.flushOutput()
            self._th_sensor.write(command_bytes)
            time.sleep(0.1)

            length = self._th_sensor.inWaiting()
            res = self._th_sensor.read(length)
            log.debug(f"received {res}")

            res = codecs.encode(res, "hex")
            relative_hum = res[6:10]
            temp = res[10:14]
            log.info(f"Temp: {temp}, RelativeHum: {relative_hum}")

            temp = float(int(temp, 16)) / 10
            relative_hum = float(int(relative_hum, 16)) / 10
            return Reading(temperature=temp, relative_humidity=relative_hum)

        except (IndexError, ValueError) as e:
            log.exception("Bad value read")
            raise AsairSensorError(str(e))
        except SerialException:
            log.exception("Communication error")
            error_msg = "Asair Sensor not connected. Check if port number is correct."
            raise AsairSensorError(error_msg)

    def get_serial(self) -> str:
        """Read the device ID register."""
        data_packet = "{}0300000002{}".format(
            self._sensor_address, addrs[self._sensor_address]
        )
        log.debug(f"sending {data_packet}")
        command_bytes = codecs.decode(data_packet.encode(), "hex")
        try:
            self._th_sensor.flushInput()
            self._th_sensor.flushOutput()
            self._th_sensor.write(command_bytes)
            time.sleep(0.1)

            length = self._th_sensor.inWaiting()
            res = self._th_sensor.read(length)
            res = codecs.encode(res, "hex")
            log.debug(f"received {res}")
            dev_id = res[6:14]
            return dev_id.decode()

        except (IndexError, ValueError) as e:
            log.exception("Bad value read")
            raise AsairSensorError(str(e))
        except SerialException:
            log.exception("Communication error")
            error_msg = "Asair Sensor not connected. Check if port number is correct."
            raise AsairSensorError(error_msg)


class SimAsairSensor(AsairSensorBase):
    """Simulating Asair sensor driver."""

    def get_serial(self) -> str:
        """Read the device ID register."""
        return "0102030405060708"

    def get_reading(self) -> Reading:
        """Get a reading."""
        temp = 25.0
        relative_hum = 50.0
        return Reading(temperature=temp, relative_humidity=relative_hum)
