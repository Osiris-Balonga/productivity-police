import { startDistractionRuntime } from "./distraction-runtime";
import { initializeChromeFreshInstall } from "./installation-bootstrap";
import { startProviderRefreshRuntime } from "./provider-refresh-runtime";
import { startReportingRuntime } from "./reporting-runtime";
import { startRetentionRuntime } from "./retention-runtime";

await initializeChromeFreshInstall();
startDistractionRuntime();
startProviderRefreshRuntime();
startReportingRuntime();
startRetentionRuntime();
