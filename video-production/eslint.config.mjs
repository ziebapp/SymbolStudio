import { config } from "@remotion/eslint-config-flat";

export default [
  ...config,
  {
    // Manifests use a data field named `transition` (shot transitions), not CSS transitions.
    files: ["compositions/**/*.manifest.ts"],
    rules: { "@remotion/non-pure-animation": "off" },
  },
];
