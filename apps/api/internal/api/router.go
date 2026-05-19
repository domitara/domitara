package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/domitara/domitara/apps/api/internal/api/handler"
	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	"github.com/domitara/domitara/apps/api/internal/config"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
	"github.com/domitara/domitara/apps/api/internal/web"
)

var bearerAuth = []map[string][]string{{"bearer": {}}}

func NewRouter(pool *pgxpool.Pool, cfg *config.Config) http.Handler {
	q := store.New(pool)
	h := handler.New(q, pool, cfg.JWTSecret, cfg.SecureCookies, cfg.UploadDir)

	r := chi.NewRouter()

	// CORS — must be first
	allowedOrigins := []string{"http://localhost:5173", "http://localhost:8080"}
	if cfg.AllowedOrigins != "" {
		allowedOrigins = append(allowedOrigins, strings.Split(cfg.AllowedOrigins, ",")...)
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Active-Home"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RequestID)

	// Limit request body size to 20 MB (accommodates photo uploads; JSON endpoints are far smaller)
	r.Use(func(next http.Handler) http.Handler {
		return http.MaxBytesHandler(next, 20<<20)
	})

	// Rate limit: 100 req/min per IP globally; login gets a tighter 5/min window
	r.Use(httprate.LimitByIP(100, time.Minute))
	loginLimiter := httprate.LimitByIP(5, time.Minute)
	r.Use(func(next http.Handler) http.Handler {
		limited := loginLimiter(next)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodPost && r.URL.Path == "/api/v1/auth/login" {
				limited.ServeHTTP(w, r)
			} else {
				next.ServeHTTP(w, r)
			}
		})
	})

	r.Use(apimw.WithResponseWriter)
	r.Use(apimw.OptionalAuth(cfg.JWTSecret))
	r.Use(apimw.WithActiveHome)

	apiConfig := huma.DefaultConfig("Domitara API", "1.0.0")
	apiConfig.Components.SecuritySchemes = map[string]*huma.SecurityScheme{
		"bearer": {Type: "http", Scheme: "bearer", BearerFormat: "JWT"},
	}
	// Disable docs and schema endpoints in production unless explicitly enabled
	if cfg.Env == "production" && !cfg.ShowAPIDocs {
		apiConfig.OpenAPIPath = ""
		apiConfig.DocsPath = ""
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
		Method: http.MethodPost, Path: "/api/v1/auth/login", Summary: "Login", DefaultStatus: 200,
	}, h.Login)
	huma.Register(api, huma.Operation{
		Method: http.MethodPost, Path: "/api/v1/auth/logout", Summary: "Logout", DefaultStatus: 204,
	}, h.Logout)
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

	// Maintenance schedules (must come before /maintenance/{id} to avoid path conflicts)
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/maintenance/schedules", Summary: "List maintenance schedules", Security: bearerAuth}, h.ListSchedules)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/maintenance/schedules", Summary: "Create maintenance schedule", DefaultStatus: 201, Security: bearerAuth}, h.CreateSchedule)
	huma.Register(api, huma.Operation{Method: http.MethodPut, Path: "/api/v1/maintenance/schedules/{id}", Summary: "Update maintenance schedule", Security: bearerAuth}, h.UpdateSchedule)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/maintenance/schedules/{id}", Summary: "Delete maintenance schedule", DefaultStatus: 204, Security: bearerAuth}, h.DeleteSchedule)

	// Maintenance logs
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/maintenance", Summary: "List maintenance logs", Security: bearerAuth}, h.ListMaintenance)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/maintenance", Summary: "Create maintenance log", DefaultStatus: 201, Security: bearerAuth}, h.CreateMaintenance)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/maintenance/{id}", Summary: "Delete maintenance log", DefaultStatus: 204, Security: bearerAuth}, h.DeleteMaintenance)

	// Reminders
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/reminders", Summary: "List reminders", Security: bearerAuth}, h.ListReminders)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/reminders/{id}/dismiss", Summary: "Dismiss reminder", DefaultStatus: 204, Security: bearerAuth}, h.DismissReminder)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/reminders/{id}/snooze", Summary: "Snooze reminder", DefaultStatus: 204, Security: bearerAuth}, h.SnoozeReminder)

	// Admin
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/admin/users", Summary: "List users (admin)", Security: bearerAuth}, h.AdminListUsers)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/admin/users", Summary: "Create user (admin)", Security: bearerAuth}, h.AdminCreateUser)
	huma.Register(api, huma.Operation{Method: http.MethodPut, Path: "/api/v1/admin/users/{id}", Summary: "Update user (admin)", Security: bearerAuth}, h.AdminUpdateUser)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/admin/users/{id}", Summary: "Delete user (admin)", DefaultStatus: 204, Security: bearerAuth}, h.AdminDeleteUser)

	// Homes
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/homes", Summary: "List homes", Security: bearerAuth}, h.ListHomes)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/homes", Summary: "Create home", DefaultStatus: 201, Security: bearerAuth}, h.CreateHome)
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/homes/{id}", Summary: "Get home", Security: bearerAuth}, h.GetHome)
	huma.Register(api, huma.Operation{Method: http.MethodPut, Path: "/api/v1/homes/{id}", Summary: "Update home", Security: bearerAuth}, h.UpdateHome)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/homes/{id}", Summary: "Delete home", DefaultStatus: 204, Security: bearerAuth}, h.DeleteHome)

	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/homes/{id}/members", Summary: "List home members", Security: bearerAuth}, h.ListHomeMembers)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/homes/{id}/members", Summary: "Add home member", DefaultStatus: 201, Security: bearerAuth}, h.AddHomeMember)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/homes/{id}/members/{userId}", Summary: "Remove home member", DefaultStatus: 204, Security: bearerAuth}, h.RemoveHomeMember)

	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/homes/{id}/photos", Summary: "List home photos", Security: bearerAuth}, h.ListHomePhotos)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/homes/{id}/photos/{photoId}", Summary: "Delete home photo", DefaultStatus: 204, Security: bearerAuth}, h.DeleteHomePhoto)
	r.Post("/api/v1/homes/{id}/photos", h.UploadHomePhoto)

	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/homes/{id}/documents", Summary: "List home documents", Security: bearerAuth}, h.ListHomeDocuments)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/homes/{id}/documents/{docId}", Summary: "Delete home document", DefaultStatus: 204, Security: bearerAuth}, h.DeleteHomeDocument)
	huma.Register(api, huma.Operation{Method: http.MethodPatch, Path: "/api/v1/homes/{homeId}/documents/{docId}/floor-level", Summary: "Set floor level on document", DefaultStatus: 204, Security: bearerAuth}, h.UpdateHomeDocumentFloorLevel)
	r.Post("/api/v1/homes/{id}/documents", h.UploadHomeDocument)

	// Item photos — list and delete through HUMA; upload is a raw chi handler (multipart)
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/items/{itemId}/photos", Summary: "List item photos", Security: bearerAuth}, h.ListItemPhotos)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/items/{itemId}/photos/{photoId}", Summary: "Delete item photo", DefaultStatus: 204, Security: bearerAuth}, h.DeletePhoto)
	r.Post("/api/v1/items/{itemId}/photos", h.UploadPhoto)

	// Item documents — same pattern as photos
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/items/{itemId}/documents", Summary: "List item documents", Security: bearerAuth}, h.ListItemDocuments)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/items/{itemId}/documents/{documentId}", Summary: "Delete item document", DefaultStatus: 204, Security: bearerAuth}, h.DeleteDocument)
	r.Post("/api/v1/items/{itemId}/documents", h.UploadDocument)

	// Floor plan areas
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/homes/{homeId}/floor-plan-areas", Summary: "List floor plan areas", Security: bearerAuth}, h.ListFloorPlanAreas)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/homes/{homeId}/floor-plan-areas", Summary: "Create floor plan area", DefaultStatus: 201, Security: bearerAuth}, h.CreateFloorPlanArea)
	huma.Register(api, huma.Operation{Method: http.MethodPut, Path: "/api/v1/floor-plan-areas/{id}", Summary: "Update floor plan area", Security: bearerAuth}, h.UpdateFloorPlanArea)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/floor-plan-areas/{id}", Summary: "Delete floor plan area", DefaultStatus: 204, Security: bearerAuth}, h.DeleteFloorPlanArea)

	// Floor plan shapes
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/homes/{homeId}/floor-plan-shapes", Summary: "List floor plan shapes", Security: bearerAuth}, h.ListFloorPlanShapes)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/homes/{homeId}/floor-plan-shapes", Summary: "Create floor plan shape", DefaultStatus: 201, Security: bearerAuth}, h.CreateFloorPlanShape)
	huma.Register(api, huma.Operation{Method: http.MethodPatch, Path: "/api/v1/floor-plan-shapes/{id}", Summary: "Update floor plan shape", Security: bearerAuth}, h.UpdateFloorPlanShape)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/floor-plan-shapes/{id}", Summary: "Delete floor plan shape", DefaultStatus: 204, Security: bearerAuth}, h.DeleteFloorPlanShape)

	// Electrical panels
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/homes/{homeId}/panels", Summary: "List electrical panels", Security: bearerAuth}, h.ListPanels)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/homes/{homeId}/panels", Summary: "Create electrical panel", DefaultStatus: 201, Security: bearerAuth}, h.CreatePanel)
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/panels/{id}", Summary: "Get electrical panel", Security: bearerAuth}, h.GetPanel)
	huma.Register(api, huma.Operation{Method: http.MethodPut, Path: "/api/v1/panels/{id}", Summary: "Update electrical panel", Security: bearerAuth}, h.UpdatePanel)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/panels/{id}", Summary: "Delete electrical panel", DefaultStatus: 204, Security: bearerAuth}, h.DeletePanel)

	// Electrical breakers
	huma.Register(api, huma.Operation{Method: http.MethodGet, Path: "/api/v1/panels/{panelId}/breakers", Summary: "List breakers", Security: bearerAuth}, h.ListBreakers)
	huma.Register(api, huma.Operation{Method: http.MethodPost, Path: "/api/v1/panels/{panelId}/breakers", Summary: "Create breaker", DefaultStatus: 201, Security: bearerAuth}, h.CreateBreaker)
	huma.Register(api, huma.Operation{Method: http.MethodPut, Path: "/api/v1/breakers/{id}", Summary: "Update breaker", Security: bearerAuth}, h.UpdateBreaker)
	huma.Register(api, huma.Operation{Method: http.MethodDelete, Path: "/api/v1/breakers/{id}", Summary: "Delete breaker", DefaultStatus: 204, Security: bearerAuth}, h.DeleteBreaker)

	// Serve uploaded files
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir(cfg.UploadDir))))

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
