const {
  parseMixpanelData,
  getISODatesForPastMonth,
  getMixpanelResourceMonitorDataFor,
  downloadAppManifest,
  getPrevValidVersions,
  latestValidVersionFromManifest,
} = require('./lib/helpers')
const { analyzeCorrelation } = require('./lib/analysis')
const {
  AGGREGATED_PROCESSES,
  AGGREGATED_PROCESS_NAMES,
  BLACKLISTED_PROCESSES,
  MINIMUM_VALID_SAMPLE_SIZE,
} = require('./lib/constants')

const UPTIME_BUCKETS = [
  { min: 0, max: 20, label: '0-20hrs' },
  { min: 20, max: 40, label: '20-40hrs' },
  { min: 40, max: 60, label: '40-60hrs' },
  { min: 60, max: 80, label: '60-80hrs' },
  { min: 80, max: 120, label: '80-120hrs' },
  { min: 120, max: 240, label: '120-240hrs' },
  { min: 240, max: Infinity, label: '240+hrs' },
]

/**
 * @description Calculate average memory usage for measurements within a specific time range
 * @param measurements Array of measurements with uptime and a memory metric
 * @param minHours Minimum hours (inclusive)
 * @param maxHours Maximum hours (exclusive)
 * @param memoryMetric The field to average ('memRssMb' or 'systemAvailMemMb')
 * @returns {number | null} Average memory usage or null if no measurements in range
 */
function calculateAverageMemoryForRange(
  measurements,
  minHours,
  maxHours,
  memoryMetric = 'memRssMb'
) {
  const inRange = measurements.filter(
    m => m.uptime >= minHours && m.uptime < maxHours
  )

  if (inRange.length === 0 || inRange.length < MINIMUM_VALID_SAMPLE_SIZE) {
    return null
  }

  const sum = inRange.reduce((acc, m) => acc + m[memoryMetric], 0)
  return sum / inRange.length
}

/**
 * @description Calculate memory usage averages across all defined ranges
 * @param measurements Array of measurements with uptime and the memory metric
 * @param memoryMetric The field to average ('memRssMb' or 'systemAvailMemMb')
 * @returns {Object} Contains averages for each range
 */
function calculateRangeAverages(measurements, memoryMetric = 'memRssMb') {
  const averages = {}
  UPTIME_BUCKETS.forEach(range => {
    const avg = calculateAverageMemoryForRange(
      measurements,
      range.min,
      range.max,
      memoryMetric
    )
    averages[range.label] =
      avg !== null ? avg.toFixed(2) : 'N/A - Not enough data available.'
  })
  return averages
}

/**
 * @description Filter the Mixpanel data for the data relevant for memory analysis, aggregating data for certain processes
 * and ignoring data for blacklisted processes.
 * @param data Mixpanel data.
 * @return A tuple of memory data by process and general ODD system memory.
 */
function processMixpanelData(data) {
  const processByName = new Map()
  const systemMemory = []

  data.forEach(entry => {
    const {
      systemUptimeHrs,
      systemAvailMemMb,
      processesDetails,
    } = entry.properties
    const uptime = parseFloat(systemUptimeHrs)

    // Validate uptime before adding any measurements
    if (isNaN(uptime)) {
      return
    }

    // Ensure system mem is a valid number before adding it.
    const availMemMb = parseFloat(systemAvailMemMb)
    if (!isNaN(availMemMb)) {
      systemMemory.push({
        uptime,
        systemAvailMemMb: availMemMb,
      })
    }

    processesDetails.forEach(process => {
      const isBlacklisted = BLACKLISTED_PROCESSES.some(pattern =>
        pattern.test(process.name)
      )

      if (!isBlacklisted) {
        let processKey = process.name
        // Certain processes are aggregated.
        for (const { pattern, key } of AGGREGATED_PROCESSES) {
          if (pattern.test(process.name)) {
            processKey = key
            break
          }
        }

        const memRssMb = parseFloat(process.memRssMb)
        if (!isNaN(memRssMb)) {
          if (!processByName.has(processKey)) {
            processByName.set(processKey, [])
          }
          processByName.get(processKey).push({
            memRssMb,
            uptime,
          })
        }
      }
    })
  })

  return [processByName, systemMemory]
}

/**
 * @description Group data by process name and calculate correlation and range averages
 * @param data See `analyzeMemoryTrends`
 */
