import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  DeckInfoLabel,
  DropdownMenu,
  Flex,
  ListItem,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { selectDropdownItem } from '../../ui/steps/actions/actions'
import type { DropdownOption } from '@opentrons/components'
import type { FieldProps } from '../../pages/Designer/ProtocolSteps/StepForm/types'

export interface DropdownStepFormFieldProps extends FieldProps {
  options: DropdownOption[]
  title: string
  width?: string
  onEnter?: (id: string) => void
  onExit?: () => void
}

const FIRST_FIELDS = ['aspirate_labware', 'labware', 'moduleId']
const SECOND_FIELDS = ['dispense_labware', 'newLocation']

export function DropdownStepFormField(
  props: DropdownStepFormFieldProps
): JSX.Element {
  const {
    options,
    value,
    updateValue,
    title,
    errorToShow,
    tooltipContent,
    padding = `0 ${SPACING.spacing16}`,
    width = '17.5rem',
    onFieldFocus,
    onEnter,
    onExit,
    onFieldBlur,
    name: fieldName,
  } = props
  const { t } = useTranslation(['tooltip', 'application'])
  const dispatch = useDispatch()
  const availableOptionId = options.find(opt => opt.value === value)
  const handleSelection = (value: string): void => {
    let text = t('application:selected')
    if (fieldName === 'newLocation') {
      text = t('application:location')
    } else if (fieldName === 'aspirate_labware') {
      text = t('application:source')
    } else if (fieldName === 'dispense_labware') {
      text = t('application:dest')
    }

    const selection = {
      id: value,
      text,
    }
    if (FIRST_FIELDS.includes(fieldName)) {
      dispatch(
        selectDropdownItem({
          selection: { ...selection, field: '1' },
          mode: 'add',
        })
      )
    } else if (SECOND_FIELDS.includes(fieldName)) {
      dispatch(
        selectDropdownItem({
          selection: { ...selection, field: '2' },
          mode: 'add',
        })
      )
    }
  }

  return (
    <Flex padding={padding ?? SPACING.spacing16}>
      {options.length > 1 || options.length === 0 ? (
        <DropdownMenu
          tooltipText={tooltipContent != null ? t(`${tooltipContent}`) : null}
          width={width}
          error={errorToShow}
          dropdownType="neutral"
          filterOptions={options}
          title={title}
          onBlur={onFieldBlur}
          onFocus={onFieldFocus}
          currentOption={
            availableOptionId ?? { name: 'Choose option', value: '' }
          }
          onClick={value => {
            updateValue(value)
            handleSelection(value)
          }}
          onEnter={onEnter}
          onExit={onExit}
        />
      ) : (
        <Flex
          gridGap={SPACING.spacing8}
          flexDirection={DIRECTION_COLUMN}
          width="100%"
        >
          <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
            {title}
          </StyledText>
          <ListItem type="noActive">
            <Flex
              gridGap={SPACING.spacing8}
              alignItems={ALIGN_CENTER}
              padding={SPACING.spacing12}
            >
              {options[0].deckLabel != null ? (
                <DeckInfoLabel deckLabel={options[0].deckLabel} svgSize={13} />
              ) : null}
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={options[0].subtext != null ? SPACING.spacing4 : '0'}
              >
                <StyledText desktopStyle="captionRegular">
                  {options[0].name}
                </StyledText>
                <StyledText
                  desktopStyle="captionRegular"
                  color={COLORS.black70}
                >
                  {options[0].subtext}
                </StyledText>
              </Flex>
            </Flex>
          </ListItem>
        </Flex>
      )}
    </Flex>
  )
}
