import { LEFT, RIGHT } from '@opentrons/shared-data'
import { Flex } from '../primitives'
import { SPACING, TYPOGRAPHY } from '../ui-style-constants'
import { LegacyStyledText } from '../atoms'
import { DIRECTION_COLUMN, JUSTIFY_CENTER } from '../styles'
import { InstrumentDiagram } from './InstrumentDiagram'

import type { ReactNode } from 'react'
import type { Mount } from '../robot-types'
import type { InstrumentDiagramProps } from './InstrumentDiagram'

import styles from './instrument.module.css'

export interface InstrumentInfoProps {
  /** 'left' or 'right' */
  mount: Mount
  /** human-readable description, eg 'p300 Single-channel' */
  description: string
  /** specs of mounted pipette */
  pipetteSpecs?: InstrumentDiagramProps['pipetteSpecs'] | null
  /** paired tiprack models */
  tiprackModels?: string[]
  /** children to display under the info */
  children?: ReactNode
  /** if true, show labels 'LEFT PIPETTE' / 'RIGHT PIPETTE' */
  showMountLabel?: boolean | null
}

const MAX_WIDTH = '14rem'

export function InstrumentInfo(props: InstrumentInfoProps): JSX.Element {
  const {
    mount,
    showMountLabel,
    description,
    tiprackModels,
    pipetteSpecs,
    children,
  } = props

  const has96Channel = pipetteSpecs?.channels === 96
  return (
    <Flex justifyContent={JUSTIFY_CENTER} gridGap={SPACING.spacing16}>
      {mount === RIGHT && pipetteSpecs ? (
        <InstrumentDiagram
          pipetteSpecs={pipetteSpecs}
          className={styles.pipette_icon}
          mount={mount}
        />
      ) : null}
      {/* NOTE: the color is our legacy c-font-dark, which matches the other colors in this component **/}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        color="#4a4a4a"
        gridGap={SPACING.spacing8}
      >
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
          <LegacyStyledText
            as="h3"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            textTransform={TYPOGRAPHY.textTransformCapitalize}
          >
            {showMountLabel && !has96Channel ? `${mount} pipette` : 'pipette'}
          </LegacyStyledText>
          <LegacyStyledText as="p" width="max-content" maxWidth={MAX_WIDTH}>
            {description}
          </LegacyStyledText>
        </Flex>

        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
          <LegacyStyledText as="h3" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
            {'Tip rack'}
          </LegacyStyledText>
          <ul>
            {tiprackModels != null && tiprackModels.length > 0 ? (
              tiprackModels.map((model, index) => (
                <li key={`${model}_${index}`}>
                  <LegacyStyledText
                    as="p"
                    width="max-content"
                    maxWidth={MAX_WIDTH}
                  >
                    {model}
                  </LegacyStyledText>
                </li>
              ))
            ) : (
              <LegacyStyledText as="p" width="max-content" maxWidth={MAX_WIDTH}>
                {'None'}
              </LegacyStyledText>
            )}
          </ul>
        </Flex>
      </Flex>

      {children}
      {mount === LEFT && pipetteSpecs ? (
        <InstrumentDiagram
          pipetteSpecs={pipetteSpecs}
          className={styles.pipette_icon}
          mount={mount}
        />
      ) : null}
    </Flex>
  )
}
