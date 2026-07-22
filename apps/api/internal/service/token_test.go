package service

import (
	"testing"
	"time"
)

func TestSignAndVerify(t *testing.T) {
	secret := "test-secret"
	claims := Claims{Sub: 42, Name: "Alice", Email: "alice@example.com", Role: "admin", Exp: TokenExpiry()}

	token, err := SignToken(claims, secret)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	got, err := VerifyToken(token, secret)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if got.Sub != 42 || got.Name != "Alice" || got.Role != "admin" {
		t.Errorf("got %+v", got)
	}
}

func TestVerifyToken_WrongSecret(t *testing.T) {
	tok, _ := SignToken(Claims{Sub: 1, Exp: TokenExpiry()}, "secret-a")
	if _, err := VerifyToken(tok, "secret-b"); err == nil {
		t.Error("want error for wrong secret")
	}
}

func TestVerifyToken_Malformed(t *testing.T) {
	if _, err := VerifyToken("not.a.jwt", "secret"); err == nil {
		t.Error("want error for malformed token")
	}
}

func TestVerifyToken_Expired(t *testing.T) {
	expired := Claims{Sub: 1, Exp: time.Now().Add(-time.Hour).Unix()}
	tok, _ := SignToken(expired, "secret")
	_, err := VerifyToken(tok, "secret")
	if err != ErrExpiredToken {
		t.Errorf("want ErrExpiredToken, got %v", err)
	}
}

func TestTokenExpiry(t *testing.T) {
	exp := time.Unix(TokenExpiry(), 0)
	if exp.Before(time.Now().Add(23 * time.Hour)) {
		t.Error("expiry should be at least 23h in the future")
	}
}

func TestNewRefreshToken_UniqueAndNonEmpty(t *testing.T) {
	a, err := NewRefreshToken()
	if err != nil {
		t.Fatalf("NewRefreshToken: %v", err)
	}
	b, err := NewRefreshToken()
	if err != nil {
		t.Fatalf("NewRefreshToken: %v", err)
	}
	if a == "" || b == "" {
		t.Fatal("want non-empty tokens")
	}
	if a == b {
		t.Error("want distinct tokens on each call")
	}
}

func TestHashRefreshToken_Deterministic(t *testing.T) {
	tok, err := NewRefreshToken()
	if err != nil {
		t.Fatalf("NewRefreshToken: %v", err)
	}
	first := HashRefreshToken(tok)
	second := HashRefreshToken(tok)
	if first != second {
		t.Error("want the same hash for the same token")
	}
	if first == tok {
		t.Error("hash should not equal the raw token")
	}
}
