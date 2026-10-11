import { DemoApp } from "@/components/demo-app";
import { config } from "@/lib/config";

export default function Home() {
  return <DemoApp horizonUrl={config.horizonUrl} usdcIssuer={config.usdcIssuer} dashboardUrl={config.dashboardUrl} />;
}
