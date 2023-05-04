// mock logger for tests
import type { Logger } from '../logger'
import path from 'path'

export function createLogger(filename: string): Logger {
  const label = path.relative(path.join(__dirname, '../../..'), filename)

  // @ts-expect-error
  return new Proxy(
    {},
    {
      get(_, level: string) {
        return (message: string, meta: unknown) =>
          console.log(`[${label}] ${level}: ${message} %j`, meta)
      },
    }
  )
}

export const useLogger = (filename: string): Logger => {
  return createLogger(filename)
}
