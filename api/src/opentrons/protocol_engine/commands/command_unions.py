"""Union types of concrete command definitions."""

from collections.abc import Collection
from typing import Annotated, Type, Union, get_type_hints

from pydantic import Field, TypeAdapter

from opentrons.util.get_union_elements import get_union_elements

from .command import DefinedErrorData
from .pipetting_common import (
    OverpressureError,
    LiquidNotFoundError,
    TipPhysicallyAttachedError,
)
from .movement_common import StallOrCollisionError

from . import absorbance_reader
from . import heater_shaker
from . import magnetic_module
from . import temperature_module
from . import thermocycler

from . import calibration
from . import unsafe
from . import robot

from .set_rail_lights import (
    SetRailLights,
    SetRailLightsCommandType,
    SetRailLightsCreate,
    SetRailLightsParams,
    SetRailLightsResult,
)

from .air_gap_in_place import (
    AirGapInPlace,
    AirGapInPlaceParams,
    AirGapInPlaceCreate,
    AirGapInPlaceResult,
    AirGapInPlaceCommandType,
)

from .aspirate import (
    Aspirate,
    AspirateParams,
    AspirateCreate,
    AspirateResult,
    AspirateCommandType,
)

from .aspirate_in_place import (
    AspirateInPlace,
    AspirateInPlaceParams,
    AspirateInPlaceCreate,
    AspirateInPlaceResult,
    AspirateInPlaceCommandType,
)

from .comment import (
    Comment,
    CommentParams,
    CommentCreate,
    CommentResult,
    CommentCommandType,
)

from .custom import (
    Custom,
    CustomParams,
    CustomCreate,
    CustomResult,
    CustomCommandType,
)

from .dispense import (
    Dispense,
    DispenseParams,
    DispenseCreate,
    DispenseResult,
    DispenseCommandType,
)

from .dispense_in_place import (
    DispenseInPlace,
    DispenseInPlaceParams,
    DispenseInPlaceCreate,
    DispenseInPlaceResult,
    DispenseInPlaceCommandType,
)

from .drop_tip import (
    DropTip,
    DropTipParams,
    DropTipCreate,
    DropTipResult,
    DropTipCommandType,
)

from .drop_tip_in_place import (
    DropTipInPlace,
    DropTipInPlaceParams,
    DropTipInPlaceCreate,
    DropTipInPlaceResult,
    DropTipInPlaceCommandType,
)

from .home import (
    Home,
    HomeParams,
    HomeCreate,
    HomeResult,
    HomeCommandType,
)

from .load_labware import (
    LoadLabware,
    LoadLabwareParams,
    LoadLabwareCreate,
    LoadLabwareResult,
    LoadLabwareCommandType,
)

from .reload_labware import (
    ReloadLabware,
    ReloadLabwareParams,
    ReloadLabwareCreate,
    ReloadLabwareResult,
    ReloadLabwareCommandType,
)

from .load_liquid import (
    LoadLiquid,
    LoadLiquidParams,
    LoadLiquidCreate,
    LoadLiquidResult,
    LoadLiquidCommandType,
)

from .load_liquid_class import (
    LoadLiquidClass,
    LoadLiquidClassParams,
    LoadLiquidClassCreate,
    LoadLiquidClassResult,
    LoadLiquidClassCommandType,
)

from .load_module import (
    LoadModule,
    LoadModuleParams,
    LoadModuleCreate,
    LoadModuleResult,
    LoadModuleCommandType,
)

from .load_pipette import (
    LoadPipette,
    LoadPipetteParams,
    LoadPipetteCreate,
    LoadPipetteResult,
    LoadPipetteCommandType,
)

from .load_lid_stack import (
    LoadLidStack,
    LoadLidStackParams,
    LoadLidStackCreate,
    LoadLidStackResult,
    LoadLidStackCommandType,
)

from .load_lid import (
    LoadLid,
    LoadLidParams,
    LoadLidCreate,
    LoadLidResult,
    LoadLidCommandType,
)

from .move_labware import (
    GripperMovementError,
    MoveLabware,
    MoveLabwareParams,
    MoveLabwareCreate,
    MoveLabwareResult,
    MoveLabwareCommandType,
)

