package api

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"html/template"
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

		// Public auth and favicon routes
		if r.URL.Path == "/auth/login" || r.URL.Path == "/auth/logout" || r.URL.Path == "/favicon.svg" {
			next.ServeHTTP(w, r)
			return
		}

		cookie, err := r.Cookie(sessionCookieName)
		token := ""
		if err == nil {
			token = cookie.Value
		}
		isBackground := r.Header.Get("x-zeabur-background") == "1"
		username, ok := s.auth.validateSession(token, !isBackground)
		if !ok {
			if strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/api" {
				writeProblem(w, http.StatusUnauthorized, "signed-out",
					"Authentication required",
					"Your session has expired or you are not signed in.",
					"Sign in to continue.",
				)
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
			if r.Header.Get("zeabur-request") != "1" {
				writeProblem(w, http.StatusForbidden, "forbidden",
					"Missing CSRF header",
					"State-changing requests require the zeabur-request header.",
					"Reload the page and try again.",
				)
				return
			}
		}

		_ = username
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
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = loginTmpl.Execute(w, map[string]any{
		"Return": ret,
		"Error":  "",
	})
}

func (s *Server) handleLoginSubmit(w http.ResponseWriter, r *http.Request) {
	if !s.auth.enabled() {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}
	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad form", http.StatusBadRequest)
		return
	}
	username := r.FormValue("username")
	password := r.FormValue("password")
	ret := sanitizeReturnURL(r.FormValue("return"))

	if !s.auth.verifyCredentials(username, password) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusUnauthorized)
		_ = loginTmpl.Execute(w, map[string]any{
			"Return": ret,
			"Error":  "Invalid username or password.",
		})
		return
	}

	token, err := s.auth.createSession(username)
	if err != nil {
		http.Error(w, "failed to create session", http.StatusInternalServerError)
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

var loginTmpl = template.Must(template.New("login").Parse(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>Sign in – Containers</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0b0f19;
      color: #e2e8f0;
      padding: 1rem;
    }
    .card {
      width: 100%;
      max-width: 360px;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 1.75rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 1.5rem;
      font-weight: 600;
      font-size: 1.05rem;
      color: #f8fafc;
    }
    label {
      display: block;
      font-size: 0.8rem;
      font-weight: 500;
      color: #94a3b8;
      margin-bottom: 0.35rem;
    }
    input {
      width: 100%;
      padding: 0.6rem 0.75rem;
      margin-bottom: 1rem;
      border-radius: 8px;
      border: 1px solid #334155;
      background: #0f172a;
      color: #f8fafc;
      font-size: 0.9rem;
      outline: none;
    }
    input:focus { border-color: #38bdf8; }
    button {
      width: 100%;
      padding: 0.65rem;
      border: none;
      border-radius: 8px;
      background: #0284c7;
      color: #fff;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
    }
    button:hover { background: #0369a1; }
    .err {
      margin-bottom: 1rem;
      padding: 0.6rem 0.75rem;
      border-radius: 8px;
      background: rgba(239,68,68,0.15);
      border: 1px solid rgba(239,68,68,0.4);
      color: #fca5a5;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <svg viewBox="0 0 32 32" fill="none" width="24" height="24" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0F172A"/>
        <path d="M16 6L25 11.2V20.8L16 26L7 20.8V11.2L16 6Z" stroke="#38BDF8" stroke-width="2" stroke-linejoin="round"/>
        <path d="M16 16L25 11.2M16 16L7 11.2M16 16V26" stroke="#38BDF8" stroke-width="2" stroke-linejoin="round"/>
        <path d="M11.5 8.6L20.5 13.8" stroke="#818CF8" stroke-width="1.75" stroke-linecap="round"/>
      </svg>
      <span>Containers</span>
    </div>
    {{if .Error}}<div class="err">{{.Error}}</div>{{end}}
    <form method="POST" action="/auth/login">
      <input type="hidden" name="return" value="{{.Return}}" />
      <label for="username">Username</label>
      <input id="username" name="username" type="text" autocomplete="username" required autofocus />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button type="submit">Sign in</button>
    </form>
  </div>
</body>
</html>`))
