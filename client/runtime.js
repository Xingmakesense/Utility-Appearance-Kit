        const module = { exports: {} };
        const exports = module.exports;
        const react = require("react");
        let reactDom;
        try {
            reactDom = require("react-dom");
        } catch {
            reactDom = undefined;
        }
        let primitives;
        try {
            primitives = require("@deepseek-ai/dsh-client-ui-primitives");
        } catch {
            primitives = undefined;
        }

        const name = "utility-appearance-kit";
        const inject = ["slots"];
        const sliderSlot = "conversation.input.right";