from .move_relative import (
    MoveRelative,
    MoveRelativeParams,
    MoveRelativeCreate,
    MoveRelativeResult,
    MoveRelativeCommandType,
)

from .move_to_coordinates import (
    MoveToCoordinates,
    MoveToCoordinatesParams,
    MoveToCoordinatesCreate,
    MoveToCoordinatesResult,
    MoveToCoordinatesCommandType,
)

from .move_to_well import (
    MoveToWell,
    MoveToWellParams,
    MoveToWellCreate,
    MoveToWellResult,
    MoveToWellCommandType,
)

from .move_to_addressable_area import (
    MoveToAddressableArea,
    MoveToAddressableAreaParams,
    MoveToAddressableAreaCreate,
    MoveToAddressableAreaResult,
    MoveToAddressableAreaCommandType,
)

from .move_to_addressable_area_for_drop_tip import (
    MoveToAddressableAreaForDropTip,
    MoveToAddressableAreaForDropTipParams,
    MoveToAddressableAreaForDropTipCreate,
    MoveToAddressableAreaForDropTipResult,
    MoveToAddressableAreaForDropTipCommandType,
)

from .wait_for_resume import (
    WaitForResume,
    WaitForResumeParams,
    WaitForResumeCreate,
    WaitForResumeResult,
    WaitForResumeCommandType,
)

from .wait_for_duration import (
    WaitForDuration,
    WaitForDurationParams,
    WaitForDurationCreate,
    WaitForDurationResult,
    WaitForDurationCommandType,
)

from .pick_up_tip import (
    PickUpTip,
    PickUpTipParams,
    PickUpTipCreate,
    PickUpTipResult,
    PickUpTipCommandType,
    TipPhysicallyMissingError,
)

from .touch_tip import (
    TouchTip,
    TouchTipParams,
    TouchTipCreate,
    TouchTipResult,
    TouchTipCommandType,
)

from .save_position import (
    SavePosition,
    SavePositionParams,
    SavePositionCreate,
    SavePositionResult,
    SavePositionCommandType,
)

from .blow_out import (
    BlowOutParams,
    BlowOut,
    BlowOutCreate,
    BlowOutCommandType,
    BlowOutResult,
)

from .blow_out_in_place import (
    BlowOutInPlaceParams,
    BlowOutInPlace,
    BlowOutInPlaceCreate,
    BlowOutInPlaceCommandType,
    BlowOutInPlaceResult,
)

from .set_status_bar import (
    SetStatusBar,
    SetStatusBarParams,
    SetStatusBarCreate,
    SetStatusBarResult,
    SetStatusBarCommandType,
)

from .retract_axis import (
    RetractAxis,
    RetractAxisParams,
    RetractAxisCreate,
    RetractAxisResult,
    RetractAxisCommandType,
)

from .configure_for_volume import (
    ConfigureForVolume,
    ConfigureForVolumeParams,
    ConfigureForVolumeCreate,
    ConfigureForVolumeResult,
    ConfigureForVolumeCommandType,
)

from .prepare_to_aspirate import (
    PrepareToAspirate,
    PrepareToAspirateParams,
    PrepareToAspirateCreate,
    PrepareToAspirateResult,
    PrepareToAspirateCommandType,
)

from .configure_nozzle_layout import (
    ConfigureNozzleLayout,
    ConfigureNozzleLayoutCreate,
    ConfigureNozzleLayoutParams,
    ConfigureNozzleLayoutResult,
    ConfigureNozzleLayoutCommandType,
)

from .verify_tip_presence import (
    VerifyTipPresence,
    VerifyTipPresenceCreate,
    VerifyTipPresenceParams,
    VerifyTipPresenceResult,
    VerifyTipPresenceCommandType,
)

from .get_tip_presence import (
    GetTipPresence,
    GetTipPresenceCreate,
    GetTipPresenceParams,
    GetTipPresenceResult,
    GetTipPresenceCommandType,
)

