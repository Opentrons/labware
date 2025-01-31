import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  LargeButton,
  POSITION_RELATIVE,
  SPACING,
  StyledText,
  TEXT_ALIGN_CENTER,
} from '@opentrons/components'
import welcomeImage from '../../assets/images/welcome_dashboard.png'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '../../resources/hooks/useIsMobile'
import { useNavigate } from 'react-router-dom'
import { useTrackEvent } from '../../resources/hooks/useTrackEvent'
import { useAtom } from 'jotai'
import { headerWithMeterAtom } from '../../resources/atoms'
import { useEffect } from 'react'

export function Landing(): JSX.Element | null {
  const navigate = useNavigate()
  const { t } = useTranslation('protocol_generator')
  const isMobile = useIsMobile()
  const trackEvent = useTrackEvent()
  const [, setHeaderWithMeterAtom] = useAtom(headerWithMeterAtom)

  useEffect(() => {
    setHeaderWithMeterAtom({ displayHeaderWithMeter: false, progress: 0.0 })
  }, [setHeaderWithMeterAtom])

  function handleCreateNewProtocol(): void {
    trackEvent({ name: 'create-new-protocol', properties: {} })
    navigate('/new-protocol')
  }

  function handleUpdateProtocol(): void {
    trackEvent({ name: 'update-protocol', properties: {} })
    navigate('/update-protocol')
  }

  return (
    <Flex
      position={POSITION_RELATIVE}
      margin={SPACING.spacing16}
      marginBottom={0}
      borderRadius={BORDERS.borderRadius16}
      backgroundColor={COLORS.white}
      justifyContent={JUSTIFY_CENTER}
      flex="1"
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_CENTER}
        width="100%"
        maxWidth="548px"
        minHeight="600px"
        gridGap={SPACING.spacing16}
        textAlign={TEXT_ALIGN_CENTER}
      >
        <img
          src={welcomeImage}
          height="132px"
          width="548px"
          alt={t('landing_page_image_alt')}
        />
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
          <StyledText desktopStyle="headingLargeBold">
            {t('landing_page_heading')}
          </StyledText>
          <StyledText desktopStyle="headingSmallRegular">
            {!isMobile ? t('landing_page_body') : t('landing_page_body_mobile')}
          </StyledText>
        </Flex>
        {!isMobile && (
          <>
            <LargeButton
              buttonText={t('landing_page_button_new_protocol')}
              onClick={handleCreateNewProtocol}
            />
            <LargeButton
              buttonText={t('landing_page_button_update_protocol')}
              buttonType="stroke"
              onClick={handleUpdateProtocol}
            />
          </>
        )}
      </Flex>
    </Flex>
  )
}
