package config

import (
	"fmt"
	"os"
)

type Config struct {
	DatabaseURL    string
	Port           string
	Env            string
	JWTSecret      string
	AllowedOrigins string
	ShowAPIDocs    bool
}

func Load() (*Config, error) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	env := getEnv("ENV", "development")
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must be at least 32 characters")
	}
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}
	return &Config{
		DatabaseURL:    dbURL,
		Port:           port,
		Env:            env,
		JWTSecret:      secret,
		AllowedOrigins: os.Getenv("ALLOWED_ORIGINS"),
		ShowAPIDocs:    os.Getenv("SHOW_API_DOCS") == "true",
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
