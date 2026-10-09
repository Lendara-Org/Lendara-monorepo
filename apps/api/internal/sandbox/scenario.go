package sandbox

import (
	"strings"
	"time"
)

// Scenario is the simulated outcome of a deposit, chosen by the decimals of
// the fiat amount (CLAUDE.md §6.6, documented in /docs/sandbox-scenarios).
type Scenario string

// Sandbox scenarios.
const (
	ScenarioApproved           Scenario = "approved"             // any other decimals
	ScenarioKYCRejected        Scenario = "kyc_rejected"         // .13
	ScenarioPaymentNotReceived Scenario = "payment_not_received" // .99
	ScenarioDelayed            Scenario = "delayed"              // .50
)

// DelayedFor is how long a delayed deposit stays in pending_anchor.
const DelayedFor = 30 * time.Second

// ScenarioFor returns the scenario of a fiat amount such as "10000.13".
func ScenarioFor(amount string) Scenario {
	_, decimals, _ := strings.Cut(amount, ".")
	switch (decimals + "00")[:2] {
	case "13":
		return ScenarioKYCRejected
	case "99":
		return ScenarioPaymentNotReceived
	case "50":
		return ScenarioDelayed
	default:
		return ScenarioApproved
	}
}
