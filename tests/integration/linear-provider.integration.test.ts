import { describe, expect, it } from "vitest";

import {
  LinearTaskProvider,
  type ProviderHttpRequest,
} from "../../packages/integrations/src";

describe("Linear assigned issues adapter", () => {
  it("INT-03 queries and normalizes only issues assigned to the connected account", async () => {
    const requests: ProviderHttpRequest[] = [];
    const provider = new LinearTaskProvider({
      accountRef: "linear-user-1",
      accessToken: "synthetic-token",
      request: (request) => {
        requests.push(request);
        return Promise.resolve({
          status: 200,
          headers: {},
          body: {
            data: {
              viewer: {
                id: "linear-user-1",
                assignedIssues: {
                  nodes: [
                    {
                      id: "issue-1",
                      identifier: "FOC-7",
                      title: "Assigned issue",
                      priority: 2,
                      url: "https://linear.app/acme/issue/FOC-7",
                      assignee: { id: "linear-user-1" },
                    },
                    {
                      id: "issue-2",
                      identifier: "FOC-8",
                      title: "Another user issue",
                      priority: 4,
                      url: "https://linear.app/acme/issue/FOC-8",
                      assignee: { id: "linear-user-2" },
                    },
                  ],
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            },
          },
        });
      },
    });

    await expect(provider.refresh()).resolves.toEqual([
      {
        id: "issue-1",
        title: "Assigned issue",
        url: "https://linear.app/acme/issue/FOC-7",
        priority: "High",
        source: "linear",
      },
    ]);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      method: "POST",
      url: "https://api.linear.app/graphql",
      headers: {
        accept: "application/json",
        authorization: "Bearer synthetic-token",
        "content-type": "application/json",
      },
    });
    expect(JSON.parse(requests[0]?.body ?? "{}")).toMatchObject({
      variables: { after: null },
    });
  });
});
