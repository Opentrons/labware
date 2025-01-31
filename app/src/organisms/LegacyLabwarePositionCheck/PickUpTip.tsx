import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import isEqual from 'lodash/isEqual'
import {
  DIRECTION_COLUMN,
  Flex,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  getLabwareDefURI,
  getLabwareDisplayName,
  getModuleType,
  getVectorDifference,
  HEATERSHAKER_MODULE_TYPE,
  IDENTITY_VECTOR,
} from '@opentrons/shared-data'
import { RobotMotionLoader } from './RobotMotionLoader'
import { PrepareSpace } from './PrepareSpace'
import { JogToWell } from './JogToWell'
import { UnorderedList } from '/app/molecules/UnorderedList'
import { getCurrentOffsetForLabwareInLocation } from '/app/transformations/analysis'
import { TipConfirmation } from './TipConfirmation'
import { getLabwareDef } from './utils/labware'
import { getLabwareDefinitionsFromCommands } from '/app/local-resources/labware'
import { getDisplayLocation } from './utils/getDisplayLocation'
import { useSelector } from 'react-redux'
import { getIsOnDevice } from '/app/redux/config'

import type { Dispatch } from 'react'
import type {
  CompletedProtocolAnalysis,
  CreateCommand,
  MoveLabwareCreateCommand,
  RobotType,
} from '@opentrons/shared-data'
import type { useChainRunCommands } from '/app/resources/runs'
import type { Jog } from '/app/molecules/JogControls/types'
import type {
  PickUpTipStep,
  RegisterPositionAction,
  WorkingOffset,
} from './types'
import type { LabwareOffset } from '@opentrons/api-client'
import type { TFunction } from 'i18next'

