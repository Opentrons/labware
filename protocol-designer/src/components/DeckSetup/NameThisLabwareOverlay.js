// @flow
import React, { useState } from 'react'
import { connect } from 'react-redux'
import { Icon, useOnClickOutside } from '@opentrons/components'
import { renameLabware } from '../../labware-ingred/actions'
import type { BaseState, ThunkDispatch } from '../../types'
import i18n from '../../localization'
import styles from './DeckSetup.css'

type OP = {|
  labwareEntity: LabwareEntity,
  editLiquids: () => mixed,
|}

type DP = {|
  // TODO Ian 2018-02-16 type these fns elsewhere and import the type
  setLabwareName: (name: ?string) => mixed,
|}

type Props = { ...OP, ...DP }

const NameThisLabwareOverlay = (props: Props) => {
  const [inputValue, setInputValue] = useState('')

  const saveNickname = () => {
    props.setLabwareName(inputValue || null)
  }

  const wrapperRef = useOnClickOutside(saveNickname)

  const handleChange = (e: SyntheticInputEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleKeyUp = (e: SyntheticKeyboardEvent<*>) => {
    if (e.key === 'Enter') {
      saveNickname()
    }
  }
  const addLiquids = () => {
    saveNickname()
    props.editLiquids()
  }

  return (
    <div className={styles.slot_overlay} ref={wrapperRef}>
      <input
        className={styles.name_input}
        onChange={handleChange}
        onKeyUp={handleKeyUp}
        placeholder={i18n.t('deck.overlay.name_labware.nickname_placeholder')}
        value={inputValue}
      />

      <p onClick={addLiquids}>
        <Icon className={styles.overlay_icon} name="water" />
        {i18n.t('deck.overlay.name_labware.add_liquids')}
      </p>
      <p onClick={saveNickname}>
        <Icon className={styles.overlay_icon} name="ot-water-outline" />
        {i18n.t('deck.overlay.name_labware.leave_empty')}
      </p>
    </div>
  )
}

const mapDispatchToProps = (dispatch: ThunkDispatch<*>, ownProps: OP): DP => {
  const { id } = ownProps.labwareEntity
  return {
    setLabwareName: (name: ?string) =>
      dispatch(renameLabware({ labwareId: id, name })),
  }
}

export default connect<Props, OP, _, DP, BaseState, ThunkDispatch<*>>(
  null,
  mapDispatchToProps
)(NameThisLabwareOverlay)
