import {
  ProviderRefreshError,
  type ExternalTask,
  type TaskProvider,
} from "./provider-cache";
import {
  readRecord,
  requestProvider,
  type ProviderHttpClient,
} from "./provider-http";

const ASSIGNED_ISSUES_QUERY = `query AssignedIssues($after: String) {
  viewer {
    id
    assignedIssues(first: 100, after: $after) {
      nodes { id identifier title priority url assignee { id } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

export interface LinearTaskProviderOptions {
  readonly accountRef: string;
  readonly accessToken: string;
  readonly request: ProviderHttpClient;
  readonly apiUrl?: string | undefined;
}

export class LinearTaskProvider implements TaskProvider {
  readonly id = "linear" as const;
  readonly #accountRef: string;
  readonly #accessToken: string;
  readonly #request: ProviderHttpClient;
  readonly #apiUrl: string;

  constructor(options: LinearTaskProviderOptions) {
    this.#accountRef = options.accountRef;
    this.#accessToken = options.accessToken;
    this.#request = options.request;
    this.#apiUrl = options.apiUrl ?? "https://api.linear.app/graphql";
  }

  getAssignedTasksUrl(): string {
    return "https://linear.app/my-issues/assigned";
  }

  getAssignedTasks(): Promise<readonly ExternalTask[]> {
    return this.refresh();
  }

  async refresh(): Promise<readonly ExternalTask[]> {
    const tasks: ExternalTask[] = [];
    const seenCursors = new Set<string>();
    let after: string | null = null;
    do {
      const response = await requestProvider(this.#request, {
        method: "POST",
        url: this.#apiUrl,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${this.#accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: ASSIGNED_ISSUES_QUERY,
          variables: { after },
        }),
      });
      const body = readRecord(response.body);
      if (Array.isArray(body?.errors) && body.errors.length > 0) {
        throw classifyGraphqlErrors(body.errors);
      }
      const viewer = readRecord(readRecord(body?.data)?.viewer);
      const connection = readRecord(viewer?.assignedIssues);
      const pageInfo = readRecord(connection?.pageInfo);
      if (
        viewer?.id !== this.#accountRef ||
        connection === undefined ||
        !Array.isArray(connection.nodes) ||
        pageInfo === undefined
      ) {
        throw new ProviderRefreshError("PROVIDER_ERROR");
      }
      for (const value of connection.nodes) {
        const task = normalizeIssue(value, this.#accountRef);
        if (task !== undefined) {
          tasks.push(task);
        }
      }
      after =
        pageInfo.hasNextPage === true && typeof pageInfo.endCursor === "string"
          ? pageInfo.endCursor
          : null;
      if (after !== null) {
        if (seenCursors.has(after)) {
          throw new ProviderRefreshError("PROVIDER_ERROR");
        }
        seenCursors.add(after);
      }
    } while (after !== null);
    return Object.freeze(tasks);
  }
}

function classifyGraphqlErrors(
  errors: readonly unknown[],
): ProviderRefreshError {
  const rateLimited = errors.some((value) => {
    const error = readRecord(value);
    const extensions = readRecord(error?.extensions);
    return extensions?.code === "RATELIMITED";
  });
  return new ProviderRefreshError(
    rateLimited ? "RATE_LIMITED" : "PROVIDER_ERROR",
  );
}

function normalizeIssue(
  value: unknown,
  accountRef: string,
): ExternalTask | undefined {
  const issue = readRecord(value);
  const assignee = readRecord(issue?.assignee);
  if (
    issue === undefined ||
    assignee?.id !== accountRef ||
    typeof issue.id !== "string" ||
    typeof issue.title !== "string" ||
    typeof issue.url !== "string"
  ) {
    return undefined;
  }
  const priority =
    typeof issue.priority === "number"
      ? (["", "Urgent", "High", "Medium", "Low"][issue.priority] ?? undefined)
      : undefined;
  return Object.freeze({
    id: issue.id,
    title: issue.title,
    url: issue.url,
    ...(priority ? { priority } : {}),
    source: "linear",
  });
}
