"""Translate events from a legacy ``ProtocolContext`` into Protocol Engine commands."""

from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union

from opentrons.hardware_control.modules.types import (
    ModuleModel as HardwareModuleModel,
    TemperatureModuleModel,
    MagneticModuleModel,
    ThermocyclerModuleModel,
    HeaterShakerModuleModel,
)
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons.types import MountType, DeckSlotName, Location
from opentrons.legacy_commands import types as legacy_command_types
from opentrons.protocol_api import InstrumentContext
from opentrons.protocol_api.core.legacy.deck import FIXED_TRASH_ID
from opentrons.protocol_api.core.legacy.load_info import (
    LoadInfo as LegacyLoadInfo,
    LabwareLoadInfo as LegacyLabwareLoadInfo,
    InstrumentLoadInfo as LegacyInstrumentLoadInfo,
    ModuleLoadInfo as LegacyModuleLoadInfo,
)
from opentrons.protocol_engine import (
    ProtocolEngineError,
    actions as pe_actions,
    commands as pe_commands,
    types as pe_types,
)
from opentrons.protocol_engine.error_recovery_policy import ErrorRecoveryType
from opentrons.protocol_engine.resources import (
    ModelUtils,
    ModuleDataProvider,
    pipette_data_provider,
)
from opentrons.protocol_engine.state.update_types import (
    StateUpdate,
)

from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.errors import ErrorCodes, EnumeratedError, PythonException


class LegacyCommandParams(pe_commands.CustomParams):
    """Custom command data payload for mapped legacy commands."""

    legacyCommandType: str
    legacyCommandText: str


class LegacyContextCommandError(ProtocolEngineError):
    """An error returned when a PAPIv2 ProtocolContext command fails."""

    def __init__(self, wrapping_exc: BaseException) -> None:
        if isinstance(wrapping_exc, EnumeratedError):
            super().__init__(
                wrapping_exc.code,
                wrapping_exc.message,
                wrapping_exc.detail,
                wrapping_exc.wrapping,
            )
        else:
            super().__init__(
                code=ErrorCodes.GENERAL_ERROR,
                message=str(wrapping_exc),
                wrapping=[PythonException(wrapping_exc)],
            )


_HARDWARE_TO_PE_MODULE: Dict[HardwareModuleModel, pe_types.ModuleModel] = {
    MagneticModuleModel.MAGNETIC_V1: pe_types.ModuleModel.MAGNETIC_MODULE_V1,
    MagneticModuleModel.MAGNETIC_V2: pe_types.ModuleModel.MAGNETIC_MODULE_V2,
    TemperatureModuleModel.TEMPERATURE_V1: pe_types.ModuleModel.TEMPERATURE_MODULE_V1,
    TemperatureModuleModel.TEMPERATURE_V2: pe_types.ModuleModel.TEMPERATURE_MODULE_V2,
    ThermocyclerModuleModel.THERMOCYCLER_V1: pe_types.ModuleModel.THERMOCYCLER_MODULE_V1,
    ThermocyclerModuleModel.THERMOCYCLER_V2: pe_types.ModuleModel.THERMOCYCLER_MODULE_V2,
    HeaterShakerModuleModel.HEATER_SHAKER_V1: pe_types.ModuleModel.HEATER_SHAKER_MODULE_V1,
}

_HIGHER_ORDER_COMMAND_TYPES = {
    legacy_command_types.MIX,
    legacy_command_types.CONSOLIDATE,
    legacy_command_types.DISTRIBUTE,
    legacy_command_types.TRANSFER,
    legacy_command_types.RETURN_TIP,
    legacy_command_types.AIR_GAP,
}


