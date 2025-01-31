const fetch = require('node-fetch')

const MIXPANEL_URL = 'https://data.mixpanel.com/api/2.0/export'

/**
 * @description Base64 encode a username and password in
 * @param uname Mixpanel service account username.
 * @param pwd Mixpanel service account password.
 * @return {string}
 */
function encodeCredentialsForMixpanel(uname, pwd) {
  return Buffer.from(`${uname}:${pwd}`).toString('base64')
}

/**
 * @description Cleans up Mixpanel data for post-processing.
 * @param data Mixpanel data
 */
function parseMixpanelData(data) {
  const lines = data.split('\n').filter(line => line.trim())
  return lines.map(line => JSON.parse(line))
}

/**
 * @description Make the network request to Mixpanel.
 */
async function getMixpanelResourceMonitorDataFor({
  uname,
  pwd,
  projectId,
  fromDate,
  toDate,
  where,
}) {
  const params = new URLSearchParams({
    project_id: projectId,
    from_date: fromDate,
    to_date: toDate,
    event: '["resourceMonitorReport"]',
    where,
  })

  const options = {
    method: 'GET',
    headers: {
      'Accept-Encoding': 'gzip',
      accept: 'text/plain',
      authorization: `Basic ${encodeCredentialsForMixpanel(uname, pwd)}`,
    },
  }

  const response = await fetch(`${MIXPANEL_URL}?${params}`, options)
  const text = await response.text()
  if (!response.ok) {
    throw new Error(
      `Mixpanel request failed: ${response.status}, ${response.statusText}, ${text}`
    )
  }
  return text
}

module.exports = {
  getMixpanelResourceMonitorDataFor,
  parseMixpanelData,
}
