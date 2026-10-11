package sandbox

import (
	"errors"
	"testing"
)

func TestNewQuote(t *testing.T) {
	tests := []struct {
		currency, amount string
		wantIn, wantOut  string
	}{
		{currency: "CRC", amount: "10000", wantIn: "10000.00", wantOut: "19.1078431"}, // 19.6078431... - 0.50, rounded down
		{currency: "ARS", amount: "25000.50", wantIn: "25000.50", wantOut: "24.5005000"},
		{currency: "CLP", amount: "9500", wantIn: "9500.00", wantOut: "9.5000000"},
	}
	for _, tt := range tests {
		t.Run(tt.currency+" "+tt.amount, func(t *testing.T) {
			q, err := NewQuote(tt.currency, tt.amount)
			if err != nil {
				t.Fatalf("NewQuote() error = %v", err)
			}
			if q.AmountIn != tt.wantIn || q.AmountOut != tt.wantOut {
				t.Errorf("in, out = %s, %s; want %s, %s", q.AmountIn, q.AmountOut, tt.wantIn, tt.wantOut)
			}
			if q.Fee != Fee || q.Rate != Rates[tt.currency] {
				t.Errorf("fee, rate = %s, %s", q.Fee, q.Rate)
			}
		})
	}
}

func TestNewQuoteRejects(t *testing.T) {
	tests := map[string][2]string{
		"unknown currency": {"USD", "100"},
		"three decimals":   {"CLP", "10.123"},
		"negative":         {"CLP", "-10"},
		"not a number":     {"CLP", "ten"},
		"below minimum":    {"CLP", "1424.99"},    // 1.4999... - 0.50 < 1
		"above maximum":    {"CLP", "9500475.01"}, // > 10000 USDC after fee
	}
	for name, in := range tests {
		t.Run(name, func(t *testing.T) {
			if _, err := NewQuote(in[0], in[1]); !errors.Is(err, ErrInvalidQuote) {
				t.Errorf("NewQuote(%s, %s) error = %v, want ErrInvalidQuote", in[0], in[1], err)
			}
		})
	}
}
