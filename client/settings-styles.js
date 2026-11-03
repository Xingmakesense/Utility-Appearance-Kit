        const UAK_SETTINGS_CSS = `
.uak-settings { color: var(--dsw-alias-label-primary); padding: 0 0 28px; }
/* Secondary copy keeps the primary hue at a slight fade: the theme's
   secondary/tertiary greys were unreadable over the wallpaper. */
.uak-settings-intro, .uak-settings-section > p { color: var(--dsw-alias-label-primary); opacity: .82; font-size: 12px; line-height: 20px; }
.uak-settings-section { padding: 16px 0; border-bottom: .5px solid var(--dsw-alias-border-l2); }
.uak-settings-section h2 { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.uak-setting-field { display: flex; align-items: center; gap: 10px; margin: 10px 0; }
.uak-setting-field > span { flex: 0 0 100px; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 500; }
.uak-setting-field input { min-width: 0; flex: 1; padding: 7px 10px; color: var(--dsw-alias-label-primary); background: rgb(127 160 230 / 18%); border: 1px solid rgb(127 160 230 / 48%); border-radius: 8px; font: inherit; font-size: 12px; }
.uak-setting-actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
.uak-setting-choice { display: flex; flex-direction: row; align-items: center; gap: 12px; margin: 12px 0; }
.uak-setting-choice > span { flex: 0 0 100px; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 500; }
.uak-setting-options { display: flex; flex-direction: row; flex-wrap: wrap; gap: 6px; }
.uak-chip { padding: 5px 11px; border: 1px solid rgb(127 160 230 / 34%); border-radius: 7px; background: rgb(127 160 230 / 16%); color: var(--dsw-alias-label-primary); cursor: pointer; font: inherit; font-size: 12px; }
.uak-chip:hover { background: rgb(127 160 230 / 30%); color: var(--dsw-alias-label-primary); }
/* Selected: fixed blue with white text keeps contrast in both themes. */
.uak-chip[data-active="true"] { background: #2f6fe0; border-color: #2f6fe0; color: #ffffff; font-weight: 600; }
.uak-setting-sliders { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); column-gap: 24px; }
.uak-setting-slider { display: grid; grid-template-columns: 100px minmax(80px,1fr) 50px; gap: 10px; align-items: center; min-height: 36px; font-size: 12px; color: var(--dsw-alias-label-primary); }
.uak-setting-slider input { width: 100%; accent-color: #2f6fe0; }
.uak-setting-slider output { color: var(--dsw-alias-label-primary); opacity: .88; text-align: right; font-variant-numeric: tabular-nums; }
.uak-book-catalog { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 7px; margin: 14px 0 20px; }
.uak-book-option { display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 10px; border: 1px solid rgb(127 160 230 / 34%); border-radius: 9px; background: rgb(127 160 230 / 16%); color: var(--dsw-alias-label-primary); cursor: pointer; font: inherit; }
.uak-book-option strong { font-size: 12px; font-weight: 600; }
.uak-book-option span { color: var(--dsw-alias-label-primary); opacity: .8; font-size: 11px; }
.uak-book-option:hover { background: rgb(127 160 230 / 30%); }
.uak-book-option[data-active="true"] { background: #2f6fe0; border-color: #2f6fe0; color: #ffffff; }
.uak-book-option[data-active="true"] strong { color: #ffffff; }
.uak-book-option[data-active="true"] span { color: rgb(235 243 255 / .95); opacity: 1; }
.uak-book-option[aria-selected="true"] { box-shadow: inset 0 0 0 1px rgb(255 255 255 / .45); }
.uak-save { display: block; width: 100%; padding: 10px 16px; border: 1px solid #2f6fe0; border-radius: 9px; background: #2f6fe0; color: #fff; cursor: pointer; font: inherit; }
.uak-save:hover { background: #3f7ced; }
.uak-save:disabled { opacity: .55; cursor: default; }
.uak-save-message { color: var(--dsw-alias-label-primary); opacity: .85; font-size: 12px; }
@media (max-width:650px) { .uak-setting-sliders { grid-template-columns: 1fr; } .uak-book-catalog { grid-template-columns: repeat(2,minmax(0,1fr)); } .uak-setting-choice { align-items: flex-start; } }
`;
