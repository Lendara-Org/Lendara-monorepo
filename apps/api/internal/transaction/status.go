// Package transaction holds the deposit state machine and its storage.
// Statuses are the SEP-24 subset described in CLAUDE.md §6.5.
package transaction

import "fmt"

// Status is a SEP-24 transaction status.
type Status string

// Statuses used by the sandbox.
const (
	StatusIncomplete               Status = "incomplete"
	StatusPendingUserTransferStart Status = "pending_user_transfer_start"
	StatusPendingAnchor            Status = "pending_anchor"
	StatusPendingTrust             Status = "pending_trust"
	StatusPendingStellar           Status = "pending_stellar"
	StatusCompleted                Status = "completed"
	StatusError                    Status = "error"
	StatusExpired                  Status = "expired"
)

// transitions lists the allowed moves from each status. Terminal statuses
// (completed, error, expired) have none.
var transitions = map[Status][]Status{
	StatusIncomplete:               {StatusPendingUserTransferStart, StatusError},
	StatusPendingUserTransferStart: {StatusPendingAnchor, StatusExpired, StatusError},
	StatusPendingAnchor:            {StatusPendingStellar, StatusPendingTrust, StatusError},
	// The user added the USDC trustline: retry the payment.
	StatusPendingTrust: {StatusPendingAnchor, StatusError},
	// A prior submission that never resolved (e.g. the worker crashed before
	// submitting or confirming it): allow a fresh attempt with a new hash.
	StatusPendingStellar: {StatusPendingStellar, StatusCompleted, StatusError},
}

// CheckTransition returns an error if a transaction cannot move from -> to.
func CheckTransition(from, to Status) error {
	for _, allowed := range transitions[from] {
		if allowed == to {
			return nil
		}
	}
	return fmt.Errorf("%w: %s -> %s", ErrInvalidTransition, from, to)
}