from .get_next_tip import (
    GetNextTip,
    GetNextTipCreate,
    GetNextTipParams,
    GetNextTipResult,
    GetNextTipCommandType,
)

from .liquid_probe import (
    LiquidProbe,
    LiquidProbeParams,
    LiquidProbeCreate,
    LiquidProbeResult,
    LiquidProbeCommandType,
    TryLiquidProbe,
    TryLiquidProbeParams,
    TryLiquidProbeCreate,
    TryLiquidProbeResult,
    TryLiquidProbeCommandType,
)

from .evotip_seal_pipette import (
    EvotipSealPipette,
    EvotipSealPipetteParams,
    EvotipSealPipetteCreate,
    EvotipSealPipetteResult,
    EvotipSealPipetteCommandType,
)

from .evotip_dispense import (
    EvotipDispense,
    EvotipDispenseParams,
    EvotipDispenseCreate,
    EvotipDispenseResult,
    EvotipDispenseCommandType,
)

from .evotip_unseal_pipette import (
    EvotipUnsealPipette,
    EvotipUnsealPipetteParams,
    EvotipUnsealPipetteCreate,
    EvotipUnsealPipetteResult,
    EvotipUnsealPipetteCommandType,
)

Command = Annotated[
    Union[
        AirGapInPlace,
        Aspirate,
        AspirateInPlace,
        Comment,
        Custom,
        Dispense,
        DispenseInPlace,
        BlowOut,
        BlowOutInPlace,
        ConfigureForVolume,
        ConfigureNozzleLayout,
        DropTip,
        DropTipInPlace,
        Home,
        RetractAxis,
        LoadLabware,
        ReloadLabware,
        LoadLiquid,
        LoadLiquidClass,
        LoadModule,
        LoadPipette,
        LoadLidStack,
        LoadLid,
        MoveLabware,
        MoveRelative,
        MoveToCoordinates,
        MoveToWell,
        MoveToAddressableArea,
        MoveToAddressableAreaForDropTip,
        PrepareToAspirate,
        WaitForResume,
        WaitForDuration,
        PickUpTip,
        SavePosition,
        SetRailLights,
        TouchTip,
        SetStatusBar,
        VerifyTipPresence,
        GetTipPresence,
        GetNextTip,
        LiquidProbe,
        TryLiquidProbe,
        EvotipSealPipette,
        EvotipDispense,
        EvotipUnsealPipette,
        heater_shaker.WaitForTemperature,
        heater_shaker.SetTargetTemperature,
        heater_shaker.DeactivateHeater,
        heater_shaker.SetAndWaitForShakeSpeed,
        heater_shaker.DeactivateShaker,
        heater_shaker.OpenLabwareLatch,
        heater_shaker.CloseLabwareLatch,
        magnetic_module.Disengage,
        magnetic_module.Engage,
        temperature_module.SetTargetTemperature,
        temperature_module.WaitForTemperature,
        temperature_module.DeactivateTemperature,
        thermocycler.SetTargetBlockTemperature,
        thermocycler.WaitForBlockTemperature,
        thermocycler.SetTargetLidTemperature,
        thermocycler.WaitForLidTemperature,
        thermocycler.DeactivateBlock,
        thermocycler.DeactivateLid,
        thermocycler.OpenLid,
        thermocycler.CloseLid,
        thermocycler.RunProfile,
        thermocycler.RunExtendedProfile,
        absorbance_reader.CloseLid,
        absorbance_reader.OpenLid,
        absorbance_reader.Initialize,
        absorbance_reader.ReadAbsorbance,
        calibration.CalibrateGripper,
        calibration.CalibratePipette,
        calibration.CalibrateModule,
        calibration.MoveToMaintenancePosition,
        unsafe.UnsafeBlowOutInPlace,
        unsafe.UnsafeDropTipInPlace,
        unsafe.UpdatePositionEstimators,
        unsafe.UnsafeEngageAxes,
        unsafe.UnsafeUngripLabware,
        unsafe.UnsafePlaceLabware,
        robot.MoveTo,
        robot.MoveAxesRelative,
        robot.MoveAxesTo,
        robot.openGripperJaw,
        robot.closeGripperJaw,
    ],
    Field(discriminator="commandType"),
]

