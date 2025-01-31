import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  Chip,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'

import type { ComponentProps } from 'react'
import type { IconName, ChipType } from '@opentrons/components'
import type { NetworkConnection } from '/app/resources/networking/hooks/useNetworkConnection'
import type { SetSettingOption } from '../types'

export type ConnectionType = 'wifi' | 'ethernet' | 'usb'

interface NetworkSettingsProps {
  networkConnection: NetworkConnection
  setCurrentOption: SetSettingOption
}

export function NetworkSettings({
  networkConnection,
  setCurrentOption,
}: NetworkSettingsProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const { isWifiConnected, isEthernetConnected, activeSsid } = networkConnection

  const handleChipType = (isConnected: boolean): ChipType => {
    return isConnected ? 'success' : 'neutral'
  }

  const handleButtonBackgroundColor = (isConnected: boolean): string =>
    isConnected ? COLORS.green35 : COLORS.grey35

  const handleChipText = (isConnected: boolean): string =>
    isConnected ? t('connected') : t('not_connected')

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <ChildNavigation
        header={t('network_settings')}
        onClickBack={() => {
          setCurrentOption(null)
        }}
      />
      <Flex
        marginTop="7.75rem"
        paddingX={SPACING.spacing40}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing8}
      >
        <NetworkSettingButton
          buttonTitle={t('wifi')}
          backgroundColor={handleButtonBackgroundColor(isWifiConnected)}
          iconName="wifi"
          chipType={handleChipType(isWifiConnected)}
          chipText={handleChipText(isWifiConnected)}
          networkName={activeSsid}
          onClick={() => {
            setCurrentOption('RobotSettingsWifi')
          }}
        />
        <NetworkSettingButton
          buttonTitle={t('ethernet')}
          backgroundColor={handleButtonBackgroundColor(isEthernetConnected)}
          iconName="ethernet"
          chipType={handleChipType(isEthernetConnected)}
          chipText={handleChipText(isEthernetConnected)}
          onClick={() => {
            setCurrentOption('EthernetConnectionDetails')
          }}
        />
      </Flex>
    </Flex>
  )
}

interface NetworkSettingButtonProps extends ComponentProps<typeof Btn> {
  buttonTitle: string
  iconName: IconName
  chipType: ChipType
  chipText: string
  networkName?: string
}

function NetworkSettingButton({
  backgroundColor,
  buttonTitle,
  iconName,
  chipType,
  chipText,
  networkName,
  onClick,
}: NetworkSettingButtonProps): JSX.Element {
  const PUSHED_STATE_STYLE = css`
    &:active {
      background-color: ${chipType === 'success'
        ? COLORS.green40
        : COLORS.grey50};
    }
  `

  return (
    <Btn
      width="100%"
      paddingX={SPACING.spacing24}
      paddingY={SPACING.spacing20}
      backgroundColor={backgroundColor}
      borderRadius={BORDERS.borderRadius12}
      css={PUSHED_STATE_STYLE}
      onClick={onClick}
    >
      <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing24}>
        <Flex gridGap={SPACING.spacing8} width="34.8125rem">
          <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing24}>
            <Icon name={iconName} size="3rem" />
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing2}>
              <LegacyStyledText
                fontSize={TYPOGRAPHY.fontSize28}
                lineHeight={TYPOGRAPHY.lineHeight36}
                fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                textAlign={TYPOGRAPHY.textAlignLeft}
              >
                {buttonTitle}
              </LegacyStyledText>
              {networkName != null ? (
                <LegacyStyledText
                  fontSize={TYPOGRAPHY.fontSize28}
                  lineHeight={TYPOGRAPHY.lineHeight36}
                  fontWeight={TYPOGRAPHY.fontWeightRegular}
                  color={COLORS.grey60}
                >
                  {networkName}
                </LegacyStyledText>
              ) : null}
            </Flex>
          </Flex>
        </Flex>
        <Flex alignItems={ALIGN_CENTER} width="15.1875rem">
          <Chip
            type={chipType}
            text={chipText}
            iconName="connection-status"
            background={false}
          />
        </Flex>
        <Flex justifyContent="flex-end" alignSelf="stretch">
          <Btn
            onClick={() => {
              console.log('setup')
            }}
          >
            <Icon name="chevron-right" size="3rem" />
          </Btn>
        </Flex>
      </Flex>
    </Btn>
  )
}
