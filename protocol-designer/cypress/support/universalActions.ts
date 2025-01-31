export enum UniversalActions {
  Snapshot = 'Take a visual testing snapshot',
  // Other examples of things that could be universal actions:
  // Clear the cache
}

export const executeUniversalAction = (action: UniversalActions): void => {
  switch (action) {
    case UniversalActions.Snapshot:
      // Placeholder for future implementation of visual testing snapshot
      // Currently, this does nothing
      break
    default:
      throw new Error(`Unrecognized universal action: ${action as string}`)
  }
}
