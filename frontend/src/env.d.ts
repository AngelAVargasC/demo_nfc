/// <reference types="vite/client" />

interface NDEFReadingEvent extends Event {
  serialNumber?: string
}

interface NDEFReader {
  scan(options?: { signal?: AbortSignal }): Promise<void>
  addEventListener(type: 'reading', listener: (event: NDEFReadingEvent) => void): void
}

declare var NDEFReader: {
  prototype: NDEFReader
  new (): NDEFReader
}