CommandParams = Union[
    AirGapInPlaceParams,
    AspirateParams,
    AspirateInPlaceParams,
    CommentParams,
    ConfigureForVolumeParams,
    ConfigureNozzleLayoutParams,
    CustomParams,
    DispenseParams,
    DispenseInPlaceParams,
    BlowOutParams,
    BlowOutInPlaceParams,
    DropTipParams,
    DropTipInPlaceParams,
    HomeParams,
    RetractAxisParams,
    LoadLabwareParams,
    LoadLidStackParams,
    LoadLidParams,
    ReloadLabwareParams,
    LoadLiquidParams,
    LoadLiquidClassParams,
    LoadModuleParams,
    LoadPipetteParams,
    MoveLabwareParams,
    MoveRelativeParams,
    MoveToCoordinatesParams,
    MoveToWellParams,
    MoveToAddressableAreaParams,
    MoveToAddressableAreaForDropTipParams,
    PrepareToAspirateParams,
    WaitForResumeParams,
    WaitForDurationParams,
    PickUpTipParams,
    SavePositionParams,
    SetRailLightsParams,
    TouchTipParams,
    SetStatusBarParams,
    VerifyTipPresenceParams,
    GetTipPresenceParams,
    GetNextTipParams,
    LiquidProbeParams,
    TryLiquidProbeParams,
    EvotipSealPipetteParams,
    EvotipDispenseParams,
    EvotipUnsealPipetteParams,
    heater_shaker.WaitForTemperatureParams,
    heater_shaker.SetTargetTemperatureParams,
    heater_shaker.DeactivateHeaterParams,
    heater_shaker.SetAndWaitForShakeSpeedParams,
    heater_shaker.DeactivateShakerParams,
    heater_shaker.OpenLabwareLatchParams,
    heater_shaker.CloseLabwareLatchParams,
    magnetic_module.DisengageParams,
    magnetic_module.EngageParams,
    temperature_module.SetTargetTemperatureParams,
    temperature_module.WaitForTemperatureParams,
    temperature_module.DeactivateTemperatureParams,
    thermocycler.SetTargetBlockTemperatureParams,
    thermocycler.WaitForBlockTemperatureParams,
    thermocycler.SetTargetLidTemperatureParams,
    thermocycler.WaitForLidTemperatureParams,
    thermocycler.DeactivateBlockParams,
    thermocycler.DeactivateLidParams,
    thermocycler.OpenLidParams,
    thermocycler.CloseLidParams,
    thermocycler.RunProfileParams,
    thermocycler.RunExtendedProfileParams,
    absorbance_reader.CloseLidParams,
    absorbance_reader.OpenLidParams,
    absorbance_reader.InitializeParams,
    absorbance_reader.ReadAbsorbanceParams,
    calibration.CalibrateGripperParams,
    calibration.CalibratePipetteParams,
    calibration.CalibrateModuleParams,
    calibration.MoveToMaintenancePositionParams,
    unsafe.UnsafeBlowOutInPlaceParams,
    unsafe.UnsafeDropTipInPlaceParams,
    unsafe.UpdatePositionEstimatorsParams,
    unsafe.UnsafeEngageAxesParams,
    unsafe.UnsafeUngripLabwareParams,
    unsafe.UnsafePlaceLabwareParams,
    robot.MoveAxesRelativeParams,
    robot.MoveAxesToParams,
    robot.MoveToParams,
    robot.openGripperJawParams,
    robot.closeGripperJawParams,
]

