// @flow
import * as React from 'react'
import cx from 'classnames'
import { DragSource, DropTarget, DragLayer } from 'react-dnd'
import {
  LabwareContainer,
  ContainerNameOverlay,
  EmptyDeckSlot,
  humanizeLabwareType,
  // SLOT_OFFSET_MM,
  type DeckSlot,
} from '@opentrons/components'
import {
  SLOT_RENDER_WIDTH,
  SLOT_RENDER_HEIGHT,
} from '@opentrons/shared-data'
import styles from './labware.css'

import ClickableText from './ClickableText'
import HighlightableLabware from '../../containers/HighlightableLabware'
import NameThisLabwareOverlay from './NameThisLabwareOverlay'
import DisabledSelectSlotOverlay from './DisabledSelectSlotOverlay'
import BrowseLabwareOverlay from './BrowseLabwareOverlay'
import {type TerminalItemId, START_TERMINAL_ITEM_ID, END_TERMINAL_ITEM_ID} from '../../steplist'

// TODO: consolidate with DraggableStepItems DND_TYPES
const DND_TYPES: {LABWARE: "LABWARE"} = {
  LABWARE: 'LABWARE',
}

type DragPreviewProps = {
  getXY: (rawX: number, rawY: number) => {scaledX?: number, scaledY?: number},
  isDragging: boolean,
  currentOffset: ?number,
  item: {slot: DeckSlot, labwareOrSlot: React.Node},
  itemType: string,
  containerType: string,
  children: React.Node,
}
const DragPreview = (props: DragPreviewProps) => {
  const {item, itemType, isDragging, currentOffset, getXY} = props
  const {scaledX, scaledY} = getXY(currentOffset && currentOffset.x, currentOffset && currentOffset.y)
  const {containerId} = item || {}
  if (itemType !== DND_TYPES.LABWARE || !isDragging || !currentOffset) return null
  return (
    <g>
      <LabwareContainer x={scaledX} y={scaledY}>
        <HighlightableLabware containerId={containerId} />
      </LabwareContainer>
    </g>
  )
}

export const DragPreviewLayer = DragLayer(monitor => ({
  currentOffset: monitor.getSourceClientOffset(),
  isDragging: monitor.isDragging(),
  itemType: monitor.getItemType(),
  item: monitor.getItem(),
}))(DragPreview)

type DragDropLabwareProps = React.ElementProps<typeof LabwareContainer> & {
  connectDragSource: mixed => React.Element<any>,
  connectDropTarget: mixed => React.Element<any>,
  slot: DeckSlot,
  moveLabware: (DeckSlot, DeckSlot) => void,
}
class DragSourceLabware extends React.Component<DragDropLabwareProps> {
  renderOverlay = () => {
    if (this.props.draggedItem) {
      if (this.props.draggedItem.slot === this.props.slot) {
        return <DisabledSelectSlotOverlay /> // this labware is being dragged, disable it
      } else if (this.props.isOver) {
        return <EmptyDestinationSlotOverlay />
      }
    } else {
      return this.props.overlay
    }
  }
  render () {
    return (
      this.props.connectDragSource(
        this.props.connectDropTarget(
          <g>
            <LabwareContainer slot={this.props.slot} highlighted={this.props.highlighted}>
              {this.props.labwareOrSlot}
              {this.renderOverlay()}
            </LabwareContainer>
          </g>
        )
      )
    )
  }
}

const labwareSource = {
  beginDrag: (props) => ({
    slot: props.slot,
    containerId: props.containerId,
  }),
  canDrag: (props) => !!props.containerId,
}
const collectLabwareSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
  draggedItem: monitor.getItem(),
})
const DraggableLabware = DragSource(DND_TYPES.LABWARE, labwareSource, collectLabwareSource)(DragSourceLabware)

const labwareTarget = {
  canDrop: (props, monitor) => {
    const draggedItem = monitor.getItem()
    return draggedItem && (draggedItem.slot !== props.slot)
  },
  drop: (props, monitor) => {
    const draggedItem = monitor.getItem()
    if (draggedItem) {
      props.moveLabware(draggedItem.slot, props.slot)
    }
  },
}
const collectLabwareTarget = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
})
const DragDropLabware = DropTarget(DND_TYPES.LABWARE, labwareTarget, collectLabwareTarget)(DraggableLabware)

function LabwareDeckSlotOverlay ({
  canAddIngreds,
  deleteLabware,
  editLiquids,
  moveLabwareSource,
  duplicateLabware,
}: {
  canAddIngreds: boolean,
  deleteLabware: () => mixed,
  editLiquids: () => mixed,
  moveLabwareSource: () => mixed,
  duplicateLabware: () => mixed,
}) {
  return (
    <g className={cx(styles.slot_overlay, styles.appear_on_mouseover)}>
      <rect className={styles.overlay_panel} />
      {canAddIngreds &&
        <ClickableText
          onClick={editLiquids}
          iconName='pencil' y='15%' text='Name & Liquids' />
      }
      <ClickableText
        onClick={duplicateLabware}
        iconName='content-copy' y='40%' text='Duplicate' />
      <ClickableText
        onClick={deleteLabware}
        iconName='close' y='65%' text='Delete' />
    </g>
  )
}

