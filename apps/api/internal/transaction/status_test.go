package transaction

import (
	"errors"
	"testing"
)

var allStatuses = []Status{
	StatusIncomplete, StatusPendingUserTransferStart, StatusPendingAnchor, StatusPendingTrust,
	StatusPendingStellar, StatusCompleted, StatusError, StatusExpired,
}

// TestCheckTransition checks every from -> to pair against CLAUDE.md §6.5.
func TestCheckTransition(t *testing.T) {
	allowed := map[[2]Status]bool{
		{StatusIncomplete, StatusPendingUserTransferStart}:    true,
		{StatusIncomplete, StatusError}:                       true,
		{StatusPendingUserTransferStart, StatusPendingAnchor}: true,
		{StatusPendingUserTransferStart, StatusExpired}:       true,
		{StatusPendingUserTransferStart, StatusError}:         true,
		{StatusPendingAnchor, StatusPendingStellar}:           true,
		{StatusPendingAnchor, StatusPendingTrust}:             true,
		{StatusPendingAnchor, StatusError}:                    true,
		{StatusPendingTrust, StatusPendingAnchor}:             true,
		{StatusPendingTrust, StatusError}:                     true,
		{StatusPendingStellar, StatusCompleted}:               true,
		{StatusPendingStellar, StatusError}:                   true,
	}
	for _, from := range allStatuses {
		for _, to := range allStatuses {
			err := CheckTransition(from, to)
			if want := allowed[[2]Status{from, to}]; want != (err == nil) {
				t.Errorf("CheckTransition(%s, %s) = %v, want allowed=%v", from, to, err, want)
			}
			if err != nil && !errors.Is(err, ErrInvalidTransition) {
				t.Errorf("CheckTransition(%s, %s) error = %v, want ErrInvalidTransition", from, to, err)
			}
		}
	}
}
