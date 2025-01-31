"""Common resources for all advanced control functions."""
import enum
from typing import NamedTuple, Optional


class MixStrategy(enum.Enum):
    BOTH = enum.auto()
    BEFORE = enum.auto()
    AFTER = enum.auto()
    NEVER = enum.auto()


class MixOpts(NamedTuple):
    """
    Options to customize behavior of mix.

    These options will be passed to
    :py:meth:`InstrumentContext.mix` when it is called during the
    transfer.
    """

    repetitions: Optional[int] = None
    volume: Optional[float] = None
    rate: Optional[float] = None


MixOpts.repetitions.__doc__ = ":py:class:`int`"
MixOpts.volume.__doc__ = ":py:class:`float`"
MixOpts.rate.__doc__ = ":py:class:`float`"


class Mix(NamedTuple):
    """
    Options to control mix behavior before aspirate and after dispense.
    """

    mix_before: MixOpts = MixOpts()
    mix_after: MixOpts = MixOpts()
