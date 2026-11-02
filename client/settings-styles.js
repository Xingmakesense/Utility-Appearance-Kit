        const UAK_SETTINGS_CSS = `
.uak-settings { color: var(--dsw-alias-label-primary); padding: 0 0 28px; }
.uak-settings-intro, .uak-settings-section > p { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 20px; }
.uak-settings-section { padding: 16px 0; border-bottom: .5px solid var(--dsw-alias-border-l2); }
.uak-settings-section h2 { margin: 0 0 12px; font-size: 15px; font-weight: 500; }
.uak-setting-url { display: flex; gap: 8px; align-items: center; margin: 10px 0 16px; }
.uak-setting-url input { min-width: 0; flex: 1; padding: 7px 10px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; font: inherit; font-size: 12px; }
.uak-setting-choice { display: flex; flex-direction: row; align-items: center; gap: 12px; margin: 12px 0; }
.uak-setting-choice > span { flex: 0 0 100px; color: var(--dsw-alias-label-secondary); font-size: 13px; }
.uak-setting-options { display: flex; flex-direction: row; flex-wrap: wrap; gap: 6px; }
.uak-chip { padding: 5px 11px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; font: inherit; font-size: 12px; }
.uak-chip:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.uak-chip[data-active="true"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 30%, transparent); color: var(--dsw-alias-label-primary); }
.uak-setting-sliders { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); column-gap: 24px; }
.uak-setting-slider { display: grid; grid-template-columns: 100px minmax(80px,1fr) 50px; gap: 10px; align-items: center; min-height: 36px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.uak-setting-slider input { width: 100%; accent-color: var(--dsw-alias-state-business-primary); }
.uak-setting-slider output { color: var(--dsw-alias-label-tertiary); text-align: right; font-variant-numeric: tabular-nums; }
.uak-book-catalog { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 7px; margin: 14px 0 20px; }
.uak-book-option { display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 9px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); cursor: pointer; font: inherit; }
.uak-book-option strong { font-size: 12px; font-weight: 500; }
.uak-book-option span { color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.uak-book-option[data-active="true"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 13%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 34%, transparent); color: var(--dsw-alias-label-primary); }
.uak-book-option[aria-selected="true"] { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary) 22%, transparent); }
.uak-save { display: block; width: 100%; padding: 10px 16px; border: 1px solid transparent; border-radius: 9px; background: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-on-business-primary, #fff); cursor: pointer; font: inherit; }
.uak-save:hover { filter: brightness(1.05); }
.uak-save:disabled { opacity: .55; cursor: default; }
.uak-save-message { color: var(--dsw-alias-label-tertiary); font-size: 12px; }
@media (max-width:650px) { .uak-setting-sliders { grid-template-columns: 1fr; } .uak-book-catalog { grid-template-columns: repeat(2,minmax(0,1fr)); } .uak-setting-choice { align-items: flex-start; } }
`;
