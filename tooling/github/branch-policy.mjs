const allowedPrefixes = [
  "feat/",
  "fix/",
  "chore/",
  "docs/",
  "test/",
  "ci/",
  "build/",
  "refactor/",
];

export function evaluateBranchPolicy(pullRequest) {
  const base = pullRequest?.base;
  const head = pullRequest?.head;
  if (!base?.ref || !head?.ref || !base?.repo?.id || !head?.repo?.id) {
    return {ok: false, reason: "Pull request metadata is incomplete."};
  }

  if (base.ref === "main") {
    const sameRepository = base.repo.id === head.repo.id;
    return head.ref === "dev" && sameRepository
      ? {ok: true, reason: "Same-repository dev may promote to main."}
      : {ok: false, reason: "Only the same repository's dev branch may target main."};
  }

  if (base.ref === "dev") {
    const sameRepositoryMain = head.ref === "main" && base.repo.id === head.repo.id;
    const plannedBranch = allowedPrefixes.some((prefix) => head.ref.startsWith(prefix));
    return sameRepositoryMain || plannedBranch
      ? {ok: true, reason: "The branch may target dev."}
      : {ok: false, reason: `Branches targeting dev must use an allowed prefix: ${allowedPrefixes.join(", ")}.`};
  }

  return {ok: false, reason: `Unsupported base branch: ${base.ref}.`};
}
