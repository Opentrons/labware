import { lazy, Suspense } from 'react'

import { useFeatureFlag } from '/app/redux/config'

// Lazily load to enable devtools when env.process.DEV is false (ex, when dev code is pushed to a physical ODD)
const ReactQueryTools = lazy(() =>
  import('react-query/devtools/development').then(d => ({
    default: d.ReactQueryDevtools,
  }))
)

export function ReactQueryDevtools(): JSX.Element {
  const enableRQTools = useFeatureFlag('reactQueryDevtools')

  return (
    <Suspense fallback={null}>
      {enableRQTools && (
        <ReactQueryTools initialIsOpen={false} position="bottom-right" />
      )}
    </Suspense>
  )
}
