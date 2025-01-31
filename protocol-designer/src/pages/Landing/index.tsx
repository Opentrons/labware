import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  COLORS,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  EndUserAgreementFooter,
  Flex,
  INFO_TOAST,
  JUSTIFY_CENTER,
  LargeButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { LINK_BUTTON_STYLE } from '../../atoms'
import { AnnouncementModal } from '../../organisms'
import { actions as loadFileActions } from '../../load-file'
import { getFileMetadata } from '../../file-data/selectors'
import { toggleNewProtocolModal } from '../../navigation/actions'
import { useKitchen } from '../../organisms/Kitchen/hooks'
import { getHasOptedIn } from '../../analytics/selectors'
import { useAnnouncements } from '../../organisms/AnnouncementModal/announcements'
import { getLocalStorageItem, localStorageAnnouncementKey } from '../../persist'
import welcomeImage from '../../assets/images/welcome_page.png'

import type { ChangeEvent, ComponentProps } from 'react'
import type { ThunkDispatch } from '../../types'

export function Landing(): JSX.Element {
  const { t } = useTranslation('shared')
  const dispatch: ThunkDispatch<any> = useDispatch()
  const metadata = useSelector(getFileMetadata)
  const navigate = useNavigate()
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(
    false
  )
  const { hasOptedIn } = useSelector(getHasOptedIn)
  const { bakeToast, eatToast } = useKitchen()
  const announcements = useAnnouncements()
  const lastAnnouncement = announcements[announcements.length - 1]
  const announcementKey = lastAnnouncement
    ? lastAnnouncement.announcementKey
    : null

  const userHasNotSeenAnnouncement =
    getLocalStorageItem(localStorageAnnouncementKey) !== announcementKey &&
    hasOptedIn != null

  useEffect(() => {
    if (userHasNotSeenAnnouncement) {
      const toastId = bakeToast(
        t('learn_more', { version: process.env.OT_PD_VERSION }) as string,
        INFO_TOAST,
        {
          heading: t('updated_protocol_designer'),
          closeButton: true,
          linkText: t('view_release_notes'),
          onLinkClick: () => {
            eatToast(toastId)
            setShowAnnouncementModal(true)
          },
          disableTimeout: true,
          justifyContent: JUSTIFY_CENTER,
        }
      )
    }
  }, [userHasNotSeenAnnouncement])

  useEffect(() => {
    if (metadata?.created != null) {
      console.warn('protocol already exists, navigating to overview')
      navigate('/overview')
    }
  }, [metadata, navigate])

  const loadFile = (fileChangeEvent: ChangeEvent<HTMLInputElement>): void => {
    dispatch(loadFileActions.loadProtocolFile(fileChangeEvent))
  }

  return (
    <>
      {showAnnouncementModal ? (
        <AnnouncementModal
          isViewReleaseNotes={showAnnouncementModal}
          onClose={() => {
            setShowAnnouncementModal(false)
          }}
        />
      ) : null}
      <Flex
        data-cy="landing-page"
        backgroundColor={COLORS.grey10}
        flexDirection={DIRECTION_COLUMN}
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_CENTER}
        height="calc(100vh - 9rem)"
        width="100%"
        gridGap={SPACING.spacing32}
      >
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
          <img
            src={welcomeImage}
            height="132px"
            width="548px"
            aria-label="welcome image"
          />
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing8}
            alignItems={ALIGN_CENTER}
          >
            <StyledText desktopStyle="headingLargeBold">
              {t('welcome')}
            </StyledText>
            <StyledText
              desktopStyle="headingSmallRegular"
              color={COLORS.grey60}
              maxWidth="34.25rem"
              textAlign={TYPOGRAPHY.textAlignCenter}
            >
              {t('no-code-required')}
            </StyledText>
          </Flex>
        </Flex>
        <StyledNavLink to="/createNew">
          <LargeButton
            onClick={() => {
              dispatch(toggleNewProtocolModal(true))
            }}
            buttonText={<ButtonText>{t('create_a_protocol')}</ButtonText>}
          />
        </StyledNavLink>
        <StyledLabel>
          <Flex css={LINK_BUTTON_STYLE}>
            <StyledText desktopStyle="bodyLargeRegular">
              {t('edit_existing')}
            </StyledText>
          </Flex>
          <input type="file" onChange={loadFile} />
        </StyledLabel>
      </Flex>
      <EndUserAgreementFooter />
    </>
  )
}

const StyledLabel = styled.label`
  display: inline-block;
  cursor: ${CURSOR_POINTER};
  input[type='file'] {
    display: none;
  }
`

const ButtonText = styled.span`
  line-height: ${TYPOGRAPHY.lineHeight24};
  font-size: 1rem;
  font-style: normal;
  font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
`

const StyledNavLink = styled(NavLink)<ComponentProps<typeof NavLink>>`
  color: ${COLORS.white};
  text-decoration: none;
`
