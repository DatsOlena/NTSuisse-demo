import '@testing-library/jest-dom'

import { TextEncoder, TextDecoder } from 'util'

if (!global.TextEncoder) {
  // @ts-ignore - jsdom environment missing TextEncoder
  global.TextEncoder = TextEncoder
}

if (!global.TextDecoder) {
  // @ts-ignore - jsdom environment missing TextDecoder
  global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder
}

