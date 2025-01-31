/**
 * Calculates the number of lines in a given string.
 * @param input - The string to calculate the number of lines for.
 * @returns The number of lines in the input string.
 */

export const calcTextAreaHeight = (input: string): number => {
  return input.split('\n').length
}

/**
 * Checks if the current URL is localhost.
 * @returns {boolean} - Returns true if the hostname is 'localhost', '127.0.0.1', or starts with '192.168.'.
 */

export const isLocalhost = (): boolean => {
  const host = window.location.hostname
  return (
    host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')
  )
}

export * from './labware'
