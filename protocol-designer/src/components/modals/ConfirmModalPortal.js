// @flow
import * as React from 'react'
import ReactDom from 'react-dom'
import {CONFIRM_MODAL_ROOT_ID} from '../../constants'

type Props = {render: () => React.Node}
/** The wrapped component returned by the render prop is rendered into
 * the "confirm modal root" of the DOM via a Portal. */
export default function ConfirmModalPortal (props: Props): React.Node {
  const modalRootElem = document.getElementById(CONFIRM_MODAL_ROOT_ID)

  if (!modalRootElem) {
    console.error('Confirm Modal root is not present, could not render modal')
    return null
  }

  return ReactDom.createPortal(
    props.render(),
    modalRootElem
  )
}
