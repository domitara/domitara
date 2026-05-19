package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/domitara/domitara/apps/api/internal/service"
)

const testSecret = "test-secret"

func makeToken(t *testing.T, claims service.Claims) string {
	t.Helper()
	tok, err := service.SignToken(claims, testSecret)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return tok
}

func TestRequireAuth_NoClaims(t *testing.T) {
	_, err := RequireAuth(context.Background())
	if err == nil {
		t.Fatal("want error for missing claims")
	}
}

func TestRequireAuth_WithClaims(t *testing.T) {
	want := service.Claims{Sub: 1, Role: "member"}
	ctx := context.WithValue(context.Background(), ctxClaims, want)
	got, err := RequireAuth(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Sub != 1 || got.Role != "member" {
		t.Errorf("got %+v, want %+v", got, want)
	}
}

func TestRequireAdmin_NotAdmin(t *testing.T) {
	claims := service.Claims{Sub: 1, Role: "member"}
	ctx := context.WithValue(context.Background(), ctxClaims, claims)
	if _, err := RequireAdmin(ctx); err == nil {
		t.Fatal("want forbidden error for non-admin")
	}
}

func TestRequireAdmin_IsAdmin(t *testing.T) {
	claims := service.Claims{Sub: 2, Role: "admin"}
	ctx := context.WithValue(context.Background(), ctxClaims, claims)
	if _, err := RequireAdmin(ctx); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestGetActiveHome(t *testing.T) {
	ctx := context.WithValue(context.Background(), CtxActiveHome, "home-abc")
	if got := GetActiveHome(ctx); got != "home-abc" {
		t.Errorf("want home-abc, got %q", got)
	}
	if got := GetActiveHome(context.Background()); got != "" {
		t.Errorf("empty context: want empty string, got %q", got)
	}
}

func TestWithActiveHome(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Active-Home", "home-xyz")

	var capturedCtx context.Context
	WithActiveHome(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
	})).ServeHTTP(httptest.NewRecorder(), req)

	if got := GetActiveHome(capturedCtx); got != "home-xyz" {
		t.Errorf("want home-xyz, got %q", got)
	}
}

func TestWithActiveHome_NoHeader(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	var capturedCtx context.Context
	WithActiveHome(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
	})).ServeHTTP(httptest.NewRecorder(), req)

	if got := GetActiveHome(capturedCtx); got != "" {
		t.Errorf("want empty, got %q", got)
	}
}

func TestOptionalAuth_Cookie(t *testing.T) {
	claims := service.Claims{Sub: 5, Role: "member", Exp: service.TokenExpiry()}
	tok := makeToken(t, claims)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.AddCookie(&http.Cookie{Name: "token", Value: tok})

	var capturedCtx context.Context
	OptionalAuth(testSecret)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
	})).ServeHTTP(httptest.NewRecorder(), req)

	got, ok := GetClaims(capturedCtx)
	if !ok {
		t.Fatal("want claims in context from cookie")
	}
	if got.Sub != 5 {
		t.Errorf("want sub=5, got %d", got.Sub)
	}
}

func TestOptionalAuth_BearerToken(t *testing.T) {
	claims := service.Claims{Sub: 6, Role: "admin", Exp: service.TokenExpiry()}
	tok := makeToken(t, claims)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tok)

	var capturedCtx context.Context
	OptionalAuth(testSecret)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
	})).ServeHTTP(httptest.NewRecorder(), req)

	got, ok := GetClaims(capturedCtx)
	if !ok {
		t.Fatal("want claims in context from bearer")
	}
	if got.Role != "admin" {
		t.Errorf("want admin, got %q", got.Role)
	}
}

func TestOptionalAuth_InvalidToken(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.AddCookie(&http.Cookie{Name: "token", Value: "not-a-valid-jwt"})

	var capturedCtx context.Context
	OptionalAuth(testSecret)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		capturedCtx = r.Context()
	})).ServeHTTP(httptest.NewRecorder(), req)

	if _, ok := GetClaims(capturedCtx); ok {
		t.Fatal("want no claims for invalid token")
	}
}
