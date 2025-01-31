from __future__ import annotations
from typing_extensions import Final
import enum


# TODO (tz, 5-18-23): think about a better name for it that would also work when we include staging area slots in the type.
class OffDeckType(enum.Enum):
    OFF_DECK = "off-deck"


OFF_DECK: Final = OffDeckType.OFF_DECK

# Set __doc__ manually as a workaround. When this docstring is written the normal way, right after
# the constant definition, Sphinx has trouble picking it up.
OFF_DECK.__doc__ = """\
A special location value, indicating that a labware is not currently on the robot's deck.

See :ref:`off-deck-location` for details on using ``OFF_DECK`` with :py:obj:`ProtocolContext.move_labware()`.
"""


class PlungerPositionTypes(enum.Enum):
    PLUNGER_TOP = "top"
    PLUNGER_BOTTOM = "bottom"
    PLUNGER_BLOWOUT = "blow_out"
    PLUNGER_DROPTIP = "drop_tip"


PLUNGER_TOP: Final = PlungerPositionTypes.PLUNGER_TOP
PLUNGER_BOTTOM: Final = PlungerPositionTypes.PLUNGER_BOTTOM
PLUNGER_BLOWOUT: Final = PlungerPositionTypes.PLUNGER_BLOWOUT
PLUNGER_DROPTIP: Final = PlungerPositionTypes.PLUNGER_DROPTIP


class PipetteActionTypes(enum.Enum):
    ASPIRATE_ACTION = "aspirate"
    DISPENSE_ACTION = "dispense"
    BLOWOUT_ACTION = "blowout"


ASPIRATE_ACTION: Final = PipetteActionTypes.ASPIRATE_ACTION
DISPENSE_ACTION: Final = PipetteActionTypes.DISPENSE_ACTION
BLOWOUT_ACTION: Final = PipetteActionTypes.BLOWOUT_ACTION
