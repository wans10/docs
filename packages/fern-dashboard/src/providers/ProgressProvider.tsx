"use client";

import { ProgressProvider as BProgressProvider } from "@bprogress/next/app";

export declare namespace ProgressProvider {
  export interface Props {
    children: React.JSX.Element;
  }
}

export function ProgressProvider({ children }: ProgressProvider.Props) {
  return (
    <BProgressProvider
      height="4px"
      color="var(--green-600)"
      // don't show spinner in the top right
      options={{ showSpinner: false }}
      // only show after loading for > 1s
      delay={1_000}
    >
      {children}
    </BProgressProvider>
  );
}
