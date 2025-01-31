import * as Yup from 'yup'
import { useEffect, useState } from 'react'
import reduce from 'lodash/reduce'
import omit from 'lodash/omit'
import uniq from 'lodash/uniq'
import mapValues from 'lodash/mapValues'
import { yupResolver } from '@hookform/resolvers/yup'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import {
  FLEX_ROBOT_TYPE,
  getAreSlotsAdjacent,
  ABSORBANCE_READER_MODELS,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_TYPE,
  MAGNETIC_MODULE_TYPE,
  OT2_ROBOT_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  WASTE_CHUTE_CUTOUT,
} from '@opentrons/shared-data'
import { Box, COLORS } from '@opentrons/components'

import { actions as fileActions } from '../../load-file'
import { uuid } from '../../utils'
import * as labwareDefSelectors from '../../labware-defs/selectors'
import * as labwareDefActions from '../../labware-defs/actions'
import * as labwareIngredActions from '../../labware-ingred/actions'
import { actions as steplistActions } from '../../steplist'
import {
  INITIAL_DECK_SETUP_STEP_ID,
  STAGING_AREA_CUTOUTS_ORDERED,
} from '../../constants'
import { actions as stepFormActions } from '../../step-forms'
import { createModuleWithNoSlot } from '../../modules'
import {
  createDeckFixture,
  toggleIsGripperRequired,
} from '../../step-forms/actions/additionalItems'
import { getNewProtocolModal } from '../../navigation/selectors'
import { SelectRobot } from './SelectRobot'
import { SelectPipettes } from './SelectPipettes'
import { SelectGripper } from './SelectGripper'
import { SelectModules } from './SelectModules'
import { SelectFixtures } from './SelectFixtures'
import { AddMetadata } from './AddMetadata'
import { getTrashSlot } from './utils'

import type { Dispatch, SetStateAction } from 'react'
import type { ThunkDispatch } from 'redux-thunk'
import type { NormalizedPipette } from '@opentrons/step-generation'
import type { BaseState } from '../../types'
import type {
  FormPipette,
  FormPipettesByMount,
  PipetteOnDeck,
} from '../../step-forms'
import type {
  ModuleModel,
  ModuleType,
  PipetteName,
} from '@opentrons/shared-data'
import type { WizardFormState } from './types'

type WizardStep =
  | 'robot'
  | 'pipette'
  | 'gripper'
  | 'modules'
  | 'fixtures'
  | 'metadata'
const WIZARD_STEPS: WizardStep[] = [
  'robot',
  'pipette',
  'gripper',
  'modules',
  'fixtures',
  'metadata',
]
const WIZARD_STEPS_OT2: WizardStep[] = [
  'robot',
  'pipette',
  'modules',
  'metadata',
]

const adapter96ChannelDefUri = 'opentrons/opentrons_flex_96_tiprack_adapter/1'

type PipetteFieldsData = Omit<
  PipetteOnDeck,
  'id' | 'spec' | 'tiprackLabwareDef'
>

interface ModuleCreationArgs {
  type: ModuleType
  model: ModuleModel
  slot: string
}

const initialFormState: WizardFormState = {
  fields: {
    name: undefined,
    description: undefined,
    organizationOrAuthor: undefined,
    robotType: FLEX_ROBOT_TYPE,
  },
  pipettesByMount: {
    left: { pipetteName: undefined, tiprackDefURI: undefined },
    right: { pipetteName: undefined, tiprackDefURI: undefined },
  },
  modules: {},
  //  defaulting to selecting trashBin already to avoid user having to
  //  click to add a trash bin/waste chute. Delete once we support returnTip()
  additionalEquipment: ['trashBin'],
}

const pipetteValidationShape = Yup.object().shape({
  pipetteName: Yup.string().nullable(),
  tiprackDefURI: Yup.array()
    .of(Yup.string())
    .nullable()
    .when('pipetteName', {
      is: (val: string | null): boolean => Boolean(val),
      then: schema => schema.required('Required'),
      otherwise: schema => schema.nullable(),
    }),
})
const moduleValidationShape: any = Yup.object().shape({
  type: Yup.string(),
  model: Yup.string(),
  slot: Yup.string(),
})

const validationSchema: any = Yup.object().shape({
  fields: Yup.object().shape({
    name: Yup.string().required('Required'),
  }),
  pipettesByMount: Yup.object()
    .shape({
      left: pipetteValidationShape,
      right: pipetteValidationShape,
    })
    .test('pipette-is-required', 'a pipette is required', value =>
      //  @ts-expect-error todo: fix this
      Object.keys(value).some((val: string) => value[val].pipetteName)
    ),
  modulesByType: Yup.object().shape({
    [MAGNETIC_MODULE_TYPE]: moduleValidationShape,
    [TEMPERATURE_MODULE_TYPE]: moduleValidationShape,
    [THERMOCYCLER_MODULE_TYPE]: moduleValidationShape,
    [HEATERSHAKER_MODULE_TYPE]: moduleValidationShape,
    [MAGNETIC_BLOCK_TYPE]: moduleValidationShape,
  }),
})

