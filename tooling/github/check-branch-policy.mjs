import fs from "node:fs";
import {evaluateBranchPolicy} from "./branch-policy.mjs";

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  console.error("GITHUB_EVENT_PATH is required.");
  process.exit(1);
}

const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const result = evaluateBranchPolicy(event.pull_request);
console.log(result.reason);
if (!result.ok) process.exit(1);
