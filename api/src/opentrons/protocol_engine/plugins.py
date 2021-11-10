"""Protocol engine plugin interface."""
from __future__ import annotations
from abc import ABC, abstractmethod
from anyio import from_thread
from typing_extensions import final

from .actions import Action, ActionDispatcher, ActionHandler
from .state import StateView


class AbstractPlugin(ActionHandler, ABC):
    """An ProtocolEngine plugin to customize engine behavior.

    A plugin may customize behavior in one of two ways:

    1. It can react to actions as they flow through the action pipeline,
       before they hit the StateStore.
    2. It can dispatch new actions into the pipeline.
    """

    @final
    @property
    def state(self) -> StateView:
        """Get the current ProtocolEngine state."""
        return self._state

    @final
    def dispatch(self, action: Action) -> None:
        """Dispatch an action into the action pipeline.

        Arguments:
            action: A new ProtocolEngine action to send into the pipeline.
                This action will flow through all plugins, including
                this one, so be careful to avoid infinite loops. In general,
                do not dispatch an action your plugin will react to.
        """
        return self._action_dispatcher.dispatch(action)

    @final
    def dispatch_threadsafe(self, action: Action) -> None:
        """Dispatch an action into the action pipeline from a child thread.

        Child thread must be created with `anyio.to_thread`.

        Arguments:
            action: A new ProtocolEngine action to send into the pipeline.
                This action will flow through all plugins, including
                this one, so be careful to avoid infinite loops. In general,
                do not dispatch an action your plugin will react to.
        """
        return from_thread.run_sync(self._action_dispatcher.dispatch, action)

    @abstractmethod
    def handle_action(self, action: Action) -> None:
        """React to an action going through the pipeline.

        When reacting to an action, `self.state` will not yet
        reflect the change represented by the action, because
        plugins receive actions before the StateStore.

        Arguments:
            action: An action that has been dispatched into the pipeline
                that this plugin may react to.
        """
        ...

    # NOTE: using a "protected" method allows mypy to infer the types
    # of private propertes `_state` and `_action_dispatcher` without
    # declaring them on the class
    @final
    def _configure(
        self,
        state: StateView,
        action_dispatcher: ActionDispatcher,
    ) -> None:
        """Insert a StateView and ActionDispatcher into the plugin.

        This is a protected method that should only be called internally
        by the ProtocolEngine during plugin setup.
        """
        self._state = state
        self._action_dispatcher = action_dispatcher
