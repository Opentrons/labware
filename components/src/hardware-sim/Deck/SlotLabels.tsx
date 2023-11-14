import * as React from 'react'

import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import { LocationIcon } from '../../molecules'
import { Flex } from '../../primitives'
import { ALIGN_CENTER, DIRECTION_COLUMN, JUSTIFY_CENTER } from '../../styles'
import { RobotCoordsForeignObject } from './RobotCoordsForeignObject'

import type { RobotType } from '@opentrons/shared-data'
interface SlotLabelsProps {
  robotType: RobotType
  color?: string
  show4thColumn?: boolean
}

/**
 * Component to render Opentrons Flex slot labels
 * For use as a RobotWorkspace child component
 */
export const SlotLabels = ({
  robotType,
  color,
  show4thColumn = false,
}: SlotLabelsProps): JSX.Element | null => {
  const widthPerColumnLabelRem = 10.125

  return robotType === FLEX_ROBOT_TYPE ? (
    <>
      <RobotCoordsForeignObject
        width="2.5rem"
        height="26.75rem"
        x="-147"
        y="-10"
      >
        <Flex
          alignItems={ALIGN_CENTER}
          flexDirection={DIRECTION_COLUMN}
          flex="1"
          height="100%"
          width="2.5rem"
        >
          <Flex alignItems={ALIGN_CENTER} flex="1">
            <LocationIcon
              color={color}
              slotName="A"
              height="max-content"
              width="100%"
            />
          </Flex>
          <Flex alignItems={ALIGN_CENTER} flex="1">
            <LocationIcon
              color={color}
              slotName="B"
              height="max-content"
              width="100%"
            />
          </Flex>
          <Flex alignItems={ALIGN_CENTER} flex="1">
            <LocationIcon
              color={color}
              slotName="C"
              height="max-content"
              width="100%"
            />
          </Flex>
          <Flex alignItems={ALIGN_CENTER} flex="1">
            <LocationIcon
              color={color}
              slotName="D"
              height="max-content"
              width="100%"
            />
          </Flex>
        </Flex>
      </RobotCoordsForeignObject>
      <RobotCoordsForeignObject
        height="2.5rem"
        width={`${
          show4thColumn
            ? widthPerColumnLabelRem * 4
            : widthPerColumnLabelRem * 3
        }rem`}
        x="-15"
        y="-55"
      >
        <Flex
          alignItems={ALIGN_CENTER}
          flex="1"
          width={`${
            show4thColumn
              ? widthPerColumnLabelRem * 4
              : widthPerColumnLabelRem * 3
          }rem`}
          height="2.5rem"
        >
          <Flex
            alignItems={ALIGN_CENTER}
            justifyContent={JUSTIFY_CENTER}
            flex="1"
          >
            <LocationIcon color={color} slotName="1" height="100%" />
          </Flex>
          <Flex
            alignItems={ALIGN_CENTER}
            justifyContent={JUSTIFY_CENTER}
            flex="1"
          >
            <LocationIcon color={color} slotName="2" height="100%" />
          </Flex>
          <Flex
            alignItems={ALIGN_CENTER}
            justifyContent={JUSTIFY_CENTER}
            flex="1"
          >
            <LocationIcon color={color} slotName="3" height="100%" />
          </Flex>
          {show4thColumn ? (
            <Flex
              alignItems={ALIGN_CENTER}
              justifyContent={JUSTIFY_CENTER}
              flex="1"
            >
              <LocationIcon color={color} slotName="4" height="100%" />
            </Flex>
          ) : null}
        </Flex>
      </RobotCoordsForeignObject>
    </>
  ) : null
}
