// Package main is a stdlib-only static file server for previewing the
// rag-web site/ directory over localhost. Used as a dev tool only — no
// output ships to GitHub Pages.
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"
)

func main() {
	var (
		port = flag.Int("port", defaultPort(), "TCP port to listen on")
		root = flag.String("root", "site", "directory to serve")
		host = flag.String("host", "0.0.0.0", "interface to bind (use 127.0.0.1 for laptop-only)")
	)
	flag.Parse()

	abs, err := filepath.Abs(*root)
	if err != nil {
		log.Fatalf("resolve root: %v", err)
	}
	info, err := os.Stat(abs)
	if err != nil || !info.IsDir() {
		log.Fatalf("root %q is not a directory", abs)
	}

	addr := net.JoinHostPort(*host, fmt.Sprintf("%d", *port))
	srv := &http.Server{
		Addr:              addr,
		Handler:           logging(http.FileServer(http.Dir(abs))),
		ReadHeaderTimeout: 5 * time.Second,
	}

	ln, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("listen %s: %v", addr, err)
	}

	log.Printf("rag-web preview serving %s", abs)
	log.Printf("listening on http://127.0.0.1:%d (loopback)", *port)
	if *host == "0.0.0.0" {
		if lan := primaryLAN(); lan != "" {
			log.Printf("             http://%s:%d (LAN)", lan, *port)
		}
	} else if *host != "127.0.0.1" {
		log.Printf("             http://%s:%d", *host, *port)
	}

	idle := make(chan struct{})
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
		<-sig
		log.Printf("shutdown signal received")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			log.Printf("shutdown: %v", err)
		}
		close(idle)
	}()

	if err := srv.Serve(ln); err != nil && err != http.ErrServerClosed {
		log.Fatalf("serve: %v", err)
	}
	<-idle
	log.Printf("stopped")
}

func defaultPort() int {
	if v := os.Getenv("PORT"); v != "" {
		var p int
		if _, err := fmt.Sscanf(v, "%d", &p); err == nil && p > 0 {
			return p
		}
	}
	return 8080
}

func primaryLAN() string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return ""
	}
	for _, i := range ifaces {
		if i.Flags&net.FlagUp == 0 || i.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := i.Addrs()
		if err != nil {
			continue
		}
		for _, a := range addrs {
			ipnet, ok := a.(*net.IPNet)
			if !ok || ipnet.IP.IsLoopback() {
				continue
			}
			if v4 := ipnet.IP.To4(); v4 != nil {
				return v4.String()
			}
		}
	}
	return ""
}

type statusRecorder struct {
	http.ResponseWriter
	code int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.code = code
	r.ResponseWriter.WriteHeader(code)
}

func logging(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, code: http.StatusOK}
		h.ServeHTTP(rec, r)
		log.Printf("%-6s %3d %7s %s", r.Method, rec.code, time.Since(start).Round(time.Microsecond), r.URL.Path)
	})
}
