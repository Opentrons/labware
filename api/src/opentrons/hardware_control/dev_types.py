from __future__ import annotations

# this file defines types that require dev dependencies
# and are only relevant for static typechecking. this file should only
# be imported if typing.TYPE_CHECKING is True
from typing import Optional, Dict, List, Union

from typing_extensions import TypedDict, Literal

from opentrons.hardware_control.instruments.ot3.instrument_calibration import (
    GripperCalibrationOffset,
)
from opentrons_shared_data.pipette.types import (
    PipetteModel,
    PipetteName,
    ChannelCount,
)
from opentrons_shared_data.pipette.types import PipetteTipType
from opentrons_shared_data.pipette.pipette_definition import (
    PipetteConfigurations,
    SupportedTipsDefinition,
    PipetteBoundingBoxOffsetDefinition,
    AvailableSensorDefinition,
)
from opentrons_shared_data.gripper import (
    GripperModel,
    GripperDefinition,
)

from opentrons.drivers.types import MoveSplit
from opentrons.types import Mount
from opentrons.hardware_control.types import GripperJawState
from opentrons.hardware_control.nozzle_manager import NozzleMap


class InstrumentSpec(TypedDict):
    id: Optional[str]


class PipetteSpec(InstrumentSpec):
    model: Union[PipetteModel, None]


class GripperSpec(InstrumentSpec):
    model: Union[GripperModel, None]


class AttachedPipette(TypedDict):
    config: Optional[PipetteConfigurations]
    id: Optional[str]


class AttachedGripper(TypedDict):
    config: Optional[GripperDefinition]
    id: Optional[str]


AttachedInstruments = Dict[Mount, AttachedPipette]

OT3AttachedInstruments = Union[AttachedPipette, AttachedGripper]

EIGHT_CHANNELS = Literal[8]
ONE_CHANNEL = Literal[1]


class InstrumentDict(TypedDict):
    display_name: str


class PipetteDict(InstrumentDict):
    name: PipetteName
    model: PipetteModel
    back_compat_names: List[PipetteName]
    pipette_id: str
    min_volume: float
    max_volume: float
    channels: ChannelCount
    aspirate_flow_rate: float
    dispense_flow_rate: float
    blow_out_flow_rate: float
    aspirate_speed: float
    dispense_speed: float
    blow_out_speed: float
    current_volume: float
    tip_length: float
    working_volume: float
    tip_overlap: Dict[str, float]
    versioned_tip_overlap: Dict[str, Dict[str, float]]
    available_volume: float
    return_tip_height: float
    default_aspirate_flow_rates: Dict[str, float]
    default_dispense_flow_rates: Dict[str, float]
    default_blow_out_flow_rates: Dict[str, float]
    default_aspirate_speeds: Dict[str, float]
    default_dispense_speeds: Dict[str, float]
    default_blow_out_speeds: Dict[str, float]
    ready_to_aspirate: bool
    has_tip: bool
    default_push_out_volume: Optional[float]
    supported_tips: Dict[PipetteTipType, SupportedTipsDefinition]
    pipette_bounding_box_offsets: PipetteBoundingBoxOffsetDefinition
    current_nozzle_map: NozzleMap
    lld_settings: Optional[Dict[str, Dict[str, float]]]
    plunger_positions: Dict[str, float]
    shaft_ul_per_mm: float
    available_sensors: AvailableSensorDefinition


class PipetteStateDict(TypedDict):
    tip_detected: bool


class GripperDict(InstrumentDict):
    model: GripperModel
    gripper_id: str
    state: GripperJawState  # Can we call this jaw_state?
    calibration_offset: GripperCalibrationOffset


class InstrumentHardwareConfigs(TypedDict):
    steps_per_mm: float
    home_pos: float
    max_travel: float
    idle_current: float
    splits: Optional[MoveSplit]
