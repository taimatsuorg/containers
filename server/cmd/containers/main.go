package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/containers-im/containers/server/internal/api"
	"github.com/containers-im/containers/server/internal/docker"
)

func main() {
	addr := flag.String("addr", "127.0.0.1:8080", "HTTP listen address")
	webDir := flag.String("web-dir", defaultWebDir(), "Path to built web/dist directory")
	authUser := flag.String("auth-user", envOrDefault("CONTAINERS_AUTH_USER", "admin"), "Login username")
	authPass := flag.String("auth-pass", os.Getenv("CONTAINERS_AUTH_PASS"), "Login password (authentication disabled if empty)")
	flag.Parse()

	dockerClient, err := docker.NewClient()
	if err != nil {
		log.Printf("warning: failed to initialize Docker client: %v (running in degraded mode)", err)
		dockerClient = nil
	} else {
		defer dockerClient.Close()
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		if _, err := dockerClient.Ping(ctx); err != nil {
			log.Printf("warning: Docker daemon ping failed: %v", err)
		} else {
			log.Printf("connected to local Docker daemon")
		}
		cancel()
	}

	authCfg := api.AuthConfig{
		Enabled:  *authPass != "",
		Username: *authUser,
		Password: *authPass,
	}
	if authCfg.Enabled {
		log.Printf("authentication enabled for user %q", authCfg.Username)
	} else {
		log.Printf("warning: CONTAINERS_AUTH_PASS not set; running without authentication")
	}

	srv := api.NewServer(dockerClient, *webDir, authCfg)
	httpServer := &http.Server{
		Addr:              *addr,
		Handler:           srv,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("Containers server listening on http://%s (web-dir=%q)", *addr, *webDir)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("http server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
}

func defaultWebDir() string {
	candidates := []string{
		"web/dist",
		"../web/dist",
	}
	for _, c := range candidates {
		if info, err := os.Stat(filepath.Join(c, "index.html")); err == nil && !info.IsDir() {
			return c
		}
	}
	return "web/dist"
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
