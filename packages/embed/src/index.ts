import { CymekWidget, type CymekConfig } from "./widget";
import { setApiUrl } from "./api";

export const VERSION = "0.1.0";
export { CymekWidget };
export type { CymekConfig };

interface CymekGlobal {
  VERSION: string;
  init: (config: CymekConfig) => CymekWidget;
  widget: CymekWidget | null;
}

function getDataConfig(): Partial<CymekConfig> {
  const script = document.querySelector<HTMLScriptElement>("script[data-cymek-tenant-id]");
  if (!script) return {};

  const config: Partial<CymekConfig> = {
    tenantId: script.dataset.cymekTenantId || "",
  };
  if (script.dataset.cymekServerUrl) config.serverUrl = script.dataset.cymekServerUrl;
  if (script.dataset.cymekTitle) config.title = script.dataset.cymekTitle;
  if (script.dataset.cymekPlaceholder) config.placeholder = script.dataset.cymekPlaceholder;
  if (script.dataset.cymekPrimaryColor) config.primaryColor = script.dataset.cymekPrimaryColor;

  return config;
}

function init(config: CymekConfig): CymekWidget {
  if (config.serverUrl) {
    setApiUrl(config.serverUrl);
  }
  const widget = new CymekWidget(config);
  widget.init();
  globalCymek.widget = widget;
  return widget;
}

const globalCymek: CymekGlobal = {
  VERSION,
  init,
  widget: null,
};

// Auto-init from data-* attributes if present
const dataConfig = getDataConfig();
if (dataConfig.tenantId) {
  init(dataConfig as CymekConfig);
}

// Expose on window for manual usage
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).Cymek = globalCymek;
}

export default globalCymek;
