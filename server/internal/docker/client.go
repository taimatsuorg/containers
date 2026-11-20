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
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/api/types/system"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/docker/go-connections/nat"
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

// ListContainers returns all containers sorted by project then name.
func (c *Client) ListContainers(ctx context.Context) ([]types.Container, error) {
	containers, err := c.raw.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, err
	}
	sort.Slice(containers, func(i, j int) bool {
		pi := ContainerProject(containers[i])
		pj := ContainerProject(containers[j])
		if pi != pj {
			return pi < pj
		}
		return ContainerName(containers[i]) < ContainerName(containers[j])
	})
	return containers, nil
}

// ListProjects lists all local containers and groups them by com.docker.compose.project.
// Containers without a compose project label are placed in "standalone".
func (c *Client) ListProjects(ctx context.Context) ([]ProjectGroup, error) {
	containers, err := c.ListContainers(ctx)
	if err != nil {
		return nil, err
	}

	grouped := make(map[string][]types.Container)
	for _, ctr := range containers {
		proj := ContainerProject(ctr)
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

// CreateContainerRequest defines parameters for creating and starting a container.
type CreateContainerRequest struct {
	Name          string   `json:"name"`
	Image         string   `json:"image"`
	Project       string   `json:"project"`
	Ports         []string `json:"ports"`
	Env           []string `json:"env"`
	RestartPolicy string   `json:"restartPolicy"`
}

// CreateAndStartContainer pulls the image if absent, creates the container, and starts it.
func (c *Client) CreateAndStartContainer(ctx context.Context, req CreateContainerRequest) (string, error) {
	if _, _, err := c.raw.ImageInspectWithRaw(ctx, req.Image); err != nil {
		rc, pullErr := c.raw.ImagePull(ctx, req.Image, image.PullOptions{})
		if pullErr != nil {
			return "", pullErr
		}
		_, _ = io.Copy(io.Discard, rc)
		_ = rc.Close()
	}

	exposedPorts := nat.PortSet{}
	portBindings := nat.PortMap{}
	for _, spec := range req.Ports {
		spec = strings.TrimSpace(spec)
		if spec == "" {
			continue
		}
		mappings, err := nat.ParsePortSpec(spec)
		if err != nil {
			return "", err
		}
		for _, m := range mappings {
			exposedPorts[m.Port] = struct{}{}
			portBindings[m.Port] = append(portBindings[m.Port], m.Binding)
		}
	}

	var labels map[string]string
	if strings.TrimSpace(req.Project) != "" {
		labels = map[string]string{
			"com.docker.compose.project": strings.TrimSpace(req.Project),
		}
	}

	restartPolicy := container.RestartPolicy{}
	switch strings.TrimSpace(req.RestartPolicy) {
	case "always":
		restartPolicy.Name = container.RestartPolicyAlways
	case "unless-stopped":
		restartPolicy.Name = container.RestartPolicyUnlessStopped
	case "on-failure":
		restartPolicy.Name = container.RestartPolicyOnFailure
	default:
		restartPolicy.Name = container.RestartPolicyDisabled
	}

	cfg := &container.Config{
		Image:        req.Image,
		Env:          req.Env,
		ExposedPorts: exposedPorts,
		Labels:       labels,
	}
	hostCfg := &container.HostConfig{
		PortBindings:  portBindings,
		RestartPolicy: restartPolicy,
	}

	resp, err := c.raw.ContainerCreate(ctx, cfg, hostCfg, nil, nil, strings.TrimSpace(req.Name))
	if err != nil {
		return "", err
	}
	if err := c.raw.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		return "", err
	}
	return resp.ID, nil
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

// ListImages lists local Docker images.
func (c *Client) ListImages(ctx context.Context) ([]image.Summary, error) {
	items, err := c.raw.ImageList(ctx, image.ListOptions{All: false})
	if err != nil {
		return nil, err
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].Created > items[j].Created
	})
	return items, nil
}

// RemoveImage deletes a local Docker image.
func (c *Client) RemoveImage(ctx context.Context, id string, force bool) error {
	_, err := c.raw.ImageRemove(ctx, id, image.RemoveOptions{Force: force, PruneChildren: true})
	return err
}

// ListVolumes lists local Docker volumes.
func (c *Client) ListVolumes(ctx context.Context) ([]*volume.Volume, error) {
	resp, err := c.raw.VolumeList(ctx, volume.ListOptions{})
	if err != nil {
		return nil, err
	}
	items := resp.Volumes
	sort.Slice(items, func(i, j int) bool {
		return items[i].Name < items[j].Name
	})
	return items, nil
}

// ListNetworks lists local Docker networks.
func (c *Client) ListNetworks(ctx context.Context) ([]network.Summary, error) {
	items, err := c.raw.NetworkList(ctx, network.ListOptions{})
	if err != nil {
		return nil, err
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].Name < items[j].Name
	})
	return items, nil
}

// ContainerUsage holds instantaneous CPU and memory metrics for a container.
type ContainerUsage struct {
	Name        string
	CPUPercent  float64
	MemoryBytes uint64
	MemoryLimit uint64
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
		MemoryLimit: stats.MemoryStats.Limit,
	}, nil
}

// ContainerProject returns the compose project name for a container or "standalone".
func ContainerProject(ctr types.Container) string {
	if p := ctr.Labels["com.docker.compose.project"]; p != "" {
		return p
	}
	return "standalone"
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
