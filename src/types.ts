export type UserConfig = {
  source?: string;
  outDir?: string;
  publicPath?: string;
  partial?: string;
  data?: string;
  layout?: string;
  appName?: string;
  shortName?: string;
  themeColor?: string;
  backgroundColor?: string;
  iconBackgroundColor?: string;
  iconBackgroundRadius?: number;
  iconScale?: number;
  skipMetadataInjection?: boolean;
};

export type GenerateOptions = UserConfig & {
  cwd: string;
  inject?: boolean;
  writePartial?: boolean;
};

export type ProjectDetection = {
  cwd: string;
  sources: string[];
  source?: string;
  layouts: string[];
  themeColors: ThemeColor[];
  partial?: string;
  layout?: string;
  appName?: string;
  isStatamic: boolean;
};

export type GenerationPlan = {
  cwd: string;
  source: string;
  outDir: string;
  publicPath: string;
  partial?: string;
  writePartial: boolean;
  data: string;
  layout?: string;
  appName: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
  iconBackgroundColor: string;
  iconBackgroundRadius: number;
  iconScale: number;
  skipMetadataInjection: boolean;
};

export type GeneratedMarkup = {
  markups: string[];
  cssSelectors: string[];
};

export type GenerateResult = {
  files: string[];
  partial?: string;
  data?: string;
  injectedLayout?: string;
  markup: GeneratedMarkup;
};

export type ThemeColor = {
  name: string;
  value: string;
  source: string;
};