CommandType = Union[
    AirGapInPlaceCommandType,
    AspirateCommandType,
    AspirateInPlaceCommandType,
    CommentCommandType,
    ConfigureForVolumeCommandType,
    ConfigureNozzleLayoutCommandType,
    CustomCommandType,
    DispenseCommandType,
    DispenseInPlaceCommandType,
    BlowOutCommandType,
    BlowOutInPlaceCommandType,
    DropTipCommandType,
    DropTipInPlaceCommandType,
    HomeCommandType,
    RetractAxisCommandType,
    LoadLabwareCommandType,
    ReloadLabwareCommandType,
    LoadLiquidCommandType,
    LoadLiquidClassCommandType,
    LoadModuleCommandType,
    LoadPipetteCommandType,
    LoadLidStackCommandType,
    LoadLidCommandType,
    MoveLabwareCommandType,
    MoveRelativeCommandType,
    MoveToCoordinatesCommandType,
    MoveToWellCommandType,
    MoveToAddressableAreaCommandType,
    MoveToAddressableAreaForDropTipCommandType,
    PrepareToAspirateCommandType,
    WaitForResumeCommandType,
    WaitForDurationCommandType,
    PickUpTipCommandType,
    SavePositionCommandType,
    SetRailLightsCommandType,
    TouchTipCommandType,
    SetStatusBarCommandType,
    VerifyTipPresenceCommandType,
    GetTipPresenceCommandType,
    GetNextTipCommandType,
    LiquidProbeCommandType,
    TryLiquidProbeCommandType,
    EvotipSealPipetteCommandType,
    EvotipDispenseCommandType,
    EvotipUnsealPipetteCommandType,
    heater_shaker.WaitForTemperatureCommandType,
    heater_shaker.SetTargetTemperatureCommandType,
    heater_shaker.DeactivateHeaterCommandType,
    heater_shaker.SetAndWaitForShakeSpeedCommandType,
    heater_shaker.DeactivateShakerCommandType,
    heater_shaker.OpenLabwareLatchCommandType,
    heater_shaker.CloseLabwareLatchCommandType,
    magnetic_module.DisengageCommandType,
    magnetic_module.EngageCommandType,
    temperature_module.SetTargetTemperatureCommandType,
    temperature_module.WaitForTemperatureCommandType,
    temperature_module.DeactivateTemperatureCommandType,
    thermocycler.SetTargetBlockTemperatureCommandType,
    thermocycler.WaitForBlockTemperatureCommandType,
    thermocycler.SetTargetLidTemperatureCommandType,
    thermocycler.WaitForLidTemperatureCommandType,
    thermocycler.DeactivateBlockCommandType,
    thermocycler.DeactivateLidCommandType,
    thermocycler.OpenLidCommandType,
    thermocycler.CloseLidCommandType,
    thermocycler.RunProfileCommandType,
    thermocycler.RunExtendedProfileCommandType,
    absorbance_reader.CloseLidCommandType,
    absorbance_reader.OpenLidCommandType,
    absorbance_reader.InitializeCommandType,
    absorbance_reader.ReadAbsorbanceCommandType,
    calibration.CalibrateGripperCommandType,
    calibration.CalibratePipetteCommandType,
    calibration.CalibrateModuleCommandType,
    calibration.MoveToMaintenancePositionCommandType,
    unsafe.UnsafeBlowOutInPlaceCommandType,
    unsafe.UnsafeDropTipInPlaceCommandType,
    unsafe.UpdatePositionEstimatorsCommandType,
    unsafe.UnsafeEngageAxesCommandType,
    unsafe.UnsafeUngripLabwareCommandType,
    unsafe.UnsafePlaceLabwareCommandType,
    robot.MoveAxesRelativeCommandType,
    robot.MoveAxesToCommandType,
    robot.MoveToCommandType,
    robot.openGripperJawCommandType,
    robot.closeGripperJawCommandType,
]

