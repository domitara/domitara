// Package version exposes the running server version.
package version

// Version is the server version string. It defaults to a development value and
// can be overridden at build time with:
//
//	go build -ldflags "-X github.com/domitara/domitara/apps/api/internal/version.Version=1.2.3"
var Version = "1.0.0"
