import { useInstrumentsQuery } from '@opentrons/react-api-client'
import { PrimaryButton } from '@opentrons/components'
import { SmallButton } from '/app/atoms/buttons'

import type { Dispatch, SetStateAction } from 'react'

interface CheckPipetteButtonProps {
  proceedButtonText: string
  setFetching: Dispatch<SetStateAction<boolean>>
  isFetching: boolean
  isOnDevice: boolean | null
  proceed?: () => void
}
export const CheckPipetteButton = (
  props: CheckPipetteButtonProps
): JSX.Element => {
  const {
    proceedButtonText,
    proceed,
    setFetching,
    isFetching,
    isOnDevice,
  } = props
  const { refetch } = useInstrumentsQuery({
    enabled: false,
    onSettled: () => {
      setFetching(false)
    },
  })

  return isOnDevice ? (
    <SmallButton
      disabled={isFetching}
      buttonText={proceedButtonText}
      onClick={() => {
        setFetching(true)
        refetch()
          .then(() => {
            proceed?.()
          })
          .catch(() => {})
      }}
    />
  ) : (
    <PrimaryButton
      disabled={isFetching}
      onClick={() => {
        refetch()
          .then(() => {
            proceed?.()
          })
          .catch(() => {})
      }}
    >
      {proceedButtonText}
    </PrimaryButton>
  )
}
