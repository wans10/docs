export interface EdgeFlags {
  isApiPlaygroundEnabled: boolean;
  isApiScrollingDisabled: boolean;
  isWhitelabeled: boolean;
  isSeoDisabled: boolean;
  isTocDefaultEnabled: boolean;
  isSnippetTemplatesEnabled: boolean;
  isHttpSnippetsEnabled: boolean;
  isInlineFeedbackEnabled: boolean;
  isDarkCodeEnabled: boolean;
  isProxyDisabled: boolean;
  isImageZoomDisabled: boolean;
  useJavaScriptAsTypeScript: boolean;
  alwaysEnableJavaScriptFetch: boolean;
  scrollInContainerEnabled: boolean;
  isBatchStreamToggleDisabled: boolean;
  isAuthEnabledInDocs: boolean;
  isAskAiEnabled: boolean;
  isAudioFileDownloadSpanSummary: boolean;
  isDocsLogoTextEnabled: boolean;
  isAudioExampleInternal: boolean;
  usesApplicationJsonInFormDataValue: boolean;
  isBinaryOctetStreamAudioPlayer: boolean;
  hasVoiceIdPlaygroundForm: boolean;
  isCohereTheme: boolean;
  isFileForgeHackEnabled: boolean;
  is404PageHidden: boolean;
  isNewSearchExperienceEnabled: boolean;
  isAuthenticatedPagesDiscoverable: boolean;
  isSearchV2Enabled: boolean;
  isAuthedPreview: boolean;
  isSearchDisabled: boolean;
  isDefaultSearchFilterOff: boolean;
  isChangelogRedirects: boolean;
  isPosthogDisabled: boolean;
}

export const DEFAULT_EDGE_FLAGS: EdgeFlags = {
  isApiPlaygroundEnabled: false,
  isApiScrollingDisabled: false,
  isWhitelabeled: false,
  isSeoDisabled: false,
  isTocDefaultEnabled: false,
  isSnippetTemplatesEnabled: false,
  isHttpSnippetsEnabled: false,
  isInlineFeedbackEnabled: false,
  isDarkCodeEnabled: false,
  isProxyDisabled: false,
  isImageZoomDisabled: false,
  useJavaScriptAsTypeScript: false,
  alwaysEnableJavaScriptFetch: false,
  scrollInContainerEnabled: false,
  isBatchStreamToggleDisabled: false,
  isAuthEnabledInDocs: false,
  isAskAiEnabled: false,
  isAudioFileDownloadSpanSummary: false,
  isDocsLogoTextEnabled: false,
  isAudioExampleInternal: false,
  usesApplicationJsonInFormDataValue: false,
  isBinaryOctetStreamAudioPlayer: false,
  hasVoiceIdPlaygroundForm: false,
  isCohereTheme: false,
  isFileForgeHackEnabled: false,
  is404PageHidden: false,
  isNewSearchExperienceEnabled: false,
  isAuthenticatedPagesDiscoverable: false,
  isSearchV2Enabled: false,
  isAuthedPreview: false,
  isSearchDisabled: false,
  isDefaultSearchFilterOff: false,
  isChangelogRedirects: false,
  isPosthogDisabled: false,
};

export const DEFAULT_SELF_HOSTED_EDGE_FLAGS: EdgeFlags = {
  ...DEFAULT_EDGE_FLAGS,
  isWhitelabeled: true,
};
