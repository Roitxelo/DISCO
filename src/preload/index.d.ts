export {}

import type { AnalyzeResult } from '../shared/media'

declare global {
  interface Window {
    disco: {
      platform: NodeJS.Platform
      version: string
      analyzeUrl: (url: string) => Promise<AnalyzeResult>
    }
  }
}
