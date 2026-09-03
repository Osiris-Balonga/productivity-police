import { startDistractionRuntime } from "./distraction-runtime";
import { initializeChromeFreshInstall } from "./installation-bootstrap";
import { startProviderRefreshRuntime } from "./provider-refresh-runtime";
import { startReportingRuntime } from "./reporting-runtime";
import { startRetentionRuntime } from "./retention-runtime";

void initializeChromeFreshInstall().then(
  startExtensionRuntimes,
  startExtensionRuntimes,
);

function startExtensionRuntimes(): void {
  startDistractionRuntime();
  startProviderRefreshRuntime();
  startReportingRuntime();
  startRetentionRuntime();
}
