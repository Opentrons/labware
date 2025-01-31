import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  BORDERS,
  Box,
  COLORS,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  MenuItem,
  Overlay,
  POSITION_ABSOLUTE,
  SecondaryButton,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import {
  getProtocolsDesktopSortKey,
  updateConfigValue,
} from '/app/redux/config'
import { useSortedProtocols } from './hooks'
import { Slideout } from '/app/atoms/Slideout'
import { ChooseRobotToRunProtocolSlideout } from '/app/organisms/Desktop/ChooseRobotToRunProtocolSlideout'
import { SendProtocolToFlexSlideout } from '../SendProtocolToFlexSlideout'
import { ProtocolUploadInput } from './ProtocolUploadInput'
import { ProtocolCard } from './ProtocolCard'
import { EmptyStateLinks } from './EmptyStateLinks'

import type { MouseEventHandler } from 'react'
import type {
  StoredProtocolData,
  ProtocolSort,
} from '/app/redux/protocol-storage'
import type { Dispatch } from '/app/redux/types'

const SORT_BY_BUTTON_STYLE = css`
  background-color: ${COLORS.transparent};
  cursor: ${CURSOR_POINTER};
  &:hover {
    background-color: ${COLORS.grey30};
  }
  &:active,
  &:focus {
    background-color: ${COLORS.grey40};
  }
`
const FLEX = 'Flex'
const OT2 = 'OT-2'
interface ProtocolListProps {
  storedProtocols: StoredProtocolData[]
}
export function ProtocolList(props: ProtocolListProps): JSX.Element | null {
  const [
    showImportProtocolSlideout,
    setShowImportProtocolSlideout,
  ] = useState<boolean>(false)
  const [
    showChooseRobotToRunProtocolSlideout,
    setShowChooseRobotToRunProtocolSlideout,
  ] = useState<boolean>(false)
  const [
    showSendProtocolToFlexSlideout,
    setShowSendProtocolToFlexSlideout,
  ] = useState<boolean>(false)
  const sortBy = useSelector(getProtocolsDesktopSortKey) ?? 'alphabetical'
  const [showSortByMenu, setShowSortByMenu] = useState<boolean>(false)
  const toggleSetShowSortByMenu = (): void => {
    setShowSortByMenu(!showSortByMenu)
  }
  const { t } = useTranslation('protocol_info')
  const { storedProtocols } = props
  const [
    selectedProtocol,
    setSelectedProtocol,
  ] = useState<StoredProtocolData | null>(null)

  const sortedStoredProtocols = useSortedProtocols(sortBy, storedProtocols)

  const dispatch = useDispatch<Dispatch>()

  const handleClickOutside: MouseEventHandler<HTMLDivElement> = e => {
    e.preventDefault()
    setShowSortByMenu(false)
  }

  const handleProtocolsSortKey = (sortKey: ProtocolSort): void => {
    dispatch(updateConfigValue('protocols.protocolsStoredSortKey', sortKey))
    setShowSortByMenu(false)
  }

  const sortByLabelType: {
    [key in ProtocolSort]: {
      label: string
    }
  } = {
    alphabetical: {
      label: t('shared:alphabetical'),
    },
    recent: {
      label: t('most_recent_updates'),
    },
    reverse: {
      label: t('shared:reverse'),
    },
    oldest: {
      label: t('oldest_updates'),
    },
    flex: {
      label: t('robot_type_first', { robotType: FLEX }),
    },
    ot2: {
      label: t('robot_type_first', { robotType: OT2 }),
    },
  }

  const handleRunProtocol = (storedProtocol: StoredProtocolData): void => {
    setSelectedProtocol(storedProtocol)
    setShowChooseRobotToRunProtocolSlideout(true)
  }

  const handleSendProtocolToFlex = (
    storedProtocol: StoredProtocolData
  ): void => {
    setSelectedProtocol(storedProtocol)
    setShowSendProtocolToFlexSlideout(true)
  }

  return (
    <Box padding={SPACING.spacing16}>
      {selectedProtocol != null ? (
        <>
          <ChooseRobotToRunProtocolSlideout
            key={`ChooseRobotToRunProtocolSlideout_${selectedProtocol.protocolKey}`}
            onCloseClick={() => {
              setShowChooseRobotToRunProtocolSlideout(false)
            }}
            showSlideout={showChooseRobotToRunProtocolSlideout}
            storedProtocolData={selectedProtocol}
          />
          <SendProtocolToFlexSlideout
            key={`SendProtocolToFlexSlideout_${selectedProtocol.protocolKey}`}
            isExpanded={showSendProtocolToFlexSlideout}
            onCloseClick={() => {
              setShowSendProtocolToFlexSlideout(false)
            }}
            storedProtocolData={selectedProtocol}
          />
        </>
      ) : null}
      <Flex
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        marginBottom={SPACING.spacing24}
      >
        <LegacyStyledText as="h1">{t('protocols')}</LegacyStyledText>
        <Flex flexDirection={DIRECTION_ROW}>
          <Flex
            flexDirection={DIRECTION_ROW}
            alignItems={ALIGN_CENTER}
            marginRight={SPACING.spacing16}
          >
            <LegacyStyledText
              as="p"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              color={COLORS.grey60}
            >
              {t('shared:sort_by')}
            </LegacyStyledText>
            <Flex
              flexDirection={DIRECTION_ROW}
              alignItems={ALIGN_CENTER}
              borderRadius={BORDERS.borderRadius8}
              marginLeft={SPACING.spacing8}
              css={SORT_BY_BUTTON_STYLE}
              onClick={toggleSetShowSortByMenu}
              data-testid="ProtocolList_SortByMenu"
            >
              <LegacyStyledText
                as="p"
                fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                paddingLeft={SPACING.spacing8}
                paddingRight={SPACING.spacing4}
                paddingY={SPACING.spacing4}
                data-testid="sortBy-label"
              >
                {sortByLabelType[sortBy].label}
              </LegacyStyledText>
              <Icon
                paddingRight={SPACING.spacing8}
                color={COLORS.black90}
                height={TYPOGRAPHY.lineHeight16}
                name={showSortByMenu ? 'chevron-up' : 'chevron-down'}
              />
            </Flex>
          </Flex>
          {showSortByMenu && (
            <Flex
              zIndex={2}
              borderRadius={BORDERS.borderRadius4}
              boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
              position={POSITION_ABSOLUTE}
              backgroundColor={COLORS.white}
              top="3.25rem"
              right="7rem"
              flexDirection={DIRECTION_COLUMN}
            >
              <MenuItem
                onClick={() => {
                  handleProtocolsSortKey('alphabetical')
                }}
              >
                {t('shared:alphabetical')}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleProtocolsSortKey('reverse')
                }}
              >
                {t('shared:reverse')}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleProtocolsSortKey('recent')
                }}
              >
                {t('most_recent_updates')}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleProtocolsSortKey('oldest')
                }}
              >
                {t('oldest_updates')}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleProtocolsSortKey('flex')
                }}
              >
                {t('robot_type_first', { robotType: FLEX })}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleProtocolsSortKey('ot2')
                }}
              >
                {t('robot_type_first', { robotType: OT2 })}
              </MenuItem>
            </Flex>
          )}
          {showSortByMenu ? (
            <Overlay
              onClick={handleClickOutside}
              backgroundColor={COLORS.transparent}
            />
          ) : null}
          <SecondaryButton
            onClick={() => {
              setShowImportProtocolSlideout(true)
            }}
          >
            {t('import')}
          </SecondaryButton>
        </Flex>
      </Flex>
      <Flex
        flexDirection="column"
        gridGap={SPACING.spacing8}
        marginBottom={SPACING.spacing40}
      >
        {sortedStoredProtocols != null &&
          sortedStoredProtocols.map(storedProtocol => (
            <ProtocolCard
              key={storedProtocol.protocolKey}
              handleRunProtocol={handleRunProtocol}
              handleSendProtocolToFlex={handleSendProtocolToFlex}
              storedProtocolData={storedProtocol}
            />
          ))}
      </Flex>
      <EmptyStateLinks title={t('create_or_download')} />
      <Slideout
        title={t('import_new_protocol')}
        isExpanded={showImportProtocolSlideout}
        onCloseClick={() => {
          setShowImportProtocolSlideout(false)
        }}
      >
        <Box marginTop={SPACING.spacing16}>
          <ProtocolUploadInput
            onUpload={() => {
              setShowImportProtocolSlideout(false)
            }}
          />
        </Box>
      </Slideout>
    </Box>
  )
}
