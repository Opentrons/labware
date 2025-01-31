export type FlexAddressableAreaName =
  | 'A1'
  | 'B1'
  | 'C1'
  | 'D1'
  | 'A2'
  | 'B2'
  | 'C2'
  | 'D2'
  | 'A3'
  | 'B3'
  | 'C3'
  | 'D3'
  | 'A4'
  | 'B4'
  | 'C4'
  | 'D4'
  | 'movableTrashA1'
  | 'movableTrashB1'
  | 'movableTrashC1'
  | 'movableTrashD1'
  | 'movableTrashA3'
  | 'movableTrashB3'
  | 'movableTrashC3'
  | 'movableTrashD3'
  | '1ChannelWasteChute'
  | '8ChannelWasteChute'
  | '96ChannelWasteChute'
  | 'gripperWasteChute'
  | 'thermocyclerModuleV2'
  | 'heaterShakerV1A1'
  | 'heaterShakerV1B1'
  | 'heaterShakerV1C1'
  | 'heaterShakerV1D1'
  | 'heaterShakerV1A3'
  | 'heaterShakerV1B3'
  | 'heaterShakerV1C3'
  | 'heaterShakerV1D3'
  | 'temperatureModuleV2A1'
  | 'temperatureModuleV2B1'
  | 'temperatureModuleV2C1'
  | 'temperatureModuleV2D1'
  | 'temperatureModuleV2A3'
  | 'temperatureModuleV2B3'
  | 'temperatureModuleV2C3'
  | 'temperatureModuleV2D3'
  | 'magneticBlockV1A1'
  | 'magneticBlockV1B1'
  | 'magneticBlockV1C1'
  | 'magneticBlockV1D1'
  | 'magneticBlockV1A2'
  | 'magneticBlockV1B2'
  | 'magneticBlockV1C2'
  | 'magneticBlockV1D2'
  | 'magneticBlockV1A3'
  | 'magneticBlockV1B3'
  | 'magneticBlockV1C3'
  | 'magneticBlockV1D3'
  | 'absorbanceReaderV1A3'
  | 'absorbanceReaderV1B3'
  | 'absorbanceReaderV1C3'
  | 'absorbanceReaderV1D3'
  | 'absorbanceReaderV1LidDockA4'
  | 'absorbanceReaderV1LidDockB4'
  | 'absorbanceReaderV1LidDockC4'
  | 'absorbanceReaderV1LidDockD4'

export type OT2AddressableAreaName =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | 'fixedTrash'

export type AddressableAreaName =
  | FlexAddressableAreaName
  | OT2AddressableAreaName

export type CutoutId =
  | 'cutoutD1'
  | 'cutoutD2'
  | 'cutoutD3'
  | 'cutoutC1'
  | 'cutoutC2'
  | 'cutoutC3'
  | 'cutoutB1'
  | 'cutoutB2'
  | 'cutoutB3'
  | 'cutoutA1'
  | 'cutoutA2'
  | 'cutoutA3'

export type OT2CutoutId =
  | 'cutout1'
  | 'cutout2'
  | 'cutout3'
  | 'cutout4'
  | 'cutout5'
  | 'cutout6'
  | 'cutout7'
  | 'cutout8'
  | 'cutout9'
  | 'cutout10'
  | 'cutout11'
  | 'cutout12'

export type SingleSlotCutoutFixtureId =
  | 'singleLeftSlot'
  | 'singleCenterSlot'
  | 'singleRightSlot'

export type StagingAreaRightSlotFixtureId = 'stagingAreaRightSlot'

export type TrashBinAdapterCutoutFixtureId = 'trashBinAdapter'

export type WasteChuteCutoutFixtureId =
  | 'wasteChuteRightAdapterCovered'
  | 'wasteChuteRightAdapterNoCover'
  | 'stagingAreaSlotWithWasteChuteRightAdapterCovered'
  | 'stagingAreaSlotWithWasteChuteRightAdapterNoCover'

export type FlexModuleCutoutFixtureId =
  | 'heaterShakerModuleV1'
  | 'temperatureModuleV2'
  | 'magneticBlockV1'
  | 'stagingAreaSlotWithMagneticBlockV1'
  | 'thermocyclerModuleV2Rear'
  | 'thermocyclerModuleV2Front'
  | 'absorbanceReaderV1'

export type OT2SingleStandardSlot = 'singleStandardSlot'

export type OT2FixedTrashSlot = 'fixedTrashSlot'

export type CutoutFixtureId =
  | SingleSlotCutoutFixtureId
  | StagingAreaRightSlotFixtureId
  | TrashBinAdapterCutoutFixtureId
  | WasteChuteCutoutFixtureId
  | FlexModuleCutoutFixtureId
  | OT2SingleStandardSlot
  | OT2FixedTrashSlot
