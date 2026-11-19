package docker

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"sort"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/system"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
)

// Client wraps the local Docker Engine API for Containers.
type Client struct {
	raw *client.Client
}

// NewClient connects to the local Docker daemon using environment defaults (/var/run/docker.sock).
func NewClient() (*Client, error) {
	c, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	return &Client{raw: c}, nil
}

// Close releases the underlying Docker HTTP client.
func (c *Client) Close() error {
	return c.raw.Close()
}

// Ping checks whether the Docker daemon is reachable.
func (c *Client) Ping(ctx context.Context) (types.Ping, error) {
	return c.raw.Ping(ctx)
}

// Version returns Docker daemon version metadata.
func (c *Client) Version(ctx context.Context) (types.Version, error) {
	return c.raw.ServerVersion(ctx)
}

// Info returns Docker daemon host/system info.
func (c *Client) Info(ctx context.Context) (system.Info, error) {
	return c.raw.Info(ctx)
}

// ProjectGroup represents a logical project derived from Docker containers.
type ProjectGroup struct {
	Name       string
	Containers []types.Container
}

// ListProjects lists all local containers and groups them by com.docker.compose.project.
// Containers without a compose project label are placed in "standalone".
func (c *Client) ListProjects(ctx context.Context) ([]ProjectGroup, error) {
	containers, err := c.raw.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, err
	}

	grouped := make(map[string][]types.Container)
	for _, ctr := range containers {
		proj := ctr.Labels["com.docker.compose.project"]
		if proj == "" {
			proj = "standalone"
		}
		grouped[proj] = append(grouped[proj], ctr)
	}

	names := make([]string, 0, len(grouped))
	for name := range grouped {
		names = append(names, name)
	}
	sort.Strings(names)

	out := make([]ProjectGroup, 0, len(names))
	for _, name := range names {
		ctrs := grouped[name]
		sort.Slice(ctrs, func(i, j int) bool {
			return ContainerName(ctrs[i]) < ContainerName(ctrs[j])
		})
		out = append(out, ProjectGroup{Name: name, Containers: ctrs})
	}
	return out, nil
}

// GetProject returns the containers belonging to a specific project name.
func (c *Client) GetProject(ctx context.Context, name string) (*ProjectGroup, error) {
	groups, err := c.ListProjects(ctx)
	if err != nil {
		return nil, err
	}
	for i := range groups {
		if groups[i].Name == name {
			return &groups[i], nil
		}
	}
	return nil, nil
}

// InspectContainer returns detailed metadata for a single container.
func (c *Client) InspectContainer(ctx context.Context, idOrName string) (types.ContainerJSON, error) {
	return c.raw.ContainerInspect(ctx, idOrName)
}

// ContainerLogs returns recent logs for a container (by ID or name).
func (c *Client) ContainerLogs(ctx context.Context, containerIDOrName, tail string, timestamps bool) ([]string, error) {
	if tail == "" {
		tail = "200"
	}
	inspect, err := c.raw.ContainerInspect(ctx, containerIDOrName)
	if err != nil {
		return nil, err
	}

	reader, err := c.raw.ContainerLogs(ctx, containerIDOrName, container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       tail,
		Timestamps: timestamps,
	})
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	var buf bytes.Buffer
	if inspect.Config != nil && inspect.Config.Tty {
		if _, err := io.Copy(&buf, reader); err != nil {
			return nil, err
		}
	} else {
		if _, err := stdcopy.StdCopy(&buf, &buf, reader); err != nil {
			return nil, err
		}
	}

	rawText := strings.TrimSuffix(buf.String(), "\n")
	if rawText == "" {
		return []string{}, nil
	}
	return strings.Split(rawText, "\n"), nil
}

// FollowContainerLogs opens a streaming log reader for a container.
func (c *Client) FollowContainerLogs(ctx context.Context, containerIDOrName, tail string, timestamps bool) (io.ReadCloser, bool, error) {
	if tail == "" {
		tail = "100"
	}
	inspect, err := c.raw.ContainerInspect(ctx, containerIDOrName)
	if err != nil {
		return nil, false, err
	}
	isTty := inspect.Config != nil && inspect.Config.Tty

	reader, err := c.raw.ContainerLogs(ctx, containerIDOrName, container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     true,
		Tail:       tail,
		Timestamps: timestamps,
	})
	if err != nil {
		return nil, false, err
	}
	return reader, isTty, nil
}

