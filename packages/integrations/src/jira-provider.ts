import { type ExternalTask, type TaskProvider } from "./provider-cache";
import {
  readRecord,
  requestProvider,
  type ProviderHttpClient,
} from "./provider-http";

export interface JiraTaskProviderOptions {
  readonly accountRef: string;
  readonly accessToken: string;
  readonly cloudId: string;
  readonly siteUrl: string;
  readonly request: ProviderHttpClient;
  readonly apiBaseUrl?: string | undefined;
}

export class JiraTaskProvider implements TaskProvider {
  readonly id = "jira" as const;
  readonly #accountRef: string;
  readonly #accessToken: string;
  readonly #cloudId: string;
  readonly #siteUrl: string;
  readonly #request: ProviderHttpClient;
  readonly #apiBaseUrl: string;

  constructor(options: JiraTaskProviderOptions) {
    this.#accountRef = options.accountRef;
    this.#accessToken = options.accessToken;
    this.#cloudId = options.cloudId;
    this.#siteUrl = options.siteUrl.replace(/\/$/, "");
    this.#request = options.request;
    this.#apiBaseUrl = options.apiBaseUrl ?? "https://api.atlassian.com";
  }

  getAssignedTasksUrl(): string {
    return `${this.#siteUrl}/issues/?jql=assignee%20%3D%20currentUser()`;
  }

  getAssignedTasks(): Promise<readonly ExternalTask[]> {
    return this.refresh();
  }

  async refresh(): Promise<readonly ExternalTask[]> {
    const tasks: ExternalTask[] = [];
    const seenTokens = new Set<string>();
    let nextPageToken: string | undefined;
    do {
      const url = new URL(
        `/ex/jira/${encodeURIComponent(this.#cloudId)}/rest/api/3/search/jql`,
        this.#apiBaseUrl,
      );
      url.searchParams.set(
        "jql",
        "assignee = currentUser() AND statusCategory != Done",
      );
      url.searchParams.set("fields", "summary,priority,assignee");
      url.searchParams.set("maxResults", "100");
      if (nextPageToken !== undefined) {
        url.searchParams.set("nextPageToken", nextPageToken);
      }
      const response = await requestProvider(this.#request, {
        method: "GET",
        url: url.href,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${this.#accessToken}`,
        },
      });
      const body = readRecord(response.body);
      if (body === undefined || !Array.isArray(body.issues)) {
        throw new Error("Invalid Jira issue search response");
      }
      for (const value of body.issues) {
        const task = normalizeIssue(value, this.#accountRef, this.#siteUrl);
        if (task !== undefined) {
          tasks.push(task);
        }
      }
      nextPageToken =
        body.isLast === true || typeof body.nextPageToken !== "string"
          ? undefined
          : body.nextPageToken;
      if (nextPageToken !== undefined) {
        if (seenTokens.has(nextPageToken)) {
          throw new Error("Jira pagination cycle");
        }
        seenTokens.add(nextPageToken);
      }
    } while (nextPageToken !== undefined);
    return Object.freeze(tasks);
  }
}

function normalizeIssue(
  value: unknown,
  accountRef: string,
  siteUrl: string,
): ExternalTask | undefined {
  const issue = readRecord(value);
  const fields = readRecord(issue?.fields);
  const assignee = readRecord(fields?.assignee);
  if (
    issue === undefined ||
    fields === undefined ||
    assignee?.accountId !== accountRef ||
    typeof issue.id !== "string" ||
    typeof issue.key !== "string" ||
    typeof fields.summary !== "string"
  ) {
    return undefined;
  }
  const priorityName = readRecord(fields.priority)?.name;
  return Object.freeze({
    id: issue.id,
    title: fields.summary,
    url: `${siteUrl}/browse/${encodeURIComponent(issue.key)}`,
    ...(typeof priorityName === "string" ? { priority: priorityName } : {}),
    source: "jira",
  });
}
