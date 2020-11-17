"""Basic pipette data state and store."""
from dataclasses import dataclass
from typing import Dict, List, Mapping, Optional, Tuple
from typing_extensions import final

from opentrons_shared_data.pipette.dev_types import PipetteName
from opentrons.hardware_control.dev_types import PipetteDict
from opentrons.types import MountType, Mount as HwMount

from .. import errors
from ..commands import CompletedCommandType, LoadPipetteResult
from .substore import Substore, CommandReactive


@final
@dataclass(frozen=True)
class PipetteData:
    """Pipette state data."""

    mount: MountType
    pipette_name: PipetteName


@final
@dataclass(frozen=True)
class HardwarePipette:
    """Hardware pipette data."""

    mount: HwMount
    config: PipetteDict


class PipetteState:
    """Basic labware data state and getter methods."""

    _pipettes_by_id: Dict[str, PipetteData]

    def __init__(self) -> None:
        """Initialize a PipetteState instance."""
        self._pipettes_by_id = {}

    def get_pipette_data_by_id(self, pipette_id: str) -> PipetteData:
        """Get pipette data by the pipette's unique identifier."""
        try:
            return self._pipettes_by_id[pipette_id]
        except KeyError:
            raise errors.PipetteDoesNotExistError(
                f"Pipette {pipette_id} not found."
            )

    def get_all_pipettes(self) -> List[Tuple[str, PipetteData]]:
        """Get a list of all pipette entries in state."""
        return [entry for entry in self._pipettes_by_id.items()]

    def get_pipette_data_by_mount(
        self,
        mount: MountType
    ) -> Optional[PipetteData]:
        """Get pipette data by the pipette's mount."""
        for pipette in self._pipettes_by_id.values():
            if pipette.mount == mount:
                return pipette
        return None

    def get_hardware_pipette(
        self,
        pipette_id: str,
        attached_pipettes: Mapping[HwMount, Optional[PipetteDict]],
    ) -> HardwarePipette:
        """Get a pipette's hardware configuration and state by ID."""
        pipette_data = self.get_pipette_data_by_id(pipette_id)
        pipette_name = pipette_data.pipette_name
        mount = pipette_data.mount

        hw_mount = mount.to_hw_mount()
        hw_config = attached_pipettes[hw_mount]

        if hw_config is None:
            raise errors.PipetteNotAttachedError(f"No pipetted attached on {mount}")
        # TODO(mc, 2020-11-12): support hw_pipette.act_as
        elif hw_config["name"] != pipette_name:
            raise errors.PipetteNotAttachedError(
                f"Found {hw_config['name']} on {mount}, "
                f"but {pipette_id} is a {pipette_name}"
            )

        return HardwarePipette(mount=hw_mount, config=hw_config)


class PipetteStore(Substore[PipetteState], CommandReactive):
    """Pipette state container."""

    _state: PipetteState

    def __init__(self) -> None:
        """Initialize a PipetteStore and its state."""
        self._state = PipetteState()

    def handle_completed_command(self, command: CompletedCommandType) -> None:
        """Modify state in reaction to a completed command."""
        if isinstance(command.result, LoadPipetteResult):
            pipette_id = command.result.pipetteId
            self._state._pipettes_by_id[pipette_id] = PipetteData(
                pipette_name=command.request.pipetteName,
                mount=command.request.mount
            )
