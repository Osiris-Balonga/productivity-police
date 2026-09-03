import {
  PROVIDER_IDS,
  type ExternalTask,
  type ProviderId,
} from "./provider-cache";

export interface BlockTaskGroup {
  readonly provider: ProviderId;
  readonly taskCount: number;
  readonly task: Readonly<ExternalTask>;
}

export function selectBlockTaskGroups(
  integrations: unknown,
): readonly Readonly<BlockTaskGroup>[] {
  const section = readRecord(integrations);
  const configs = readRecord(section.configs);
  const caches = readRecord(section.caches);
  const groups: BlockTaskGroup[] = [];
  for (const provider of PROVIDER_IDS) {
    const config = readRecord(configs[provider]);
    const cache = readRecord(caches[provider]);
    if (
      config.provider !== provider ||
      config.connected !== true ||
      config.status !== "connected" ||
      cache.provider !== provider ||
      (cache.status !== "fresh" && cache.status !== "stale") ||
      !Array.isArray(cache.tasks)
    ) {
      continue;
    }
    const tasks = cache.tasks.filter((task): task is ExternalTask =>
      isExternalTask(task, provider),
    );
    const task = tasks[0];
    if (task === undefined) {
      continue;
    }
    groups.push(
      Object.freeze({
        provider,
        taskCount: tasks.length,
        task: Object.freeze({ ...task }),
      }),
    );
  }
  return Object.freeze(groups);
}

function isExternalTask(
  value: unknown,
  provider: ProviderId,
): value is ExternalTask {
  const task = readRecord(value);
  return (
    task.source === provider &&
    typeof task.id === "string" &&
    task.id.length > 0 &&
    typeof task.title === "string" &&
    task.title.length > 0 &&
    typeof task.url === "string" &&
    isHttpUrl(task.url) &&
    (task.priority === undefined || typeof task.priority === "string")
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