export function CreateNewProtocolWizard(): JSX.Element | null {
  const navigate = useNavigate()
  const showWizard = useSelector(getNewProtocolModal)
  const [analyticsStartTime] = useState<Date>(new Date())
  const customLabware = useSelector(
    labwareDefSelectors.getCustomLabwareDefsByURI
  )
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [wizardSteps, setWizardSteps] = useState<WizardStep[]>(WIZARD_STEPS)

  const dispatch = useDispatch<ThunkDispatch<BaseState, any, any>>()

  useEffect(() => {
    if (!showWizard) {
      navigate('/overview')
    }
  }, [showWizard])

  const createProtocolFile = (values: WizardFormState): void => {
    navigate('/overview')

    const pipettes = reduce<FormPipettesByMount, PipetteFieldsData[]>(
      values.pipettesByMount,
      (acc, formPipette: FormPipette, mount): PipetteFieldsData[] => {
        return formPipette?.pipetteName != null &&
          formPipette?.pipetteName !== '' &&
          formPipette.tiprackDefURI != null &&
          (mount === 'left' || mount === 'right')
          ? [
              ...acc,
              {
                mount,
                name: formPipette.pipetteName as PipetteName,
                tiprackDefURI: formPipette.tiprackDefURI,
              },
            ]
          : acc
      },
      []
    )

    const modules: ModuleCreationArgs[] =
      values.modules != null
        ? Object.entries(values.modules).reduce<ModuleCreationArgs[]>(
            (acc, [number, formModule]) => {
              return [
                ...acc,
                {
                  type: formModule.type,
                  model: formModule.model || ('' as ModuleModel),
                  slot: formModule.slot,
                },
              ]
            },
            []
          )
        : []
    const heaterShakerIndex = modules.findIndex(
      mod => mod.type === HEATERSHAKER_MODULE_TYPE
    )
    const magModIndex = modules.findIndex(
      mod => mod.type === MAGNETIC_MODULE_TYPE
    )
    if (heaterShakerIndex > -1 && magModIndex > -1) {
      // if both are present, move the Mag mod to slot 9, since both can't be in slot 1
      modules[magModIndex].slot = '9'
    }
    const newProtocolFields = values.fields

    dispatch(fileActions.createNewProtocol(newProtocolFields))
    const pipettesById: Record<string, PipetteOnDeck> = pipettes.reduce(
      (acc, pipette) => ({ ...acc, [uuid()]: pipette }),
      {}
    )
    // create custom labware
    mapValues(customLabware, labwareDef =>
      dispatch(
        labwareDefActions.createCustomLabwareDefAction({
          def: labwareDef,
        })
      )
    )
    // create new pipette entities
    dispatch(
      stepFormActions.createPipettes(
        mapValues(
          pipettesById,
          (p: PipetteOnDeck, id: string): NormalizedPipette => ({
            // @ts-expect-error(sa, 2021-6-22): id will always get overwritten
            id,
            ...omit(p, 'mount'),
          })
        )
      )
    )
    // update pipette locations in initial deck setup step
    dispatch(
      steplistActions.changeSavedStepForm({
        stepId: INITIAL_DECK_SETUP_STEP_ID,
        update: {
          pipetteLocationUpdate: mapValues(
            pipettesById,
            (p: typeof pipettesById[keyof typeof pipettesById]) => p.mount
          ),
        },
      })
    )

    //  add trash
    if (values.additionalEquipment.includes('trashBin')) {
      // defaulting trash to appropriate locations
      dispatch(
        createDeckFixture(
          'trashBin',
          values.fields.robotType === FLEX_ROBOT_TYPE
            ? getTrashSlot(values)
            : 'cutout12'
        )
      )
    }

    // add waste chute
    if (values.additionalEquipment.includes('wasteChute')) {
      dispatch(createDeckFixture('wasteChute', WASTE_CHUTE_CUTOUT))
    }
    //  add staging areas
    const stagingAreas = values.additionalEquipment.filter(
      equipment => equipment === 'stagingArea'
    )

    if (stagingAreas.length > 0) {
      // Note: when plate reader is present, cutoutB3 is not available for StagingArea
      const hasPlateReader = modules.some(
        module => module.model === ABSORBANCE_READER_MODELS[0]
      )
      stagingAreas.forEach((_, index) => {
        const stagingAreaCutout = hasPlateReader
          ? STAGING_AREA_CUTOUTS_ORDERED.filter(
              cutout => cutout !== 'cutoutB3'
            )[index]
          : STAGING_AREA_CUTOUTS_ORDERED[index]

        return dispatch(createDeckFixture('stagingArea', stagingAreaCutout))
      })
    }

    // create modules
    // sort so modules with slot are created first
    // then modules without a slot are generated in remaining available slots
    modules.sort((a, b) => {
      if (a.slot == null && b.slot != null) {
        return 1
      }
      if (b.slot == null && a.slot != null) {
        return -1
      }
      return 0
    })

    modules.forEach(moduleArgs => {
      return moduleArgs.slot != null
        ? dispatch(stepFormActions.createModule(moduleArgs))
        : dispatch(
            createModuleWithNoSlot({
              model: moduleArgs.model,
              type: moduleArgs.type,
              isMagneticBlock: moduleArgs.type === MAGNETIC_BLOCK_TYPE,
            })
          )
    })

    // add gripper
    if (values.additionalEquipment.includes('gripper')) {
      dispatch(toggleIsGripperRequired())
    }

    // auto-generate assigned tipracks for pipettes
    const newTiprackModels: string[] = uniq(
      pipettes.flatMap(pipette => pipette.tiprackDefURI)
    )
    const hasMagneticBlock = modules.some(
      module => module.type === MAGNETIC_BLOCK_TYPE
    )
    const FLEX_MIDDLE_SLOTS = hasMagneticBlock ? [] : ['C2', 'B2', 'A2']
    const hasOt2TC = modules.find(
      module => module.type === THERMOCYCLER_MODULE_TYPE
    )
    const heaterShakerSlot = modules.find(
      module => module.type === HEATERSHAKER_MODULE_TYPE
    )?.slot
    const OT2_MIDDLE_SLOTS = hasOt2TC ? ['2', '5'] : ['2', '5', '8', '11']
    const modifiedOt2Slots = OT2_MIDDLE_SLOTS.filter(slot =>
      heaterShakerSlot != null
        ? !getAreSlotsAdjacent(heaterShakerSlot, slot)
        : slot
    )
    newTiprackModels.forEach((tiprackDefURI, index) => {
      dispatch(
        labwareIngredActions.createContainer({
          slot:
            values.fields.robotType === FLEX_ROBOT_TYPE
              ? FLEX_MIDDLE_SLOTS[index]
              : modifiedOt2Slots[index],
          labwareDefURI: tiprackDefURI,
          adapterUnderLabwareDefURI:
            values.pipettesByMount.left.pipetteName === 'p1000_96'
              ? adapter96ChannelDefUri
              : undefined,
        })
      )
    })

    dispatch(labwareIngredActions.generateNewProtocol({ isNewProtocol: true }))
  }

  const currentWizardStep = wizardSteps[currentStepIndex]
  const goBack = (stepsBack: number = 1): void => {
    if (currentStepIndex >= 0 + stepsBack) {
      setCurrentStepIndex(currentStepIndex - stepsBack)
    }
  }
  const proceed = (stepsForward: number = 1): void => {
    if (currentStepIndex + stepsForward < wizardSteps.length) {
      setCurrentStepIndex(currentStepIndex + stepsForward)
    }
  }

  return showWizard ? (
    <Box backgroundColor={COLORS.grey10} height="calc(100vh - 48px)">
      <CreateFileForm
        currentWizardStep={currentWizardStep}
        createProtocolFile={createProtocolFile}
        proceed={proceed}
        goBack={goBack}
        setWizardSteps={setWizardSteps}
        analyticsStartTime={analyticsStartTime}
      />
    </Box>
  ) : null
}

