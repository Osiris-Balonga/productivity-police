import { type ExternalTask, type TaskProvider } from "./provider-cache";
import {
  readRecord,
  requestProvider,
  type ProviderHttpClient,
} from "./provider-http";

export interface GitHubTaskProviderOptions {
  readonly accountRef: string;
  readonly accessToken: string;
  readonly request: ProviderHttpClient;
  readonly apiBaseUrl?: string | undefined;
}

export class GitHubTaskProvider implements TaskProvider {
  readonly id = "github" as const;
  readonly #accountRef: string;
  readonly #accessToken: string;
  readonly #request: ProviderHttpClient;
  readonly #apiBaseUrl: string;

  constructor(options: GitHubTaskProviderOptions) {
    this.#accountRef = options.accountRef;
    this.#accessToken = options.accessToken;
    this.#request = options.request;
    this.#apiBaseUrl = options.apiBaseUrl ?? "https://api.github.com";
  }

  getAssignedTasksUrl(): string {
    return "https://github.com/issues/assigned";
  }

  getAssignedTasks(): Promise<readonly ExternalTask[]> {
    return this.refresh();
  }

  async refresh(): Promise<readonly ExternalTask[]> {
    const initial = new URL("/issues", this.#apiBaseUrl);
    initial.searchParams.set("filter", "assigned");
    initial.searchParams.set("state", "open");
    initial.searchParams.set("per_page", "100");
    const tasks: ExternalTask[] = [];
    const visited = new Set<string>();
    let url: string | undefined = initial.href;

    while (url !== undefined) {
      if (visited.has(url)) {
        throw new Error("GitHub pagination cycle");
      }
      visited.add(url);
      const response = await requestProvider(this.#request, {
        method: "GET",
        url,
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${this.#accessToken}`,
          "x-github-api-version": "2022-11-28",
        },
      });
      if (!Array.isArray(response.body)) {
        throw new Error("Invalid GitHub issues response");
      }
      for (const value of response.body) {
        const task = normalizeIssue(value, this.#accountRef);
        if (task !== undefined) {
          tasks.push(task);
        }
      }
      url = readNextLink(response.headers.link);
    }
    return Object.freeze(tasks);
  }
}

function normalizeIssue(
  value: unknown,
  accountRef: string,
): ExternalTask | undefined {
  const issue = readRecord(value);
  if (issue === undefined || readRecord(issue.pull_request) !== undefined) {
    return undefined;
  }
  const assignees = Array.isArray(issue.assignees) ? issue.assignees : [];
  const assigned = assignees.some(
    (assignee) => readRecord(assignee)?.login === accountRef,
  );
  if (
    !assigned ||
    (typeof issue.id !== "number" && typeof issue.id !== "string") ||
    typeof issue.title !== "string" ||
    typeof issue.html_url !== "string"
  ) {
    return undefined;
  }
  const priority = readPriority(issue.labels);
  return Object.freeze({
    id: String(issue.id),
    title: issue.title,
    url: issue.html_url,
    ...(priority === undefined ? {} : { priority }),
    source: "github",
  });
}

function readPriority(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  for (const labelValue of value) {
    const name = readRecord(labelValue)?.name;
    if (typeof name === "string" && name.startsWith("priority:")) {
      return name.slice("priority:".length);
    }
  }
  return undefined;
}

function readNextLink(link: string | undefined): string | undefined {
  if (link === undefined) {
    return undefined;
  }
  for (const part of link.split(",")) {
    const match = /<([^>]+)>;\s*rel="next"/.exec(part);
    if (match?.[1] !== undefined) {
      return match[1];
    }
  }
  return undefined;
}
