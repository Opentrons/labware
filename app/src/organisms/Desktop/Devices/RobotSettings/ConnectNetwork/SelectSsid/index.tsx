import { useTranslation } from 'react-i18next'
import { CONTEXT_MENU } from '@opentrons/components'
import { SelectField } from '/app/atoms/SelectField'
import { NetworkOptionLabel, NetworkActionLabel } from './NetworkOptionLabel'

import type { ComponentProps } from 'react'
import type { TFunction } from 'i18next'
import type { SelectOptionOrGroup } from '@opentrons/components'
import type { WifiNetwork } from '../types'

export interface SelectSsidProps {
  list: WifiNetwork[]
  value: string | null
  onConnect: (ssid: string) => unknown
  onJoinOther: () => unknown
  isRobotBusy: boolean
}

const FIELD_NAME = '__SelectSsid__'

const JOIN_OTHER_VALUE = '__join-other-network__'

const formatOptions = (
  list: WifiNetwork[],
  t: TFunction
): SelectOptionOrGroup[] => {
  const SELECT_JOIN_OTHER_GROUP = {
    options: [
      { value: JOIN_OTHER_VALUE, label: `${t('join_other_network')}...` },
    ],
  }

  const ssidOptionsList = {
    options: list?.map(({ ssid }) => ({ value: ssid })),
  }
  const options = [ssidOptionsList, SELECT_JOIN_OTHER_GROUP]

  return options
}

export function SelectSsid(props: SelectSsidProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const { list, value, onConnect, onJoinOther, isRobotBusy } = props

  const handleValueChange = (_: string, value: string): void => {
    if (value === JOIN_OTHER_VALUE) {
      onJoinOther()
    } else {
      onConnect(value)
    }
  }

  const formatOptionLabel: ComponentProps<
    typeof SelectField
  >['formatOptionLabel'] = (option, { context }): JSX.Element | null => {
    const { value, label } = option

    if (label != null) return <NetworkActionLabel label={label} />
    const network = list.find(nw => nw.ssid === value)

    // react-select sets context to tell us if the value is rendered in the
    // options menu list or in the currently selected value. If it's being
    // rendered in the menu, we want to show a connected icon if the network
    // is active, but if the context is value, we want to hide the icon
    return network != null ? (
      <NetworkOptionLabel
        {...network}
        showConnectedIcon={context === CONTEXT_MENU}
      />
    ) : null
  }

  return (
    <SelectField
      disabled={isRobotBusy}
      name={FIELD_NAME}
      value={value}
      options={formatOptions(list, t as TFunction)}
      placeholder={t('choose_a_network')}
      onValueChange={handleValueChange}
      formatOptionLabel={formatOptionLabel}
      width="16rem"
    />
  )
}
