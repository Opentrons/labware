import { Flex } from '../../../primitives'
import {
  ALIGN_FLEX_START,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  JUSTIFY_FLEX_START,
  JUSTIFY_SPACE_BETWEEN,
} from '../../../styles'
import { SPACING } from '../../../ui-style-constants'

interface ListItemDescriptorProps {
  type: 'default' | 'large'
  description: JSX.Element
  content: JSX.Element
  changeFlexDirection?: boolean
}

export const ListItemDescriptor = (
  props: ListItemDescriptorProps
): JSX.Element => {
  const { description, content, type, changeFlexDirection = false } = props
  let justifyContent = 'none'
  if (type === 'default' && changeFlexDirection) {
    justifyContent = JUSTIFY_FLEX_START
  } else if (type === 'default') {
    justifyContent = JUSTIFY_SPACE_BETWEEN
  }

  return (
    <Flex
      flexDirection={changeFlexDirection ? DIRECTION_COLUMN : DIRECTION_ROW}
      gridGap={SPACING.spacing8}
      width="100%"
      alignItems={ALIGN_FLEX_START}
      justifyContent={justifyContent}
      padding={type === 'default' ? SPACING.spacing4 : SPACING.spacing12}
    >
      {description}
      {content}
    </Flex>
  )
}