interface CreateFileFormProps {
  currentWizardStep: WizardStep
  createProtocolFile: (values: WizardFormState) => void
  goBack: () => void
  proceed: () => void
  setWizardSteps: Dispatch<SetStateAction<WizardStep[]>>
  analyticsStartTime: Date
}

function CreateFileForm(props: CreateFileFormProps): JSX.Element {
  const {
    currentWizardStep,
    createProtocolFile,
    proceed,
    goBack,
    setWizardSteps,
    analyticsStartTime,
  } = props
  const { ...formProps } = useForm<WizardFormState>({
    defaultValues: initialFormState,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    resolver: yupResolver(validationSchema),
  })

  const handleProceedRobotType = (robotType: string): void => {
    if (robotType === OT2_ROBOT_TYPE) {
      setWizardSteps(WIZARD_STEPS_OT2)
    } else {
      setWizardSteps(WIZARD_STEPS)
    }
  }

  return (
    <form onSubmit={formProps.handleSubmit(() => {})}>
      {(() => {
        switch (currentWizardStep) {
          case 'robot':
            return (
              <SelectRobot
                {...formProps}
                goBack={goBack}
                proceed={() => {
                  handleProceedRobotType(
                    formProps.getValues().fields.robotType ?? OT2_ROBOT_TYPE
                  )
                  proceed()
                }}
              />
            )
          case 'pipette':
            return <SelectPipettes {...{ ...formProps, proceed, goBack }} />
          case 'gripper':
            return <SelectGripper {...{ ...formProps, proceed, goBack }} />
          case 'modules':
            return <SelectModules {...{ ...formProps, proceed, goBack }} />
          case 'fixtures':
            return <SelectFixtures {...{ ...formProps, proceed, goBack }} />
          case 'metadata':
            return (
              <AddMetadata
                {...formProps}
                proceed={() => {
                  createProtocolFile(formProps.getValues())
                }}
                goBack={goBack}
                analyticsStartTime={analyticsStartTime}
              />
            )
          default:
            return null
        }
      })()}
    </form>
  )
}
