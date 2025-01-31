import uuidv1 from 'uuid/v4'
import intersection from 'lodash/intersection'
import {
  orderWells,
  getAllDefinitions,
  getLabwareDefURI,
  getTipTypeFromTipRackDefinition,
  TRASH_BIN_ADAPTER_FIXTURE,
  WASTE_CHUTE_FIXTURES,
} from '@opentrons/shared-data'
import { makeInitialRobotState } from '@opentrons/step-generation'
import {
  DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP,
  DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP,
} from '../constants'
import type {
  CutoutConfig,
  LabwareDefinition2,
  DeckConfiguration,
  PipetteName,
  NozzleConfigurationStyle,
} from '@opentrons/shared-data'
import type { QuickTransferSummaryState } from '../types'
import type {
  ConsolidateArgs,
  DistributeArgs,
  TransferArgs,
  InvariantContext,
  PipetteEntities,
  LabwareEntities,
  RobotState,
  AdditionalEquipmentEntities,
} from '@opentrons/step-generation'

type MoveLiquidStepArgs = ConsolidateArgs | DistributeArgs | TransferArgs | null

const uuid: () => string = uuidv1
const adapter96ChannelDefUri = 'opentrons/opentrons_flex_96_tiprack_adapter/1'

function getOrderedWells(
  unorderedWells: string[],
  labwareDef: LabwareDefinition2
): string[] {
  const allWellsOrdered = orderWells(labwareDef.ordering, 't2b', 'l2r')
  return intersection(allWellsOrdered, unorderedWells)
}

function getInvariantContextAndRobotState(
  quickTransferState: QuickTransferSummaryState
): { invariantContext: InvariantContext; robotState: RobotState } {
  const tipRackDefURI = getLabwareDefURI(quickTransferState.tipRack)
  let pipetteName = quickTransferState.pipette.model
  if (quickTransferState.pipette.channels === 1) {
    pipetteName = pipetteName + `_single_flex`
  } else if (quickTransferState.pipette.channels === 8) {
    pipetteName = pipetteName + `_multi_flex`
  } else {
    pipetteName = pipetteName + `_96`
  }
  const pipetteId = `${uuid()}_${pipetteName}`
  const tipRackId = `${uuid()}_${tipRackDefURI}`

  const pipetteEntities: PipetteEntities = {
    [pipetteId]: {
      name: pipetteName as PipetteName,
      id: pipetteId,
      tiprackDefURI: [tipRackDefURI],
      tiprackLabwareDef: [quickTransferState.tipRack],
      spec: quickTransferState.pipette,
    },
  }
  const pipetteLocations: RobotState['pipettes'] = {
    [pipetteId]: {
      mount: quickTransferState.mount,
    },
  }
  const sourceLabwareURI = getLabwareDefURI(quickTransferState.source)
  const sourceLabwareId = `${uuid()}_${sourceLabwareURI}`

  let labwareEntities: LabwareEntities = {}
  let labwareLocations: RobotState['labware'] = {}
  let adapterId: string | null = null

  if (quickTransferState.pipette.channels === 96) {
    adapterId = `${uuid()}_${adapter96ChannelDefUri}`
    labwareEntities = {
      [adapterId]: {
        id: adapterId,
        labwareDefURI: adapter96ChannelDefUri,
        def: getAllDefinitions()[adapter96ChannelDefUri],
      },
    }
    labwareLocations = {
      [adapterId]: {
        slot: 'B2',
      },
    }
  }

  labwareEntities = {
    ...labwareEntities,
    [tipRackId]: {
      id: tipRackId,
      labwareDefURI: tipRackDefURI,
      def: quickTransferState.tipRack,
    },
    [sourceLabwareId]: {
      id: sourceLabwareId,
      labwareDefURI: sourceLabwareURI,
      def: quickTransferState.source,
    },
  }
  labwareLocations = {
    ...labwareLocations,
    [tipRackId]: {
      slot: adapterId ?? 'B2',
    },
    [sourceLabwareId]: {
      slot: 'C2',
    },
  }

  if (quickTransferState.destination !== 'source') {
    const destLabwareURI = getLabwareDefURI(quickTransferState.destination)
    const destLabwareId = `${uuid()}_${destLabwareURI}`
    labwareEntities = {
      ...labwareEntities,
      [destLabwareId]: {
        id: destLabwareId,
        labwareDefURI: destLabwareURI,
        def: quickTransferState.destination,
      },
    }
    labwareLocations = {
      ...labwareLocations,
      [destLabwareId]: {
        slot: 'D2',
      },
    }
  }
  let additionalEquipmentEntities: AdditionalEquipmentEntities = {}

  if (
    quickTransferState.dropTipLocation.cutoutFixtureId ===
    TRASH_BIN_ADAPTER_FIXTURE
  ) {
    const trashLocation = quickTransferState.dropTipLocation.cutoutId
    const trashId = `${uuid()}_trashBin`
    additionalEquipmentEntities = {
      [trashId]: {
        name: 'trashBin',
        id: trashId,
        location: trashLocation,
      },
    }
  }
  if (
    quickTransferState.blowOut != null &&
    quickTransferState.blowOut !== 'source_well' &&
    quickTransferState.blowOut !== 'dest_well' &&
    quickTransferState.blowOut?.cutoutFixtureId === TRASH_BIN_ADAPTER_FIXTURE
  ) {
    const trashLocation = quickTransferState.blowOut.cutoutId
    const isSameTrash = Object.values(additionalEquipmentEntities).some(
      entity => entity.location === trashLocation
    )
    if (!isSameTrash) {
      const trashId = `${uuid()}_trashBin`
      additionalEquipmentEntities = {
        ...additionalEquipmentEntities,
        [trashId]: {
          name: 'trashBin',
          id: trashId,
          location: trashLocation,
        },
      }
    }
  }

  if (
    WASTE_CHUTE_FIXTURES.includes(
      quickTransferState.dropTipLocation.cutoutFixtureId
    )
  ) {
    const wasteChuteLocation = quickTransferState.dropTipLocation.cutoutId
    const wasteChuteId = `${uuid()}_wasteChute`
    additionalEquipmentEntities = {
      ...additionalEquipmentEntities,
      [wasteChuteId]: {
        name: 'wasteChute',
        id: wasteChuteId,
        location: wasteChuteLocation,
      },
    }
  }
  if (
    quickTransferState.blowOut != null &&
    quickTransferState.blowOut !== 'source_well' &&
    quickTransferState.blowOut !== 'dest_well' &&
    WASTE_CHUTE_FIXTURES.includes(quickTransferState.blowOut.cutoutFixtureId)
  ) {
    const wasteChuteLocation = quickTransferState.dropTipLocation.cutoutId
    const isSameChute = Object.values(additionalEquipmentEntities).some(
      entity => entity.location === wasteChuteLocation
    )
    if (!isSameChute) {
      const wasteChuteId = `${uuid()}_wasteChute`
      additionalEquipmentEntities = {
        ...additionalEquipmentEntities,
        [wasteChuteId]: {
          name: 'wasteChute',
          id: wasteChuteId,
          location: wasteChuteLocation,
        },
      }
    }
  }
  const invariantContext = {
    labwareEntities,
    moduleEntities: {},
    pipetteEntities,
    additionalEquipmentEntities,
    config: { OT_PD_DISABLE_MODULE_RESTRICTIONS: false },
  }
  const moduleLocations = {}
  const robotState = makeInitialRobotState({
    invariantContext,
    labwareLocations,
    moduleLocations,
    pipetteLocations,
  })

  return { invariantContext, robotState }
}

