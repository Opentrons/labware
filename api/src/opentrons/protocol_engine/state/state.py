"""Protocol engine state management."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Sequence, TypeVar
from typing_extensions import ParamSpec

from opentrons_shared_data.deck.types import DeckDefinitionV5
from opentrons_shared_data.robot.types import RobotDefinition

from opentrons.protocol_engine.error_recovery_policy import ErrorRecoveryPolicy
from opentrons.protocol_engine.types import LiquidClassRecordWithId, ModuleOffsetData
from opentrons.util.change_notifier import ChangeNotifier

from ..resources import DeckFixedLabware
from ..actions import Action, ActionHandler
from ._abstract_store import HasState, HandlesActions
from .commands import CommandState, CommandStore, CommandView
from .addressable_areas import (
    AddressableAreaState,
    AddressableAreaStore,
    AddressableAreaView,
)
from .labware import LabwareState, LabwareStore, LabwareView
from .pipettes import PipetteState, PipetteStore, PipetteView
from .modules import ModuleState, ModuleStore, ModuleView
from .liquids import LiquidState, LiquidView, LiquidStore
from .liquid_classes import LiquidClassState, LiquidClassStore, LiquidClassView
from .tips import TipState, TipView, TipStore
from .wells import WellState, WellView, WellStore
from .geometry import GeometryView
from .motion import MotionView
from .files import FileView, FileState, FileStore
from .config import Config
from .state_summary import StateSummary
from ..types import DeckConfigurationType


_ParamsT = ParamSpec("_ParamsT")
_ReturnT = TypeVar("_ReturnT")


@dataclass(frozen=True)
class State:
    """Underlying engine state."""

    commands: CommandState
    addressable_areas: AddressableAreaState
    labware: LabwareState
    pipettes: PipetteState
    modules: ModuleState
    liquids: LiquidState
    liquid_classes: LiquidClassState
    tips: TipState
    wells: WellState
    files: FileState


class StateView(HasState[State]):
    """A read-only view of computed state."""

    _state: State
    _commands: CommandView
    _addressable_areas: AddressableAreaView
    _labware: LabwareView
    _pipettes: PipetteView
    _modules: ModuleView
    _liquid: LiquidView
    _liquid_classes: LiquidClassView
    _tips: TipView
    _wells: WellView
    _geometry: GeometryView
    _motion: MotionView
    _files: FileView
    _config: Config

    @property
    def commands(self) -> CommandView:
        """Get state view selectors for commands state."""
        return self._commands

    @property
    def addressable_areas(self) -> AddressableAreaView:
        """Get state view selectors for addressable area state."""
        return self._addressable_areas

    @property
    def labware(self) -> LabwareView:
        """Get state view selectors for labware state."""
        return self._labware

    @property
    def pipettes(self) -> PipetteView:
        """Get state view selectors for pipette state."""
        return self._pipettes

    @property
    def modules(self) -> ModuleView:
        """Get state view selectors for hardware module state."""
        return self._modules

    @property
    def liquid(self) -> LiquidView:
        """Get state view selectors for liquid state."""
        return self._liquid

    @property
    def liquid_classes(self) -> LiquidClassView:
        """Get state view selectors for liquid class state."""
        return self._liquid_classes

    @property
    def tips(self) -> TipView:
        """Get state view selectors for tip state."""
        return self._tips

    @property
    def wells(self) -> WellView:
        """Get state view selectors for well state."""
        return self._wells

    @property
    def geometry(self) -> GeometryView:
        """Get state view selectors for derived geometry state."""
        return self._geometry

    @property
    def motion(self) -> MotionView:
        """Get state view selectors for derived motion state."""
        return self._motion

    @property
    def files(self) -> FileView:
        """Get state view selectors for engine create file state."""
        return self._files

    @property
    def config(self) -> Config:
        """Get ProtocolEngine configuration."""
        return self._config

    def get_summary(self) -> StateSummary:
        """Get protocol run data."""
        error = self._commands.get_error()
        # TODO maybe add summary here for AA
        return StateSummary.model_construct(
            status=self._commands.get_status(),
            errors=[] if error is None else [error],
            pipettes=self._pipettes.get_all(),
            labware=self._labware.get_all(),
            labwareOffsets=self._labware.get_labware_offsets(),
            modules=self._modules.get_all(),
            completedAt=self._state.commands.run_completed_at,
            startedAt=self._state.commands.run_started_at,
            liquids=self._liquid.get_all(),
            wells=self._wells.get_all(),
            hasEverEnteredErrorRecovery=self._commands.get_has_entered_recovery_mode(),
            files=self._state.files.file_ids,
            liquidClasses=[
                LiquidClassRecordWithId(
                    liquidClassId=liquid_class_id, **dict(liquid_class_record)
                )
                for liquid_class_id, liquid_class_record in self._liquid_classes.get_all().items()
            ],
        )


class StateStore(StateView, ActionHandler):
    """ProtocolEngine state store.

    A StateStore manages several substores, which will modify themselves in
    reaction to commands and other protocol events. State instances inside
    stores should be treated as immutable.
    """

    def __init__(
        self,
        *,
        config: Config,
        deck_definition: DeckDefinitionV5,
        deck_fixed_labware: Sequence[DeckFixedLabware],
        robot_definition: RobotDefinition,
        is_door_open: bool,
        error_recovery_policy: ErrorRecoveryPolicy,
        change_notifier: Optional[ChangeNotifier] = None,
        module_calibration_offsets: Optional[Dict[str, ModuleOffsetData]] = None,
        deck_configuration: Optional[DeckConfigurationType] = None,
        notify_publishers: Optional[Callable[[], None]] = None,
    ) -> None:
        """Initialize a StateStore and its substores.

        Arguments:
            config: Top-level configuration.
            deck_definition: The deck definition to preload into
                labware state.
            deck_fixed_labware: Labware definitions from the deck
                definition to preload into labware state.
            is_door_open: Whether the robot's door is currently open.
            error_recovery_policy: The run's initial error recovery policy.
            change_notifier: Internal state change notifier.
            module_calibration_offsets: Module offsets to preload.
            deck_configuration: The initial deck configuration the addressable area store will be instantiated with.
            robot_definition: Static information about the robot type being used.
            notify_publishers: Notifies robot server publishers of internal state change.
        """
        self._command_store = CommandStore(
            config=config,
            is_door_open=is_door_open,
            error_recovery_policy=error_recovery_policy,
        )
        self._pipette_store = PipetteStore()
        if deck_configuration is None:
            deck_configuration = []
        self._addressable_area_store = AddressableAreaStore(
            deck_configuration=deck_configuration,
            config=config,
            deck_definition=deck_definition,
            robot_definition=robot_definition,
        )
        self._labware_store = LabwareStore(
            deck_fixed_labware=deck_fixed_labware,
            deck_definition=deck_definition,
        )
        self._module_store = ModuleStore(
            config=config,
            deck_fixed_labware=deck_fixed_labware,
            module_calibration_offsets=module_calibration_offsets,
        )
        self._liquid_store = LiquidStore()
        self._liquid_class_store = LiquidClassStore()
        self._tip_store = TipStore()
        self._well_store = WellStore()
        self._file_store = FileStore()

        self._substores: List[HandlesActions] = [
            self._command_store,
            self._pipette_store,
            self._addressable_area_store,
            self._labware_store,
            self._module_store,
            self._liquid_store,
            self._liquid_class_store,
            self._tip_store,
            self._well_store,
            self._file_store,
        ]
        self._config = config
        self._change_notifier = change_notifier or ChangeNotifier()
        self._notify_robot_server = notify_publishers
        self._initialize_state()

    def handle_action(self, action: Action) -> None:
        """Modify State in reaction to an action.

        Arguments:
            action: An action object representing a state change. Will be
                passed to all substores so they can react accordingly.
        """
        for substore in self._substores:
            substore.handle_action(action)

        self._update_state_views()

    async def wait_for(
        self,
        condition: Callable[_ParamsT, _ReturnT],
        *args: _ParamsT.args,
        **kwargs: _ParamsT.kwargs,
    ) -> _ReturnT:
        """Wait for a condition to become true, checking whenever state changes.

        If the condition is already true, return immediately.

        !!! Warning:
            This will only return when `condition` is true right now.
            If you're not careful, this can cause you to miss updates,
            and potentially wait forever.

            For example, suppose:

            1. Things start out in state A.
            2. You start waiting specifically for state B.
            3. State transitions A -> B.
               Your task could theoretically run now,
               but the event loop decides not to do that.
            4. State transitions B -> C.
            5. The event loop decides to run your task now.
               But this method will only return when the state is B,
               which it isn't now, so your task will stay waiting indefinitely.

            To fix this, design your `condition` to look for something that,
            after it first becomes true, remains true forever. For example,
            suppose you want to wait for the engine to reach a specific command.
            Don't use a `condition` that checks if that command is running now.
            Instead, use a `condition` that checks if it ever has been running.

            If this isn't possible, then you need other means to ensure that
            no other task can transition the state out of the condition that you
            care about until after you've had a chance to operate on the state
            while it's in that condition.

        Arguments:
            condition: A function that returns a truthy value when the `await`
                should resolve.
            *args: Positional arguments to pass to `condition`.
            **kwargs: Named arguments to pass to `condition`.

        Returns:
            The truthy value returned by the `condition` function.

        Raises:
            The exception raised by the `condition` function, if any.
        """

        def predicate() -> _ReturnT:
            return condition(*args, **kwargs)

        return await self._wait_for(condition=predicate, truthiness_to_wait_for=True)

    async def wait_for_not(
        self,
        condition: Callable[_ParamsT, _ReturnT],
        *args: _ParamsT.args,
        **kwargs: _ParamsT.kwargs,
    ) -> _ReturnT:
        """Like `wait_for()`, except wait for the condition to become false.

        See the documentation in `wait_for()`, especially the warning about condition
        design.

        The advantage of having this separate method over just passing a wrapper lambda
        as the condition to `wait_for()` yourself is that wrapper lambdas are hard to
        test in the mock-heavy Decoy + Protocol Engine style.
        """

        def predicate() -> _ReturnT:
            return condition(*args, **kwargs)

        return await self._wait_for(condition=predicate, truthiness_to_wait_for=False)

    async def _wait_for(
        self, condition: Callable[[], _ReturnT], truthiness_to_wait_for: bool
    ) -> _ReturnT:
        current_value = condition()

        while bool(current_value) != truthiness_to_wait_for:
            await self._change_notifier.wait()
            current_value = condition()

        return current_value

    def _get_next_state(self) -> State:
        """Get a new instance of the state value object."""
        return State(
            commands=self._command_store.state,
            addressable_areas=self._addressable_area_store.state,
            labware=self._labware_store.state,
            pipettes=self._pipette_store.state,
            modules=self._module_store.state,
            liquids=self._liquid_store.state,
            liquid_classes=self._liquid_class_store.state,
            tips=self._tip_store.state,
            wells=self._well_store.state,
            files=self._file_store.state,
        )

    def _initialize_state(self) -> None:
        """Initialize state data and view."""
        state = self._get_next_state()

        # Base states
        self._state = state
        self._commands = CommandView(state.commands)
        self._addressable_areas = AddressableAreaView(state.addressable_areas)
        self._labware = LabwareView(state.labware)
        self._pipettes = PipetteView(state.pipettes)
        self._modules = ModuleView(state.modules)
        self._liquid = LiquidView(state.liquids)
        self._liquid_classes = LiquidClassView(state.liquid_classes)
        self._tips = TipView(state.tips)
        self._wells = WellView(state.wells)
        self._files = FileView(state.files)

        # Derived states
        self._geometry = GeometryView(
            config=self._config,
            labware_view=self._labware,
            well_view=self._wells,
            module_view=self._modules,
            pipette_view=self._pipettes,
            addressable_area_view=self._addressable_areas,
        )
        self._motion = MotionView(
            config=self._config,
            labware_view=self._labware,
            pipette_view=self._pipettes,
            addressable_area_view=self._addressable_areas,
            geometry_view=self._geometry,
            module_view=self._modules,
        )

    def _update_state_views(self) -> None:
        """Update state view interfaces to use latest underlying values."""
        next_state = self._get_next_state()
        self._state = next_state
        self._commands._state = next_state.commands
        self._addressable_areas._state = next_state.addressable_areas
        self._labware._state = next_state.labware
        self._pipettes._state = next_state.pipettes
        self._modules._state = next_state.modules
        self._liquid._state = next_state.liquids
        self._liquid_classes._state = next_state.liquid_classes
        self._tips._state = next_state.tips
        self._wells._state = next_state.wells
        self._change_notifier.notify()
        if self._notify_robot_server is not None:
            self._notify_robot_server()
