"""Control a `ProtocolEngine` without async/await."""

from typing import cast, Any, Optional, overload

from opentrons_shared_data.labware.types import LabwareUri
from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from .. import commands
from ..commands.command_unions import CREATE_TYPES_BY_PARAMS_TYPE
from ..state.state import StateView
from ..types import (
    Liquid,
    LabwareOffsetCreate,
)
from .transports import ChildThreadTransport


class SyncClient:
    """Control a `ProtocolEngine` without async/await.

    Normally, `ProtocolEngine` provides an async/await interface, like this:

    ```
    aspirate_result = await protocol_engine.add_and_execute_command(aspirate_command)
    dispense_result = await protocol_engine.add_and_execute_command(dispense_command)
    ```

    But we sometimes want to control it with plain old non-async blocking method calls.
    To accomplish that, this class adapts `ProtocolEngine`'s interface into this:

    ```
    aspirate_result = sync_client.aspirate(...)
    dispense_result = sync_client.dispense(...)
    ```

    This is intended to help implement the Python Protocol API, which is all non-async.
    """

    # todo(mm, 2024-06-13): The separation of responsibilities between this class
    # and ChildThreadTransport has grown to be pretty fuzzy. Clarify or merge the two
    # classes.

    def __init__(self, transport: ChildThreadTransport) -> None:
        """Initialize the `SyncClient`.

        Params:
            transport: The interface for the new `SyncClient` to use to
                communicate with the `ProtocolEngine`.
        """
        self._transport = transport

    def execute_command(self, params: commands.CommandParams) -> None:
        """Execute a ProtocolEngine command, including error recovery.

        See `ChildThreadTransport.execute_command_wait_for_recovery()` for exact
        behavior.
        """
        CreateType = CREATE_TYPES_BY_PARAMS_TYPE[type(params)]
        create_request = CreateType(params=cast(Any, params))
        self._transport.execute_command_wait_for_recovery(create_request)

    @overload
    def execute_command_without_recovery(
        self, params: commands.LoadLabwareParams
    ) -> commands.LoadLabwareResult:
        pass

    @overload
    def execute_command_without_recovery(
        self, params: commands.LoadModuleParams
    ) -> commands.LoadModuleResult:
        pass

    @overload
    def execute_command_without_recovery(
        self, params: commands.LoadPipetteParams
    ) -> commands.LoadPipetteResult:
        pass

    @overload
    def execute_command_without_recovery(
        self, params: commands.LoadLidStackParams
    ) -> commands.LoadLidStackResult:
        pass

    @overload
    def execute_command_without_recovery(
        self, params: commands.LoadLidParams
    ) -> commands.LoadLidResult:
        pass

    @overload
    def execute_command_without_recovery(
        self, params: commands.LiquidProbeParams
    ) -> commands.LiquidProbeResult:
        pass

    @overload
    def execute_command_without_recovery(
        self, params: commands.TryLiquidProbeParams
    ) -> commands.TryLiquidProbeResult:
        pass

    @overload
    def execute_command_without_recovery(
        self, params: commands.LoadLiquidClassParams
    ) -> commands.LoadLiquidClassResult:
        pass

    def execute_command_without_recovery(
        self, params: commands.CommandParams
    ) -> commands.CommandResult:
        """Execute a ProtocolEngine command.

        See `ChildThreadTransport.execute_command()` for exact
        behavior.
        """
        CreateType = CREATE_TYPES_BY_PARAMS_TYPE[type(params)]
        create_request = CreateType(params=cast(Any, params))
        return self._transport.execute_command(create_request)

    @property
    def state(self) -> StateView:
        """Get a view of the engine's state."""
        return self._transport.state

    def add_labware_definition(self, definition: LabwareDefinition) -> LabwareUri:
        """Add a labware definition to the engine."""
        return self._transport.call_method(
            "add_labware_definition",
            definition=definition,
        )

    def add_addressable_area(self, addressable_area_name: str) -> None:
        """Add an addressable area to the engine's state."""
        self._transport.call_method(
            "add_addressable_area", addressable_area_name=addressable_area_name
        )

    def add_liquid(
        self, name: str, color: Optional[str], description: Optional[str]
    ) -> Liquid:
        """Add a liquid to the engine."""
        return self._transport.call_method("add_liquid", name=name, color=color, description=description)  # type: ignore[no-any-return]

    def reset_tips(self, labware_id: str) -> None:
        """Reset a labware's tip tracking state.."""
        self._transport.call_method(
            "reset_tips",
            labware_id=labware_id,
        )

    def add_labware_offset(self, request: LabwareOffsetCreate) -> None:
        """Add a labware offset."""
        self._transport.call_method("add_labware_offset", request=request)

    def set_pipette_movement_speed(
        self, pipette_id: str, speed: Optional[float]
    ) -> None:
        """Set the speed of a pipette's X/Y/Z movements. Does not affect plunger speed.

        None will use the hardware API's default.
        """
        self._transport.call_method(
            "set_pipette_movement_speed",
            pipette_id=pipette_id,
            speed=speed,
        )
