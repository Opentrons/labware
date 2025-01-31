// ToDo (kk:05/29/2024) this should be switched by env var
export const STAGING_END_POINT =
  'https://staging.opentrons.ai/api/chat/completion'
export const STAGING_FEEDBACK_END_POINT =
  'https://staging.opentrons.ai/api/chat/feedback'
export const STAGING_CREATE_PROTOCOL_END_POINT =
  'https://staging.opentrons.ai/api/chat/createProtocol'
export const STAGING_UPDATE_PROTOCOL_END_POINT =
  'https://staging.opentrons.ai/api/chat/updateProtocol'

export const PROD_END_POINT = 'https://ai.opentrons.com/api/chat/completion'
export const PROD_FEEDBACK_END_POINT =
  'https://ai.opentrons.com/api/chat/feedback'
export const PROD_CREATE_PROTOCOL_END_POINT =
  'https://ai.opentrons.com/api/chat/createProtocol'
export const PROD_UPDATE_PROTOCOL_END_POINT =
  'https://ai.opentrons.com/api/chat/updateProtocol'

// auth0 domain
export const AUTH0_DOMAIN = 'identity.auth.opentrons.com'

// auth0 for staging
export const STAGING_AUTH0_CLIENT_ID = 'AV3GDND34Q9CHx9yjZSI85k8ZuvzWH4a'
export const STAGING_AUTH0_AUDIENCE = 'https://staging.opentrons.ai/api'

// auth0 for production
export const PROD_AUTH0_CLIENT_ID = 'b5oTRmfMY94tjYL8GyUaVYHhMTC28X8o'
export const PROD_AUTH0_AUDIENCE = 'https://opentrons.ai/api'

// auth0 for local
export const LOCAL_AUTH0_CLIENT_ID = 'PcuD1wEutfijyglNeRBi41oxsKJ1HtKw'
export const LOCAL_AUTH0_AUDIENCE = 'sandbox-ai-api'
export const LOCAL_AUTH0_DOMAIN = 'identity.auth-dev.opentrons.com'
export const LOCAL_END_POINT = 'http://localhost:8000/api/chat/completion'
export const LOCAL_CREATE_PROTOCOL_END_POINT =
  'http://localhost:8000/api/chat/createProtocol'
export const LOCAL_UPDATE_PROTOCOL_END_POINT =
  'http://localhost:8000/api/chat/updateProtocol'
export const LOCAL_FEEDBACK_END_POINT =
  'http://localhost:8000/api/chat/feedback'

export const CLIENT_MAX_WIDTH = '1440px'
