// ── Web NFC Global Type Definitions ─────────────────────────────────────────
// Supported natively in Chrome for Android 89+; fallback simulations on iOS/desktop.

declare global {
  interface NDEFRecordInstance {
    recordType: string;
    mediaType?: string;
    id?: string;
    encoding?: string;
    lang?: string;
    data: DataView;
  }

  interface NDEFMessageInstance {
    records: NDEFRecordInstance[];
  }

  interface NDEFReadingEvent extends Event {
    serialNumber?: string;
    message: NDEFMessageInstance;
  }

  interface NDEFReaderInstance extends EventTarget {
    scan(options?: { signal?: AbortSignal }): Promise<void>;
    write(
      message: string | { records: Array<{ recordType: string; data: string }> },
      options?: { signal?: AbortSignal },
    ): Promise<void>;
    onreading?: ((event: NDEFReadingEvent) => void) | null;
    onreadingerror?: ((event: Event) => void) | null;
    addEventListener(
      type: "reading",
      listener: (event: NDEFReadingEvent) => void,
      options?: AddEventListenerOptions & { signal?: AbortSignal },
    ): void;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ): void;
  }

  interface Window {
    NDEFReader: new () => NDEFReaderInstance;
  }
}

export {};
