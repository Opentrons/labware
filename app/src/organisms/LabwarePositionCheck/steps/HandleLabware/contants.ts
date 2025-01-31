import { css } from 'styled-components'

import { SPACING, DIRECTION_COLUMN } from '@opentrons/components'

/**
 * Styles
 */

export const LIST_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  padding: ${SPACING.spacing32} ${SPACING.spacing60};
  grid-gap: ${SPACING.spacing24};
`