CommandCreate = Annotated[
    Union[
        AirGapInPlaceCreate,
        AspirateCreate,
        AspirateInPlaceCreate,
        CommentCreate,
        ConfigureForVolumeCreate,
        ConfigureNozzleLayoutCreate,
        CustomCreate,
        DispenseCreate,
        DispenseInPlaceCreate,
        BlowOutCreate,
        BlowOutInPlaceCreate,
        DropTipCreate,
        DropTipInPlaceCreate,
        HomeCreate,
        RetractAxisCreate,
        LoadLabwareCreate,
        ReloadLabwareCreate,
        LoadLiquidCreate,
        LoadLiquidClassCreate,
        LoadModuleCreate,
        LoadPipetteCreate,
        LoadLidStackCreate,
        LoadLidCreate,
        MoveLabwareCreate,
        MoveRelativeCreate,
        MoveToCoordinatesCreate,
        MoveToWellCreate,
        MoveToAddressableAreaCreate,
        MoveToAddressableAreaForDropTipCreate,
        PrepareToAspirateCreate,
        WaitForResumeCreate,
        WaitForDurationCreate,
        PickUpTipCreate,
        SavePositionCreate,
        SetRailLightsCreate,
        TouchTipCreate,
        SetStatusBarCreate,
        VerifyTipPresenceCreate,
        GetTipPresenceCreate,
        GetNextTipCreate,
        LiquidProbeCreate,
        TryLiquidProbeCreate,
        EvotipSealPipetteCreate,
        EvotipDispenseCreate,
        EvotipUnsealPipetteCreate,
        heater_shaker.WaitForTemperatureCreate,
        heater_shaker.SetTargetTemperatureCreate,
        heater_shaker.DeactivateHeaterCreate,
        heater_shaker.SetAndWaitForShakeSpeedCreate,
        heater_shaker.DeactivateShakerCreate,
        heater_shaker.OpenLabwareLatchCreate,
        heater_shaker.CloseLabwareLatchCreate,
        magnetic_module.DisengageCreate,
        magnetic_module.EngageCreate,
        temperature_module.SetTargetTemperatureCreate,
        temperature_module.WaitForTemperatureCreate,
        temperature_module.DeactivateTemperatureCreate,
        thermocycler.SetTargetBlockTemperatureCreate,
        thermocycler.WaitForBlockTemperatureCreate,
        thermocycler.SetTargetLidTemperatureCreate,
        thermocycler.WaitForLidTemperatureCreate,
        thermocycler.DeactivateBlockCreate,
        thermocycler.DeactivateLidCreate,
        thermocycler.OpenLidCreate,
        thermocycler.CloseLidCreate,
        thermocycler.RunProfileCreate,
        thermocycler.RunExtendedProfileCreate,
        absorbance_reader.CloseLidCreate,
        absorbance_reader.OpenLidCreate,
        absorbance_reader.InitializeCreate,
        absorbance_reader.ReadAbsorbanceCreate,
        calibration.CalibrateGripperCreate,
        calibration.CalibratePipetteCreate,
        calibration.CalibrateModuleCreate,
        calibration.MoveToMaintenancePositionCreate,
        unsafe.UnsafeBlowOutInPlaceCreate,
        unsafe.UnsafeDropTipInPlaceCreate,
        unsafe.UpdatePositionEstimatorsCreate,
        unsafe.UnsafeEngageAxesCreate,
        unsafe.UnsafeUngripLabwareCreate,
        unsafe.UnsafePlaceLabwareCreate,
        robot.MoveAxesRelativeCreate,
        robot.MoveAxesToCreate,
        robot.MoveToCreate,
        robot.openGripperJawCreate,
        robot.closeGripperJawCreate,
    ],
    Field(discriminator="commandType"),
]

# Each time a TypeAdapter is instantiated, it will construct a new validator and
# serializer. To improve performance, TypeAdapters are instantiated once.
# See https://docs.pydantic.dev/latest/concepts/performance/#typeadapter-instantiated-once
CommandCreateAdapter: TypeAdapter[CommandCreate] = TypeAdapter(CommandCreate)

CommandAdapter: TypeAdapter[Command] = TypeAdapter(Command)