function analyzeProcessMemoryTrends(data) {
  const [processByName, systemMemory] = processMixpanelData(data)

  // Filter out any process that has less than the minimum sample size
  for (const [processName, measurements] of processByName.entries()) {
    if (measurements.length < MINIMUM_VALID_SAMPLE_SIZE) {
      processByName.delete(processName)
    }
  }

  // Calculate correlation coefficient and range averages for each process
  const results = new Map()
  processByName.forEach((measurements, processName) => {
    const analysis = analyzeCorrelation(
      measurements.map(m => m.uptime),
      measurements.map(m => m.memRssMb)
    )

    results.set(processName, {
      correlation: analysis.correlation,
      sampleSize: analysis.sampleSize,
      interpretation: analysis.interpretation,
      averageMemoryMbByUptime: calculateRangeAverages(measurements, 'memRssMb'),
    })
  })

  // Calculate system memory metrics
  const systemAnalysis = analyzeCorrelation(
    systemMemory.map(m => m.uptime),
    systemMemory.map(m => m.systemAvailMemMb)
  )

  results.set('odd-available-memory', {
    correlation: systemAnalysis.correlation,
    sampleSize: systemAnalysis.sampleSize,
    interpretation: systemAnalysis.interpretation,
    averageMemoryMbByUptime: calculateRangeAverages(
      systemMemory,
      'systemAvailMemMb'
    ),
  })

  // Filter out any process with a negative correlation except for a few key ones.
  for (const [processName, memResults] of results.entries()) {
    if (
      memResults.correlation < 0 &&
      processName !== 'odd-available-memory' &&
      ![
        AGGREGATED_PROCESS_NAMES.APP_RENDERER,
        AGGREGATED_PROCESS_NAMES.SERVER_UVICORN,
      ].includes(processName)
    ) {
      results.delete(processName)
    }
  }

  return results
}

/**
 * @description Post-process mixpanel data, returning statistical summaries per process
 * @param mixpanelData Each entry is expected to contain a top-level 'properties' field with relevant subfields.
 */
function analyzeMemoryTrends(mixpanelData) {
  const parsedData = parseMixpanelData(mixpanelData)
  const results = analyzeProcessMemoryTrends(parsedData)

  const analysis = {}
  results.forEach((result, processName) => {
    analysis[processName] = {
      correlation: result.correlation.toFixed(4),
      sampleSize: result.sampleSize,
      interpretation: result.interpretation,
      averageMemoryMbByUptime: result.averageMemoryMbByUptime,
    }
  })

  return analysis
}

/**
 * @description The 'where' used as a segmentation expression for Mixpanel data filtering.
 */
function buildWhere(version) {
  return `properties["appVersion"]=="${version}" and properties["appMode"]=="ODD"`
}

/**
 * @description Analyze memory trends across multiple versions
 * @param {number} previousVersionCount Number of previous versions to analyze
 * @param {string} uname Mixpanel service account username.
 * @param {string} pwd Mixpanel service account password.
 * @param {string} projectId Mixpanel project id.
 */
async function analyzeMemoryTrendsAcrossVersions({
  previousVersionCount,
  uname,
  pwd,
  projectId,
}) {
  const manifest = await downloadAppManifest()
  const latestValidVersion = latestValidVersionFromManifest(manifest)
  const prevValidVersions = getPrevValidVersions(
    manifest,
    latestValidVersion,
    previousVersionCount
  )
  const analysisPeriod = getISODatesForPastMonth()

  // Populate backup messaging if there's no data available for a specific version
  const noDataAvailableStr = 'N/A - No data available'
  const results = {
    [latestValidVersion]: noDataAvailableStr,
  }
  prevValidVersions.forEach(version => {
    results[version] = noDataAvailableStr
  })

  // Analyze latest version
  const currentVersionData = await getMixpanelResourceMonitorDataFor({
    version: latestValidVersion,
    uname,
    pwd,
    projectId,
    fromDate: analysisPeriod.from,
    toDate: analysisPeriod.to,
    where: buildWhere(latestValidVersion),
  })

  if (currentVersionData) {
    results[latestValidVersion] = analyzeMemoryTrends(currentVersionData)
  }

  // Analyze previous versions
  for (const version of prevValidVersions) {
    const versionData = await getMixpanelResourceMonitorDataFor({
      version,
      uname,
      pwd,
      projectId,
      fromDate: analysisPeriod.from,
      toDate: analysisPeriod.to,
      where: buildWhere(version),
    })

    if (versionData) {
      results[version] = analyzeMemoryTrends(versionData)
    }
  }

  return results
}

module.exports = { analyzeMemoryTrendsAcrossVersions }
