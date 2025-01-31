const core = require('@actions/core')
const { analyzeMemoryTrendsAcrossVersions } = require('./analyzeMemoryTrends')

async function run() {
  try {
    const mixpanelUser = core.getInput('mixpanel-user', { required: true })
    const mixpanelSecret = core.getInput('mixpanel-secret', { required: true })
    const mixpanelProjectId = parseInt(
      core.getInput('mixpanel-project-id', {
        required: true,
      })
    )
    const previousVersionCount = parseInt(
      core.getInput('previous-version-count') || '2'
    )

    core.info('Beginning analysis...')
    const memoryAnalysis = await analyzeMemoryTrendsAcrossVersions({
      previousVersionCount,
      uname: mixpanelUser,
      pwd: mixpanelSecret,
      projectId: mixpanelProjectId,
    })

    console.log(
      'ODD Available Memory and Processes with Increasing Memory Trend or Selectively Observed by Version (Rolling 1 Month Analysis Window):'
    )
    console.log(JSON.stringify(memoryAnalysis, null, 2))

    const outputText =
      'ODD Available Memory and Processes with Increasing Memory Trend or Selectively Observed by Version (Rolling 1 Month Analysis Window):\n' +
      Object.entries(memoryAnalysis)
        .map(
          ([version, analysis]) =>
            `\n${version}: ${JSON.stringify(analysis, null, 2)}`
        )
        .join('\n')

    core.setOutput('analysis-results', JSON.stringify(memoryAnalysis))

    await core.summary
      .addHeading('ODD Memory Usage Results')
      .addCodeBlock(outputText, 'json')
      .write()
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
