import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import {
  ALIGN_CENTER,
  BORDERS,
  Box,
  COLORS,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  LiquidIcon,
  MenuItem,
  OVERFLOW_AUTO,
  POSITION_ABSOLUTE,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { LINE_CLAMP_TEXT_STYLE } from '../../atoms'
import { selectors as labwareIngredSelectors } from '../../labware-ingred/selectors'
import * as labwareIngredActions from '../../labware-ingred/actions'

import type { MouseEvent, RefObject } from 'react'
import type { ThunkDispatch } from '../../types'

const NAV_HEIGHT = '64px'

interface LiquidsOverflowMenuProps {
  onClose: () => void
  showLiquidsModal: () => void
  overflowWrapperRef: RefObject<HTMLDivElement>
}

export function LiquidsOverflowMenu(
  props: LiquidsOverflowMenuProps
): JSX.Element {
  const { onClose, showLiquidsModal, overflowWrapperRef } = props
  const location = useLocation()
  const { t } = useTranslation(['starting_deck_state'])
  const liquids = useSelector(labwareIngredSelectors.allIngredientNamesIds)
  const dispatch: ThunkDispatch<any> = useDispatch()

  return (
    <Flex
      position={POSITION_ABSOLUTE}
      zIndex={12}
      right={location.pathname === '/liquids' ? SPACING.spacing12 : '3.125rem'}
      top={`calc(${NAV_HEIGHT} - 6px)`}
      ref={overflowWrapperRef}
      borderRadius={BORDERS.borderRadius8}
      boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
      backgroundColor={COLORS.white}
      flexDirection={DIRECTION_COLUMN}
      onClick={(e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      width="9.375rem"
      maxHeight="18.75rem"
      overflowY={OVERFLOW_AUTO}
    >
      {liquids.map(({ name, displayColor, ingredientId }) => {
        return (
          <MenuItem
            data-testid={`${name}_${ingredientId}`}
            onClick={() => {
              onClose()
              showLiquidsModal()
              dispatch(labwareIngredActions.selectLiquidGroup(ingredientId))
            }}
            key={ingredientId}
            css={css`
              cursor: ${CURSOR_POINTER};
            `}
          >
            <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
              <LiquidIcon color={displayColor ?? ''} />
              <StyledText
                desktopStyle="bodyDefaultRegular"
                css={`
                  ${LINE_CLAMP_TEXT_STYLE(3)}
                  text-align: ${TYPOGRAPHY.textAlignLeft}
                `}
              >
                {name}
              </StyledText>
            </Flex>
          </MenuItem>
        )
      })}
      {liquids.length > 0 ? (
        <Box width="100%" border={`1px solid ${COLORS.grey20}`} />
      ) : null}
      <MenuItem
        data-testid="defineLiquid"
        onClick={() => {
          onClose()
          showLiquidsModal()
          dispatch(labwareIngredActions.createNewLiquidGroup())
        }}
        key="defineLiquid"
        css={css`
          cursor: ${CURSOR_POINTER};
        `}
      >
        <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
          <Icon name="plus" size="1rem" />
          <StyledText desktopStyle="bodyDefaultRegular">
            {t('define_liquid')}
          </StyledText>
        </Flex>
      </MenuItem>
    </Flex>
  )
}
