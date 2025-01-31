import {
  COLORS,
  DISPLAY_FLEX,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
} from '@opentrons/components'

export function ResizeBar({
  handleMouseDown,
}: {
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
}): JSX.Element {
  return (
    <div
      style={{
        width: '3px',
        cursor: 'col-resize',
        backgroundColor: COLORS.grey30,
        height: '100%',
        position: POSITION_RELATIVE,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        style={{
          width: '16px',
          height: '24px',
          backgroundColor: COLORS.grey30,
          borderRadius: '16px',
          position: POSITION_ABSOLUTE,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: DISPLAY_FLEX,
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
        }}
      >
        <div
          style={{
            width: '2px',
            height: '10px',
            borderRadius: '12px',
            backgroundColor: COLORS.white,
          }}
        />
        <div
          style={{
            width: '2px',
            height: '10px',
            borderRadius: '12px',
            backgroundColor: COLORS.white,
          }}
        />
      </div>
    </div>
  )
}
