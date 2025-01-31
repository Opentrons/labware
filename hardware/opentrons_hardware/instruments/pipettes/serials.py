"""Handle parsing and providing pipette information."""
import re
from typing import Dict, Tuple
import struct
from opentrons_shared_data.errors.exceptions import (
    InvalidInstrumentData,
    PythonException,
)
from opentrons_hardware.firmware_bindings.constants import PipetteName
from opentrons_hardware.instruments.serial_utils import ensure_serial_length

# Separate string into 3 named groups:
#   - name P any
#   - model
#   - code

RAW_SERIAL_STRING = (
    "^"  # start of string
    r"(?P<name>P[\w\d]{3})"  # "name" group starts with P and contains exactly 3 alphanumeric characters
    "V"  # The character V
    r"(?P<model>\d{2})"  # "model" group contains exactly 2 digits
    r"(?P<code>[\w\d]{0,12})"  # "code" group contains 0 to 12 inclusive alphanumeric characters
    "$"  # end of string
)
SERIAL_RE = re.compile(RAW_SERIAL_STRING)

NAME_LOOKUP: Dict[str, PipetteName] = {
    "P1KS": PipetteName.p1000_single,
    "P1KM": PipetteName.p1000_multi,
    "P1KP": PipetteName.p1000_multi_em,
    "P50S": PipetteName.p50_single,
    "P50M": PipetteName.p50_multi,
    "P1KH": PipetteName.p1000_96,
    "P50H": PipetteName.p50_96,
    "P2HH": PipetteName.p200_96,
}

SERIAL_FORMAT_MSG = (
    f'Serial numbers must have the format PNNNVMMXXXXXX... where NNN is one of {", ".join(NAME_LOOKUP.keys())}, '
    "MM is a two-digit model number, and the rest is some serial code."
)


def info_from_serial_string(serialval: str) -> Tuple[PipetteName, int, bytes]:
    """Parse pipette information from a serial code.

    The return value is the serial parts: the name, the model, and the serial.

    Note: this is not the inverse of serial_val_from_parts. The input should be
    something a human scans, not something returned from a pipette. A bytestring
    from a pipette is probably not valid ascii and even if it is, you won't get
    the expected values from passing it to this function.
    """
    matches = SERIAL_RE.match(serialval.strip())
    if not matches:
        raise InvalidInstrumentData(
            message=f"The serial number {serialval.strip()} is not valid. {SERIAL_FORMAT_MSG}",
            detail={"serial": serialval},
        )
    try:
        name = NAME_LOOKUP[matches.group("name")]
    except KeyError:
        raise InvalidInstrumentData(
            message=f"The pipette name part of the serial number ({matches.group('name')}) is unknown. {SERIAL_FORMAT_MSG}",
            detail={"name": matches.group("name")},
        )
    model = int(matches.group("model"))

    return (
        name,
        model,
        ensure_serial_length(matches.group("code").encode("ascii")),
    )


def serial_val_from_parts(name: PipetteName, model: int, serialval: bytes) -> bytes:
    """Encode pipette information into a bytestring suitable for EEPROM storage.

    Note: this is not the inverse of info_from_serial_string. info_from_serial_string
    parses information from a human-entered string that is probably the pipette barcode.
    This function takes that information and specifically encodes it in a bytestring for
    storage on the pipette, which includes binary data. If you call

    serial_val_from_parts(*info_from_serial_str(somestr.encode('ascii'))).decode('ascii')

    you will not get what you put in.
    """
    try:
        return struct.pack(
            ">HH16s",
            name.value,
            model,
            ensure_serial_length(serialval),
        )
    except struct.error as e:
        raise InvalidInstrumentData(
            message="Invalid pipette serial",
            detail={"name": str(name), "model": str(model), "serial": str(serialval)},
            wrapping=[PythonException(e)],
        )
