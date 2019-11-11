// @flow
import * as React from 'react'
import { getModuleDisplayName } from '@opentrons/shared-data'

import StatusCard from './StatusCard'
import StatusItem from './StatusItem'
import styles from './styles.css'

import type { MagDeckModule } from '../../robot-api/types'

type Props = {|
  module: MagDeckModule,
  isCardExpanded: boolean,
  toggleCard: boolean => mixed,
|}

const MagDeckCard = ({ module, isCardExpanded, toggleCard }: Props) => (
  <StatusCard
    title={getModuleDisplayName(module.name)}
    isCardExpanded={isCardExpanded}
    toggleCard={toggleCard}
  >
    <div className={styles.card_row}>
      <StatusItem status={module.status} />
    </div>
  </StatusCard>
)

export default MagDeckCard
