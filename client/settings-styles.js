        const UAK_SETTINGS_CSS = `
.uak-settings { color: var(--dsw-alias-label-primary); padding: 0 0 28px; }
.uak-settings-intro, .uak-settings-section > p { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 20px; }
.uak-settings-section { padding: 16px 0; border-bottom: .5px solid var(--dsw-alias-border-l2); }
.uak-settings-section h2 { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.uak-setting-field { display: flex; align-items: center; gap: 10px; margin: 10px 0; }
.uak-setting-field > span { flex: 0 0 100px; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 500; }
.uak-setting-field input { min-width: 0; flex: 1; padding: 7px 10px; color: var(--dsw-alias-label-primary); background: rgb(219 234 254 / 14%); border: 1px solid rgb(147 197 253 / 38%); border-radius: 8px; font: inherit; font-size: 12px; }
.uak-setting-actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
.uak-setting-choice { display: flex; flex-direction: row; align-items: center; gap: 12px; margin: 12px 0; }
.uak-setting-choice > span { flex: 0 0 100px; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 500; }
.uak-setting-options { display: flex; flex-direction: row; flex-wrap: wrap; gap: 6px; }
.uak-chip { padding: 5px 11px; border: 1px solid rgb(148 177 232 / 22%); border-radius: 7px; background: rgb(67 106 179 / .12); color: var(--dsw-alias-label-primary); cursor: pointer; font: inherit; font-size: 12px; }
.uak-chip:hover { background: rgb(108 150 229 / .22); color: var(--dsw-alias-label-primary); }
.uak-chip[data-active="true"] { background: rgb(88 137 230 / .38); border-color: rgb(160 196 255 / .6); color: #ffffff; font-weight: 600; }
.uak-setting-sliders { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); column-gap: 24px; }
.uak-setting-slider { display: grid; grid-template-columns: 100px minmax(80px,1fr) 50px; gap: 10px; align-items: center; min-height: 36px; font-size: 12px; color: var(--dsw-alias-label-primary); }
.uak-setting-slider input { width: 100%; accent-color: #689fff; }
.uak-setting-slider output { color: var(--dsw-alias-label-secondary); text-align: right; font-variant-numeric: tabular-nums; }
.uak-book-catalog { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 7px; margin: 14px 0 20px; }
.uak-book-option { display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 10px; border: 1px solid rgb(148 177 232 / .2); border-radius: 9px; background: rgb(67 106 179 / .12); color: var(--dsw-alias-label-primary); cursor: pointer; font: inherit; }
.uak-book-option strong { font-size: 12px; font-weight: 600; }
.uak-book-option span { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.uak-book-option:hover { background: rgb(80 130 210 / .22); }
.uak-book-option[data-active="true"] { background: rgb(61 125 235 / .38); border-color: rgb(160 196 255 / .7); color: #ffffff; }
.uak-book-option[data-active="true"] span { color: rgb(226 236 255 / .92); }
.uak-book-option[aria-selected="true"] { box-shadow: inset 0 0 0 1px rgb(160 196 255 / .5); }
.uak-save { display: block; width: 100%; padding: 10px 16px; border: 1px solid rgb(152 190 255 / .35); border-radius: 9px; background: #356fca; color: #fff; cursor: pointer; font: inherit; }
.uak-save:hover { background: #427ddb; }
.uak-save:disabled { opacity: .55; cursor: default; }
.uak-save-message { color: var(--dsw-alias-label-secondary); font-size: 12px; }
@media (max-width:650px) { .uak-setting-sliders { grid-template-columns: 1fr; } .uak-book-catalog { grid-template-columns: repeat(2,minmax(0,1fr)); } .uak-setting-choice { align-items: flex-start; } }
`;