// ExecSession holds an attached Docker exec session.
type ExecSession struct {
	ExecID string
	Conn   types.HijackedResponse
}

// ExecCreateAndAttach creates and attaches to an interactive TTY exec session inside a container.
func (c *Client) ExecCreateAndAttach(ctx context.Context, containerIDOrName string, cmd []string) (*ExecSession, error) {
	if len(cmd) == 0 {
		cmd = []string{"/bin/sh"}
	}
	execCfg := container.ExecOptions{
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          true,
		Cmd:          cmd,
	}
	created, err := c.raw.ContainerExecCreate(ctx, containerIDOrName, execCfg)
	if err != nil {
		return nil, err
	}
	attached, err := c.raw.ContainerExecAttach(ctx, created.ID, container.ExecAttachOptions{
		Tty: true,
	})
	if err != nil {
		return nil, err
	}
	return &ExecSession{
		ExecID: created.ID,
		Conn:   attached,
	}, nil
}

// ExecResize updates the TTY dimensions for an active exec session.
func (c *Client) ExecResize(ctx context.Context, execID string, rows, cols uint) error {
	return c.raw.ContainerExecResize(ctx, execID, container.ResizeOptions{
		Height: rows,
		Width:  cols,
	})
}

// ExecInspect checks the exit code and running state of an exec session.
func (c *Client) ExecInspect(ctx context.Context, execID string) (container.ExecInspect, error) {
	return c.raw.ContainerExecInspect(ctx, execID)
}

// StartContainer starts a stopped container.
func (c *Client) StartContainer(ctx context.Context, idOrName string) error {
	return c.raw.ContainerStart(ctx, idOrName, container.StartOptions{})
}

// StopContainer stops a running container.
func (c *Client) StopContainer(ctx context.Context, idOrName string) error {
	return c.raw.ContainerStop(ctx, idOrName, container.StopOptions{})
}

// RestartContainer restarts a container.
func (c *Client) RestartContainer(ctx context.Context, idOrName string) error {
	return c.raw.ContainerRestart(ctx, idOrName, container.StopOptions{})
}

// RemoveContainer removes a container (forcefully if running).
func (c *Client) RemoveContainer(ctx context.Context, idOrName string, force bool) error {
	return c.raw.ContainerRemove(ctx, idOrName, container.RemoveOptions{Force: force})
}

// ContainerUsage holds instantaneous CPU and memory metrics for a container.
type ContainerUsage struct {
	Name        string
	CPUPercent  float64
	MemoryBytes uint64
}

// ContainerStatsOneShot fetches a single stats snapshot for a container.
func (c *Client) ContainerStatsOneShot(ctx context.Context, idOrName string) (*ContainerUsage, error) {
	resp, err := c.raw.ContainerStatsOneShot(ctx, idOrName)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var stats container.StatsResponse
	if err := json.NewDecoder(resp.Body).Decode(&stats); err != nil {
		return nil, err
	}

	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(stats.CPUStats.SystemUsage - stats.PreCPUStats.SystemUsage)
	cpuPercent := 0.0
	if systemDelta > 0 && cpuDelta > 0 {
		onlineCPUs := float64(stats.CPUStats.OnlineCPUs)
		if onlineCPUs == 0 {
			onlineCPUs = float64(len(stats.CPUStats.CPUUsage.PercpuUsage))
		}
		if onlineCPUs == 0 {
			onlineCPUs = 1
		}
		cpuPercent = (cpuDelta / systemDelta) * onlineCPUs * 100.0
	}

	return &ContainerUsage{
		Name:        idOrName,
		CPUPercent:  cpuPercent,
		MemoryBytes: stats.MemoryStats.Usage,
	}, nil
}

// ContainerName returns the primary human-readable name of a container without leading '/'.
func ContainerName(ctr types.Container) string {
	if len(ctr.Names) > 0 {
		return strings.TrimPrefix(ctr.Names[0], "/")
	}
	if len(ctr.ID) >= 12 {
		return ctr.ID[:12]
	}
	return ctr.ID
}
