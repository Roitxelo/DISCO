export {}

declare global {
  interface Window {
    disco: {
      platform: NodeJS.Platform
      version: string
    }
  }
}
