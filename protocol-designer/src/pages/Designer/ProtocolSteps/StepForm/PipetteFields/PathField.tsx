import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Box,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  RadioButton,
  SPACING,
  StyledText,
  TOOLTIP_TOP_START,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'
import { selectors as stepFormSelectors } from '../../../../../step-forms'
import SINGLE_IMAGE from '../../../../../assets/images/path_single_transfers.svg'
import MULTI_DISPENSE_IMAGE from '../../../../../assets/images/path_multi_dispense.svg'
import MULTI_ASPIRATE_IMAGE from '../../../../../assets/images/path_multi_aspirate.svg'
import { getDisabledPathMap } from './utils'

import type { ChangeEvent, ReactNode } from 'react'
import type { PathOption } from '../../../../../form-types'
import type { FieldProps } from '../types'
import type { DisabledPathMap, ValuesForPath } from './utils'

const PATH_ANIMATION_IMAGES = {
  single: new URL(
    '../../../../../assets/images/path_single.gif',
    import.meta.url
  ).href,
  multiAspirate: new URL(
    '../../../../../assets/images/path_multiAspirate.gif',
    import.meta.url
  ).href,
  multiDispense: new URL(
    '../../../../../assets/images/path_multiDispense.gif',
    import.meta.url
  ).href,
}

const ALL_PATH_OPTIONS: Array<{ name: PathOption; image: string }> = [
  {
    name: 'single',
    image: SINGLE_IMAGE,
  },
  {
    name: 'multiAspirate',
    image: MULTI_ASPIRATE_IMAGE,
  },
  {
    name: 'multiDispense',
    image: MULTI_DISPENSE_IMAGE,
  },
]

type PathFieldPropsIntersection = FieldProps & ValuesForPath
interface PathFieldProps extends PathFieldPropsIntersection {
  title?: string
}

interface PathButtonProps {
  disabled: boolean
  selected: boolean
  subtitle: string
  onClick: (e: ChangeEvent<HTMLInputElement>) => void
  path: PathOption
  id?: string
  children?: ReactNode
}

function PathButton(props: PathButtonProps): JSX.Element {
  const { disabled, onClick, id, path, selected, subtitle } = props
  const [targetProps, tooltipProps] = useHoverTooltip({
    placement: TOOLTIP_TOP_START,
  })
  const { t } = useTranslation(['form', 'protocol_steps'])
  // TODO: update the tooltip and images
  const tooltip = (
    <Tooltip tooltipProps={tooltipProps} maxWidth="24.5rem">
      <Flex gridGap={SPACING.spacing8} flexDirection={DIRECTION_COLUMN}>
        <Box>{t(`step_edit_form.field.path.title.${path}`)}</Box>
        <img src={PATH_ANIMATION_IMAGES[path]} width="361px" />
        <Box>{subtitle}</Box>
      </Flex>
    </Tooltip>
  )

  return (
    <Flex {...targetProps} key={id}>
      {tooltip}
      <RadioButton
        width="100%"
        isSelected={selected}
        largeDesktopBorderRadius
        onChange={e => {
          onClick(e)
        }}
        disabled={disabled}
        buttonLabel={t(`protocol_steps:${path}`)}
        buttonValue={path}
      />
    </Flex>
  )
}

const getSubtitle = (
  path: PathOption,
  disabledPathMap: DisabledPathMap
): string => {
  const reasonForDisabled = disabledPathMap && disabledPathMap[path]
  return reasonForDisabled || ''
}

export function PathField(props: PathFieldProps): JSX.Element {
  const {
    aspirate_airGap_checkbox,
    aspirate_airGap_volume,
    aspirate_wells,
    changeTip,
    dispense_wells,
    pipette,
    volume,
    value,
    updateValue,
    tipRack,
    isDisposalLocation,
    padding = `0 ${SPACING.spacing16}`,
    title,
  } = props
  const { t } = useTranslation('form')
  const pipetteEntities = useSelector(stepFormSelectors.getPipetteEntities)
  const disabledPathMap = getDisabledPathMap(
    {
      aspirate_airGap_checkbox,
      aspirate_airGap_volume,
      aspirate_wells,
      changeTip,
      dispense_wells,
      pipette,
      volume,
      tipRack,
      isDisposalLocation,
    },
    pipetteEntities,
    t
  )
  return (
    <Flex padding={padding} flexDirection={DIRECTION_COLUMN}>
      {title != null ? (
        <StyledText
          desktopStyle="bodyDefaultRegular"
          paddingBottom={SPACING.spacing8}
          color={COLORS.grey60}
        >
          {title}
        </StyledText>
      ) : null}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        width="100%"
      >
        {ALL_PATH_OPTIONS.map(option => {
          const { name } = option
          return (
            <PathButton
              id={`PathButton_${name}`}
              key={name}
              selected={name === value}
              path={name}
              disabled={disabledPathMap !== null && name in disabledPathMap}
              subtitle={getSubtitle(name, disabledPathMap)}
              onClick={() => {
                updateValue(name)
              }}
            >
              <img src={option.image} />
            </PathButton>
          )
        })}
      </Flex>
    </Flex>
  )
}
