import { saveAs } from 'file-saver'
import { useTranslation, Trans } from 'react-i18next'

import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  Link,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  useInstrumentsQuery,
  useModulesQuery,
} from '@opentrons/react-api-client'
import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import { TertiaryButton } from '/app/atoms/buttons'
import {
  useDeckCalibrationData,
  usePipetteOffsetCalibrations,
  useTipLengthCalibrations,
} from '/app/organisms/Desktop/Devices/hooks'
import {
  useTrackEvent,
  ANALYTICS_CALIBRATION_DATA_DOWNLOADED,
} from '/app/redux/analytics'
import { useRobot, useIsFlex } from '/app/redux-resources/robots'
import { useIsEstopNotDisengaged } from '/app/resources/devices/hooks/useIsEstopNotDisengaged'

import type { MouseEventHandler } from 'react'

// TODO(bc, 2022-02-08): replace with support article when available
const FLEX_CALIBRATION_SUPPORT_URL = 'https://support.opentrons.com'

interface CalibrationDataDownloadProps {
  robotName: string
  setShowHowCalibrationWorksModal: (
    showHowCalibrationWorksModal: boolean
  ) => void
}

export function CalibrationDataDownload({
  robotName,
  setShowHowCalibrationWorksModal,
}: CalibrationDataDownloadProps): JSX.Element {
  const { t } = useTranslation([
    'device_settings',
    'robot_calibration',
    'shared',
  ])
  const doTrackEvent = useTrackEvent()

  const robot = useRobot(robotName)
  const isFlex = useIsFlex(robotName)
  // wait for robot request to resolve instead of using name directly from params
  const deckCalibrationData = useDeckCalibrationData(robot?.name)
  const pipetteOffsetCalibrations = usePipetteOffsetCalibrations()
  const tipLengthCalibrations = useTipLengthCalibrations()
  const { data: attachedInstruments } = useInstrumentsQuery({ enabled: isFlex })
  const { data: attachedModules } = useModulesQuery({ enabled: isFlex })
  const isEstopNotDisengaged = useIsEstopNotDisengaged(robotName)

  const ot2DownloadIsPossible =
    deckCalibrationData.isDeckCalibrated &&
    pipetteOffsetCalibrations != null &&
    pipetteOffsetCalibrations.length > 0 &&
    tipLengthCalibrations != null &&
    tipLengthCalibrations.length > 0

  const onClickSaveAs: MouseEventHandler = e => {
    e.preventDefault()
    doTrackEvent({
      name: ANALYTICS_CALIBRATION_DATA_DOWNLOADED,
      properties: {
        robotType: isFlex ? FLEX_ROBOT_TYPE : OT2_ROBOT_TYPE,
      },
    })
    saveAs(
      new Blob([
        isFlex
          ? JSON.stringify({
              instrumentData: attachedInstruments,
              moduleData: attachedModules,
            })
          : JSON.stringify({
              deck: deckCalibrationData,
              pipetteOffset: pipetteOffsetCalibrations,
              tipLength: tipLengthCalibrations,
            }),
      ]),
      `opentrons-${robotName}-calibration.json`
    )
  }

  return (
    <Flex
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      alignItems={ALIGN_CENTER}
      gridGap={SPACING.spacing40}
    >
      <Flex gridGap={SPACING.spacing8} flexDirection={DIRECTION_COLUMN}>
        <LegacyStyledText as="h3" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
          {isFlex
            ? t('about_calibration_title')
            : t('robot_calibration:download_calibration_title')}
        </LegacyStyledText>
        {isFlex ? (
          <>
            <Trans
              t={t}
              i18nKey="about_calibration_description_ot3"
              components={{
                block: <LegacyStyledText as="p" />,
              }}
            />
            <Link
              external
              css={TYPOGRAPHY.linkPSemiBold}
              href={FLEX_CALIBRATION_SUPPORT_URL}
            >
              {t('robot_calibration:see_how_robot_calibration_works')}
            </Link>
          </>
        ) : (
          <LegacyStyledText as="p">
            {t(
              ot2DownloadIsPossible
                ? 'robot_calibration:download_calibration_data_available'
                : 'robot_calibration:download_calibration_data_unavailable'
            )}
          </LegacyStyledText>
        )}
      </Flex>
      <TertiaryButton
        onClick={onClickSaveAs}
        disabled={isFlex ? isEstopNotDisengaged : !ot2DownloadIsPossible} // always enable download on Flex
      >
        <Flex alignItems={ALIGN_CENTER}>
          <Icon name="download" size="0.75rem" marginRight={SPACING.spacing8} />
          {t('download_calibration_data')}
        </Flex>
      </TertiaryButton>
    </Flex>
  )
}
