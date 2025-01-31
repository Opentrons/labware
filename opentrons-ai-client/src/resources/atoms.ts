// jotai's atoms
import { atom } from 'jotai'
import type {
  Chat,
  ChatData,
  CreatePrompt,
  CreateProtocolAtomProps,
  HeaderWithMeterAtomProps,
  Mixpanel,
  UpdatePrompt,
} from './types'

/** ChatDataAtom is for chat data (user prompt and response from OpenAI API) */
export const chatDataAtom = atom<ChatData[]>([])

/** CreateProtocolChatAtom is for the prefilled userprompt when navigating to the chat page from Create New protocol page */
export const createProtocolChatAtom = atom<CreatePrompt>({
  prompt: '',
  regenerate: false,
  scientific_application_type: '',
  description: '',
  robots: 'opentrons_flex',
  mounts: [],
  flexGripper: false,
  modules: [],
  labware: [],
  liquids: [],
  steps: [],
  fake: false,
  fake_id: 0,
})

/** CreateProtocolChatAtom is for the prefilled userprompt when navigating to the chat page from Update Protocol page */
export const updateProtocolChatAtom = atom<UpdatePrompt>({
  prompt: '',
  protocol_text: '',
  regenerate: false,
  update_type: 'adapt_python_protocol',
  update_details: '',
  fake: false,
  fake_id: 0,
})

/** Regenerate protocol atom */
export const regenerateProtocolAtom = atom<{
  isCreateOrUpdateProtocol: boolean
  regenerate: boolean
}>({
  isCreateOrUpdateProtocol: false,
  regenerate: false,
})

/** Scroll to bottom of chat atom */
export const scrollToBottomAtom = atom<boolean>(false)

export const chatHistoryAtom = atom<Chat[]>([])

export const feedbackModalAtom = atom<boolean>(false)

export const tokenAtom = atom<string | null>(null)

export const mixpanelAtom = atom<Mixpanel | null>({
  analytics: { hasOptedIn: true }, // TODO: set to false when we have the opt-in modal
  isInitialized: false,
})

export const headerWithMeterAtom = atom<HeaderWithMeterAtomProps>({
  displayHeaderWithMeter: false,
  progress: 0,
})

export const createProtocolAtom = atom<CreateProtocolAtomProps>({
  currentSection: 0,
  focusSection: 0,
})

export const displayExitConfirmModalAtom = atom<boolean>(false)