// Including a labware type in `labwareImages` will use that image instead of an SVG
const IMG_TRASH = require('../../images/labware/Trash.png')
const labwareImages = {
  'trash-box': IMG_TRASH,
}

type SlotWithLabwareProps = {
  containerType: string,
  displayName: string,
  containerId: string,
}

function SlotWithLabware (props: SlotWithLabwareProps) {
  const {containerType, displayName, containerId} = props

  return (
    <g>
      {labwareImages[containerType]
        ? <image
          href={labwareImages[containerType]}
          width={SLOT_RENDER_WIDTH} height={SLOT_RENDER_HEIGHT}
        />
        : <HighlightableLabware containerId={containerId} />
      }
      <ContainerNameOverlay title={displayName || humanizeLabwareType(containerType)} />
    </g>
  )
}

const EmptyDestinationSlotOverlay = () => (
  <g className={cx(styles.slot_overlay)}>
    <rect className={styles.overlay_panel} />
    <g className={styles.clickable_text}>
      <text x='0' y='40%'>Place Here</text>
    </g>
  </g>
)

type EmptyDeckSlotOverlayProps = {
  addLabware: (e: SyntheticEvent<*>) => mixed,
}
function EmptyDeckSlotOverlay (props: EmptyDeckSlotOverlayProps) {
  const {addLabware} = props
  return (
    <g className={cx(styles.slot_overlay, styles.appear_on_mouseover, styles.add_labware)}>
      <rect className={styles.overlay_panel} />
      <ClickableText onClick={addLabware}
        iconName='plus' y='40%' text='Add Labware' />
    </g>
  )
}

type LabwareOnDeckProps = {
  slot: DeckSlot,
  containerId: string,
  containerName: ?string,
  containerType: string,

  showNameOverlay: ?boolean,
  slotHasLabware: boolean,
  highlighted: boolean,

  addLabwareMode: boolean,
  canAddIngreds: boolean,
  isTiprack: boolean,
  selectedTerminalItem: ?TerminalItemId,
  moveLabwareMode: boolean,

  addLabware: () => mixed,
  editLiquids: () => mixed,
  drillDown: () => mixed,
  drillUp: () => mixed,
  deleteLabware: () => mixed,
  duplicateLabware: (string) => mixed,

  cancelMove: () => mixed,
  moveLabwareDestination: () => mixed,
  moveLabwareSource: () => mixed,
  slotToMoveFrom: ?DeckSlot,

  setLabwareName: (name: ?string) => mixed,
  setDefaultLabwareName: () => mixed,
}

class LabwareOnDeck extends React.Component<LabwareOnDeckProps> {
  // TODO: BC 2018-10-11 re-implement this re-render check at a lower level once this component
  // and its connected props are broken out into lower level components.

  // shouldComponentUpdate (nextProps: LabwareOnDeckProps) {
  //   const shouldAlwaysUpdate = this.props.addLabwareMode ||
  //     nextProps.addLabwareMode ||
  //     this.props.moveLabwareMode ||
  //     nextProps.moveLabwareMode

  //   const labwarePresenceChange = this.props.containerId !== nextProps.containerId
  //   const nameOverlayChange = this.props.showNameOverlay !== nextProps.showNameOverlay

  //   if (shouldAlwaysUpdate || labwarePresenceChange || nameOverlayChange) return true
  //   return this.props.highlighted !== nextProps.highlighted
  // }
  render () {
    const {
      slot,
      containerId,
      containerName,
      containerType,

      showNameOverlay,
      slotHasLabware,
      highlighted,

      addLabwareMode,
      canAddIngreds,
      isTiprack,
      selectedTerminalItem,
      drillDown,
      drillUp,

      addLabware,
      duplicateLabware,
      editLiquids,
      deleteLabware,

      swapSlotContents,

      setDefaultLabwareName,
      setLabwareName,
    } = this.props

    // determine what overlay to show
    let overlay = null
    if (selectedTerminalItem === START_TERMINAL_ITEM_ID && !addLabwareMode) {
      if (showNameOverlay) {
        overlay = (
          <NameThisLabwareOverlay
            {...{setLabwareName, editLiquids}}
            onClickOutside={setDefaultLabwareName} />
        )
      } else {
        overlay = (slotHasLabware)
          ? (
            <LabwareDeckSlotOverlay
              duplicateLabware={() => duplicateLabware(containerId)}
              {...{canAddIngreds, deleteLabware, editLiquids}} />
          ) : <EmptyDeckSlotOverlay {...{addLabware}} />
      }
    } else if (selectedTerminalItem === END_TERMINAL_ITEM_ID && slotHasLabware && !isTiprack) {
      overlay = <BrowseLabwareOverlay drillDown={drillDown} drillUp={drillUp} />
    }

    const labwareOrSlot = (slotHasLabware)
      ? <SlotWithLabware
        key={`${containerType}`}
        {...{containerType, containerId}}
        displayName={containerName || containerType}
      />
      : <EmptyDeckSlot slot={slot} />

    return (
      <DragDropLabware
        moveLabware={swapSlotContents}
        {...{slot, highlighted, labwareOrSlot, overlay, containerId}} />
    )
  }
}

export default LabwareOnDeck
