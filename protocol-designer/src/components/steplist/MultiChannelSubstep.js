// @flow
import * as React from 'react'
import cx from 'classnames'

import {Icon} from '@opentrons/components'
import {PDListItem} from '../lists'
import SubstepRow from './SubstepRow'
import styles from './StepItem.css'

import type {StepItemSourceDestRowMulti} from '../../steplist/types'

const DEFAULT_COLLAPSED_STATE = true

type MultiChannelSubstepProps = {|
  rowGroup: Array<StepItemSourceDestRowMulti>,
  ingredNames: {[string]: string},
  highlighted?: boolean,
  onMouseEnter?: (e: SyntheticMouseEvent<*>) => mixed,
  onMouseLeave?: (e: SyntheticMouseEvent<*>) => mixed,
|}

type MultiChannelSubstepState = {
  collapsed: boolean,
}

const VOLUME_DIGITS = 1

function formatVolume (inputVolume: ?string | ?number): string {
  if (typeof inputVolume === 'number') {
    // don't add digits to numbers with nothing to the right of the decimal
    const digits = inputVolume.toString().split('.')[1] ? VOLUME_DIGITS : 0
    return inputVolume.toFixed(digits)
  }

  return inputVolume || ''
}

export default class MultiChannelSubstep extends React.Component<MultiChannelSubstepProps, MultiChannelSubstepState> {
  state = {collapsed: DEFAULT_COLLAPSED_STATE}

  handleToggleCollapsed = () => {
    this.setState({collapsed: !this.state.collapsed})
  }

  render () {
    const {rowGroup, highlighted} = this.props
    const {collapsed} = this.state

    // NOTE: need verbose null check for flow to be happy
    const firstChannelSource = rowGroup[0].source
    const lastChannelSource = rowGroup[rowGroup.length - 1].source
    const sourceWellRange = `${firstChannelSource ? firstChannelSource.well : ''}:${lastChannelSource ? lastChannelSource.well : ''}`
    const firstChannelDest = rowGroup[0].dest
    const lastChannelDest = rowGroup[rowGroup.length - 1].dest
    const destWellRange = `${firstChannelDest ? firstChannelDest.well : ''}:${lastChannelDest ? lastChannelDest.well : ''}`
    return (
      <ol
        onMouseEnter={this.props.onMouseEnter}
        onMouseLeave={this.props.onMouseLeave}
        className={cx({[styles.highlighted]: highlighted})} >

        {/* Header row */}
        <PDListItem
          border
          className={cx(styles.step_subitem, {[styles.clear_border]: highlighted})}>
          <span className={styles.multi_substep_header}>multi</span>
          <span className={styles.emphasized_cell}>{sourceWellRange}</span>
          <span className={styles.volume_cell}>{`${formatVolume(rowGroup[0].volume)} μL`}</span>
          <span className={styles.emphasized_cell}>{destWellRange}</span>
          <span className={styles.inner_carat} onClick={this.handleToggleCollapsed}>
            <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} />
          </span>
        </PDListItem>

        {collapsed && rowGroup.map((row, rowKey) => {
          // Channel rows (1 for each channel in multi-channel pipette
          return (
            <SubstepRow
              key={rowKey}
              className={styles.step_subitem_channel_row}
              volume={row.volume}
              ingredNames={this.props.ingredNames}
              source={row.source}
              dest={row.dest}
            />
          )
        }
      )}
      </ol>
    )
  }
}
