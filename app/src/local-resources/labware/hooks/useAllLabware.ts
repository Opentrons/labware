import { useSelector } from 'react-redux'
import { getValidCustomLabware } from '/app/redux/custom-labware'
import { getAllDefinitions } from '../utils'
import type { LabwareSort, LabwareFilter, LabwareDefAndDate } from '../types'

// labware to filter out from the labware tab of the desktop app
// TODO (sb:1/14/25) remove evotips from blocklist before public launch
const LABWARE_LOADNAME_BLOCKLIST = [
  'evotips_flex_96_tiprack_adapter',
  'evotips_opentrons_96_labware',
]

export function useAllLabware(
  sortBy: LabwareSort,
  filterBy: LabwareFilter
): LabwareDefAndDate[] {
  const fullLabwareList: LabwareDefAndDate[] = []
  const labwareDefinitions = getAllDefinitions().filter(
    def => !LABWARE_LOADNAME_BLOCKLIST.includes(def.parameters.loadName)
  )
  labwareDefinitions.forEach(def => fullLabwareList.push({ definition: def }))
  const customLabwareList = useSelector(getValidCustomLabware)
  customLabwareList.forEach(customLabware =>
    'definition' in customLabware
      ? fullLabwareList.push({
          modified: customLabware.modified,
          definition: customLabware.definition,
          filename: customLabware.filename,
        })
      : null
  )
  const sortLabware = (a: LabwareDefAndDate, b: LabwareDefAndDate): number => {
    if (
      a.definition.metadata.displayName.toUpperCase() <
      b.definition.metadata.displayName.toUpperCase()
    ) {
      return sortBy === 'alphabetical' ? -1 : 1
    }
    if (
      a.definition.metadata.displayName.toUpperCase() >
      b.definition.metadata.displayName.toUpperCase()
    ) {
      return sortBy === 'alphabetical' ? 1 : -1
    }
    return 0
  }

  if (filterBy === 'customLabware') {
    return (customLabwareList as LabwareDefAndDate[]).sort(sortLabware)
  }
  fullLabwareList.sort(sortLabware)
  if (filterBy !== 'all') {
    return fullLabwareList.filter(
      labwareItem =>
        labwareItem.definition.metadata.displayCategory === filterBy
    )
  }
  return fullLabwareList
}
