package sandbox

import "testing"

func TestScenarioFor(t *testing.T) {
	tests := map[string]Scenario{
		"10000":         ScenarioApproved,
		"10000.00":      ScenarioApproved,
		"10000.01":      ScenarioApproved,
		"10000.13":      ScenarioKYCRejected,
		"10000.99":      ScenarioPaymentNotReceived,
		"10000.50":      ScenarioDelayed,
		"10000.5":       ScenarioDelayed,
		"10000.5000000": ScenarioDelayed, // as stored in the database
		"13":            ScenarioApproved,
	}
	for amount, want := range tests {
		if got := ScenarioFor(amount); got != want {
			t.Errorf("ScenarioFor(%q) = %s, want %s", amount, got, want)
		}
	}
}
