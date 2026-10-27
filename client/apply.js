        const DIRECTORY_SERVICES = ["remote", "remote.session"];

        function injectFor(ctx, sliderEnabled) {
            const extra = typeof ctx.get === "function"
                ? DIRECTORY_SERVICES.filter((service) => ctx.get(service) !== undefined)
                : [];
            return sliderEnabled
                ? [...inject, "modelDirectories", "sessions", ...extra]
                : [...inject, ...extra];
        }

        function mountSliderAndPricing(ctx, options) {
            ctx.inject(injectFor(ctx, options.slider), (scope) => {
                let closed = false;
                let disposeSlider;
                let disposePeak;
                const timers = [];
                const install = () => {
                    if (closed) return true;
                    let complete = true;
                    let slots;
                    try {
                        slots = scope.get("slots");
                        if (slots === undefined) throw new Error("slots is unavailable");
                    } catch (error) {
                        console.warn("[utility-appearance-kit] slot registration deferred:", error);
                        return false;
                    }
                    if (options.slider && disposeSlider === undefined) {
                        try {
                            const models = scope.get("modelDirectories");
                            const sessions = scope.get("sessions");
                            if (models === undefined || sessions === undefined) {
                                throw new Error("model services are unavailable");
                            }
                            disposeSlider = slots.inject(sliderSlot, () => slots.register({
                                name: sliderSlot,
                                id: "utility-appearance-kit",
                                order: 90,
                                inject: (sessionId) => {
                                    const directory = models.directoryFor(sessionId);
                                    const available = typeof sessions.subagentAddress === "function"
                                        ? sessions.subagentAddress(sessionId) === undefined
                                        : true;
                                    const accepted = (outcome) => !(outcome !== null && typeof outcome === "object" && outcome.ok === false);
                                    return {
                                        available,
                                        directory: directory.store,
                                        load: () => available ? directory.load().catch(() => {}) : Promise.resolve(),
                                        select: (selection) => available
                                            ? directory.select(selection).then(accepted, () => false)
                                            : Promise.resolve(false)
                                    };
                                }
                            }, EffortSlider));
                        } catch (error) {
                            complete = false;
                            console.warn("[utility-appearance-kit] slider registration deferred:", error);
                        }
                    }
                    if (disposePeak === undefined) {
                        try {
                            disposePeak = slots.inject("sidebar.brand.name", () => slots.register({
                                name: "sidebar.brand.name",
                                priority: -100
                            }, BrandIdentity));
                        } catch (error) {
                            complete = false;
                            console.warn("[utility-appearance-kit] pricing registration deferred:", error);
                        }
                    }
                    return complete;
                };
                if (!install()) {
                    for (const delay of [250, 1_000, 3_000]) {
                        timers.push(setTimeout(() => {
                            if (!closed && !install()) console.warn("[utility-appearance-kit] registration still unavailable");
                        }, delay));
                    }
                }
                return () => {
                    closed = true;
                    for (const timer of timers) clearTimeout(timer);
                    try { disposePeak?.(); } catch { /* ignore */ }
                    try { disposeSlider?.(); } catch { /* ignore */ }
                };
            });
        }

        const apply = (ctx, config) => {
            const normalized = normalizeOptions(config);
            const options = normalized.value ?? {
                ...DEFAULT_OPTIONS,
                declarations: "off",
                slider: false,            };
            if (normalized.issues !== undefined) {
                console.warn("[utility-appearance-kit] invalid config; optional UI disabled:", normalized.issues);
            }
            try {
                if (typeof ctx.effect === "function") ctx.effect(() => installStyle());
                else installStyle();
            } catch (error) {
                console.warn("[utility-appearance-kit] stylesheet skipped:", error);
            }
            try {
                if (typeof ctx.effect === "function") ctx.effect(() => installTopBarActions());
                else installTopBarActions();
            } catch (error) {
                console.warn("[utility-appearance-kit] top-bar actions skipped:", error);
            }
            try {
                mountSliderAndPricing(ctx, options);
            } catch (error) {
                console.warn("[utility-appearance-kit] slider/pricing mount skipped:", error);
            }
        };

        const Config = {
            "~standard": {
                version: 1,
                vendor: "utility-appearance-kit",
                validate: normalizeOptions
            }
        };

        exports.name = name;
        exports.inject = inject;
        exports.apply = apply;
        exports.Config = Config;
        if (typeof globalThis !== "undefined" && globalThis.__DSH_UAK_TEST__ === true) {
            exports.__test = {
                HOLIDAY_FALLBACK,
                LEVEL_PROFILES,
                LEVEL_WIDTH,
                railWidthFor,
                valueWidthFor,
                buildHolidaySet,
                calendarHasYear,
                isPeakTime,
                levelProfile,
                mergeCalendar,
                nextPeakChangeAt,
                remainingLabel,
                normalizeOptions
            };
        }