export function generateQuickTransferArgs(
  quickTransferState: QuickTransferSummaryState,
  deckConfig: DeckConfiguration
): {
  stepArgs: MoveLiquidStepArgs
  invariantContext: InvariantContext
  initialRobotState: RobotState
} {
  let sourceWells = getOrderedWells(
    quickTransferState.sourceWells,
    quickTransferState.source
  )
  const destLabwareDefinition =
    quickTransferState.destination === 'source'
      ? quickTransferState.source
      : quickTransferState.destination
  let destWells = getOrderedWells(
    quickTransferState.destinationWells,
    destLabwareDefinition
  )
  if (destWells != null) {
    if (
      quickTransferState.path === 'single' &&
      sourceWells.length !== destWells.length
    ) {
      if (sourceWells.length === 1) {
        sourceWells = Array(destWells.length).fill(sourceWells[0])
      } else if (destWells.length === 1) {
        destWells = Array(sourceWells.length).fill(destWells[0])
      }
    }
  }
  const { invariantContext, robotState } = getInvariantContextAndRobotState(
    quickTransferState
  )

  let blowoutLocation: string | undefined
  if (
    quickTransferState?.blowOut != null &&
    quickTransferState.blowOut !== 'source_well' &&
    quickTransferState.blowOut !== 'dest_well' &&
    'cutoutId' in quickTransferState.blowOut
  ) {
    const entity = Object.values(
      invariantContext.additionalEquipmentEntities
    ).find(entity => {
      const blowoutObject = quickTransferState.blowOut as CutoutConfig
      return entity.location === blowoutObject.cutoutId
    })
    blowoutLocation = entity?.id
  } else {
    blowoutLocation = quickTransferState.blowOut
  }

  const dropTipLocationEntity = Object.values(
    invariantContext.additionalEquipmentEntities
  ).find(
    entity => entity.location === quickTransferState.dropTipLocation.cutoutId
  )
  const dropTipLocation = dropTipLocationEntity?.id ?? ''

  const tipType = getTipTypeFromTipRackDefinition(quickTransferState.tipRack)
  const flowRatesForSupportedTip =
    quickTransferState.pipette.liquids.default.supportedTips[tipType]
  const pipetteEntity = Object.values(invariantContext.pipetteEntities)[0]

  const sourceLabwareId = Object.keys(robotState.labware).find(
    labwareId => robotState.labware[labwareId].slot === 'C2'
  )
  const sourceLabwareEntity =
    sourceLabwareId != null
      ? invariantContext.labwareEntities[sourceLabwareId]
      : undefined
  let destLabwareEntity = sourceLabwareEntity
  if (quickTransferState.destination !== 'source') {
    const destinationLabwareId = Object.keys(robotState.labware).find(
      labwareId => robotState.labware[labwareId].slot === 'D2'
    )
    destLabwareEntity =
      destinationLabwareId != null
        ? invariantContext.labwareEntities[destinationLabwareId]
        : undefined
  }

  let nozzles = null
  if (pipetteEntity.spec.channels === 96) {
    nozzles = 'ALL' as NozzleConfigurationStyle
  }
  const touchTipAfterDispenseOffsetMmFromTop =
    quickTransferState.touchTipDispense ?? DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP

  const touchTipAfterAspirateOffsetMmFromTop =
    quickTransferState.touchTipAspirate ?? DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP

  const commonFields = {
    pipette: pipetteEntity.id,
    volume: quickTransferState.volume,
    sourceLabware: sourceLabwareEntity?.id as string,
    destLabware: destLabwareEntity?.id as string,
    tipRack: pipetteEntity.tiprackDefURI[0],
    aspirateFlowRateUlSec: quickTransferState.aspirateFlowRate,
    dispenseFlowRateUlSec: quickTransferState.dispenseFlowRate,
    aspirateOffsetFromBottomMm: quickTransferState.tipPositionAspirate,
    dispenseOffsetFromBottomMm: quickTransferState.tipPositionDispense,
    blowoutLocation,
    blowoutFlowRateUlSec:
      flowRatesForSupportedTip.defaultBlowOutFlowRate.default,
    blowoutOffsetFromTopMm: DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP,
    changeTip: quickTransferState.changeTip,
    preWetTip: quickTransferState.preWetTip,
    aspirateDelay:
      quickTransferState.delayAspirate != null
        ? {
            seconds: quickTransferState.delayAspirate?.delayDuration,
            mmFromBottom: quickTransferState.delayAspirate.positionFromBottom,
          }
        : null,
    dispenseDelay:
      quickTransferState.delayDispense != null
        ? {
            seconds: quickTransferState.delayDispense?.delayDuration,
            mmFromBottom: quickTransferState.delayDispense.positionFromBottom,
          }
        : null,
    aspirateAirGapVolume: quickTransferState.airGapAspirate ?? null,
    dispenseAirGapVolume: quickTransferState.airGapDispense ?? null,
    touchTipAfterAspirate: quickTransferState.touchTipAspirate != null,
    touchTipAfterAspirateOffsetMmFromTop,
    touchTipAfterDispense: quickTransferState.touchTipDispense != null,
    touchTipAfterDispenseOffsetMmFromTop,
    dropTipLocation,
    aspirateXOffset: 0,
    aspirateYOffset: 0,
    dispenseXOffset: 0,
    dispenseYOffset: 0,
    name: null,
    description: null,
    nozzles,
  }

  switch (quickTransferState.path) {
    case 'single': {
      const transferStepArguments: TransferArgs = {
        ...commonFields,
        commandCreatorFnName: 'transfer',
        sourceWells,
        destWells,
        mixBeforeAspirate:
          quickTransferState.mixOnAspirate != null
            ? {
                volume: quickTransferState.mixOnAspirate.mixVolume,
                times: quickTransferState.mixOnAspirate.repititions,
              }
            : null,
        mixInDestination:
          quickTransferState.mixOnDispense != null
            ? {
                volume: quickTransferState.mixOnDispense.mixVolume,
                times: quickTransferState.mixOnDispense.repititions,
              }
            : null,
      }
      return {
        stepArgs: transferStepArguments,
        invariantContext,
        initialRobotState: robotState,
      }
    }

    case 'multiAspirate': {
      const consolidateStepArguments: ConsolidateArgs = {
        ...commonFields,
        commandCreatorFnName: 'consolidate',
        mixFirstAspirate:
          quickTransferState.mixOnAspirate != null
            ? {
                volume: quickTransferState.mixOnAspirate.mixVolume,
                times: quickTransferState.mixOnAspirate.repititions,
              }
            : null,
        mixInDestination:
          quickTransferState.mixOnDispense != null
            ? {
                volume: quickTransferState.mixOnDispense.mixVolume,
                times: quickTransferState.mixOnDispense.repititions,
              }
            : null,
        sourceWells,
        destWell: destWells[0],
      }
      return {
        stepArgs: consolidateStepArguments,
        invariantContext,
        initialRobotState: robotState,
      }
    }

    case 'multiDispense': {
      const distributeStepArguments: DistributeArgs = {
        ...commonFields,
        commandCreatorFnName: 'distribute',
        disposalVolume: quickTransferState.disposalVolume,
        mixBeforeAspirate:
          quickTransferState.mixOnAspirate != null
            ? {
                volume: quickTransferState.mixOnAspirate.mixVolume,
                times: quickTransferState.mixOnAspirate.repititions,
              }
            : null,
        sourceWell: sourceWells[0],
        destWells,
      }
      return {
        stepArgs: distributeStepArguments,
        invariantContext,
        initialRobotState: robotState,
      }
    }
  }
}
