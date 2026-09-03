import { describe, expect, it } from "vitest";

import {
  JiraTaskProvider,
  type ProviderHttpRequest,
} from "../../packages/integrations/src";

describe("Jira assigned tickets adapter", () => {
  it("INT-02 queries and normalizes only tickets assigned to the connected account", async () => {
    const requests: ProviderHttpRequest[] = [];
    const provider = new JiraTaskProvider({
      accountRef: "jira-account-1",
      accessToken: "synthetic-token",
      cloudId: "cloud-1",
      siteUrl: "https://acme.atlassian.net",
      request: (request) => {
        requests.push(request);
        return Promise.resolve({
          status: 200,
          headers: {},
          body: {
            issues: [
              {
                id: "10001",
                key: "FOCUS-7",
                fields: {
                  summary: "Assigned ticket",
                  assignee: { accountId: "jira-account-1" },
                  priority: { name: "High" },
                },
              },
              {
                id: "10002",
                key: "FOCUS-8",
                fields: {
                  summary: "Another user ticket",
                  assignee: { accountId: "jira-account-2" },
                  priority: { name: "Low" },
                },
              },
            ],
            isLast: true,
          },
        });
      },
    });

    await expect(provider.refresh()).resolves.toEqual([
      {
        id: "10001",
        title: "Assigned ticket",
        url: "https://acme.atlassian.net/browse/FOCUS-7",
        priority: "High",
        source: "jira",
      },
    ]);
    expect(requests).toHaveLength(1);
    const request = requests[0];
    expect(request).toMatchObject({
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: "Bearer synthetic-token",
      },
    });
    const requestUrl = new URL(request?.url ?? "");
    expect(requestUrl.pathname).toBe("/ex/jira/cloud-1/rest/api/3/search/jql");
    expect(requestUrl.searchParams.get("jql")).toBe(
      "assignee = currentUser() AND statusCategory != Done",
    );
  });
});
