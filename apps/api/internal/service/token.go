// Package service contains domain logic shared across handlers, such as JWT
// token signing and verification.
package service

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ErrInvalidToken is returned when a token is malformed or fails verification.
// ErrExpiredToken is returned when a token has passed its expiration time.
var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token expired")
)

// Claims is the set of JWT claims issued for authenticated users.
type Claims struct {
	Sub   int64  `json:"sub"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
	Exp   int64  `json:"exp"`
	Iat   int64  `json:"iat"`
}

// Claims implements the jwt.Claims interface below so golang-jwt handles validation.

// GetExpirationTime reports the token expiration time.
func (c Claims) GetExpirationTime() (*jwt.NumericDate, error) {
	return jwt.NewNumericDate(time.Unix(c.Exp, 0)), nil
}

// GetIssuedAt reports when the token was issued.
func (c Claims) GetIssuedAt() (*jwt.NumericDate, error) {
	return jwt.NewNumericDate(time.Unix(c.Iat, 0)), nil
}

// GetNotBefore reports the not-before time; unused, always nil.
func (c Claims) GetNotBefore() (*jwt.NumericDate, error) { return nil, nil }

// GetIssuer reports the token issuer; unused, always empty.
func (c Claims) GetIssuer() (string, error) { return "", nil }

// GetSubject reports the subject (user ID) as a string.
func (c Claims) GetSubject() (string, error) { return strconv.FormatInt(c.Sub, 10), nil }

// GetAudience reports the token audience; unused, always nil.
func (c Claims) GetAudience() (jwt.ClaimStrings, error) { return nil, nil }

// SignToken signs the given claims with the secret using HS256.
func SignToken(claims Claims, secret string) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

// VerifyToken parses and validates a signed token string, returning its claims.
func VerifyToken(tokenStr, secret string) (Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(secret), nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return Claims{}, ErrExpiredToken
		}
		return Claims{}, ErrInvalidToken
	}
	c, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return Claims{}, ErrInvalidToken
	}
	return *c, nil
}

// TokenExpiry returns the Unix expiration timestamp for a newly issued token.
func TokenExpiry() int64 {
	return time.Now().Add(24 * time.Hour).Unix()
}
