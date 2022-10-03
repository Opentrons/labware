"""Entrypoint for the USB-TCP bridge application."""
import asyncio
import logging
import select
import time
from typing import NoReturn, Optional
import serial  # type: ignore[import]

from .src import cli, usb_config, default_config, usb_monitor

LOG = logging.getLogger(__name__)


def update_ser_handle(
    config: usb_config.SerialGadget, ser: Optional[serial.Serial], connected: bool
) -> Optional[serial.Serial]:
    """Updates the serial handle for connections and disconnections.

    Args:
        config: Serial gadget configuration
        ser: Handle for the serial port
        connected: Whether the monitor reports the serial handle as
        connected or not
    """
    if ser and not connected:
        LOG.info("USB host disconnected")
        ser = None
    elif connected:
        LOG.info("New USB host connected")
        ser = config.get_handle()
    return ser


def listen(
    monitor: usb_monitor.USBConnectionMonitor,
    config: usb_config.SerialGadget,
    ser: Optional[serial.Serial],
) -> Optional[serial.Serial]:
    """Process any available incoming data.

    This function will check for input from any of the input sources to the
    USB bridge:
        - The serial port, if it is available
        - The UDEV message stream (usb_monitor)
        - The TCP connection to the NGINX server, if a connection is open

    Args:
        monitor: The USB connection monitor
        config: Serial gadget configuration
        ser: Handle for the serial port
    """
    rlist = [monitor]
    if ser:
        rlist.append(ser)
    ready = select.select(rlist, [], [])[0]
    if monitor in ready:
        # Read a new udev messages
        monitor.read_message()
        ser = update_ser_handle(config, ser, monitor.host_connected())
    if ser and ser in ready:
        # Ready serial data
        data = ser.read_all()
        LOG.debug(f"Received: {data}")
        ser.write(data)
    return ser


async def main() -> NoReturn:
    """Entrypoint for USB-TCP bridge."""
    parser = cli.build_root_parser()
    args = parser.parse_args()

    numeric_level = getattr(logging, args.log_level.upper())
    logging.basicConfig(level=numeric_level)

    LOG.info("Starting USB-TCP bridge")

    config = usb_config.SerialGadget(
        driver=usb_config.OSDriver(), config=default_config.default_gadget
    )

    try:
        config.configure_and_activate()
        LOG.info("Configured UDC as USB gadget")
    except BaseException as err:
        LOG.error("Failed to configure UDC as USB gadget")
        LOG.error(f"Exception: {format(err)}")
        exit(-1)

    # Give the kernel a couple seconds to set up the handle
    timeout = time.time() + 2.0
    while time.time() < timeout and not config.handle_exists():
        time.sleep(0.1)

    if not config.handle_exists():
        LOG.error("udev did not generate a serial handle")
        exit(-1)

    ser = None

    monitor = usb_monitor.USBConnectionMonitor(
        phy_udev_name="usbphynop1", udc_folder=config.udc_folder()
    )

    # After the gadget starts up, need time to populate state
    time.sleep(1)

    monitor.begin()

    if monitor.host_connected():
        LOG.info("USB connected on startup")
        ser = config.get_handle()

    while True:
        ser = listen(monitor, config, ser)


if __name__ == "__main__":
    asyncio.run(main())
