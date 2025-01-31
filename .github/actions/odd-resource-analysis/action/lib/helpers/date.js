/**
 * @description Get ISO date strings for the past month from yesterday.
 */
function getISODatesForPastMonth() {
  const now = new Date()
  // Don't use today's data, because the Mixpanel API seemingly doesn't use UTC timestamps, and
  // it's easy to fail a request depending on the time of day it's made.
  const yesterday = new Date(now.setDate(now.getDate() - 1))
  const formatDate = date => date.toISOString().split('T')[0]

  const monthAgo = new Date(yesterday)
  monthAgo.setMonth(yesterday.getMonth() - 1)

  return {
    from: formatDate(monthAgo),
    to: formatDate(yesterday),
  }
}

module.exports = {
  getISODatesForPastMonth,
}
