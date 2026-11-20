package api

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"

	"github.com/docker/docker/pkg/stdcopy"
	"github.com/gorilla/websocket"
)

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type clientResizeFrame struct {
	Type string `json:"type"`
	Cols uint   `json:"cols"`
	Rows uint   `json:"rows"`
}

func (s *Server) handleFollowContainerLogs(w http.ResponseWriter, r *http.Request) {
	if !s.requireDocker(w) {
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming unsupported")
		return
	}

	id := r.PathValue("id")
	tail := r.URL.Query().Get("tail")
	timestamps := r.URL.Query().Get("timestamps") == "true"

	stream, isTty, err := s.docker.FollowContainerLogs(r.Context(), id, tail, timestamps)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	defer stream.Close()

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	var lineReader io.Reader
	if isTty {
		lineReader = stream
	} else {
		pr, pw := io.Pipe()
		go func() {
			_, copyErr := stdcopy.StdCopy(pw, pw, stream)
			_ = pw.CloseWithError(copyErr)
		}()
		lineReader = pr
	}

	scanner := bufio.NewScanner(lineReader)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		select {
		case <-r.Context().Done():
			return
		default:
			fmt.Fprintf(w, "data: %s\n\n", scanner.Text())
			flusher.Flush()
		}
	}
}

func (s *Server) handleContainerExec(w http.ResponseWriter, r *http.Request) {
	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	var writeMu sync.Mutex
	sendText := func(v any) {
		b, err := json.Marshal(v)
		if err != nil {
			return
		}
		writeMu.Lock()
		defer writeMu.Unlock()
		_ = conn.WriteMessage(websocket.TextMessage, b)
	}
	sendBinary := func(data []byte) {
		writeMu.Lock()
		defer writeMu.Unlock()
		_ = conn.WriteMessage(websocket.BinaryMessage, data)
	}

	if s.docker == nil {
		sendText(map[string]any{
			"type":    "error",
			"message": "Docker daemon is not connected.",
		})
		return
	}

	id := r.PathValue("id")
	cmd := r.URL.Query()["cmd"]
	if len(cmd) == 0 {
		cmd = []string{"/bin/sh"}
	}

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	session, err := s.docker.ExecCreateAndAttach(ctx, id, cmd)
	if err != nil {
		sendText(map[string]any{
			"type":    "error",
			"message": err.Error(),
		})
		return
	}
	defer session.Conn.Close()

	sendText(map[string]any{
		"type":      "ready",
		"container": id,
	})

	done := make(chan struct{})
	go func() {
		defer close(done)
		buf := make([]byte, 4096)
		for {
			n, readErr := session.Conn.Reader.Read(buf)
			if n > 0 {
				sendBinary(buf[:n])
			}
			if readErr != nil {
				break
			}
		}
		inspect, err := s.docker.ExecInspect(context.Background(), session.ExecID)
		if err == nil {
			sendText(map[string]any{
				"type": "exit",
				"code": inspect.ExitCode,
			})
		} else {
			sendText(map[string]any{
				"type":    "exit",
				"message": err.Error(),
			})
		}
	}()

	go func() {
		<-done
		cancel()
	}()

	for {
		msgType, payload, err := conn.ReadMessage()
		if err != nil {
			cancel()
			break
		}
		switch msgType {
		case websocket.TextMessage:
			var frame clientResizeFrame
			if json.Unmarshal(payload, &frame) == nil && frame.Type == "resize" && frame.Cols > 0 && frame.Rows > 0 {
				_ = s.docker.ExecResize(ctx, session.ExecID, frame.Rows, frame.Cols)
				continue
			}
			_, _ = session.Conn.Conn.Write(payload)
		case websocket.BinaryMessage:
			_, _ = session.Conn.Conn.Write(payload)
		}
	}
	<-done
}
