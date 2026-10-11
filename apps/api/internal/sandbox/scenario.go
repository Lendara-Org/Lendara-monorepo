package sandbox

import "time"

// Scenario is the simulated outcome of a deposit. The widget picks it from
// the test card the user enters (documented in /docs/sandbox-scenarios).
type Scenario string

// Sandbox scenarios. The values match the SandboxScenario enum in openapi.yaml.
const (
	ScenarioApproved           Scenario = "approved"
	ScenarioKYCRejected        Scenario = "kyc_rejected"
	ScenarioPaymentNotReceived Scenario = "payment_not_received"
	ScenarioDelayed            Scenario = "delayed"
)

// DelayedFor is how long a delayed deposit stays in pending_anchor.
const DelayedFor = 30 * time.Second
