// @flow
// import * as React from 'react'
import {connect} from 'react-redux'

import MoreOptionsModal from '../components/modals/MoreOptionsModal'

import {selectors} from '../steplist/reducers'
import {
  deleteStep,
  cancelMoreOptionsModal,
  changeMoreOptionsModalInput,
  saveMoreOptionsModal
} from '../steplist/actions'

import type {BaseState, ThunkDispatch} from '../types'

function mapStateToProps (state: BaseState) {
  const formModalData = selectors.formModalData(state)
  return {
    hideModal: formModalData === null,
    formData: formModalData
  }
}

function mapDispatchToProps (dispatch: ThunkDispatch<*>) {
  return {
    onDelete: () => dispatch(deleteStep()),
    onCancel: () => dispatch(cancelMoreOptionsModal()),
    onSave: () => dispatch(saveMoreOptionsModal()),

    handleChange: (accessor: string) => (e: SyntheticInputEvent<*>) => {
      // NOTE this is similar to ConnectedStepEdit form, is it possible to make a more general reusable fn?
      dispatch(changeMoreOptionsModalInput({accessor, value: e.target.value}))
    },

    onClickAway: () => dispatch(cancelMoreOptionsModal())
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(MoreOptionsModal)
