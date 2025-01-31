import { useState } from 'react'
import { ToggleGroup } from '@opentrons/components'
import { useTrackEvent } from '/app/redux/analytics'

import type { ReactNode } from 'react'

export const useToggleGroup = (
  left: string,
  right: string,
  trackEventName?: string
): [string, ReactNode] => {
  const [selectedValue, setSelectedValue] = useState<string>(left)
  const trackEvent = useTrackEvent()
  const handleLeftClick = (): void => {
    setSelectedValue(left)
    if (trackEventName != null) {
      trackEvent({
        name: trackEventName,
        properties: { view: 'list' },
      })
    }
  }
  const handleRightClick = (): void => {
    setSelectedValue(right)
    if (trackEventName != null) {
      trackEvent({
        name: trackEventName,
        properties: { view: 'map' },
      })
    }
  }

  return [
    selectedValue,
    <ToggleGroup
      key={`ToggleGroup_${left}_${right}`}
      leftText={left}
      rightText={right}
      leftClick={handleLeftClick}
      rightClick={handleRightClick}
      selectedValue={selectedValue}
    />,
  ]
}
