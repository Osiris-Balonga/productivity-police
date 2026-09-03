import { describe, expect, it } from "vitest";

import {
  GitHubTaskProvider,
  type ProviderHttpRequest,
  type ProviderHttpResponse,
} from "../../packages/integrations/src";

describe("GitHub assigned issues adapter", () => {
  it("INT-01 requests and normalizes only issues assigned to the connected account", async () => {
    const requests: ProviderHttpRequest[] = [];
    const response: ProviderHttpResponse = {
      status: 200,
      headers: {},
      body: [
        {
          id: 101,
          title: "Assigned issue",
          html_url: "https://github.test/acme/work/issues/101",
          assignees: [{ login: "focus-user" }],
          labels: [{ name: "priority:high" }],
        },
        {
          id: 102,
          title: "Someone else issue",
          html_url: "https://github.test/acme/work/issues/102",
          assignees: [{ login: "another-user" }],
          labels: [],
        },
        {
          id: 103,
          title: "Assigned pull request",
          html_url: "https://github.test/acme/work/pull/103",
          assignees: [{ login: "focus-user" }],
          pull_request: {},
        },
      ],
    };
    const provider = new GitHubTaskProvider({
      accountRef: "focus-user",
      accessToken: "synthetic-token",
      request: (request) => {
        requests.push(request);
        return Promise.resolve(response);
      },
    });

    await expect(provider.refresh()).resolves.toEqual([
      {
        id: "101",
        title: "Assigned issue",
        url: "https://github.test/acme/work/issues/101",
        priority: "high",
        source: "github",
      },
    ]);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      method: "GET",
      headers: {
        accept: "application/vnd.github+json",
        authorization: "Bearer synthetic-token",
      },
    });
    expect(new URL(requests[0]?.url ?? "").searchParams.get("filter")).toBe(
      "assigned",
    );
  });
});
