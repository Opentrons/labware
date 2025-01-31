import { forwardRef, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { useSelector } from 'react-redux'
import last from 'lodash/last'

import { useDispatchApiRequest } from '/app/redux/robot-api'
import { postWifiKeys, getWifiKeyByRequestId } from '/app/redux/networking'

import type { ChangeEventHandler, ForwardedRef } from 'react'
import type { State } from '/app/redux/types'

export interface UploadKeyInputProps {
  robotName: string
  label: string
  onUpload: (keyId: string) => unknown
}

// TODO(mc, 2020-03-04): create styled HiddenInput in components library
const HiddenInput = styled.input`
  position: absolute;
  overflow: hidden;
  clip: rect(0 0 0 0);
  height: 1px;
  width: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
`

const UploadKeyInputComponent = (
  props: UploadKeyInputProps,
  ref: ForwardedRef<HTMLInputElement>
): JSX.Element => {
  const { robotName, label, onUpload } = props
  const [dispatchApi, requestIds] = useDispatchApiRequest()
  const handleUpload = useRef<(key: string) => void>()

  const createdKeyId = useSelector((state: State) => {
    return getWifiKeyByRequestId(state, robotName, last(requestIds) ?? null)
  })?.id

  const handleFileInput: ChangeEventHandler<HTMLInputElement> = event => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0]
      event.target.value = ''

      dispatchApi(postWifiKeys(robotName, file))
    }
  }

  useEffect(() => {
    handleUpload.current = onUpload
  }, [onUpload])

  useEffect(() => {
    if (createdKeyId != null && handleUpload.current) {
      handleUpload.current(createdKeyId)
    }
  }, [createdKeyId])

  return (
    <HiddenInput
      ref={ref}
      aria-label={label}
      type="file"
      onChange={handleFileInput}
    />
  )
}

export const UploadKeyInput = forwardRef<HTMLInputElement, UploadKeyInputProps>(
  UploadKeyInputComponent
)
