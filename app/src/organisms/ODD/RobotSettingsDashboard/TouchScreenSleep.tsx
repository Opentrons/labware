import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import {
  DIRECTION_COLUMN,
  Flex,
  RadioButton,
  SPACING,
} from '@opentrons/components'

import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import {
  getOnDeviceDisplaySettings,
  updateConfigValue,
} from '/app/redux/config'
import { SLEEP_NEVER_MS } from '/app/local-resources/dom-utils'

import type { ChangeEvent } from 'react'
import type { Dispatch } from '/app/redux/types'
import type { SetSettingOption } from './types'

const SLEEP_TIME_MS = 60 * 1000 // 1 min

interface TouchScreenSleepProps {
  setCurrentOption: SetSettingOption
}

export function TouchScreenSleep({
  setCurrentOption,
}: TouchScreenSleepProps): JSX.Element {
  const { t } = useTranslation(['device_settings'])
  const { sleepMs } = useSelector(getOnDeviceDisplaySettings) ?? SLEEP_NEVER_MS
  const dispatch = useDispatch<Dispatch>()
  const screenRef = useRef<HTMLDivElement | null>(null)

  // Note (kj:02/10/2023) value's unit is ms
  const settingsButtons = [
    { label: t('never'), value: SLEEP_NEVER_MS },
    { label: t('minutes', { minute: 3 }), value: SLEEP_TIME_MS * 3 },
    { label: t('minutes', { minute: 5 }), value: SLEEP_TIME_MS * 5 },
    { label: t('minutes', { minute: 10 }), value: SLEEP_TIME_MS * 10 },
    { label: t('minutes', { minute: 15 }), value: SLEEP_TIME_MS * 15 },
    { label: t('minutes', { minute: 30 }), value: SLEEP_TIME_MS * 30 },
    { label: t('one_hour'), value: SLEEP_TIME_MS * 60 },
  ]

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    dispatch(
      updateConfigValue(
        'onDeviceDisplaySettings.sleepMs',
        Number(event.target.value)
      )
    )
  }

  useEffect(() => {
    if (screenRef.current != null) screenRef.current.scrollIntoView()
  }, [])

  return (
    <Flex flexDirection={DIRECTION_COLUMN} ref={screenRef}>
      <ChildNavigation
        header={t('touchscreen_sleep')}
        onClickBack={() => {
          setCurrentOption(null)
        }}
      />
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing8}
        paddingX={SPACING.spacing40}
        paddingBottom={SPACING.spacing40}
        marginTop="7.75rem"
      >
        {settingsButtons.map(radio => (
          <RadioButton
            key={`sleep_setting_${radio.label}`}
            buttonLabel={radio.label}
            buttonValue={radio.value}
            onChange={handleChange}
            isSelected={radio.value === sleepMs}
          />
        ))}
      </Flex>
    </Flex>
  )
}
