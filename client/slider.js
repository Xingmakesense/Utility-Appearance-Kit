        // Seven defensive visual profiles, indexed by the level's distance from
        // `low`. `violet` is where the purple mix starts (1/2 at low), `cool`
        // is where the first blue-violet anchor sits. Just the two ends (1px)
        // are pure colour; everything between is mixed by the scheme. Models
        // with up to seven effort levels all get a row; longer sets clamp to
        // the last row instead of breaking the layout.
        const LEVEL_PROFILES = Object.freeze([
            { cool: 0.26, violet: 0.50 },
            { cool: 0.23, violet: 0.46 },
            { cool: 0.20, violet: 0.40 },
            { cool: 0.18, violet: 0.35 },
            { cool: 0.16, violet: 0.31 },
            { cool: 0.15, violet: 0.29 },
            { cool: 0.14, violet: 0.27 }
        ]);

        const CODEX_SCHEME = Object.freeze({
            start: "#4c8dff",
            mid: "#6f7dff",
            violet: "#a855f7",
            end: "#d96bff",
            trackStart: "rgb(76 141 255 / 14%)",
            trackEnd: "rgb(168 85 247 / 18%)"
        });

        function gradientFor(profile) {
            const cool = (profile.cool * 100).toFixed(1);
            const violet = (profile.violet * 100).toFixed(1);
            return `linear-gradient(90deg, ${CODEX_SCHEME.start} 0px, ${CODEX_SCHEME.start} 1px, ${CODEX_SCHEME.mid} ${cool}%, ${CODEX_SCHEME.violet} ${violet}%, ${CODEX_SCHEME.end} calc(100% - 1px), ${CODEX_SCHEME.end} 100%)`;
        }

        const LEVEL_GRADIENTS = Object.freeze(LEVEL_PROFILES.map((profile) => gradientFor(profile)));

        function levelProfile(index, lowIndex) {
            const relative = Math.max(0, index - lowIndex);
            return LEVEL_PROFILES[Math.min(relative, LEVEL_PROFILES.length - 1)];
        }

        // Particles sit on a rail-level layer behind the white knob (z-order),
        // start within its 12px footprint and flow left across the whole filled
        // run. Spawn top is kept in 4–14px with only ±2px vertical drift, so
        // they stay inside the 22px slider instead of drifting out.
        //
        // One level owns a fixed run of rail, so the slider length follows the
        // model's level count instead of cramming every model into one width.
        // Baseline is DeepSeek V4.1 flash (`deepseek-flash`: off/low/high/max,
        // 4 levels) widened by 25%: 104 × 1.25 ÷ 4 = 32.5px per level. A 6-level
        // model therefore draws a 195px rail, a 2-level one 65px.
        const RAIL_BASE_WIDTH = 104;
        const RAIL_SCALE = 1.25;
        const BASELINE_LEVEL_COUNT = 4;
        const LEVEL_WIDTH = (RAIL_BASE_WIDTH * RAIL_SCALE) / BASELINE_LEVEL_COUNT;

        /**
         * Rail length in px for a model offering `count` levels. Every level
         * owns the same run, so the slider grows and shrinks with the model.
         * @param {number} count offered level count, at least 1 in practice.
         * @returns {number} rail width in CSS pixels.
         */
        function railWidthFor(count) {
            return Math.max(1, count) * LEVEL_WIDTH;
        }

        /**
         * Width of the value readout for one model's actual level names.
         *
         * A fixed 3.6em was too narrow for "medium" with some host fonts, and
         * every model was then squeezed by the parent flex row. Measure the
         * longest name instead: ASCII glyphs take roughly 0.6em, CJK glyphs a
         * full em, plus a small padding allowance. The result is frozen per
         * model so dragging between levels cannot shift the rail.
         *
         * @param {Array<{id: string, name?: string}>} levels offered levels.
         * @param {string} [fallback] current or default label.
         * @returns {number} label width in em.
         */
        function valueWidthFor(levels, fallback) {
            let widest = 0;
            for (const text of [...(levels ?? []).map((level) => level?.name ?? level?.id), fallback]) {
                if (typeof text !== "string") continue;
                let em = 0;
                for (const character of text) {
                    em += character.codePointAt(0) > 0x2e7f ? 1 : 0.6;
                }
                widest = Math.max(widest, em);
            }
            // Never below the old readout width; cap pathological labels so a
            // bad custom name cannot push the whole composer off-screen.
            return Math.min(9, Math.max(3.6, widest + 0.35));
        }
        const PARTICLE_TRAJECTORIES = Object.freeze(["dsh-uak-drift-a", "dsh-uak-drift-b", "dsh-uak-drift-c"]);
        const PARTICLE_EASINGS = Object.freeze(["ease-in-out", "ease-out", "linear", "cubic-bezier(.2,.7,.4,1)"]);

        function randomParticleNodes() {
            if (typeof react.createElement !== "function") return [];
            const count = 8 + Math.floor(Math.random() * 4);
            return Array.from({ length: count }, (_, index) => {
                const distance = index === 0 ? 0 : Math.random() * 12;
                const size = 1.9 + Math.random() * 1.3;
                const top = 4 + Math.random() * 10;
                const delay = -(Math.random() * 2.8 + index * 0.03);
                const durationFactor = 0.6 + Math.random() * 0.85;
                const span = 1;
                const driftY = -2 + Math.random() * 4;
                const startY = Math.random() * 2;
                const scaleFrom = 0.45 + Math.random() * 0.5;
                const scaleTo = 0.8 + Math.random() * 0.6;
                const peak = 0.55 + Math.random() * 0.45;
                const glow = 2 + Math.random() * 3;
                const glowAlpha = 0.55 + Math.random() * 0.4;
                const color = Math.random() < 0.75 ? "#ffffff" : "#f4e9ff";
                return react.createElement("span", {
                    key: index,
                    className: "dsh-uak-particle",
                    style: {
                        left: `-${distance.toFixed(1)}px`,
                        top: `${top.toFixed(1)}px`,
                        width: `${size.toFixed(1)}px`,
                        height: `${size.toFixed(1)}px`,
                        background: color,
                        boxShadow: `0 0 ${glow.toFixed(1)}px rgb(255 255 255 / ${glowAlpha.toFixed(2)})`,
                        animationName: PARTICLE_TRAJECTORIES[Math.floor(Math.random() * PARTICLE_TRAJECTORIES.length)],
                        animationTimingFunction: PARTICLE_EASINGS[Math.floor(Math.random() * PARTICLE_EASINGS.length)],
                        animationDelay: `${delay.toFixed(2)}s`,
                        animationDuration: `calc(var(--dsh-uak-duration, 2.6s) * ${durationFactor.toFixed(2)})`,
                        "--dsh-uak-span": span.toFixed(2),
                        "--dsh-uak-drift-y": `${driftY.toFixed(1)}px`,
                        "--dsh-uak-start-y": `${startY.toFixed(1)}px`,
                        "--dsh-uak-scale-from": scaleFrom.toFixed(2),
                        "--dsh-uak-scale-to": scaleTo.toFixed(2),
                        "--dsh-uak-peak-opacity": peak.toFixed(2)
                    }
                });
            });
        }

        const PARTICLE_SETS = Object.freeze(Array.from({ length: 7 }, () => Object.freeze(randomParticleNodes())));

        const sliderCss = `
.dsh-uak-root {
    min-width: max-content;
    max-width: 100%;
    position: relative;
    display: inline-flex;
    flex: 0 0 auto;
}
.dsh-uak-wrap {
    display: inline-flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 5px;
    height: 28px;
    padding: 0 2px;
    border-radius: var(--dsw-radius-sm, 6px);
    color: var(--dsw-alias-label-secondary);
}
.dsh-uak-default:disabled {
    opacity: 1;
    color: var(--dsw-alias-label-caption);
    -webkit-text-fill-color: var(--dsw-alias-label-caption);
    cursor: default;
}
.dsh-uak-default {
    height: 20px;
    padding: 0 6px;
    border: 1px solid var(--dsw-alias-border-l2);
    border-radius: 10px;
    background: transparent;
    color: var(--dsw-alias-label-caption);
    font: inherit;
    font-size: 10px;
    line-height: 18px;
    cursor: pointer;
    flex: none;
}
.dsh-uak-default:hover {
    color: var(--dsw-alias-label-primary);
    border-color: var(--dsw-alias-border-l3, var(--dsw-alias-border-l2));
}
.dsh-uak-defaultActive {
    color: var(--dsw-alias-state-info-primary);
    border-color: var(--dsw-alias-state-info-primary);
}
.dsh-uak-rail {
    position: relative;
    /* 4-level baseline; the component sets width/min/max inline per model. */
    width: 130px;
    min-width: 130px;
    max-width: 130px;
    height: 22px;
    flex: 0 0 auto;
    contain: layout paint;
}
.dsh-uak-groove {
    position: absolute;
    inset: 0;
    overflow: hidden;
    corner-shape: round;
    border-radius: 11px;
    pointer-events: none;
}
.dsh-uak-track, .dsh-uak-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    corner-shape: round;
    border-radius: 11px;
    pointer-events: none;
}
.dsh-uak-track {
    right: 0;
    background: linear-gradient(90deg, rgb(76 141 255 / 14%) 0%, rgb(168 85 247 / 18%) 100%);
}
.dsh-uak-fill {
    z-index: 1;
    overflow: hidden;
    background: #4c8dff;
}
.dsh-uak-particles {
    position: absolute;
    z-index: 3;
    top: 0;
    bottom: 0;
    width: 0;
    overflow: visible;
    pointer-events: none;
}
.dsh-uak-particle {
    position: absolute;
    width: 2.5px;
    height: 2.5px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 0 3px rgb(255 255 255 / 75%);
    opacity: 0;
    animation-name: dsh-uak-drift-a;
    animation-duration: var(--dsh-uak-duration, 2.6s);
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
}
@keyframes dsh-uak-drift-a {
    0% { opacity: 0; transform: translate3d(0, var(--dsh-uak-start-y, 1px), 0) scale(var(--dsh-uak-scale-from, .7)); }
    24% { opacity: var(--dsh-uak-peak-opacity, .9); }
    70% { opacity: .42; }
    100% { opacity: 0; transform: translate3d(calc(var(--dsh-uak-travel, -24px) * var(--dsh-uak-span, 1)), var(--dsh-uak-drift-y, -3px), 0) scale(var(--dsh-uak-scale-to, 1)); }
}
@keyframes dsh-uak-drift-b {
    0% { opacity: 0; transform: translate3d(0, var(--dsh-uak-start-y, 1px), 0) scale(var(--dsh-uak-scale-from, .7)); }
    35% { opacity: var(--dsh-uak-peak-opacity, .9); transform: translate3d(calc(var(--dsh-uak-travel, -24px) * var(--dsh-uak-span, 1) * .55), calc(var(--dsh-uak-drift-y, -3px) - 2px), 0) scale(var(--dsh-uak-scale-to, 1)); }
    68% { opacity: .3; }
    100% { opacity: 0; transform: translate3d(calc(var(--dsh-uak-travel, -24px) * var(--dsh-uak-span, 1)), var(--dsh-uak-drift-y, -3px), 0) scale(calc(var(--dsh-uak-scale-to, 1) * .8)); }
}
@keyframes dsh-uak-drift-c {
    0% { opacity: 0; transform: translate3d(0, var(--dsh-uak-start-y, 1px), 0) scale(var(--dsh-uak-scale-from, .7)); }
    30% { opacity: var(--dsh-uak-peak-opacity, .9); }
    62% { opacity: .5; transform: translate3d(calc(var(--dsh-uak-travel, -24px) * var(--dsh-uak-span, 1) * .7), calc(var(--dsh-uak-drift-y, -3px) + 2px), 0) scale(var(--dsh-uak-scale-to, 1)); }
    100% { opacity: 0; transform: translate3d(calc(var(--dsh-uak-travel, -24px) * var(--dsh-uak-span, 1)), var(--dsh-uak-drift-y, -3px), 0) scale(calc(var(--dsh-uak-scale-to, 1) * 1.15)); }
}
@media (prefers-reduced-motion: reduce) {
    .dsh-uak-particle { animation: none; opacity: .25; }
}
.dsh-uak-knob {
    position: absolute;
    z-index: 4;
    top: 50%;
    width: 22px;
    height: 22px;
    margin-left: -11px;
    pointer-events: none;
    transform: translateY(-50%);
}
.dsh-uak-knobFace {
    width: 100%;
    height: 100%;
    corner-shape: round;
    border-radius: 50%;
    background: #ffffff;
}
.dsh-uak-ticks {
    position: absolute;
    z-index: 2;
    top: 0;
    right: 11px;
    bottom: 0;
    left: 11px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    pointer-events: none;
}
.dsh-uak-tick {
    width: 3px;
    height: 3px;
    corner-shape: round;
    border-radius: 50%;
    background: rgb(255 255 255 / 38%);
}
.dsh-uak-range {
    -webkit-appearance: none;
    appearance: none;
    position: absolute;
    z-index: 3;
    top: 50%;
    left: 0;
    width: 100%;
    height: 30px;
    transform: translateY(-50%);
    margin: 0;
    background: transparent;
    cursor: pointer;
    outline: none;
    accent-color: transparent;
    color: transparent;
}
.dsh-uak-range:disabled {
    cursor: default;
    opacity: 1;
}
.dsh-uak-range::-webkit-slider-runnable-track {
    height: 22px;
    border: none;
    border-radius: 11px;
    background: transparent;
}
.dsh-uak-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    box-sizing: border-box;
    width: 22px;
    height: 22px;
    margin-top: 0;
    border-radius: 50%;
    background: transparent;
    border: none;
    box-shadow: none;
    cursor: pointer;
}
.dsh-uak-range::-moz-range-track, .dsh-uak-range::-moz-range-progress {
    height: 22px;
    border: none;
    border-radius: 11px;
    background: transparent;
}
.dsh-uak-range::-moz-range-thumb {
    box-sizing: border-box;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: transparent;
    border: none;
    box-shadow: none;
    cursor: pointer;
}
.dsh-uak-value {
    /* The component sets an exact per-model width inline. */
    width: 3.6em;
    min-width: 3.6em;
    max-width: none;
    overflow: visible;
    text-overflow: clip;
    text-align: right;
    font-size: 11px;
    line-height: 16px;
    white-space: nowrap;
    color: var(--dsw-alias-label-primary);
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
}
.dsh-uak-error {
    color: var(--dsw-alias-state-error-primary);
    font-size: 11px;
    line-height: 16px;
    cursor: help;
}
`;

        const NO_EFFORTS = Object.freeze([]);
        const COMMIT_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);

        function levelsOf(model) {
            const efforts = model?.reasoning?.efforts;
            return Array.isArray(efforts) ? efforts : NO_EFFORTS;
        }

        function defaultEffortOf(model) {
            return model?.reasoning?.defaultEffort;
        }

        function effortIndex(levels, current) {
            const index = levels.findIndex((level) => level.id === current);
            return index >= 0 ? index : Math.floor((levels.length - 1) / 2);
        }

        function explainError(message) {
            if (typeof message !== "string" || message.length === 0) return "推理强度切换失败";
            if (message.includes("does not support reasoning effort")) return "此模型不支持当前推理强度";
            return message;
        }

        function EffortSlider({ locked, available, directory, load, select, useSession }) {
            const subscribe = react.useCallback((listener) => directory.subscribe(listener), [directory]);
            const getSnapshot = react.useCallback(() => directory.getSnapshot(), [directory]);
            const state = react.useSyncExternalStore(subscribe, getSnapshot);
            const running = typeof useSession === "function"
                ? useSession((session) => session?.running === true)
                : false;
            const [initialLoading, setInitialLoading] = react.useState(true);
            const [draft, setDraft] = react.useState(-1);
            const [pendingIndex, setPendingIndex] = react.useState(-1);
            const [queued, setQueued] = react.useState(null);
            const [error, setError] = react.useState(null);
            const [lockRect, setLockRect] = react.useState(null);
            const liveModelRef = react.useRef(null);
            const loadedRef = react.useRef(false);
            const rootRef = react.useRef(null);
            const draftFrame = react.useRef(0);
            const draftValue = react.useRef(-1);

            react.useEffect(() => {
                if (!available || loadedRef.current) return;
                loadedRef.current = true;
                load().then(() => setInitialLoading(false), () => setInitialLoading(false));
            }, [available, load]);
            react.useEffect(() => () => {
                if (draftFrame.current !== 0) cancelAnimationFrame(draftFrame.current);
                draftFrame.current = 0;
            }, []);

            const currentChoice = react.useMemo(() => {
                if (state.current === null) return undefined;
                for (const group of state.groups) {
                    if (group.id !== state.current.provider) continue;
                    const model = group.models.find((candidate) => candidate.id === state.current.model);
                    if (model !== undefined) return { group, model };
                }
                return undefined;
            }, [state.current?.provider, state.current?.model, state.groups]);

            const levels = levelsOf(currentChoice?.model);
            const currentEffort = state.current?.reasoningEffort ?? defaultEffortOf(currentChoice?.model);
            const currentIndex = currentChoice === undefined ? -1 : effortIndex(levels, currentEffort);
            const currentLevel = currentChoice === undefined ? undefined : levels[currentIndex];
            const currentKey = state.current === null ? null : `${state.current.provider}/${state.current.model}`;
            const isDefault = state.current !== null && state.current.reasoningEffort === undefined;
            liveModelRef.current = currentKey;
            const busy = state.status === "selecting" || state.status === "loading";
            const disabled = locked === true || running;
            const cancelDraftFrame = () => {
                if (draftFrame.current !== 0) cancelAnimationFrame(draftFrame.current);
                draftFrame.current = 0;
            };
            const queueDraft = (value) => {
                draftValue.current = value;
                if (draftFrame.current !== 0) return;
                draftFrame.current = requestAnimationFrame(() => {
                    draftFrame.current = 0;
                    setDraft(draftValue.current);
                });
            };

            react.useEffect(() => {
                setDraft(-1);
                setPendingIndex(-1);
                setQueued(null);
                setError(null);
                cancelDraftFrame();
            }, [state.current?.provider, state.current?.model]);
            react.useEffect(() => {
                if (!running) return;
                cancelDraftFrame();
                setDraft(-1);
                setPendingIndex(-1);
                setQueued(null);
                setError(null);
            }, [running]);
            react.useEffect(() => {
                if (!disabled) {
                    setLockRect(null);
                    return;
                }
                const node = rootRef.current;
                if (node !== null && node.matches(":hover")) setLockRect(node.getBoundingClientRect());
            }, [disabled]);

            const submit = (nextIndex) => {
                if (disabled) return;
                cancelDraftFrame();
                setError(null);
                const nextEffort = levels[nextIndex]?.id;
                if (nextEffort === undefined || state.current === null || nextEffort === currentEffort) {
                    setDraft(-1);
                    setPendingIndex(-1);
                    return;
                }
                const submittedKey = currentKey;
                setDraft(nextIndex);
                setPendingIndex(nextIndex);
                select({
                    provider: state.current.provider,
                    model: state.current.model,
                    reasoningEffort: nextEffort
                }).then((accepted) => {
                    if (accepted || liveModelRef.current !== submittedKey) return;
                    setDraft(-1);
                    setPendingIndex(-1);
                    setError(explainError(directory.getSnapshot().error));
                });
            };

            const submitDefault = () => {
                if (disabled || busy || state.current === null) return;
                cancelDraftFrame();
                const submittedKey = currentKey;
                setError(null);
                setDraft(-1);
                setPendingIndex(-1);
                setQueued(null);
                select({
                    provider: state.current.provider,
                    model: state.current.model
                }).then((accepted) => {
                    if (accepted || liveModelRef.current !== submittedKey) return;
                    setError(explainError(directory.getSnapshot().error));
                });
            };

            react.useEffect(() => {
                if (pendingIndex < 0) return;
                if (currentIndex === pendingIndex) {
                    setDraft(-1);
                    setPendingIndex(-1);
                }
            }, [currentIndex, pendingIndex]);

            react.useEffect(() => {
                if (disabled || busy || queued === null) return;
                setQueued(null);
                if (queued.key !== currentKey) return;
                submit(queued.index);
            }, [disabled, busy, queued]);

            // Keep every hook above this line: bailing out earlier changes the hook count.
            if (!available) return null;
            if (initialLoading && state.groups.length === 0 && currentChoice === undefined) return null;
            if (currentChoice === undefined || levels.length === 0) return null;

            const displayedIndex = draft >= 0 ? draft : pendingIndex >= 0 ? pendingIndex : currentIndex;
            const displayedLevel = levels[displayedIndex];
            const maxIndex = levels.length - 1;
            // Fixed run per level: the rail length is a function of how many
            // levels this model offers, so switching models resizes it.
            const railWidth = railWidthFor(levels.length);
            const fillPct = levels.length <= 1 ? 100 : Math.round((displayedIndex / maxIndex) * 100);
            const radius = 11;
            const travel = `calc(${fillPct}% + ${Math.round(radius - (radius * 2 * fillPct) / 100)}px)`;
            const atMax = displayedIndex >= maxIndex;
            const knobLeft = atMax || levels.length <= 1
                ? `calc(100% - ${radius}px)`
                : fillPct <= 0
                    ? `${radius}px`
                    : travel;
            // Numeric rail-space centre of the knob; the particle layer uses it
            // as its origin and as the full travel distance to the left edge.
            const knobPx = atMax || levels.length <= 1
                ? railWidth - radius
                : radius + (railWidth - radius * 2) * (fillPct / 100);
            // At the top the capsule itself must be fully filled, including the
            // rounded right cap the knob sits on; stopping at the knob centre is
            // what left the visible grey sliver ("填充不完全").
            const fillWidth = atMax ? "100%" : fillPct <= 0 ? "0px" : travel;

            // Purple grows from a faint tint at `low` to a full violet bloom at
            // the top. `off` (or the lowest level of a model without `off`)
            // stays blue.
            const lowIndex = (() => {
                const found = levels.findIndex((level) => level.id === "low");
                return found >= 0 ? found : 0;
            })();
            const highIndex = (() => {
                const found = levels.findIndex((level) => level.id === "high");
                return found >= 0 ? found : Math.ceil(maxIndex * 0.75);
            })();
            const profileIndex = Math.min(Math.max(0, displayedIndex - lowIndex), LEVEL_GRADIENTS.length - 1);
            const fillGradient = LEVEL_GRADIENTS[profileIndex];
            const particleNodes = PARTICLE_SETS[Math.min(Math.max(displayedIndex, 0), PARTICLE_SETS.length - 1)];
            // Particle levels are a geometric series: the first particle
            // level keeps the old 2x speed (unchanged), the top is now relaxed
            // from 0.0875s to 0.18s, and every step between is geometric.
            const particleLevels = Math.max(1, maxIndex - highIndex + 1);
            const highProgress = maxIndex > 0 ? highIndex / maxIndex : 1;
            const firstParticleDuration = Math.max(0.12, (0.35 + 2.25 * (1 - highProgress) ** 2) / 2);
            const lastParticleDuration = 0.18;
            const particleSlot = Math.max(0, displayedIndex - highIndex);
            const particleDuration = particleLevels <= 1
                ? lastParticleDuration
                : firstParticleDuration * (lastParticleDuration / firstParticleDuration) ** (particleSlot / (particleLevels - 1));
            const particleDurationText = `${particleDuration.toFixed(4)}s`;
            const showParticles = displayedIndex >= highIndex && maxIndex > 0;

            const valueLabel = displayedLevel?.name ?? currentEffort ?? "默认";
            const valueWidth = `${valueWidthFor(levels, valueLabel).toFixed(2)}em`;
            const title = running
                ? "会话进行中，暂不能调整推理强度"
                : `推理强度：${valueLabel}${displayedLevel?.description ? ` — ${displayedLevel.description}` : ""}`;
            const lockBelow = lockRect !== null && lockRect.top < 40;
            const lockTip = disabled && lockRect !== null
                ? react.createElement(
                    "span",
                    {
                        className: "dsh-uak-lockTip",
                        role: "tooltip",
                        style: {
                            left: `${Math.round(lockRect.left + lockRect.width / 2)}px`,
                            top: `${Math.round(lockBelow ? lockRect.bottom + 8 : lockRect.top - 8)}px`,
                            transform: lockBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)"
                        }
                    },
                    "暂不支持调整"
                )
                : null;

            const commit = (event) => {
                if (disabled) return;
                const nextIndex = Number(event?.currentTarget?.value ?? draft);
                if (!Number.isFinite(nextIndex) || nextIndex < 0) return;
                if (busy) {
                    setQueued({ index: nextIndex, key: currentKey });
                    return;
                }
                submit(nextIndex);
            };

            return react.createElement(
                "div",
                {
                    ref: rootRef,
                    className: "dsh-uak-root",
                    "data-dsh-plugin": name,
                    onMouseEnter: () => {
                        if (!disabled) return;
                        const node = rootRef.current;
                        if (node !== null) setLockRect(node.getBoundingClientRect());
                    },
                    onMouseLeave: () => setLockRect(null)
                },
                react.createElement(
                    "div",
                    {
                        className: "dsh-uak-wrap",
                        "data-disabled": disabled ? "true" : undefined,
                        "data-running": running ? "true" : undefined
                    },
                    react.createElement(
                        "button",
                        {
                            type: "button",
                            className: isDefault ? "dsh-uak-default dsh-uak-defaultActive" : "dsh-uak-default",
                            disabled: disabled || busy,
                            onClick: submitDefault
                        },
                        "默认"
                    ),
                    react.createElement(
                        "div",
                        {
                            className: "dsh-uak-rail",
                            "data-levels": levels.length,
                            style: {
                                width: `${railWidth}px`,
                                minWidth: `${railWidth}px`,
                                maxWidth: `${railWidth}px`
                            }
                        },
                        react.createElement(
                            "div",
                            { className: "dsh-uak-groove", "aria-hidden": true },
                            react.createElement("div", {
                                className: "dsh-uak-track",
                                style: { background: `linear-gradient(90deg, ${CODEX_SCHEME.trackStart}, ${CODEX_SCHEME.trackEnd})` }
                            }),
                            react.createElement("div", {
                                className: "dsh-uak-fill",
                                style: {
                                    width: fillWidth,
                                    backgroundImage: fillGradient,
                                    backgroundSize: "100% 100%",
                                    backgroundRepeat: "no-repeat",
                                    backgroundPosition: "left center"
                                }
                            }),
                            showParticles
                                ? react.createElement("div", {
                                    className: "dsh-uak-particles",
                                    "aria-hidden": true,
                                    style: {
                                        left: `${knobPx.toFixed(2)}px`,
                                        "--dsh-uak-duration": particleDurationText,
                                        "--dsh-uak-travel": `-${knobPx.toFixed(2)}px`
                                    }
                                }, particleNodes)
                                : null
                        ),
                        react.createElement(
                            "div",
                            { className: "dsh-uak-knob", "aria-hidden": true, style: { left: knobLeft } },
                            react.createElement("div", { className: "dsh-uak-knobFace" })
                        ),
                        react.createElement(
                            "div",
                            { className: "dsh-uak-ticks", "aria-hidden": true },
                            levels.map((level) => react.createElement("span", {
                                key: level.id,
                                className: "dsh-uak-tick"
                            }))
                        ),
                        react.createElement("input", {
                            className: "dsh-uak-range",
                            type: "range",
                            min: 0,
                            max: Math.max(maxIndex, 0),
                            step: 1,
                            value: displayedIndex,
                            disabled: disabled,
                            "aria-disabled": disabled,
                            "aria-label": title,
                            onChange: (event) => queueDraft(Number(event.currentTarget.value)),
                            onMouseUp: commit,
                            onTouchEnd: commit,
                            onKeyUp: (event) => {
                                if (COMMIT_KEYS.has(event.key)) commit(event);
                            }
                        })
                    ),
                    react.createElement("span", {
                        className: "dsh-uak-value",
                        style: { width: valueWidth, minWidth: valueWidth },
                        title: valueLabel
                    }, valueLabel),
                    error === null
                        ? null
                        : react.createElement("span", { className: "dsh-uak-error", role: "status", title: error }, "!"),
                    disabled ? react.createElement("div", { className: "dsh-uak-lockOverlay", "aria-hidden": true }) : null,
                    lockTip === null
                        ? null
                        : (typeof reactDom?.createPortal === "function" ? reactDom.createPortal(lockTip, document.body) : lockTip)
                )
            );
        }

