"""Interface with opentrons modules!"""
from serial import Serial  # type: ignore[import-untyped]
import asyncio
import subprocess
from typing import Any

# Generic
_READ_ALL = "readall"
_READ_LINE = "read"
_DONE = "done"

# TC commands
_MOVE_SEAL = "ms"
_MOVE_LID = "ml"
tc_gcode_shortcuts = {
    "status": "M119",
    _MOVE_SEAL: "M241.D",  # move seal motor
    _MOVE_LID: "M240.D",  # move lid stepper motor
    "ol": "M126",  # open lid
    "cl": "M127",  # close lid
    "sw": "M901.D",  # status of all switches
    "lt": "M141.D",  # get lid temperature
    "pt": "M105.D",  # get plate temperature
}

# HS Commands
hs_gcode_shortcuts = {
    "srpm": "M3 S{rpm}",  # Set RPM
    "grpm": "M123",  # Get RPM
    "home": "G28",  # Home
    "deactivate": "M106",  # Deactivate
}

gcode_shortcuts = tc_gcode_shortcuts | hs_gcode_shortcuts


async def message_read(dev: Serial) -> Any:
    """Read message."""
    response = dev.readline().decode()
    while not response:
        await asyncio.sleep(1)
        response = dev.readline().decode()
    return response


async def message_return(dev: Serial) -> Any:
    """Wait until message becomes available."""
    try:
        response = await asyncio.wait_for(message_read(dev), timeout=30)
        return response
    except asyncio.exceptions.TimeoutError:
        print("response timed out.")
        return ""


async def handle_module_gcode_shortcut(
    dev: Serial, command: str, in_commands: bool, output: str = ""
) -> None:
    """Handle debugging commands that require followup."""
    if in_commands:
        if command == _MOVE_SEAL:
            distance = input("enter distance in steps => ")
            dev.write(
                f"{gcode_shortcuts[command]} {distance}\n".encode()
            )  # (+) -> retract, (-) -> engage
            # print(await message_return(dev))
        elif command == _MOVE_LID:
            distance = input(
                "enter angular distance in degrees => "
            )  # (+) -> open, (-) -> close
            dev.write(f"{gcode_shortcuts[command]} {distance}\n".encode())
            # print(await message_return(dev))
        # everything else
        else:
            dev.write(f"{gcode_shortcuts[command]}\n".encode())
    else:
        dev.write(f"{command}\n".encode())
    try:
        mr = await message_return(dev)
        print(mr)
    except TypeError:
        print("Invalid input")
        return

    if output:
        try:
            with open(output, "a") as result_file:
                if "OK" in mr:
                    status = command + ": SUCCESS"
                else:
                    status = command + ": FAILURE"
                result_file.write(status)
                result_file.write(f"    {mr}")
            result_file.close()
        except FileNotFoundError:
            print(f"cannot open file: {output}")


async def comms_loop(dev: Serial, commands: list, output: str = "") -> bool:
    """Loop for commands."""
    _exit = False
    try:
        command = commands.pop(0)
    except IndexError:
        command = input("\n>>> ")
    if command == _READ_ALL:
        print(dev.readlines())
    elif command == _READ_LINE:
        print(dev.readline())
    elif command == _DONE:
        _exit = True
    elif command in gcode_shortcuts:
        await handle_module_gcode_shortcut(dev, command, True, output)
    else:
        await handle_module_gcode_shortcut(dev, command, False, output)
    return _exit


async def _main(module: str, commands: list = [], output: str = "") -> bool:
    """Main process."""
    module_name = (
        subprocess.check_output(["find", "/dev/", "-name", f"*{module}*"])
        .decode()
        .strip()
    )
    if not module_name:
        print(f"{module} not found. Exiting.")
        return False
    dev = Serial(f"{module_name}", 9600, timeout=2)
    _exit = False
    while not _exit:
        _exit = await comms_loop(dev, commands, output)
    dev.close()
    return True


if __name__ == "__main__":
    asyncio.run(_main("heatershaker"))
