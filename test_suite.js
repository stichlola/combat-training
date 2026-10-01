import esbuild from "esbuild";
import fs from "fs";
import path from "path";

async function run() {
  // Bundle a small test runner using esbuild
  const testCode = `
    import React from "react";
    import ReactDOMServer from "react-dom/server";
    import { ResultsScreen } from "./src/components/ResultsScreen.jsx";

    // Test cases for results object:
    const tests = [
      {
        name: "Normal results",
        results: {
          name: "Scheda A",
          quests: [],
          xpGain: 60,
          xpBefore: 100,
          levelBefore: 1,
          ptModifiedWhileTraining: false
        }
      },
      {
        name: "Results with quests",
        results: {
          name: "Scheda B",
          quests: [
            { text: "Fai 10 serie", prog: 5, target: 10, done: false, before: 5, after: 10, completedNow: true, xp: 50, metric: "sets" },
            { text: "Solleva 1000 kg", prog: 500, target: 1000, done: false, before: 500, after: 1000, completedNow: true, xp: 50, metric: "volume" },
            { text: "20 min cardio", prog: 10, target: 20, done: false, before: 10, after: 20, completedNow: true, xp: 50, metric: "cardio" }
          ],
          xpGain: 160,
          xpBefore: 200,
          levelBefore: 2,
          ptModifiedWhileTraining: true
        }
      },
      {
        name: "Results with undefined quests",
        results: {
          name: "Scheda C",
          quests: undefined,
          xpGain: 60,
          xpBefore: 0,
          levelBefore: 1
        }
      },
      {
        name: "Results with null quests",
        results: {
          name: "Scheda D",
          quests: null,
          xpGain: 60,
          xpBefore: 0,
          levelBefore: 1
        }
      }
    ];

    for (const t of tests) {
      console.log("--- Testing: " + t.name + " ---");
      try {
        const html = ReactDOMServer.renderToString(
          React.createElement(ResultsScreen, {
            results: t.results,
            onClose: () => {},
            standard: false
          })
        );
        console.log("SUCCESS, rendered " + html.length + " chars");
      } catch (e) {
        console.error("FAILED with error:", e);
      }
    }
  `;

  fs.writeFileSync("temp_bundle_input.jsx", testCode);

  await esbuild.build({
    entryPoints: ["temp_bundle_input.jsx"],
    outfile: "temp_bundle_output.cjs",
    bundle: true,
    platform: "node",
    format: "cjs",
    loader: { ".jsx": "jsx", ".js": "js" },
    external: ["canvas", "jsdom"]
  });

  console.log("Bundle created, running test...");
  const { execSync } = await import("child_process");
  const out = execSync("node temp_bundle_output.cjs", { encoding: "utf8" });
  console.log(out);

  fs.unlinkSync("temp_bundle_input.jsx");
  fs.unlinkSync("temp_bundle_output.cjs");
}

run().catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});
