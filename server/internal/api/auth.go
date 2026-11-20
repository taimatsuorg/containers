package api

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const (
	sessionCookieName = "containers_session"
	sessionTTL        = 24 * time.Hour
)

// AuthConfig configures username/password session authentication.
type AuthConfig struct {
	Enabled  bool
	Username string
	Password string
}

type sessionEntry struct {
	username  string
	expiresAt time.Time
}

type authManager struct {
	cfg      AuthConfig
	mu       sync.RWMutex
	sessions map[string]sessionEntry
}

func newAuthManager(cfg AuthConfig) *authManager {
	return &authManager{
		cfg:      cfg,
		sessions: make(map[string]sessionEntry),
	}
}

func (a *authManager) enabled() bool {
	return a != nil && a.cfg.Enabled && a.cfg.Username != "" && a.cfg.Password != ""
}

func (a *authManager) verifyCredentials(username, password string) bool {
	if !a.enabled() {
		return false
	}
	uMatch := subtle.ConstantTimeCompare([]byte(username), []byte(a.cfg.Username)) == 1
	pMatch := subtle.ConstantTimeCompare([]byte(password), []byte(a.cfg.Password)) == 1
	return uMatch && pMatch
}

func (a *authManager) createSession(username string) (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	token := hex.EncodeToString(buf)
	a.mu.Lock()
	a.sessions[token] = sessionEntry{
		username:  username,
		expiresAt: time.Now().Add(sessionTTL),
	}
	a.mu.Unlock()
	return token, nil
}

func (a *authManager) validateSession(token string, refresh bool) (string, bool) {
	if token == "" {
		return "", false
	}
	now := time.Now()
	a.mu.Lock()
	defer a.mu.Unlock()
	entry, ok := a.sessions[token]
	if !ok || now.After(entry.expiresAt) {
		delete(a.sessions, token)
		return "", false
	}
	if refresh {
		entry.expiresAt = now.Add(sessionTTL)
		a.sessions[token] = entry
	}
	return entry.username, true
}

func (a *authManager) deleteSession(token string) {
	if token == "" {
		return
	}
	a.mu.Lock()
	delete(a.sessions, token)
	a.mu.Unlock()
}

func (s *Server) withAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !s.auth.enabled() {
			next.ServeHTTP(w, r)
			return
		}

		// Public auth, static asset, and favicon routes
		if r.URL.Path == "/auth/login" ||
			r.URL.Path == "/auth/logout" ||
			r.URL.Path == "/favicon.svg" ||
			strings.HasPrefix(r.URL.Path, "/assets/") {
			next.ServeHTTP(w, r)
			return
		}

		cookie, err := r.Cookie(sessionCookieName)
		token := ""
		if err == nil {
			token = cookie.Value
		}
		isBackground := r.Header.Get("X-Containers-Background") == "1"
		_, ok := s.auth.validateSession(token, !isBackground)
		if !ok {
			if strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/api" {
				writeError(w, http.StatusUnauthorized, "Authentication required")
				return
			}
			ret := r.URL.RequestURI()
			target := "/auth/login"
			if ret != "" && ret != "/" {
				target += "?return=" + url.QueryEscape(ret)
			}
			http.Redirect(w, r, target, http.StatusFound)
			return
		}

		// CSRF protection for mutating API requests
		if strings.HasPrefix(r.URL.Path, "/api/") && r.Method != http.MethodGet && r.Method != http.MethodHead {
			if r.Header.Get("X-Containers-Request") != "1" {
				writeError(w, http.StatusForbidden, "Missing X-Containers-Request header")
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleLoginPage(w http.ResponseWriter, r *http.Request) {
	if !s.auth.enabled() {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}
	ret := sanitizeReturnURL(r.URL.Query().Get("return"))
	if cookie, err := r.Cookie(sessionCookieName); err == nil {
		if _, ok := s.auth.validateSession(cookie.Value, false); ok {
			http.Redirect(w, r, ret, http.StatusFound)
			return
		}
	}
	s.handleSPA(w, r)
}

func (s *Server) handleLoginSubmit(w http.ResponseWriter, r *http.Request) {
	if !s.auth.enabled() {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}
	if err := r.ParseForm(); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid form submission")
		return
	}
	username := r.FormValue("username")
	password := r.FormValue("password")
	ret := sanitizeReturnURL(r.FormValue("return"))
	wantsJSON := strings.Contains(r.Header.Get("Accept"), "application/json")

	if !s.auth.verifyCredentials(username, password) {
		if wantsJSON {
			writeError(w, http.StatusUnauthorized, "Invalid username or password.")
			return
		}
		http.Redirect(w, r, "/auth/login?error=1&return="+url.QueryEscape(ret), http.StatusFound)
		return
	}

	token, err := s.auth.createSession(username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	isHTTPS := r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   isHTTPS,
		MaxAge:   int(sessionTTL.Seconds()),
	})
	if wantsJSON {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":     true,
			"return": ret,
		})
		return
	}
	http.Redirect(w, r, ret, http.StatusFound)
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(sessionCookieName); err == nil {
		s.auth.deleteSession(cookie.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
	w.WriteHeader(http.StatusNoContent)
}

func sanitizeReturnURL(raw string) string {
	if raw == "" || !strings.HasPrefix(raw, "/") || strings.HasPrefix(raw, "//") {
		return "/"
	}
	return raw
}
