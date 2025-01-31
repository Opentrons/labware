import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  RadioButton,
  SPACING,
  StyledText,
  WRAP,
} from '@opentrons/components'
import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import { WizardBody } from './WizardBody'
import { HandleEnter } from '../../atoms/HandleEnter'
import type { WizardTileProps } from './types'

export function SelectRobot(props: WizardTileProps): JSX.Element {
  const { setValue, proceed, watch } = props
  const { t } = useTranslation(['create_new_protocol', 'shared'])
  const fields = watch('fields')

  const robotType = fields?.robotType
  return (
    <HandleEnter onEnter={proceed}>
      <WizardBody
        robotType={robotType}
        stepNumber={1}
        header={t('basics')}
        disabled={false}
        proceed={() => {
          proceed(1)
        }}
      >
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
          <StyledText desktopStyle="headingSmallBold">
            {t('robot_type')}
          </StyledText>
          <Flex gridGap={SPACING.spacing4} flexWrap={WRAP}>
            <RadioButton
              onChange={() => {
                setValue('fields.robotType', FLEX_ROBOT_TYPE)
              }}
              buttonLabel={t('shared:opentrons_flex')}
              buttonValue={FLEX_ROBOT_TYPE}
              isSelected={robotType === FLEX_ROBOT_TYPE}
            />
            <RadioButton
              onChange={() => {
                setValue('fields.robotType', OT2_ROBOT_TYPE)
              }}
              buttonLabel={t('shared:ot2')}
              buttonValue={OT2_ROBOT_TYPE}
              isSelected={robotType === OT2_ROBOT_TYPE}
            />
          </Flex>
        </Flex>
      </WizardBody>
    </HandleEnter>
  )
}
