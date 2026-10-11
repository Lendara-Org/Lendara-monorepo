// Package sandbox holds the simulated fiat side of the anchor: fictitious
// exchange rates, fee and deposit limits. Nothing here moves real money.
package sandbox

import (
	"errors"
	"fmt"
	"math/big"
	"regexp"
)

// AssetCode is the Stellar test asset delivered by deposits.
const AssetCode = "USDC"

// Deposit limits in USDC, published in SEP-24 /info.
const (
	MinDeposit = 1
	MaxDeposit = 10000
)

// Fee is the fixed, simulated fee in USDC.
const Fee = "0.50"

// Rates are fictitious fiat units per 1 USDC.
var Rates = map[string]string{
	"CRC": "510",
	"ARS": "1000",
	"CLP": "950",
}

// ErrInvalidQuote means the currency or amount cannot be quoted.
var ErrInvalidQuote = errors.New("invalid quote")

// fiatAmountPattern matches openapi.yaml FiatAmount: up to 2 decimals.
var fiatAmountPattern = regexp.MustCompile(`^[0-9]+(\.[0-9]{1,2})?$`)

// Quote is a simulated conversion. Amounts are decimal strings.
type Quote struct {
	FiatCurrency string
	AmountIn     string // fiat, 2 decimals
	Rate         string // fiat per USDC
	Fee          string // USDC
	AmountOut    string // USDC after the fee, 7 decimals
}

// NewQuote converts a fiat amount to USDC: amount / rate - fee, rounded down
// to Stellar's 7 decimals. The result must be within the deposit limits.
func NewQuote(currency, amount string) (Quote, error) {
	rateStr, ok := Rates[currency]
	if !ok {
		return Quote{}, fmt.Errorf("%w: fiat_currency must be CRC, ARS or CLP", ErrInvalidQuote)
	}
	if !fiatAmountPattern.MatchString(amount) {
		return Quote{}, fmt.Errorf("%w: amount must be a positive number with up to 2 decimals", ErrInvalidQuote)
	}

	in, _ := new(big.Rat).SetString(amount)
	rate, _ := new(big.Rat).SetString(rateStr)
	fee, _ := new(big.Rat).SetString(Fee)
	out := new(big.Rat).Sub(new(big.Rat).Quo(in, rate), fee)

	if out.Cmp(big.NewRat(MinDeposit, 1)) < 0 || out.Cmp(big.NewRat(MaxDeposit, 1)) > 0 {
		return Quote{}, fmt.Errorf("%w: the deposit must be between %d and %d %s after the fee",
			ErrInvalidQuote, MinDeposit, MaxDeposit, AssetCode)
	}
	return Quote{
		FiatCurrency: currency,
		AmountIn:     in.FloatString(2),
		Rate:         rateStr,
		Fee:          Fee,
		AmountOut:    floorString(out, 7),
	}, nil
}

// floorString formats a non-negative r with n decimals, rounding down.
// (big.Rat.FloatString rounds half away from zero.)
func floorString(r *big.Rat, n int) string {
	scale := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(n)), nil)
	scaled := new(big.Int).Quo(new(big.Int).Mul(r.Num(), scale), r.Denom())
	return new(big.Rat).SetFrac(scaled, scale).FloatString(n)
}
