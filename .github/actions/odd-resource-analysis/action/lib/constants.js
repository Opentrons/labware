const AGGREGATED_PROCESS_NAMES = {
  APP_RENDERER: 'app-renderer-processes',
  APP_ZYGOTE: 'app-zygote-processes',
  SERVER_UVICORN: 'robot-server-uvicorn-processes',
  APP_UTILITY: 'app-utility-processes',
}

/**
 * @description Several processes we care about execute with a lot of unique sub args determined at
 * runtime. These processes are aggregated using a regex pattern.
 */
const AGGREGATED_PROCESSES = [
  {
    pattern: /^\/opt\/opentrons-app\/opentrons --type=renderer/,
    key: AGGREGATED_PROCESS_NAMES.APP_RENDERER,
  },
  {
    pattern: /^\/opt\/opentrons-app\/opentrons --type=zygote/,
    key: AGGREGATED_PROCESS_NAMES.APP_ZYGOTE,
  },
  {
    pattern: /^python3 -m uvicorn/,
    key: AGGREGATED_PROCESS_NAMES.SERVER_UVICORN,
  },
  {
    pattern: /^\/opt\/opentrons-app\/opentrons --type=utility/,
    key: AGGREGATED_PROCESS_NAMES.APP_UTILITY,
  },
]

/**
 * @description Generally don't include any variation of external processes in analysis.
 */
const BLACKLISTED_PROCESSES = [/^nmcli/, /^\/usr\/bin\/python3/]

/**
 * @description For Pearson's, it's generally recommended to use a sample size of at least n=30.
 */
const MINIMUM_VALID_SAMPLE_SIZE = 30

const P_VALUE_SIGNIFICANCE_THRESHOLD = 0.05

module.exports = {
  AGGREGATED_PROCESSES,
  AGGREGATED_PROCESS_NAMES,
  BLACKLISTED_PROCESSES,
  MINIMUM_VALID_SAMPLE_SIZE,
  P_VALUE_SIGNIFICANCE_THRESHOLD,
}
