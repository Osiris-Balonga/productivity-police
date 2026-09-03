import assert from "node:assert/strict";
import test from "node:test";
import {evaluateBranchPolicy} from "./branch-policy.mjs";

const repo = {id: 42};
const fork = {id: 99};
const pr = (base, head, headRepo = repo) => ({base: {ref: base, repo}, head: {ref: head, repo: headRepo}});

test("branch policy accepts planned work branches targeting dev", () => {
  for (const branch of ["feat/schedule", "fix/quota", "chore/bootstrap", "docs/plan", "test/migration", "ci/quality", "build/extension", "refactor/domain"]) {
    assert.equal(evaluateBranchPolicy(pr("dev", branch)).ok, true, branch);
  }
});

test("branch policy accepts prefixed fork branches targeting dev", () => {
  assert.equal(evaluateBranchPolicy(pr("dev", "fix/report", fork)).ok, true);
});

test("branch policy rejects unplanned branch names targeting dev", () => {
  assert.equal(evaluateBranchPolicy(pr("dev", "random-work")).ok, false);
});

test("branch policy permits only same-repository dev targeting main", () => {
  assert.equal(evaluateBranchPolicy(pr("main", "dev")).ok, true);
  assert.equal(evaluateBranchPolicy(pr("main", "dev", fork)).ok, false);
  assert.equal(evaluateBranchPolicy(pr("main", "release/v1")).ok, false);
});

test("branch policy permits same-repository main synchronization into dev", () => {
  assert.equal(evaluateBranchPolicy(pr("dev", "main")).ok, true);
  assert.equal(evaluateBranchPolicy(pr("dev", "main", fork)).ok, false);
});

test("branch policy fails closed on missing metadata or unknown bases", () => {
  assert.equal(evaluateBranchPolicy({}).ok, false);
  assert.equal(evaluateBranchPolicy(pr("preview", "feat/demo")).ok, false);
});
