/**
 * A step is associated with a view or multiple views that are a part of the
 * core flow. They are driven by CTA and are not side effects of robot state.
 *
 * Advancing a step advances the step counter, going back a step lowers
 * the step counter. If advancing/going back to a different view does not alter the step counter,
 * then the view should either be associated with an existing step or should be independent of any step (ex, "robot in motion").
 *
 */
export const LPC_STEP = {
  BEFORE_BEGINNING: 'BEFORE_BEGINNING',
  ATTACH_PROBE: 'ATTACH_PROBE',
  HANDLE_LABWARE: 'HANDLE_LABWARE',
  DETACH_PROBE: 'DETACH_PROBE',
  LPC_COMPLETE: 'LPC_COMPLETE',
} as const

// All LPC steps, in order.
export const LPC_STEPS = [
  LPC_STEP.BEFORE_BEGINNING,
  LPC_STEP.ATTACH_PROBE,
  LPC_STEP.HANDLE_LABWARE,
  LPC_STEP.DETACH_PROBE,
  LPC_STEP.LPC_COMPLETE,
]