class LegacyCommandMapper:
    """Map broker commands to protocol engine commands.

    Each protocol should use its own instance of this class.
    """

    def __init__(
        self, module_data_provider: Optional[ModuleDataProvider] = None
    ) -> None:
        """Initialize the command mapper."""
        # commands keyed by broker message ID
        self._commands_by_broker_id: Dict[str, pe_commands.Command] = {}

        # running count of each legacy command type, to construct IDs
        self._command_count: Dict[str, int] = defaultdict(lambda: 0)

        # equipment IDs by physical location
        self._labware_id_by_slot: Dict[DeckSlotName, str] = {
            DeckSlotName.FIXED_TRASH: FIXED_TRASH_ID
        }
        self._labware_id_by_module_id: Dict[str, str] = {}
        self._pipette_id_by_mount: Dict[MountType, str] = {}
        self._module_id_by_slot: Dict[DeckSlotName, str] = {}

        # module definition state and provider depedency
        self._module_definition_by_model: Dict[
            pe_types.ModuleModel, pe_types.ModuleDefinition
        ] = {}
        self._module_data_provider = module_data_provider or ModuleDataProvider()

    def map_command(  # noqa: C901
        self,
        command: legacy_command_types.CommandMessage,
    ) -> List[pe_actions.Action]:
        """Map a legacy Broker command to a ProtocolEngine command.

        A "before" message from the Broker
        is mapped to a ``RUNNING`` ProtocolEngine command.

        An "after" message from the Broker
        is mapped to a ``SUCCEEDED`` ProtocolEngine command.
        It has the same ID as the original ``RUNNING`` command,
        so when you send it to the ProtocolEngine, it will update the original
        command's status in-place.
        """
        command_type = command["name"]

        if command_type in _HIGHER_ORDER_COMMAND_TYPES:
            return []

        command_error = command["error"]
        stage = command["$"]
        # TODO(mc, 2021-12-08): use message ID as command ID directly once
        # https://github.com/Opentrons/opentrons/issues/8986 is resolved
        broker_id = command["id"]
        now = ModelUtils.get_timestamp()

        results: List[pe_actions.Action] = []

        if stage == "before":
            count = self._command_count[command_type]
            command_id = f"{command_type}-{count}"
            command_create, running_command = self._build_initial_command(
                command, command_id, now
            )

            self._command_count[command_type] = count + 1
            self._commands_by_broker_id[broker_id] = running_command

            results.append(
                pe_actions.QueueCommandAction(
                    command_id=command_id,
                    created_at=running_command.createdAt,
                    request=command_create,
                    request_hash=None,
                )
            )
            assert running_command.startedAt is not None
            results.append(
                pe_actions.RunCommandAction(
                    running_command.id, started_at=running_command.startedAt
                )
            )

        elif stage == "after":
            running_command = self._commands_by_broker_id[broker_id]
            completed_command: pe_commands.Command
            if command_error is None:
                if isinstance(running_command, pe_commands.PickUpTip):
                    completed_command = running_command.model_copy(
                        update={
                            "result": pe_commands.PickUpTipResult.model_construct(
                                tipVolume=command["payload"]["location"].max_volume,  # type: ignore[typeddict-item]
                                tipLength=command["payload"]["instrument"].hw_pipette[  # type: ignore[typeddict-item]
                                    "tip_length"
                                ],
                                position=pe_types.DeckPoint(x=0, y=0, z=0),
                            ),
                            "status": pe_commands.CommandStatus.SUCCEEDED,
                            "completedAt": now,
                            "notes": [],
                        }
                    )
                elif isinstance(running_command, pe_commands.DropTip):
                    completed_command = running_command.model_copy(
                        update={
                            "result": pe_commands.DropTipResult.model_construct(
                                position=pe_types.DeckPoint(x=0, y=0, z=0)
                            ),
                            "status": pe_commands.CommandStatus.SUCCEEDED,
                            "completedAt": now,
                            "notes": [],
                        }
                    )
                elif isinstance(running_command, pe_commands.Aspirate):
                    completed_command = running_command.model_copy(
                        update={
                            # Don't .model_construct() result, because we want to validate
                            # volume.
                            "result": pe_commands.AspirateResult(
                                volume=running_command.params.volume,
                                position=pe_types.DeckPoint(x=0, y=0, z=0),
                            ),
                            "status": pe_commands.CommandStatus.SUCCEEDED,
                            "completedAt": now,
                            "notes": [],
                        }
                    )
                elif isinstance(running_command, pe_commands.Dispense):
                    completed_command = running_command.model_copy(
                        update={
                            # Don't .model_construct() result, because we want to validate
                            # volume.
                            "result": pe_commands.DispenseResult(
                                volume=running_command.params.volume,
                                position=pe_types.DeckPoint(x=0, y=0, z=0),
                            ),
                            "status": pe_commands.CommandStatus.SUCCEEDED,
                            "completedAt": now,
                            "notes": [],
                        }
                    )
                elif isinstance(running_command, pe_commands.BlowOut):
                    completed_command = running_command.model_copy(
                        update={
                            "result": pe_commands.BlowOutResult.model_construct(
                                position=pe_types.DeckPoint(x=0, y=0, z=0)
                            ),
                            "status": pe_commands.CommandStatus.SUCCEEDED,
                            "completedAt": now,
                            "notes": [],
                        }
                    )
                elif isinstance(running_command, pe_commands.Comment):
                    completed_command = running_command.model_copy(
                        update={
                            "result": pe_commands.CommentResult.model_construct(),
                            "status": pe_commands.CommandStatus.SUCCEEDED,
                            "completedAt": now,
                            "notes": [],
                        }
                    )
                elif isinstance(running_command, pe_commands.Custom):
                    completed_command = running_command.model_copy(
                        update={
                            "result": pe_commands.CustomResult.model_construct(),
                            "status": pe_commands.CommandStatus.SUCCEEDED,
                            "completedAt": now,
                            "notes": [],
                        }
                    )
                else:
                    # TODO(mm, 2024-06-13): This looks potentially wrong.
                    # We're creating a `SUCCEEDED` command that does not have a `result`,
                    # which is not normally possible.
                    completed_command = running_command.model_copy(
                        update={
                            "status": pe_commands.CommandStatus.SUCCEEDED,
                            "completedAt": now,
                            "notes": [],
                        }
                    )
                results.append(
                    pe_actions.SucceedCommandAction(
                        completed_command,
                        state_update=StateUpdate(),
                    )
                )

                if isinstance(completed_command, pe_commands.WaitForResume):
                    results.append(
                        pe_actions.PauseAction(source=pe_actions.PauseSource.PROTOCOL)
                    )

            else:
                results.append(
                    pe_actions.FailCommandAction(
                        command_id=running_command.id,
                        running_command=running_command,
                        error_id=ModelUtils.generate_id(),
                        failed_at=now,
                        error=LegacyContextCommandError(command_error),
                        notes=[],
                        # For legacy protocols, we don't attempt to support any kind
                        # of error recovery at the Protocol Engine level.
                        # These protocols only run on the OT-2, which doesn't have
                        # any recoverable errors, anyway.
                        type=ErrorRecoveryType.FAIL_RUN,
                    )
                )

        return results

    def map_equipment_load(self, load_info: LegacyLoadInfo) -> List[pe_actions.Action]:
        """Map a labware, instrument (pipette), or module load to a PE command."""
        if isinstance(load_info, LegacyLabwareLoadInfo):
            return self._map_labware_load(load_info)
        elif isinstance(load_info, LegacyInstrumentLoadInfo):
            return self._map_instrument_load(load_info)
        elif isinstance(load_info, LegacyModuleLoadInfo):
            return self._map_module_load(load_info)

    def _build_initial_command(
        self,
        command: legacy_command_types.CommandMessage,
        command_id: str,
        now: datetime,
    ) -> Tuple[pe_commands.CommandCreate, pe_commands.Command]:
        if command["name"] == legacy_command_types.PICK_UP_TIP:
            return self._build_pick_up_tip(
                command=command, command_id=command_id, now=now
            )
        elif command["name"] == legacy_command_types.DROP_TIP:
            return self._build_drop_tip(command=command, command_id=command_id, now=now)

        elif (
            command["name"] == legacy_command_types.ASPIRATE
            or command["name"] == legacy_command_types.DISPENSE
        ):
            return self._build_liquid_handling(
                command=command, command_id=command_id, now=now
            )
        elif command["name"] == legacy_command_types.BLOW_OUT:
            return self._build_blow_out(command=command, command_id=command_id, now=now)
        elif command["name"] == legacy_command_types.PAUSE:
            wait_for_resume_running = pe_commands.WaitForResume.model_construct(
                id=command_id,
                key=command_id,
                status=pe_commands.CommandStatus.RUNNING,
                createdAt=now,
                startedAt=now,
                params=pe_commands.WaitForResumeParams.model_construct(
                    message=command["payload"]["userMessage"],
                ),
            )
            wait_for_resume_create: pe_commands.CommandCreate = (
                pe_commands.WaitForResumeCreate.model_construct(
                    key=wait_for_resume_running.key,
                    params=wait_for_resume_running.params,
                )
            )
            return wait_for_resume_create, wait_for_resume_running
        elif command["name"] == legacy_command_types.COMMENT:
            comment_running = pe_commands.Comment.model_construct(
                id=command_id,
                key=command_id,
                status=pe_commands.CommandStatus.RUNNING,
                createdAt=now,
                startedAt=now,
                params=pe_commands.CommentParams.model_construct(
                    message=command["payload"]["text"],
                ),
            )
            comment_create = pe_commands.CommentCreate.model_construct(
                key=comment_running.key, params=comment_running.params
            )
            return comment_create, comment_running
        else:
            custom_running = pe_commands.Custom.model_construct(
                id=command_id,
                key=command_id,
                status=pe_commands.CommandStatus.RUNNING,
                createdAt=now,
                startedAt=now,
                params=LegacyCommandParams.model_construct(
                    legacyCommandType=command["name"],
                    legacyCommandText=command["payload"]["text"],
                ),
            )
            custom_create = pe_commands.CustomCreate.model_construct(
                key=custom_running.key,
                params=custom_running.params,
            )
            return custom_create, custom_running

    def _build_drop_tip(
        self,
        command: legacy_command_types.DropTipMessage,
        command_id: str,
        now: datetime,
    ) -> Tuple[pe_commands.CommandCreate, pe_commands.Command]:
        pipette: InstrumentContext = command["payload"]["instrument"]
        well = command["payload"]["location"]
        mount = MountType(pipette.mount)
        #   the following type checking suppression assumes the tiprack is not loaded on top of a module
        slot = DeckSlotName.from_primitive(well.parent.parent)  # type: ignore[arg-type]
        well_name = well.well_name
        labware_id = self._labware_id_by_slot[slot]
        pipette_id = self._pipette_id_by_mount[mount]

        running = pe_commands.DropTip.model_construct(
            id=command_id,
            key=command_id,
            status=pe_commands.CommandStatus.RUNNING,
            createdAt=now,
            startedAt=now,
            params=pe_commands.DropTipParams.model_construct(
                pipetteId=pipette_id,
                labwareId=labware_id,
                wellName=well_name,
            ),
        )
        create = pe_commands.DropTipCreate.model_construct(
            key=running.key,
            params=running.params,
        )
        return create, running

    def _build_pick_up_tip(
        self,
        command: legacy_command_types.PickUpTipMessage,
        command_id: str,
        now: datetime,
    ) -> Tuple[pe_commands.CommandCreate, pe_commands.Command]:
        pipette: InstrumentContext = command["payload"]["instrument"]
        location = command["payload"]["location"]
        well = location
        mount = MountType(pipette.mount)
        #   the following type checking suppression assumes the tiprack is not loaded on top of a module
        slot = DeckSlotName.from_primitive(well.parent.parent)  # type: ignore[arg-type]
        well_name = well.well_name
        labware_id = self._labware_id_by_slot[slot]
        pipette_id = self._pipette_id_by_mount[mount]

        running = pe_commands.PickUpTip.model_construct(
            id=command_id,
            key=command_id,
            status=pe_commands.CommandStatus.RUNNING,
            createdAt=now,
            startedAt=now,
            params=pe_commands.PickUpTipParams.model_construct(
                pipetteId=pipette_id,
                labwareId=labware_id,
                wellName=well_name,
            ),
        )
        create = pe_commands.PickUpTipCreate.model_construct(
            key=running.key, params=running.params
        )
        return create, running

    def _build_liquid_handling(
        self,
        command: Union[
            legacy_command_types.AspirateMessage, legacy_command_types.DispenseMessage
        ],
        command_id: str,
        now: datetime,
    ) -> Tuple[pe_commands.CommandCreate, pe_commands.Command]:
        pipette: InstrumentContext = command["payload"]["instrument"]
        location = command["payload"]["location"]
        volume = command["payload"]["volume"]
        # TODO:(jr, 15.08.2022): aspirate and dispense commands with no specified labware
        # get filtered into custom. Refactor this in followup legacy command mapping
        if location.labware.is_well:
            well = location.labware.as_well()
            slot = DeckSlotName(location.labware.first_parent())
            parent_module_id = self._module_id_by_slot.get(slot)
            labware_id = (
                self._labware_id_by_module_id[parent_module_id]
                if parent_module_id is not None
                else self._labware_id_by_slot[slot]
            )
            mount = MountType(pipette.mount)
            well_name = well.well_name
            pipette_id = self._pipette_id_by_mount[mount]

            if volume == 0:
                # In edge cases, it's possible for a Python protocol to do dispense()
                # or aspirate() with a volume of 0, which behaves roughly like
                # move_to(). Protocol Engine aspirate and dispense commands must have
                # volume > 0, so we can't map into those.
                #
                # TODO(mm, 2024-03-22): I don't think this has been true since
                # https://github.com/Opentrons/opentrons/pull/14211. Can we just use
                # aspirate and dispense commands now?
                move_to_well_running = pe_commands.MoveToWell.model_construct(
                    id=command_id,
                    key=command_id,
                    status=pe_commands.CommandStatus.RUNNING,
                    createdAt=now,
                    startedAt=now,
                    params=pe_commands.MoveToWellParams.model_construct(
                        pipetteId=pipette_id,
                        labwareId=labware_id,
                        wellName=well_name,
                    ),
                )
                move_to_well_create = pe_commands.MoveToWellCreate.model_construct(
                    key=move_to_well_running.key, params=move_to_well_running.params
                )
                return move_to_well_create, move_to_well_running
            elif command["name"] == legacy_command_types.ASPIRATE:
                flow_rate = command["payload"]["rate"] * pipette.flow_rate.aspirate
                aspirate_running = pe_commands.Aspirate.model_construct(
                    id=command_id,
                    key=command_id,
                    status=pe_commands.CommandStatus.RUNNING,
                    createdAt=now,
                    startedAt=now,
                    # Don't .model_construct() params, because we want to validate
                    # volume and flowRate.
                    params=pe_commands.AspirateParams(
                        pipetteId=pipette_id,
                        labwareId=labware_id,
                        wellName=well_name,
                        volume=volume,
                        flowRate=flow_rate,
                    ),
                )
                aspirate_create = pe_commands.AspirateCreate.model_construct(
                    key=aspirate_running.key, params=aspirate_running.params
                )
                return aspirate_create, aspirate_running
            else:
                flow_rate = command["payload"]["rate"] * pipette.flow_rate.dispense
                dispense_running = pe_commands.Dispense.model_construct(
                    id=command_id,
                    key=command_id,
                    status=pe_commands.CommandStatus.RUNNING,
                    createdAt=now,
                    startedAt=now,
                    # Don't .model_construct params, because we want to validate
                    # volume and flowRate.
                    params=pe_commands.DispenseParams(
                        pipetteId=pipette_id,
                        labwareId=labware_id,
                        wellName=well_name,
                        volume=volume,
                        flowRate=flow_rate,
                    ),
                )
                dispense_create = pe_commands.DispenseCreate.model_construct(
                    key=dispense_running.key, params=dispense_running.params
                )
                return dispense_create, dispense_running

        else:
            running = pe_commands.Custom.model_construct(
                id=command_id,
                key=command_id,
                status=pe_commands.CommandStatus.RUNNING,
                createdAt=now,
                startedAt=now,
                params=LegacyCommandParams.model_construct(
                    legacyCommandType=command["name"],
                    legacyCommandText=command["payload"]["text"],
                ),
            )
            create = pe_commands.CustomCreate.model_construct(
                key=running.key, params=running.params
            )
            return create, running

    def _build_blow_out(
        self,
        command: legacy_command_types.BlowOutMessage,
        command_id: str,
        now: datetime,
    ) -> Tuple[pe_commands.CommandCreate, pe_commands.Command]:
        pipette: InstrumentContext = command["payload"]["instrument"]
        location = command["payload"]["location"]
        flow_rate = pipette.flow_rate.blow_out
        #   TODO:(jr, 15.08.2022): blow_out commands with no specified labware get filtered
        #   into custom. Remove location.labware.is_empty is False when refactor is complete
        if isinstance(location, Location) and location.labware.is_well:
            well = location.labware.as_well()
            slot = DeckSlotName(location.labware.first_parent())
            parent_module_id = self._module_id_by_slot.get(slot)
            labware_id = (
                self._labware_id_by_module_id[parent_module_id]
                if parent_module_id is not None
                else self._labware_id_by_slot[slot]
            )
            mount = MountType(pipette.mount)
            well_name = well.well_name
            pipette_id = self._pipette_id_by_mount[mount]

            blow_out_running = pe_commands.BlowOut.model_construct(
                id=command_id,
                key=command_id,
                status=pe_commands.CommandStatus.RUNNING,
                createdAt=now,
                startedAt=now,
                # Don't .model_construct() params, because we want to validate flowRate.
                params=pe_commands.BlowOutParams(
                    pipetteId=pipette_id,
                    labwareId=labware_id,
                    wellName=well_name,
                    flowRate=flow_rate,
                ),
            )
            blow_out_create = pe_commands.BlowOutCreate.model_construct(
                key=blow_out_running.key, params=blow_out_running.params
            )
            return blow_out_create, blow_out_running

        #   TODO:(jr, 15.08.2022): blow_out commands with no specified labware get filtered
        #   into custom. Refactor this in followup legacy command mapping
        else:
            custom_running = pe_commands.Custom.model_construct(
                id=command_id,
                key=command_id,
                status=pe_commands.CommandStatus.RUNNING,
                createdAt=now,
                startedAt=now,
                params=LegacyCommandParams.model_construct(
                    legacyCommandType=command["name"],
                    legacyCommandText=command["payload"]["text"],
                ),
            )
            custom_create = pe_commands.CustomCreate.model_construct(
                key=custom_running.key, params=custom_running.params
            )
            return custom_create, custom_running

    def _map_labware_load(
        self, labware_load_info: LegacyLabwareLoadInfo
    ) -> List[pe_actions.Action]:
        """Map a legacy labware load to a ProtocolEngine command."""
        now = ModelUtils.get_timestamp()
        count = self._command_count["LOAD_LABWARE"]
        slot = labware_load_info.deck_slot
        location: pe_types.LabwareLocation
        if labware_load_info.on_module:
            location = pe_types.ModuleLocation.model_construct(
                moduleId=self._module_id_by_slot[slot]
            )
        else:
            location = pe_types.DeckSlotLocation.model_construct(slotName=slot)

        command_id = f"commands.LOAD_LABWARE-{count}"
        labware_id = f"labware-{count}"

        succeeded_command = pe_commands.LoadLabware.model_construct(
            id=command_id,
            key=command_id,
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=now,
            startedAt=now,
            completedAt=now,
            params=pe_commands.LoadLabwareParams.model_construct(
                location=location,
                loadName=labware_load_info.labware_load_name,
                namespace=labware_load_info.labware_namespace,
                version=labware_load_info.labware_version,
                displayName=labware_load_info.labware_display_name,
            ),
            notes=[],
            result=pe_commands.LoadLabwareResult.model_construct(
                labwareId=labware_id,
                definition=LabwareDefinition.model_validate(
                    labware_load_info.labware_definition
                ),
                offsetId=labware_load_info.offset_id,
            ),
        )
        queue_action = pe_actions.QueueCommandAction(
            command_id=succeeded_command.id,
            created_at=succeeded_command.createdAt,
            request=pe_commands.LoadLabwareCreate.model_construct(
                key=succeeded_command.key, params=succeeded_command.params
            ),
            request_hash=None,
        )
        run_action = pe_actions.RunCommandAction(
            command_id=succeeded_command.id,
            # We just set this above, so we know it's not None.
            started_at=succeeded_command.startedAt,  # type: ignore[arg-type]
        )
        state_update = StateUpdate()
        assert succeeded_command.result is not None
        state_update.set_loaded_labware(
            labware_id=labware_id,
            definition=succeeded_command.result.definition,
            display_name=labware_load_info.labware_display_name,
            offset_id=labware_load_info.offset_id,
            location=location,
        )

        succeed_action = pe_actions.SucceedCommandAction(
            command=succeeded_command,
            state_update=state_update,
        )

        self._command_count["LOAD_LABWARE"] = count + 1
        if isinstance(location, pe_types.DeckSlotLocation):
            self._labware_id_by_slot[location.slotName] = labware_id
        elif isinstance(location, pe_types.ModuleLocation):
            self._labware_id_by_module_id[location.moduleId] = labware_id

        return [queue_action, run_action, succeed_action]

    def _map_instrument_load(
        self,
        instrument_load_info: LegacyInstrumentLoadInfo,
    ) -> List[pe_actions.Action]:
        """Map a legacy instrument (pipette) load to a ProtocolEngine command.

        Also creates a `AddPipetteConfigAction`, which is not necessary for the run,
        but is needed for stop so tip geometry is in state for the HardwareStopper.
        """
        now = ModelUtils.get_timestamp()
        count = self._command_count["LOAD_PIPETTE"]
        command_id = f"commands.LOAD_PIPETTE-{count}"
        pipette_id = f"pipette-{count}"
        mount = MountType(str(instrument_load_info.mount).lower())

        succeeded_command = pe_commands.LoadPipette.model_construct(
            id=command_id,
            key=command_id,
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=now,
            startedAt=now,
            completedAt=now,
            params=pe_commands.LoadPipetteParams.model_construct(
                pipetteName=PipetteNameType(instrument_load_info.instrument_load_name),
                mount=mount,
            ),
            notes=[],
            result=pe_commands.LoadPipetteResult.model_construct(pipetteId=pipette_id),
        )
        serial = instrument_load_info.pipette_dict.get("pipette_id", None) or ""
        state_update = StateUpdate()
        state_update.set_load_pipette(
            pipette_id=pipette_id,
            mount=succeeded_command.params.mount,
            pipette_name=succeeded_command.params.pipetteName,
            liquid_presence_detection=succeeded_command.params.liquidPresenceDetection,
        )
        state_update.update_pipette_config(
            pipette_id=pipette_id,
            serial_number=serial,
            config=pipette_data_provider.get_pipette_static_config(
                # Compatibility note - this is the version of tip overlap data, it stays at 0
                # so protocol behavior does not change when you run a legacy JSON protocol
                instrument_load_info.pipette_dict,
                "v0",
            ),
        )
        queue_action = pe_actions.QueueCommandAction(
            command_id=succeeded_command.id,
            created_at=succeeded_command.createdAt,
            request=pe_commands.LoadPipetteCreate.model_construct(
                key=succeeded_command.key, params=succeeded_command.params
            ),
            request_hash=None,
        )
        run_action = pe_actions.RunCommandAction(
            command_id=succeeded_command.id,
            # We just set this above, so we know it's not None.
            started_at=succeeded_command.startedAt,  # type: ignore[arg-type]
        )

        succeed_action = pe_actions.SucceedCommandAction(
            command=succeeded_command,
            state_update=state_update,
        )

        self._command_count["LOAD_PIPETTE"] = count + 1
        self._pipette_id_by_mount[mount] = pipette_id

        return [queue_action, run_action, succeed_action]

    def _map_module_load(
        self, module_load_info: LegacyModuleLoadInfo
    ) -> List[pe_actions.Action]:
        """Map a legacy module load to a Protocol Engine command."""
        now = ModelUtils.get_timestamp()

        count = self._command_count["LOAD_MODULE"]
        command_id = f"commands.LOAD_MODULE-{count}"
        module_id = f"module-{count}"
        requested_model = _HARDWARE_TO_PE_MODULE[module_load_info.requested_model]
        loaded_model = _HARDWARE_TO_PE_MODULE[module_load_info.loaded_model]

        # This will fetch a V2 definition only. PAPI < v2.3 use V1 definitions.
        # When running a < v2.3 protocol, there will be a mismatch of definitions used
        # during analysis+LPC (V2) and protocol execution (V1).
        # But this shouldn't result in any problems since V2 and V1 definitions
        # have similar info, with V2 having additional info fields.
        loaded_definition = self._module_definition_by_model.get(
            loaded_model
        ) or self._module_data_provider.get_definition(loaded_model)

        succeeded_command = pe_commands.LoadModule.model_construct(
            id=command_id,
            key=command_id,
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=now,
            startedAt=now,
            completedAt=now,
            params=pe_commands.LoadModuleParams.model_construct(
                model=requested_model,
                location=pe_types.DeckSlotLocation(
                    slotName=module_load_info.deck_slot,
                ),
                moduleId=module_id,
            ),
            notes=[],
            result=pe_commands.LoadModuleResult.model_construct(
                moduleId=module_id,
                serialNumber=module_load_info.module_serial,
                definition=loaded_definition,
                model=loaded_model,
            ),
        )
        queue_action = pe_actions.QueueCommandAction(
            command_id=succeeded_command.id,
            created_at=succeeded_command.createdAt,
            request=pe_commands.LoadModuleCreate.model_construct(
                key=succeeded_command.key, params=succeeded_command.params
            ),
            request_hash=None,
        )
        run_action = pe_actions.RunCommandAction(
            command_id=succeeded_command.id,
            # We just set this above, so we know it's not None.
            started_at=succeeded_command.startedAt,  # type: ignore[arg-type]
        )
        succeed_action = pe_actions.SucceedCommandAction(
            command=succeeded_command, state_update=StateUpdate()
        )

        self._command_count["LOAD_MODULE"] = count + 1
        self._module_id_by_slot[module_load_info.deck_slot] = module_id
        self._module_definition_by_model[loaded_model] = loaded_definition

        return [queue_action, run_action, succeed_action]
