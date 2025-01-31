import enum
from typing import (
    Any,
    Dict,
    List,
    Optional,
    Union,
    NamedTuple,
    Callable,
    Generator,
    Iterator,
    Sequence,
    Tuple,
    TypedDict,
    TypeAlias,
    TYPE_CHECKING,
)
from opentrons.protocol_api.labware import Labware, Well
from opentrons import types
from opentrons.protocols.api_support.types import APIVersion

from . import common as tx_commons
from ..common import Mix, MixOpts, MixStrategy

AdvancedLiquidHandling = Union[
    Well,
    types.Location,
    Sequence[Union[Well, types.Location]],
    Sequence[Sequence[Well]],
]


class TransferStep(TypedDict):
    method: str
    args: Optional[List[Any]]
    kwargs: Optional[Dict[Any, Any]]


if TYPE_CHECKING:
    from opentrons.protocol_api import InstrumentContext

_PARTIAL_TIP_SUPPORT_ADDED = APIVersion(2, 18)
"""The version after which partial tip support and nozzle maps were made available."""


class DropTipStrategy(enum.Enum):
    TRASH = enum.auto()
    RETURN = enum.auto()


class TouchTipStrategy(enum.Enum):
    NEVER = enum.auto()
    ALWAYS = enum.auto()


class BlowOutStrategy(enum.Enum):
    NONE = enum.auto()
    TRASH = enum.auto()
    DEST = enum.auto()
    SOURCE = enum.auto()
    CUSTOM_LOCATION = enum.auto()


class TransferMode(enum.Enum):
    DISTRIBUTE = enum.auto()
    CONSOLIDATE = enum.auto()
    TRANSFER = enum.auto()


class Transfer(NamedTuple):
    """
    Options pertaining to behavior of the transfer.

    """

    new_tip: types.TransferTipPolicy = types.TransferTipPolicy.ONCE
    air_gap: float = 0
    carryover: bool = True
    gradient_function: Optional[Callable[[float], float]] = None
    disposal_volume: float = 0
    mix_strategy: MixStrategy = MixStrategy.NEVER
    drop_tip_strategy: DropTipStrategy = DropTipStrategy.TRASH
    blow_out_strategy: BlowOutStrategy = BlowOutStrategy.NONE
    touch_tip_strategy: TouchTipStrategy = TouchTipStrategy.NEVER


Transfer.new_tip.__doc__ = """
    Control when or if to pick up tip during a transfer

    :py:attr:`types.TransferTipPolicy.ALWAYS`
        Drop and pick up a new tip after each dispense.

    :py:attr:`types.TransferTipPolicy.ONCE`
        Pick up tip at the beginning of the transfer and use it
        throughout the transfer. This would speed up the transfer.

    :py:attr:`types.TransferTipPolicy.NEVER`
        Do not ever pick up or drop tip. The protocol should explicitly
        pick up a tip before transfer and drop it afterwards.

    To customize where to drop tip, see :py:attr:`.drop_tip_strategy`.
    To customize the behavior of pickup tip, see
    :py:attr:`.TransferOptions.pick_up_tip`.
    """

Transfer.air_gap.__doc__ = """
    Controls the volume (in uL) of air gap aspirated when moving to
    dispense.

    Adding an air gap would slow down a transfer since less liquid will
    now fit in the pipette but it prevents the loss of liquid while
    moving between wells.
    """

Transfer.carryover.__doc__ = """
    Controls whether volumes larger than pipette's max volume will be
    split into smaller volumes.
    """

Transfer.gradient_function.__doc__ = """
    Specify a nonlinear gradient for volumes.

    This should be a function that takes a single float between 0 and 1
    and returns a single float between 0 and 1. This function is used
    to determine the path the transfer takes between the volume
    gradient minimum and maximum if the transfer volume is specified as
    a gradient. For instance, specifying the function as

    .. code-block:: python

        def gradient(a):
            if a > 0.5:
                return 1.0
            else:
                return 0.0

    would transfer the minimum volume of the gradient to the first half
    of the target wells, and the maximum to the other half.
    """

Transfer.disposal_volume.__doc__ = """
    The amount of liquid (in uL) to aspirate as a buffer.

    The remaining buffer will be blown out into the location specified
    by :py:attr:`.blow_out_strategy`.

    This is useful to avoid under-pipetting but can waste reagent and
    slow down transfer.
    """

