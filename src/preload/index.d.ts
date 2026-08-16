import type { InkRiverApi } from './index'

declare global {
  interface Window {
    inkriver: InkRiverApi
  }
}

export {}