interface PickUpTipProps extends PickUpTipStep {
  protocolData: CompletedProtocolAnalysis
  proceed: () => void
  registerPosition: Dispatch<RegisterPositionAction>
  chainRunCommands: ReturnType<typeof useChainRunCommands>['chainRunCommands']
  setFatalError: (errorMessage: string) => void
  workingOffsets: WorkingOffset[]
  existingOffsets: LabwareOffset[]
  handleJog: Jog
  isRobotMoving: boolean
  robotType: RobotType
  protocolHasModules: boolean
  currentStepIndex: number
}
export const PickUpTip = (props: PickUpTipProps): JSX.Element | null => {
  const { t, i18n } = useTranslation(['labware_position_check', 'shared'])
  const {
    labwareId,
    pipetteId,
    location,
    protocolData,
    proceed,
    chainRunCommands,
    registerPosition,
    handleJog,
    isRobotMoving,
    existingOffsets,
    workingOffsets,
    setFatalError,
    adapterId,
    robotType,
    protocolHasModules,
    currentStepIndex,
  } = props
  const [showTipConfirmation, setShowTipConfirmation] = useState(false)
  const isOnDevice = useSelector(getIsOnDevice)
  const labwareDef = getLabwareDef(labwareId, protocolData)
  const pipette = protocolData.pipettes.find(p => p.id === pipetteId)
  const pipetteName = pipette?.pipetteName
  const pipetteMount = pipette?.mount
  if (pipetteName == null || labwareDef == null || pipetteMount == null)
    return null
  const pipetteZMotorAxis: 'leftZ' | 'rightZ' =
    pipetteMount === 'left' ? 'leftZ' : 'rightZ'

  const displayLocation = getDisplayLocation(
    location,
    getLabwareDefinitionsFromCommands(protocolData.commands),
    t as TFunction,
    i18n
  )
  const labwareDisplayName = getLabwareDisplayName(labwareDef)
  const instructions = [
    ...(protocolHasModules && currentStepIndex === 1
      ? [t('place_modules')]
      : []),
    isOnDevice ? t('clear_all_slots_odd') : t('clear_all_slots'),
    <Trans
      key="place_a_full_tip_rack_in_location"
      t={t}
      i18nKey="place_a_full_tip_rack_in_location"
      tOptions={{ tip_rack: labwareDisplayName, location: displayLocation }}
      components={{
        bold: (
          <LegacyStyledText
            as="span"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          />
        ),
      }}
    />,
  ]

  const initialPosition = workingOffsets.find(
    o =>
      o.labwareId === labwareId &&
      isEqual(o.location, location) &&
      o.initialPosition != null
  )?.initialPosition

  let moveLabware: MoveLabwareCreateCommand[]
  if (adapterId != null) {
    moveLabware = [
      {
        commandType: 'moveLabware' as const,
        params: {
          labwareId: adapterId,
          newLocation: { slotName: location.slotName },
          strategy: 'manualMoveWithoutPause',
        },
      },
      {
        commandType: 'moveLabware' as const,
        params: {
          labwareId,
          newLocation:
            adapterId != null
              ? { labwareId: adapterId }
              : { slotName: location.slotName },
          strategy: 'manualMoveWithoutPause',
        },
      },
    ]
  } else {
    moveLabware = [
      {
        commandType: 'moveLabware' as const,
        params: {
          labwareId,
          newLocation: location,
          strategy: 'manualMoveWithoutPause',
        },
      },
    ]
  }

  const handleConfirmPlacement = (): void => {
    const modulePrepCommands = protocolData.modules.reduce<CreateCommand[]>(
      (acc, module) => {
        if (getModuleType(module.model) === HEATERSHAKER_MODULE_TYPE) {
          return [
            ...acc,
            {
              commandType: 'heaterShaker/closeLabwareLatch',
              params: { moduleId: module.id },
            },
          ]
        }
        return acc
      },
      []
    )
    chainRunCommands(
      [
        ...modulePrepCommands,
        ...moveLabware,
        {
          commandType: 'moveToWell' as const,
          params: {
            pipetteId,
            labwareId,
            wellName: 'A1',
            wellLocation: { origin: 'top' as const },
          },
        },
        { commandType: 'savePosition', params: { pipetteId } },
      ],
      false
    )
      .then(responses => {
        const finalResponse = responses[responses.length - 1]
        if (finalResponse.data.commandType === 'savePosition') {
          const { position } = finalResponse.data?.result ?? { position: null }
          registerPosition({
            type: 'initialPosition',
            labwareId,
            location,
            position,
          })
        } else {
          setFatalError(
            `PickUpTip failed to save position for initial placement.`
          )
        }
      })
      .catch((e: Error) => {
        setFatalError(
          `PickUpTip failed to save position for initial placement with message: ${e.message}`
        )
      })
  }
  const handleConfirmPosition = (): void => {
    chainRunCommands(
      [{ commandType: 'savePosition', params: { pipetteId } }],
      false
    )
      .then(responses => {
        if (responses[0].data.commandType === 'savePosition') {
          const { position } = responses[0].data?.result ?? { position: null }
          const offset =
            initialPosition != null && position != null
              ? getVectorDifference(position, initialPosition)
              : undefined
          registerPosition({
            type: 'finalPosition',
            labwareId,
            location,
            position,
          })
          registerPosition({ type: 'tipPickUpOffset', offset: offset ?? null })
          chainRunCommands(
            [
              {
                commandType: 'pickUpTip',
                params: {
                  pipetteId,
                  labwareId,
                  wellName: 'A1',
                  wellLocation: { origin: 'top', offset },
                },
              },
            ],
            false
          )
            .then(() => {
              setShowTipConfirmation(true)
            })
            .catch((e: Error) => {
              setFatalError(
                `PickUpTip failed to move from final position with message: ${e.message}`
              )
            })
        }
      })
      .catch((e: Error) => {
        setFatalError(
          `PickUpTip failed to save final position with message: ${e.message}`
        )
      })
  }

  const moveLabwareOffDeck: MoveLabwareCreateCommand[] =
    adapterId != null
      ? [
          {
            commandType: 'moveLabware' as const,
            params: {
              labwareId,
              newLocation: 'offDeck',
              strategy: 'manualMoveWithoutPause',
            },
          },
          {
            commandType: 'moveLabware' as const,
            params: {
              labwareId: adapterId,
              newLocation: 'offDeck',
              strategy: 'manualMoveWithoutPause',
            },
          },
        ]
      : [
          {
            commandType: 'moveLabware' as const,
            params: {
              labwareId,
              newLocation: 'offDeck',
              strategy: 'manualMoveWithoutPause',
            },
          },
        ]

  const handleConfirmTipAttached = (): void => {
    chainRunCommands(
      [
        {
          commandType: 'retractAxis' as const,
          params: {
            axis: pipetteZMotorAxis,
          },
        },
        {
          commandType: 'retractAxis' as const,
          params: { axis: 'x' },
        },
        {
          commandType: 'retractAxis' as const,
          params: { axis: 'y' },
        },
        ...moveLabwareOffDeck,
      ],
      false
    )
      .then(() => {
        proceed()
      })
      .catch((e: Error) => {
        setFatalError(
          `PickUpTip failed to move to safe location after tip pick up with message: ${e.message}`
        )
      })
  }
  const handleInvalidateTip = (): void => {
    chainRunCommands(
      [
        {
          commandType: 'dropTip',
          params: {
            pipetteId,
            labwareId,
            wellName: 'A1',
          },
        },
        {
          commandType: 'moveToWell' as const,
          params: {
            pipetteId,
            labwareId,
            wellName: 'A1',
            wellLocation: { origin: 'top' as const },
          },
        },
      ],
      false
    )
      .then(() => {
        registerPosition({ type: 'tipPickUpOffset', offset: null })
        registerPosition({
          type: 'finalPosition',
          labwareId,
          location,
          position: null,
        })
        setShowTipConfirmation(false)
      })
      .catch((e: Error) => {
        setFatalError(`PickUpTip failed to drop tip with message: ${e.message}`)
      })
  }
  const handleGoBack = (): void => {
    chainRunCommands(
      [
        {
          commandType: 'moveLabware' as const,
          params: {
            labwareId,
            newLocation: 'offDeck',
            strategy: 'manualMoveWithoutPause',
          },
        },
      ],
      false
    )
      .then(() => {
        registerPosition({
          type: 'initialPosition',
          labwareId,
          location,
          position: null,
        })
      })
      .catch((e: Error) => {
        setFatalError(
          `PickUpTip failed to clear tip rack with message: ${e.message}`
        )
      })
  }

  const existingOffset =
    getCurrentOffsetForLabwareInLocation(
      existingOffsets,
      getLabwareDefURI(labwareDef),
      location
    )?.vector ?? IDENTITY_VECTOR

  if (isRobotMoving)
    return (
      <RobotMotionLoader header={t('shared:stand_back_robot_is_in_motion')} />
    )
  return showTipConfirmation ? (
    <TipConfirmation
      invalidateTip={handleInvalidateTip}
      confirmTip={handleConfirmTipAttached}
    />
  ) : (
    <Flex flexDirection={DIRECTION_COLUMN}>
      {initialPosition != null ? (
        <JogToWell
          header={t('pick_up_tip_from_rack_in_location', {
            location: displayLocation,
          })}
          body={
            <Trans
              t={t}
              i18nKey={
                isOnDevice
                  ? 'ensure_nozzle_position_odd'
                  : 'ensure_nozzle_position_desktop'
              }
              components={{
                block: <LegacyStyledText as="p" />,
                bold: <strong />,
              }}
              values={{
                tip_type: t('pipette_nozzle'),
                item_location: t('check_tip_location'),
              }}
            />
          }
          labwareDef={labwareDef}
          pipetteName={pipetteName}
          handleConfirmPosition={handleConfirmPosition}
          handleGoBack={handleGoBack}
          handleJog={handleJog}
          initialPosition={initialPosition}
          existingOffset={existingOffset}
          shouldUseMetalProbe={false}
        />
      ) : (
        <PrepareSpace
          {...props}
          header={t('prepare_item_in_location', {
            item: t('tip_rack'),
            location: displayLocation,
          })}
          body={<UnorderedList items={instructions} />}
          labwareDef={labwareDef}
          confirmPlacement={handleConfirmPlacement}
          robotType={robotType}
        />
      )}
    </Flex>
  )
}