Transfer.mix_strategy.__doc__ = """
    If and when to mix during a transfer.

    :py:attr:`MixStrategy.NEVER`
        Do not ever perform a mix during the transfer.

    :py:attr:`MixStrategy.BEFORE`
        Mix before each aspirate.

    :py:attr:`MixStrategy.AFTER`
        Mix after each dispense.

    :py:attr:`MixStrategy.BOTH`
        Mix before each aspirate and after each dispense.

    To customize the mix behavior, see :py:attr:`.TransferOptions.mix`
    """

Transfer.drop_tip_strategy.__doc__ = """
    Specifies the location to drop tip into.

    :py:attr:`DropTipStrategy.TRASH`
        Drop the tip into the trash container.

    :py:attr:`DropTipStrategy.RETURN`
        Return the tip to tiprack.
    """

Transfer.blow_out_strategy.__doc__ = """
    Specifies the location to blow out the liquid in the pipette to.

    :py:attr:`BlowOutStrategy.TRASH`
        Blow out to trash container.

    :py:attr:`BlowOutStrategy.SOURCE`
        Blow out into the source well in order to dispense any leftover
        liquid.

    :py:attr:`BlowOutStrategy.DEST`
        Blow out into the destination well in order to dispense any leftover
        liquid.

    :py:attr:`BlowOutStrategy.CUSTOM_LOCATION`
        If using any other location to blow out to. Specify the location in
        :py:attr:`.TransferOptions.blow_out`.
    """

Transfer.touch_tip_strategy.__doc__ = """
    Controls whether to touch tip during the transfer

    This helps in getting rid of any droplets clinging to the pipette
    tip at the cost of slowing down the transfer.

    :py:attr:`TouchTipStrategy.NEVER`
        Do not touch tip ever during the transfer.

    :py:attr:`TouchTipStrategy.ALWAYS`
        Touch tip after each aspirate.

    To customize the behavior of touch tips, see
    :py:attr:`.TransferOptions.touch_tip`.
    """


class PickUpTipOpts(NamedTuple):
    """
    Options to customize :py:attr:`.Transfer.new_tip`.

    These options will be passed to
    :py:meth:`InstrumentContext.pick_up_tip` when it is called during
    the transfer.
    """

    location: Optional[types.Location] = None
    presses: Optional[int] = None
    increment: Optional[int] = None


PickUpTipOpts.location.__doc__ = ":py:class:`types.Location`"
PickUpTipOpts.presses.__doc__ = ":py:class:`int`"
PickUpTipOpts.increment.__doc__ = ":py:class:`int`"


Mix.mix_before.__doc__ = """
    Options applied to mix before aspirate.
    See :py:class:`.Mix.MixOpts`.
    """

Mix.mix_after.__doc__ = """
    Options applied to mix after dispense. See :py:class:`.Mix.MixOpts`.
    """


class BlowOutOpts(NamedTuple):
    """
    Location where to blow out instead of the trash.

    This location will be passed to :py:meth:`InstrumentContext.blow_out`
    when called during the transfer
    """

    location: Optional[Union[types.Location, Well]] = None


BlowOutOpts.location.__doc__ = ":py:class:`types.Location`"


class TouchTipOpts(NamedTuple):
    """
    Options to customize touch tip.

    These options will be passed to
    :py:meth:`InstrumentContext.touch_tip` when called during the
    transfer.
    """

    radius: Optional[float] = None
    v_offset: Optional[float] = None
    speed: Optional[float] = None


TouchTipOpts.radius.__doc__ = ":py:class:`float`"
TouchTipOpts.v_offset.__doc__ = ":py:class:`float`"
TouchTipOpts.speed.__doc__ = ":py:class:`float`"


class AspirateOpts(NamedTuple):
    """
    Option to customize aspirate rate.

    This option will be passed to :py:meth:`InstrumentContext.aspirate`
    when called during the transfer.
    """

    rate: Optional[float] = 1.0


AspirateOpts.rate.__doc__ = ":py:class:`float`"


class DispenseOpts(NamedTuple):
    """
    Option to customize dispense rate.

    This option will be passed to :py:meth:`InstrumentContext.dispense`
    when called during the transfer.
    """

    rate: Optional[float] = 1.0


