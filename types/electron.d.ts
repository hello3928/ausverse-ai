interface Window {
  electronAIA?: {
    onUpdateReady: (cb: (version: string) => void) => void;
    restartToUpdate: () => void;
    dismissUpdate: () => void;
    checkForUpdates: () => void;
    onUpdateNotAvailable: (cb: () => void) => void;
    getVersion: () => Promise<string>;
  };
}
