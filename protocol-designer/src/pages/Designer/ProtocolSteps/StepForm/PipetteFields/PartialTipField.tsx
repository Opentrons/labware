import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ALL, COLUMN } from '@opentrons/shared-data'
import { Flex, DropdownMenu, SPACING } from '@opentrons/components'
import { getInitialDeckSetup } from '../../../../../step-forms/selectors'
import type { FieldProps } from '../types'

export function PartialTipField(props: FieldProps): JSX.Element {
  const {
    value: dropdownItem,
    updateValue,
    errorToShow,
    padding = `0 ${SPACING.spacing16}`,
    tooltipContent,
  } = props
  const { t } = useTranslation('protocol_steps')
  const deckSetup = useSelector(getInitialDeckSetup)
  const tipracks = Object.values(deckSetup.labware).filter(
    labware => labware.def.parameters.isTiprack
  )
  const tipracksNotOnAdapter = tipracks.filter(
    tiprack => deckSetup.labware[tiprack.slot] == null
  )

  const options = [
    {
      name: t('all'),
      value: ALL,
    },
    {
      name: t('column'),
      value: COLUMN,
      disabled: tipracksNotOnAdapter.length === 0,
      tooltipText:
        tipracksNotOnAdapter.length === 0
          ? t('form:step_edit_form.field.nozzles.option_tooltip.COLUMN')
          : undefined,
    },
  ]

  const [selectedValue, setSelectedValue] = useState(
    dropdownItem || options[0].value
  )
  useEffect(() => {
    updateValue(selectedValue)
  }, [selectedValue])

  return (
    <Flex padding={padding}>
      <DropdownMenu
        width="100%"
        error={errorToShow}
        dropdownType="neutral"
        filterOptions={options}
        title={t('select_nozzles')}
        currentOption={
          options.find(option => option.value === selectedValue) ?? options[0]
        }
        onClick={value => {
          updateValue(value)
          setSelectedValue(value)
        }}
        tooltipText={tooltipContent}
      />
    </Flex>
  )
}