CommandResult = Union[
    AirGapInPlaceResult,
    AspirateResult,
    AspirateInPlaceResult,
    CommentResult,
    ConfigureForVolumeResult,
    ConfigureNozzleLayoutResult,
    CustomResult,
    DispenseResult,
    DispenseInPlaceResult,
    BlowOutResult,
    BlowOutInPlaceResult,
    DropTipResult,
    DropTipInPlaceResult,
    HomeResult,
    RetractAxisResult,
    LoadLabwareResult,
    ReloadLabwareResult,
    LoadLiquidResult,
    LoadLiquidClassResult,
    LoadModuleResult,
    LoadPipetteResult,
    LoadLidStackResult,
    LoadLidResult,
    MoveLabwareResult,
    MoveRelativeResult,
    MoveToCoordinatesResult,
    MoveToWellResult,
    MoveToAddressableAreaResult,
    MoveToAddressableAreaForDropTipResult,
    PrepareToAspirateResult,
    WaitForResumeResult,
    WaitForDurationResult,
    PickUpTipResult,
    SavePositionResult,
    SetRailLightsResult,
    TouchTipResult,
    SetStatusBarResult,
    VerifyTipPresenceResult,
    GetTipPresenceResult,
    GetNextTipResult,
    LiquidProbeResult,
    TryLiquidProbeResult,
    EvotipSealPipetteResult,
    EvotipDispenseResult,
    EvotipUnsealPipetteResult,
    heater_shaker.WaitForTemperatureResult,
    heater_shaker.SetTargetTemperatureResult,
    heater_shaker.DeactivateHeaterResult,
    heater_shaker.SetAndWaitForShakeSpeedResult,
    heater_shaker.DeactivateShakerResult,
    heater_shaker.OpenLabwareLatchResult,
    heater_shaker.CloseLabwareLatchResult,
    magnetic_module.DisengageResult,
    magnetic_module.EngageResult,
    temperature_module.SetTargetTemperatureResult,
    temperature_module.WaitForTemperatureResult,
    temperature_module.DeactivateTemperatureResult,
    thermocycler.SetTargetBlockTemperatureResult,
    thermocycler.WaitForBlockTemperatureResult,
    thermocycler.SetTargetLidTemperatureResult,
    thermocycler.WaitForLidTemperatureResult,
    thermocycler.DeactivateBlockResult,
    thermocycler.DeactivateLidResult,
    thermocycler.OpenLidResult,
    thermocycler.CloseLidResult,
    thermocycler.RunProfileResult,
    thermocycler.RunExtendedProfileResult,
    absorbance_reader.CloseLidResult,
    absorbance_reader.OpenLidResult,
    absorbance_reader.InitializeResult,
    absorbance_reader.ReadAbsorbanceResult,
    calibration.CalibrateGripperResult,
    calibration.CalibratePipetteResult,
    calibration.CalibrateModuleResult,
    calibration.MoveToMaintenancePositionResult,
    unsafe.UnsafeBlowOutInPlaceResult,
    unsafe.UnsafeDropTipInPlaceResult,
    unsafe.UpdatePositionEstimatorsResult,
    unsafe.UnsafeEngageAxesResult,
    unsafe.UnsafeUngripLabwareResult,
    unsafe.UnsafePlaceLabwareResult,
    robot.MoveAxesRelativeResult,
    robot.MoveAxesToResult,
    robot.MoveToResult,
    robot.openGripperJawResult,
    robot.closeGripperJawResult,
]


# All `DefinedErrorData`s that implementations will actually return in practice.
CommandDefinedErrorData = Union[
    DefinedErrorData[TipPhysicallyMissingError],
    DefinedErrorData[TipPhysicallyAttachedError],
    DefinedErrorData[OverpressureError],
    DefinedErrorData[LiquidNotFoundError],
    DefinedErrorData[GripperMovementError],
    DefinedErrorData[StallOrCollisionError],
]


def _map_create_types_by_params_type(
    create_types: Collection[Type[CommandCreate]],
) -> dict[Type[CommandParams], Type[CommandCreate]]:
    def get_params_type(create_type: Type[CommandCreate]) -> Type[CommandParams]:
        return get_type_hints(create_type)["params"]  # type: ignore[no-any-return]

    result = {get_params_type(create_type): create_type for create_type in create_types}

    # This isn't an inherent requirement of opentrons.protocol_engine,
    # but this mapping is only useful to higher-level code if this holds true.
    assert len(result) == len(
        create_types
    ), "Param models should map to create models 1:1."

    return result


CREATE_TYPES_BY_PARAMS_TYPE = _map_create_types_by_params_type(
    get_union_elements(CommandCreate)
)
"""A "reverse" mapping from each CommandParams type to its parent CommandCreate type."""
