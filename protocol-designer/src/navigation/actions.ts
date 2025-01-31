export interface ToggleNewProtocolModalAction {
  type: 'TOGGLE_NEW_PROTOCOL_MODAL'
  payload: boolean
}
export const toggleNewProtocolModal = (
  payload: boolean
): ToggleNewProtocolModalAction => ({
  type: 'TOGGLE_NEW_PROTOCOL_MODAL',
  payload,
})
