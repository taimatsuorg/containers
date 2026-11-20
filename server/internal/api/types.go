package api

// ErrorResponse is returned on API errors.
type ErrorResponse struct {
	Error string `json:"error"`
}

// AuthMe describes the current signed-in user and auth state.
type AuthMe struct {
	Username    string `json:"username"`
	AuthEnabled bool   `json:"authEnabled"`
}

// HostInfo describes the local Docker host and daemon.
type HostInfo struct {
	Hostname        string `json:"hostname"`
	OS              string `json:"os"`
	Kernel          string `json:"kernel"`
	Arch            string `json:"arch"`
	DockerVersion   string `json:"dockerVersion"`
	CPUs            int    `json:"cpus"`
	MemoryBytes     int64  `json:"memoryBytes"`
	DockerConnected bool   `json:"dockerConnected"`
}

// ResourceCounts summarizes Docker resource totals.
type ResourceCounts struct {
	Projects          int `json:"projects"`
	ContainersTotal   int `json:"containersTotal"`
	ContainersRunning int `json:"containersRunning"`
	ContainersStopped int `json:"containersStopped"`
	Images            int `json:"images"`
	Volumes           int `json:"volumes"`
	Networks          int `json:"networks"`
}

// OverviewResponse is returned by GET /api/overview.
type OverviewResponse struct {
	Host     HostInfo         `json:"host"`
	Counts   ResourceCounts   `json:"counts"`
	Projects []ProjectSummary `json:"projects"`
}

// PortMapping describes one container port mapping.
type PortMapping struct {
	IP          string `json:"ip,omitempty"`
	PrivatePort uint16 `json:"privatePort"`
	PublicPort  uint16 `json:"publicPort"`
	Type        string `json:"type"`
}

// ContainerSummary represents a Docker container in list views.
type ContainerSummary struct {
	ID         string        `json:"id"`
	ShortID    string        `json:"shortId"`
	Name       string        `json:"name"`
	Project    string        `json:"project"`
	Image      string        `json:"image"`
	State      string        `json:"state"`
	Status     string        `json:"status"`
	Created    int64         `json:"created"`
	Ports      []PortMapping `json:"ports"`
	MountCount int           `json:"mountCount"`
}

// ProjectSummary groups containers by compose project or "standalone".
type ProjectSummary struct {
	Name       string             `json:"name"`
	Total      int                `json:"total"`
	Running    int                `json:"running"`
	Stopped    int                `json:"stopped"`
	Containers []ContainerSummary `json:"containers"`
}

// MountInfo describes a container bind/volume mount.
type MountInfo struct {
	Type        string `json:"type"`
	Source      string `json:"source"`
	Destination string `json:"destination"`
	ReadOnly    bool   `json:"readOnly"`
}

// ContainerDetail represents full container inspection data.
type ContainerDetail struct {
	ContainerSummary
	Command       []string          `json:"command"`
	Entrypoint    []string          `json:"entrypoint"`
	Env           []string          `json:"env"`
	Mounts        []MountInfo       `json:"mounts"`
	Networks      []string          `json:"networks"`
	Labels        map[string]string `json:"labels"`
	RestartPolicy string            `json:"restartPolicy"`
	RestartCount  int               `json:"restartCount"`
	StartedAt     string            `json:"startedAt"`
}

// ContainerStatsResponse holds live CPU and memory usage for one container.
type ContainerStatsResponse struct {
	Container   string  `json:"container"`
	CPUPercent  float64 `json:"cpuPercent"`
	MemoryBytes uint64  `json:"memoryBytes"`
	MemoryLimit uint64  `json:"memoryLimit"`
}

// ImageSummary describes a local Docker image.
type ImageSummary struct {
	ID       string   `json:"id"`
	ShortID  string   `json:"shortId"`
	RepoTags []string `json:"repoTags"`
	Size     int64    `json:"size"`
	Created  int64    `json:"created"`
}

// VolumeSummary describes a local Docker volume.
type VolumeSummary struct {
	Name       string `json:"name"`
	Driver     string `json:"driver"`
	Mountpoint string `json:"mountpoint"`
	CreatedAt  string `json:"createdAt"`
}

// NetworkSummary describes a local Docker network.
type NetworkSummary struct {
	ID         string `json:"id"`
	ShortID    string `json:"shortId"`
	Name       string `json:"name"`
	Driver     string `json:"driver"`
	Scope      string `json:"scope"`
	Containers int    `json:"containers"`
}
