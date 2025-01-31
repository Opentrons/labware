import { createPortal } from 'react-dom'
import { css } from 'styled-components'

import {
  Flex,
  OVERFLOW_AUTO,
  OVERFLOW_HIDDEN,
  RESPONSIVENESS,
  SPACING,
} from '@opentrons/components'

import { InterventionModal } from '/app/molecules/InterventionModal'
import { getModalPortalEl, getTopPortalEl } from '/app/App/portal'

import type { ComponentProps } from 'react'
import type { ModalType } from '/app/molecules/InterventionModal'
import type { DesktopSizeType } from '../types'

export type RecoveryInterventionModalProps = Omit<
  ComponentProps<typeof InterventionModal>,
  'type'
> & {
  /* If on desktop, specifies the hard-coded dimensions height of the modal. */
  desktopType: DesktopSizeType
  isOnDevice: boolean
}

// A wrapper around InterventionModal with Error-Recovery specific props and styling.
export function RecoveryInterventionModal({
  children,
  desktopType,
  isOnDevice,
  ...rest
}: RecoveryInterventionModalProps): JSX.Element {
  const restProps = {
    ...rest,
    type: 'error' as ModalType,
  }

  return createPortal(
    <InterventionModal {...restProps} iconSize={isOnDevice ? '28px' : '16px'}>
      <Flex
        css={
          desktopType === 'desktop-small'
            ? SMALL_MODAL_STYLE
            : LARGE_MODAL_STYLE
        }
      >
        {children}
      </Flex>
    </InterventionModal>,
    isOnDevice ? getTopPortalEl() : getModalPortalEl()
  )
}

const SMALL_MODAL_STYLE = css`
  height: 22rem;
  padding: ${SPACING.spacing32};
  width: 100%;
  overflow-y: ${OVERFLOW_AUTO};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    padding: ${SPACING.spacing32};
    height: 100%;
    overflow: ${OVERFLOW_HIDDEN};
    user-select: none;
  }
`
const LARGE_MODAL_STYLE = css`
  height: 26.75rem;
  width: 100%;
  overflow-y: ${OVERFLOW_AUTO};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: 100%;
    overflow: ${OVERFLOW_HIDDEN};
    user-select: none;
  }
`