DispenseOpts.rate.__doc__ = ":py:class:`float`"


class TransferOptions(NamedTuple):
    """
    All available options for a transfer, distribute or consolidate function
    """

    transfer: Transfer = Transfer()
    pick_up_tip: PickUpTipOpts = PickUpTipOpts()
    mix: Mix = Mix()
    blow_out: BlowOutOpts = BlowOutOpts()
    touch_tip: TouchTipOpts = TouchTipOpts()
    aspirate: AspirateOpts = AspirateOpts()
    dispense: DispenseOpts = DispenseOpts()


FormatDictArgs: TypeAlias = Union[
    PickUpTipOpts, MixOpts, BlowOutOpts, TouchTipOpts, AspirateOpts, DispenseOpts
]


TransferOptions.transfer.__doc__ = """
    Options pertaining to behavior of the transfer.

    For instance you can control how frequently to get a new tip using
    :py:attr:`.Transfer.new_tip`. For documentation of all transfer options
    see :py:class:`.Transfer`.
    """

TransferOptions.pick_up_tip.__doc__ = """
    Options used when picking up a tip during transfer.
    See :py:class:`.PickUpTipOpts`.
    """

TransferOptions.mix.__doc__ = """
    Options to control mix behavior before aspirate and after dispense.
    See :py:class:`.Mix`.
    """

TransferOptions.blow_out.__doc__ = """
    Option to specify custom location for blow out. See
    :py:class:`.BlowOutOpts`.
    """

TransferOptions.touch_tip.__doc__ = """
    Options to customize touch tip. See
    :py:class:`.TouchTipOpts`.
    """

TransferOptions.aspirate.__doc__ = """
    Option to customize aspirate rate. See
    :py:class:`.AspirateOpts`.
    """

TransferOptions.dispense.__doc__ = """
    Option to customize dispense rate. See
    :py:class:`.DispenseOpts`.
    """


