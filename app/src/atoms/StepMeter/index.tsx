import {
  Box,
  COLORS,
  SPACING,
  POSITION_RELATIVE,
  POSITION_ABSOLUTE,
} from '@opentrons/components'
import * as React from 'react'
import { css } from 'styled-components'

interface StepMeterProps {
  totalSteps: number
  currentStep: number | null
  OnDevice?: boolean
}

export const StepMeter = (props: StepMeterProps): JSX.Element => {
  const { totalSteps, currentStep, OnDevice: isOnDevice = false } = props
  const progress = currentStep != null ? currentStep : 0
  const percentComplete = `${
    //    this logic puts a cap at 100% percentComplete which we should never run into
    currentStep != null && currentStep > totalSteps
      ? 100
      : (progress / totalSteps) * 100
  }%`

  const StepMeterContainer = css`
    position: ${POSITION_RELATIVE};
    height: ${isOnDevice ? '0.75rem' : SPACING.spacing4};
    background-color: ${COLORS.medGreyEnabled};
  `
  const StepMeterBar = css`
    position: ${POSITION_ABSOLUTE};
    top: 0;
    height: 100%;
    background-color: ${COLORS.blueEnabled};
    width: ${percentComplete};
    webkit-transition: width 0.5s ease-in-out;
    moz-transition: width 0.5s ease-in-out;
    o-transition: width 0.5s ease-in-out;
    transition: width 0.5s ease-in-out;
  `

  return (
    <Box data-testid="StepMeter_StepMeterContainer" css={StepMeterContainer}>
      <Box data-testid="StepMeter_StepMeterBar" css={StepMeterBar} />
    </Box>
  )
}
