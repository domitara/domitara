package api

import (
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/your-org/monorepo/apps/api/internal/api/handler"
	apimw "github.com/your-org/monorepo/apps/api/internal/api/middleware"
	"github.com/your-org/monorepo/apps/api/internal/config"
	store "github.com/your-org/monorepo/apps/api/internal/db/sqlc"
	"github.com/your-org/monorepo/apps/api/internal/web"
)

var bearerAuth = []map[string][]string{{"bearer": {}}}

func NewRouter(pool *pgxpool.Pool, cfg *config.Config) http.Handler {
	q := store.New(pool)
	h := handler.New(q, pool, cfg.JWTSecret)

	r := chi.NewRouter()
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RequestID)
	r.Use(apimw.OptionalAuth(cfg.JWTSecret))

	apiConfig := huma.DefaultConfig("Domitara API", "1.0.0")
	apiConfig.Components.SecuritySchemes = map[string]*huma.SecurityScheme{
		"bearer": {Type: "http", Scheme: "bearer", BearerFormat: "JWT"},
	}
	api := humachi.New(r, apiConfig)

	// Health
	huma.Register(api, huma.Operation{
		Method: http.MethodGet, Path: "/health", Summary: "Health check",
	}, h.Health)

	// System
	huma.Register(api, huma.Operation{
		Method: http.MethodGet, Path: "/api/v1/system/status", Summary: "System status",
	}, h.SystemStatus)
	huma.Register(api, huma.Operation{
		Method: http.MethodPost, Path: "/api/v1/system/setup", Summary: "Initial setup", DefaultStatus: 201,
	}, h.Setup)

	// Auth
	huma.Register(api, huma.Operation{
		Method: http.MethodPost, Path: "/api/v1/auth/login", Summary: "Login",
	}, h.Login)
	huma.Register(api, huma.Operation{
		Method: http.MethodGet, Path: "/api/v1/auth/me", Summary: "Current user", Security: bearerAuth,
	}, h.Me)
	huma.Register(api, huma.Operation{
		Method: http.MethodPatch, Path: "/api/v1/auth/me", Summary: "Update current user", Security: bearerAuth,
	}, h.UpdateMe)

	// Dashboard
	huma.Register(api, huma.Operation{
		Method: http.MethodGet, Path: "/api/v1/dashboard", Summary: "Dashboard stats", Security: bearerAuth,
	}, h.Dashboard)

	// Locations
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/locations", Summary: "List locations", Security: bearerAuth}, h.ListLocations)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/locations", Summary: "Create location", DefaultStatus: 201, Security: bearerAuth}, h.CreateLocation)
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/locations/{id}", Summary: "Get location", Security: bearerAuth}, h.GetLocation)
	huma.Register(api, huma.Operation{Method: http.MethodPut, Path: "/api/v1/locations/{id}", Summary: "Update location", Security: bearerAuth}, h.UpdateLocation)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/locations/{id}", Summary: "Delete location", DefaultStatus: 204, Security: bearerAuth}, h.DeleteLocation)

	// Labels
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/labels", Summary: "List labels", Security: bearerAuth}, h.ListLabels)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/labels", Summary: "Create label", DefaultStatus: 201, Security: bearerAuth}, h.CreateLabel)
	huma.Register(api, huma.Operation{Method: http.MethodPut, Path: "/api/v1/labels/{id}", Summary: "Update label", Security: bearerAuth}, h.UpdateLabel)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/labels/{id}", Summary: "Delete label", DefaultStatus: 204, Security: bearerAuth}, h.DeleteLabel)

	// Items
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/items", Summary: "List items", Security: bearerAuth}, h.ListItems)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/items", Summary: "Create item", DefaultStatus: 201, Security: bearerAuth}, h.CreateItem)
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/items/{id}", Summary: "Get item", Security: bearerAuth}, h.GetItem)
	huma.Register(api, huma.Operation{Method: http.MethodPut, Path: "/api/v1/items/{id}", Summary: "Update item", Security: bearerAuth}, h.UpdateItem)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/items/{id}", Summary: "Delete item", DefaultStatus: 204, Security: bearerAuth}, h.DeleteItem)

	// Maintenance
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/maintenance", Summary: "List maintenance logs", Security: bearerAuth}, h.ListMaintenance)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/maintenance", Summary: "Create maintenance log", DefaultStatus: 201, Security: bearerAuth}, h.CreateMaintenance)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/maintenance/{id}", Summary: "Delete maintenance log", DefaultStatus: 204, Security: bearerAuth}, h.DeleteMaintenance)

	// Admin
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/admin/users", Summary: "List users (admin)", Security: bearerAuth}, h.AdminListUsers)
	huma.Register(api, huma.Operation{Method: http.MethodPut, Path: "/api/v1/admin/users/{id}", Summary: "Update user (admin)", Security: bearerAuth}, h.AdminUpdateUser)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/admin/users/{id}", Summary: "Delete user (admin)", DefaultStatus: 204, Security: bearerAuth}, h.AdminDeleteUser)

	// SPA catch-all — must be last, not through HUMA
	r.Handle("/*", spaHandler(web.FS()))

	return r
}

func spaHandler(fs http.FileSystem) http.Handler {
	fileServer := http.FileServer(fs)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f, err := fs.Open(r.URL.Path)
		if err != nil {
			r.URL.Path = "/"
		} else {
			f.Close()
		}
		fileServer.ServeHTTP(w, r)
	})
}