class TransferPlan:
    """Calculate and carry state for an arbitrary transfer

    This class encapsulates the logic around planning an M:N transfer.

    It handles calculations based on pipette channels, tip management, and all
    the various little commands that can be involved in a transfer. It can be
    iterated to resolve methods to call to execute the plan.
    """

    def __init__(
        self,
        volume: Union[float, Sequence[float]],
        srcs: AdvancedLiquidHandling,
        dsts: AdvancedLiquidHandling,
        # todo(mm, 2021-03-10):
        # Refactor to not need an InstrumentContext, so we can more
        # easily test this class's logic on its own.
        instr: "InstrumentContext",
        max_volume: float,
        api_version: APIVersion,
        mode: str,
        options: Optional[TransferOptions] = None,
    ) -> None:
        """Build the transfer plan.

        This method initializes the object and does the work of preparing the
        transfer plan. Its arguments are as those of
        :py:meth:`.InstrumentContext.transfer`.
        """
        self._instr = instr
        self._api_version = api_version
        # Convert sources & dests into proper format
        # CASES:
        # i. if using multi-channel pipette,
        # and the source or target is a row/column of Wells (i.e list of Wells)
        # then avoid iterating through its Wells.
        # ii. if using single channel pipettes, flatten a multi-dimensional
        # list of Wells into a 1 dimensional list of Wells
        pipette_configuration_type = types.NozzleConfigurationType.FULL
        normalized_sources: List[Union[Well, types.Location]]
        normalized_dests: List[Union[Well, types.Location]]
        if self._api_version >= _PARTIAL_TIP_SUPPORT_ADDED:
            pipette_configuration_type = (
                self._instr._core.get_nozzle_map().configuration
            )
        if (
            self._instr.channels > 1
            and pipette_configuration_type == types.NozzleConfigurationType.FULL
        ):
            normalized_sources, normalized_dests = self._multichannel_transfer(
                srcs, dsts
            )
        else:
            if isinstance(srcs, List):
                if isinstance(srcs[0], List):
                    # Source is a List[List[Well]]
                    normalized_sources = [
                        well for well_list in srcs for well in well_list
                    ]
                else:
                    normalized_sources = srcs
            elif isinstance(srcs, Well) or isinstance(srcs, types.Location):
                normalized_sources = [srcs]
            if isinstance(dsts, List):
                if isinstance(dsts[0], List):
                    # Dest is a List[List[Well]]
                    normalized_dests = [
                        well for well_list in dsts for well in well_list
                    ]
                else:
                    normalized_dests = dsts
            elif isinstance(dsts, Well) or isinstance(dsts, types.Location):
                normalized_dests = [dsts]

        total_xfers = max(len(normalized_sources), len(normalized_dests))

        self._volumes = self._create_volume_list(volume, total_xfers)
        self._sources = normalized_sources
        self._dests = normalized_dests
        self._options = options or TransferOptions()
        self._strategy = self._options.transfer
        self._tip_opts = self._options.pick_up_tip
        self._blow_opts = self._options.blow_out
        self._touch_tip_opts = self._options.touch_tip
        self._mix_before_opts = self._options.mix.mix_before
        self._mix_after_opts = self._options.mix.mix_after
        self._max_volume = max_volume

        self._mode = TransferMode[mode.upper()]

    def __iter__(self) -> Iterator[TransferStep]:
        if self._strategy.new_tip == types.TransferTipPolicy.ONCE:
            yield self._format_dict("pick_up_tip", kwargs=self._tip_opts)
        yield from {
            TransferMode.CONSOLIDATE: self._plan_consolidate,
            TransferMode.DISTRIBUTE: self._plan_distribute,
            TransferMode.TRANSFER: self._plan_transfer,
        }[self._mode]()
        if self._strategy.new_tip == types.TransferTipPolicy.ONCE:
            if self._strategy.drop_tip_strategy == DropTipStrategy.RETURN:
                yield self._format_dict("return_tip")
            else:
                yield self._format_dict("drop_tip")

    def _plan_transfer(self) -> Generator[TransferStep, None, None]:
        """
        * **Source/ Dest:** Multiple sources to multiple destinations.
                            Src & dest should be equal length

        * **Volume:** Single volume or List of volumes is acceptable. This list
                      should be same length as sources/destinations

        * **Behavior with transfer options:**

            - New_tip: can be either NEVER or ONCE or ALWAYS
            - Air_gap: if specified, will be performed after every aspirate
            - Blow_out: can be performed after each dispense (after mix, before
                        touch_tip) at the location specified. If there is
                        liquid present in the tip (as in the case of nonzero
                        disposal volume), blow_out will be performed at either
                        user-defined location or (default) trash.
                        If no liquid is supposed to be present in the tip after
                        dispense, blow_out will be performed at dispense well
                        location (if blow out strategy is DEST)
            - Touch_tip: can be performed after each aspirate and/or after
                         each dispense
            - Mix: can be performed before aspirate and/or after dispense
                   if there is no disposal volume (i.e. can be performed
                   only when the tip is supposed to be empty)

            Considering all options, the sequence of actions is:
            *New Tip -> Mix -> Aspirate (with disposal volume) -> Air gap ->
            -> Touch tip -> Dispense air gap -> Dispense -> Mix if empty ->
            -> Blow out -> Touch tip -> Drop tip*
        """
        # reform source target lists
        sources, dests = self._extend_source_target_lists(self._sources, self._dests)
        tx_commons.check_valid_volume_parameters(
            disposal_volume=self._strategy.disposal_volume,
            air_gap=self._strategy.air_gap,
            max_volume=self._instr.max_volume,
        )
        plan_iter = tx_commons.expand_for_volume_constraints(
            self._volumes,
            zip(sources, dests),
            self._instr.max_volume
            - self._strategy.disposal_volume
            - self._strategy.air_gap,
        )
        for step_vol, (src, dest) in plan_iter:
            if self._strategy.new_tip == types.TransferTipPolicy.ALWAYS:
                yield self._format_dict("pick_up_tip", kwargs=self._tip_opts)
            max_vol = (
                self._max_volume
                - self._strategy.disposal_volume
                - self._strategy.air_gap
            )
            xferred_vol = 0.0
            while xferred_vol < step_vol:
                # TODO: account for unequal length sources, dests
                # TODO: ensure last transfer is > min_vol
                vol = min(max_vol, step_vol - xferred_vol)
                yield from self._aspirate_actions(vol, src)
                yield from self._dispense_actions(vol=vol, dest=dest, src=src)
                xferred_vol += vol
            yield from self._new_tip_action()

    @staticmethod
    def _extend_source_target_lists(
        sources: List[Union[Well, types.Location]],
        targets: List[Union[Well, types.Location]],
    ) -> Tuple[List[Union[Well, types.Location]], List[Union[Well, types.Location]]]:
        """Extend source or target list to match the length of the other"""
        if len(sources) < len(targets):
            if len(targets) % len(sources) != 0:
                raise ValueError("Source and destination lists must be divisible")
            sources = [
                source
                for source in sources
                for i in range(int(len(targets) / len(sources)))
            ]
        elif len(sources) > len(targets):
            if len(sources) % len(targets) != 0:
                raise ValueError("Source and destination lists must be divisible")
            targets = [
                target
                for target in targets
                for i in range(int(len(sources) / len(targets)))
            ]
        return sources, targets

    def _plan_distribute(self) -> Generator[TransferStep, None, None]:
        """
        * **Source/ Dest:** One source to many destinations
        * **Volume:** Single volume or List of volumes is acceptable. This list
                      should be same length as destinations
        * **Behavior with transfer options:**

            - New_tip: can be either NEVER or ONCE
                       (ALWAYS will fallback to ONCE)
            - Air_gap: if specified, will be performed after every aspirate and
                       also in-between dispenses (to keep air gap while moving
                       between wells)
            - Blow_out: can be performed at the end of distribute (after mix,
                        before touch_tip) at the location specified. If there
                        is liquid present in the tip, blow_out will be
                        performed at either user-defined location or (default)
                        trash. If no liquid is supposed to be present in the
                        tip at the end of distribute, blow_out will be
                        performed at the last well the liquid was dispensed to
                        (if strategy is DEST)
            - Touch_tip: can be performed after each aspirate and/or after
                         every dispense
            - Mix: can be performed before aspirate and/or after the last
                   dispense if there is no disposal volume (i.e. can be
                   performed only when the tip is supposed to be empty)

            Considering all options, the sequence of actions is:

            1. Going from source to dest1:
               *New Tip -> Mix -> Aspirate (with disposal volume) -> Air gap ->
               -> Touch tip -> Dispense air gap -> Dispense -> Mix if empty ->
               -> Blow out -> Touch tip -> Drop tip*
            2. Going from destn to destn+1:
               *.. Dispense air gap -> Dispense -> Touch tip -> Air gap ->
               .. Dispense air gap -> ...*

        """

        tx_commons.check_valid_volume_parameters(
            disposal_volume=self._strategy.disposal_volume,
            air_gap=self._strategy.air_gap,
            max_volume=self._instr.max_volume,
        )

        # TODO: decide whether default disposal vol for distribute should be
        # pipette min_vol or should we leave it to being 0 by default and
        # recommend users to specify a disposal vol when using distribute.
        # First method keeps distribute consistent with current behavior while
        # the other maintains consistency in default behaviors of all functions
        plan_iter = tx_commons.expand_for_volume_constraints(
            self._volumes,
            self._dests,
            # todo(mm, 2021-03-09): Is it right for this to be
            # _instr_.max_volume? Does/should this take the tip maximum volume
            # into account?
            self._instr.max_volume
            - self._strategy.disposal_volume
            - self._strategy.air_gap,
        )

        done = False
        current_xfer = next(plan_iter)
        if self._strategy.new_tip == types.TransferTipPolicy.ALWAYS:
            yield self._format_dict("pick_up_tip", kwargs=self._tip_opts)
        while not done:
            asp_grouped: List[Tuple[float, Well | types.Location]] = []
            try:
                while (
                    sum(a[0] for a in asp_grouped)
                    + self._strategy.disposal_volume
                    + self._strategy.air_gap
                    + current_xfer[0]
                ) <= self._max_volume:
                    append_xfer = self._check_volume_not_zero(
                        self._api_version, current_xfer[0]
                    )
                    if append_xfer:
                        asp_grouped.append(current_xfer)
                    current_xfer = next(plan_iter)
            except StopIteration:
                done = True
            if not asp_grouped:
                break

            yield from self._aspirate_actions(
                sum(a[0] for a in asp_grouped) + self._strategy.disposal_volume,
                self._sources[0],
            )
            for step in asp_grouped:

                yield from self._dispense_actions(
                    vol=step[0],
                    src=self._sources[0],
                    dest=step[1],
                    is_disp_next=step is not asp_grouped[-1],
                )
        yield from self._new_tip_action()

    def _plan_consolidate(self) -> Generator[TransferStep, None, None]:
        """
        * **Source/ Dest:** Many sources to one destination
        * **Volume:** Single volume or List of volumes is acceptable. This list
                      should be same length as sources
        * **Behavior with transfer options:**

            - New_tip: can be either NEVER or ONCE
                      (ALWAYS will fallback to ONCE)
            - Air_gap: if specified, will be performed after every aspirate
                       so that the aspirated liquids do not mix inside the tip.
                       The air gap will be dispensed while dispensing the
                       liquid into the destination well.
            - Blow_out: can be performed after a dispense (after mix,
                        before touch_tip) at the location specified. If there
                        is liquid present in the tip (which shouldn't happen
                        since consolidate doesn't take a disposal vol, yet),
                        blow_out will be performed at either user-defined
                        location or (default) trash.
                        If no liquid is supposed to be present in the tip after
                        dispense, blow_out will be performed at dispense well
                        loc (if blow out strategy is DEST)
            - Touch_tip: can be performed after each aspirate and/or after
                         dispense
            - Mix: can be performed before the first aspirate and/or after
                   dispense if there is no disposal volume (i.e. can be
                   performed only when the tip is supposed to be empty)

            Considering all options, the sequence of actions is:
            1. Going from source to dest1:
               *New Tip -> Mix -> Aspirate (with disposal volume?) -> Air gap
               -> Touch tip -> Dispense air gap -> Dispense -> Mix if empty ->
               -> Blow out -> Touch tip -> Drop tip*
            2. Going from source(n) to source(n+1):
               *.. Aspirate -> Air gap -> Touch tip ->..
               .. Aspirate -> .....*
        """
        # TODO: verify if _check_valid_volume_parameters should be re-enabled here
        # self._check_valid_volume_parameters(
        #     disposal_volume=self._strategy.disposal_volume,
        #     air_gap=self._strategy.air_gap,
        #     max_volume=self._instr.max_volume,
        # )
        plan_iter = tx_commons.expand_for_volume_constraints(
            # todo(mm, 2021-03-09): Is it right to use _instr.max_volume here?
            # Why don't we account for tip max volume, disposal volume, or air
            # gap?
            self._volumes,
            self._sources,
            self._instr.max_volume,
        )
        current_xfer = next(plan_iter)
        if self._strategy.new_tip == types.TransferTipPolicy.ALWAYS:
            yield self._format_dict("pick_up_tip", kwargs=self._tip_opts)
        done = False
        while not done:
            asp_grouped: List[Tuple[float, Union[Well, types.Location]]] = []
            try:
                while (
                    sum([a[0] for a in asp_grouped])
                    + self._strategy.disposal_volume
                    + self._strategy.air_gap * len(asp_grouped)
                    + current_xfer[0]
                ) <= self._max_volume:
                    append_xfer = self._check_volume_not_zero(
                        self._api_version, current_xfer[0]
                    )
                    if append_xfer:
                        asp_grouped.append(current_xfer)
                    current_xfer = next(plan_iter)
            except StopIteration:
                done = True
            if not asp_grouped:
                break
            # Q: What accounts as disposal volume in a consolidate action?
            # yield self._format_dict('aspirate',
            #                         self._strategy.disposal_volume, loc)
            for step in asp_grouped:
                yield from self._aspirate_actions(step[0], step[1])
            yield from self._dispense_actions(
                vol=sum([a[0] + self._strategy.air_gap for a in asp_grouped])
                - self._strategy.air_gap,
                src=None,
                dest=self._dests[0],
            )
        yield from self._new_tip_action()

    def _aspirate_actions(
        self, vol: float, loc: Union[Well, types.Location]
    ) -> Generator[TransferStep, None, None]:
        yield from self._before_aspirate(loc)
        yield self._format_dict("aspirate", [vol, loc, self._options.aspirate.rate])
        yield from self._after_aspirate()

    def _dispense_actions(
        self,
        vol: float,
        dest: Union[Well, types.Location],
        src: Optional[Union[Well, types.Location]] = None,
        is_disp_next: bool = False,
    ) -> Generator[TransferStep, None, None]:
        if self._strategy.air_gap:
            vol += self._strategy.air_gap
        yield self._format_dict("dispense", [vol, dest, self._options.dispense.rate])
        yield from self._after_dispense(dest=dest, src=src, is_disp_next=is_disp_next)

    def _before_aspirate(
        self, loc: Union[Well, types.Location]
    ) -> Generator[TransferStep, None, None]:
        if (
            self._strategy.mix_strategy == MixStrategy.BEFORE
            or self._strategy.mix_strategy == MixStrategy.BOTH
        ):
            if self._instr.current_volume == 0:
                mix_before_opts = self._mix_before_opts._asdict()
                mix_before_opts["location"] = loc
                yield self._format_dict("mix", kwargs=mix_before_opts)

    def _after_aspirate(self) -> Generator[TransferStep, None, None]:
        if self._strategy.air_gap:
            yield self._format_dict("air_gap", [self._strategy.air_gap])
        if self._strategy.touch_tip_strategy == TouchTipStrategy.ALWAYS:
            yield self._format_dict("touch_tip", kwargs=self._touch_tip_opts)

    def _after_dispense_trash(self) -> Generator[TransferStep, None, None]:
        if isinstance(self._instr.trash_container, Labware):
            yield self._format_dict(
                "blow_out", [self._instr.trash_container.wells()[0]]
            )
        else:
            yield self._format_dict("blow_out", [self._instr.trash_container])

    def _after_dispense_helper(self) -> Generator[TransferStep, None, None]:
        # Used by distribute
        if self._strategy.air_gap:
            yield self._format_dict("air_gap", [self._strategy.air_gap])
        if self._strategy.touch_tip_strategy == TouchTipStrategy.ALWAYS:
            yield self._format_dict("touch_tip", kwargs=self._touch_tip_opts)

    def _after_dispense(
        self,
        dest: Union[Well, types.Location],
        src: Optional[Union[types.Location, Well]],
        is_disp_next: bool = False,
    ) -> Generator[TransferStep, None, None]:
        # This sequence of actions is subject to change
        if not is_disp_next:
            # If the next command is an aspirate, we are switching
            # between aspirate and dispense.
            if self._instr.current_volume == 0:
                # If we're empty, then this is when after mixes come into play
                if (
                    self._strategy.mix_strategy == MixStrategy.AFTER
                    or self._strategy.mix_strategy == MixStrategy.BOTH
                ):
                    mix_after_opts = self._mix_after_opts._asdict()
                    mix_after_opts["location"] = dest
                    yield self._format_dict("mix", kwargs=mix_after_opts)
            if self._strategy.touch_tip_strategy == TouchTipStrategy.ALWAYS:
                yield self._format_dict("touch_tip", kwargs=self._touch_tip_opts)

            if self._strategy.blow_out_strategy == BlowOutStrategy.SOURCE:
                yield self._format_dict("blow_out", [src])
            elif self._strategy.blow_out_strategy == BlowOutStrategy.DEST:
                yield self._format_dict("blow_out", [dest])
            elif self._strategy.blow_out_strategy == BlowOutStrategy.CUSTOM_LOCATION:
                yield self._format_dict("blow_out", kwargs=self._blow_opts)
            elif (
                self._strategy.blow_out_strategy == BlowOutStrategy.TRASH
                or self._strategy.disposal_volume
            ):
                yield from self._after_dispense_trash()
        else:
            yield from self._after_dispense_helper()

    def _new_tip_action(self) -> Generator[TransferStep, None, None]:
        if self._strategy.new_tip == types.TransferTipPolicy.ALWAYS:
            if self._strategy.drop_tip_strategy == DropTipStrategy.RETURN:
                yield self._format_dict("return_tip")
            else:
                yield self._format_dict("drop_tip")

    def _format_dict(
        self,
        method: str,
        args: Optional[List[Any]] = None,
        kwargs: Optional[Union[Dict[Any, Any], FormatDictArgs]] = None,
    ) -> TransferStep:
        if kwargs:
            if isinstance(kwargs, Dict):
                params = {key: val for key, val in kwargs.items() if val}
            else:
                params = {key: val for key, val in kwargs._asdict().items() if val}
        else:
            params = {}
        if not args:
            args = []
        return {"method": method, "args": args, "kwargs": params}

    def _create_volume_list(
        self, volume: Union[Union[float, int], Sequence[float]], total_xfers: int
    ) -> List[float]:
        if isinstance(volume, (float, int)):
            return [float(volume)] * total_xfers
        elif isinstance(volume, tuple):
            return self._create_volume_gradient(
                volume[0], volume[-1], total_xfers, self._strategy.gradient_function
            )
        else:
            if not isinstance(volume, List):
                raise TypeError(
                    "Volume expected as a number or List or"
                    " tuple but got {}".format(volume)
                )
            elif not len(volume) == total_xfers:
                raise RuntimeError(
                    "List of volumes should be equal to number " "of transfers"
                )
            return volume

    @staticmethod
    def _create_volume_gradient(
        min_v: float,
        max_v: float,
        total: int,
        gradient: Optional[Callable[[float], float]] = None,
    ) -> List[float]:

        diff_vol = max_v - min_v

        def _map_volume(i: int) -> float:
            nonlocal diff_vol, total
            rel_x = i / (total - 1)
            rel_y = gradient(rel_x) if gradient else rel_x
            return (rel_y * diff_vol) + min_v

        return [_map_volume(i) for i in range(total)]

    def _check_valid_well_list(
        self, well_list: List[Any], id: str, old_well_list: List[Any]
    ) -> None:
        if self._api_version >= APIVersion(2, 2) and len(well_list) < 1:
            raise RuntimeError(
                f"Invalid {id} for multichannel transfer: {old_well_list}"
            )

    @staticmethod
    def _check_volume_not_zero(api_version: APIVersion, volume: float) -> bool:
        # We should only be adding volumes to transfer plans if it is
        # greater than zero to prevent extraneous robot movements.
        if api_version < APIVersion(2, 8):
            return True
        elif volume > 0:
            return True
        return False

    def _multichannel_transfer(
        self, s: AdvancedLiquidHandling, d: AdvancedLiquidHandling
    ) -> Tuple[List[Union[Well, types.Location]], List[Union[Well, types.Location]]]:
        # TODO: add a check for container being multi-channel compatible?
        # Helper function for multi-channel use-case
        assert (
            isinstance(s, Well)
            or isinstance(s, types.Location)
            or (isinstance(s, List) and isinstance(s[0], Well))
            or (isinstance(s, List) and isinstance(s[0], List))
            or (isinstance(s, List) and isinstance(s[0], types.Location))
        ), "Source should be a Well or List[Well] but is {}".format(s)
        assert (
            isinstance(d, Well)
            or isinstance(d, types.Location)
            or (isinstance(d, List) and isinstance(d[0], Well))
            or (isinstance(d, List) and isinstance(d[0], List))
            or (isinstance(d, List) and isinstance(d[0], types.Location))
        ), "Target should be a Well or List[Well] but is {}".format(d)

        # TODO: Account for cases where a src/dest list has a non-first-row
        # well (eg, 'B1') and would expect the robot/pipette to
        # understand that it is referring to the whole first column
        if isinstance(s, List) and isinstance(s[0], List):
            # s is a List[List]]; flatten to 1D list
            s = [well for list_elem in s for well in list_elem]
        elif isinstance(s, Well) or isinstance(s, types.Location):
            s = [s]
        new_src = []
        for well in s:
            if self._is_valid_row(well):
                new_src.append(well)
        self._check_valid_well_list(new_src, "source", s)

        if isinstance(d, List) and isinstance(d[0], List):
            # s is a List[List]]; flatten to 1D list
            d = [well for list_elem in d for well in list_elem]
        elif isinstance(d, Well) or isinstance(d, types.Location):
            d = [d]
        new_dst = []
        for well in d:
            if self._is_valid_row(well):
                new_dst.append(well)
        self._check_valid_well_list(new_dst, "target", d)
        return new_src, new_dst

    def _is_valid_row(self, well: Union[Well, types.Location]) -> bool:
        if isinstance(well, types.Location):
            test_well = well.labware.as_well()
        else:
            test_well = well

        if self._api_version < APIVersion(2, 2):
            return test_well in test_well.parent.rows()[0]
        else:
            # Allow the first 2 rows to be accessible to 384-well plates;
            # otherwise, only the first row is accessible
            if test_well.parent.parameters["format"] == "384Standard":
                valid_wells = [
                    well for row in test_well.parent.rows()[:2] for well in row
                ]
                return test_well in valid_wells
            else:
                return test_well in test_well.parent.rows()[0]
