import { useState, useEffect, useMemo, createContext } from 'react'
import { useNotifyCurrentMaintenanceRun } from '/app/resources/maintenance_runs'

import type { ReactNode } from 'react'

interface MaintenanceRunIds {
  currentRunId: string | null
  oddRunId: string | null
}

export interface MaintenanceRunStatus {
  getRunIds: () => MaintenanceRunIds
  setOddRunIds: (state: MaintenanceRunIds) => void
}

export const MaintenanceRunContext = createContext<MaintenanceRunStatus>({
  getRunIds: () => ({ currentRunId: null, oddRunId: null }),
  setOddRunIds: () => {},
})

interface MaintenanceRunProviderProps {
  children?: ReactNode
}

export function MaintenanceRunStatusProvider(
  props: MaintenanceRunProviderProps
): JSX.Element {
  const [oddRunIds, setOddRunIds] = useState<MaintenanceRunIds>({
    currentRunId: null,
    oddRunId: null,
  })

  const currentRunIdQueryResult = useNotifyCurrentMaintenanceRun({
    refetchInterval: 5000,
  }).data?.data.id

  useEffect(() => {
    setOddRunIds(prevState => ({
      ...prevState,
      currentRunId: currentRunIdQueryResult ?? null,
    }))
  }, [currentRunIdQueryResult])

  const maintenanceRunStatus = useMemo(
    () => ({
      getRunIds: () => oddRunIds,
      setOddRunIds,
    }),
    [oddRunIds]
  )

  return (
    <MaintenanceRunContext.Provider value={maintenanceRunStatus}>
      {props.children}
    </MaintenanceRunContext.Provider>
  )
}
