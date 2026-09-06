/** Anasayfa bölümlerinde `forwardRef` + `useImperativeHandle` için */
export type SectionLoadingProps = {
  onLoadingChange?: (loading: boolean) => void;
};

export type SectionReloadOptions = {
  /** Pull-to-refresh: backend Firestore sync (TTL bypass) */
  refresh?: boolean;
};

export type SectionReloadHandle = {
  reload: (options?: SectionReloadOptions) => Promise<void>;
};
