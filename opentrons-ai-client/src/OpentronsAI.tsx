import { HashRouter } from 'react-router-dom'
import {
  DIRECTION_COLUMN,
  Flex,
  OVERFLOW_AUTO,
  COLORS,
  ALIGN_CENTER,
} from '@opentrons/components'
import { OpentronsAIRoutes } from './OpentronsAIRoutes'
import { useAuth0 } from '@auth0/auth0-react'
import { useAtom } from 'jotai'
import { useEffect } from 'react'
import { Loading } from './molecules/Loading'
import { headerWithMeterAtom, mixpanelAtom, tokenAtom } from './resources/atoms'
import { useGetAccessToken } from './resources/hooks'
import { initializeMixpanel } from './analytics/mixpanel'
import { useTrackEvent } from './resources/hooks/useTrackEvent'
import { Header } from './molecules/Header'
import { CLIENT_MAX_WIDTH } from './resources/constants'
import { Footer } from './molecules/Footer'
import { HeaderWithMeter } from './molecules/HeaderWithMeter'
import styled from 'styled-components'
import { ExitConfirmModal } from './molecules/ExitConfirmModal'

export function OpentronsAI(): JSX.Element | null {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()
  const [, setToken] = useAtom(tokenAtom)
  const [{ displayHeaderWithMeter, progress }] = useAtom(headerWithMeterAtom)
  const [mixpanelState, setMixpanelState] = useAtom(mixpanelAtom)
  const { getAccessToken } = useGetAccessToken()
  const trackEvent = useTrackEvent()

  const fetchAccessToken = async (): Promise<void> => {
    try {
      const accessToken = await getAccessToken()
      setToken(accessToken)
    } catch (error) {
      console.error('Error fetching access token:', error)
    }
  }

  if (mixpanelState?.isInitialized === false) {
    setMixpanelState({ ...mixpanelState, isInitialized: true })
    initializeMixpanel(mixpanelState)
  }

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      void loginWithRedirect()
    }
    if (isAuthenticated) {
      void fetchAccessToken()
    }
  }, [isAuthenticated, isLoading, loginWithRedirect])

  useEffect(() => {
    if (isAuthenticated) {
      trackEvent({ name: 'user-login', properties: {} })
    }
  }, [isAuthenticated])

  if (isLoading) {
    return <Loading />
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <Flex
      id="opentrons-ai"
      width={'100%'}
      height={'100vh'}
      flexDirection={DIRECTION_COLUMN}
    >
      <StickyHeader>
        {displayHeaderWithMeter ? (
          <HeaderWithMeter progressPercentage={progress} />
        ) : (
          <Header />
        )}
      </StickyHeader>

      <Flex
        flex={1}
        flexDirection={DIRECTION_COLUMN}
        backgroundColor={COLORS.grey10}
        overflow={OVERFLOW_AUTO}
      >
        <Flex
          width="100%"
          maxWidth={CLIENT_MAX_WIDTH}
          alignSelf={ALIGN_CENTER}
          flex={1}
        >
          <HashRouter>
            <ExitConfirmModal />
            <OpentronsAIRoutes />
          </HashRouter>
        </Flex>
        <Footer />
      </Flex>
    </Flex>
  )
}

const StickyHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 100;
`
