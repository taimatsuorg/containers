package api

// Kind categorizes an RFC 9457 Problem response.
type Kind string

// Message is a localizable message key with optional parameters.
type Message struct {
	Key    string            `json:"key"`
	Params map[string]string `json:"params,omitempty"`
}

// Problem is an RFC 9457 error payload returned to the UI.
type Problem struct {
	Type    string  `json:"type"`
	Title   string  `json:"title"`
	Status  int     `json:"status"`
	Detail  string  `json:"detail"`
	Fix     string  `json:"fix"`
	Kind    Kind    `json:"kind"`
	Summary Message `json:"summary"`
}

// WhoAmI identifies the current user.
type WhoAmI struct {
	Username string   `json:"username"`
	Groups   []string `json:"groups"`
}

// SessionView describes whether sign-in is enabled.
type SessionView struct {
	SignsIn bool `json:"signsIn"`
}

// BuildSettings describes Git build image storage.
type BuildSettings struct {
	Registry *string `json:"registry,omitempty"`
}

// DomainSettings describes default domain suffixes for services.
type DomainSettings struct {
	ClusterIssuer *string  `json:"clusterIssuer,omitempty"`
	Suffixes      []string `json:"suffixes,omitempty"`
}

// ClusterRights describes cluster-level permissions.
type ClusterRights struct {
	ChangeBackups string `json:"changeBackups"`
	ChangeNodes   string `json:"changeNodes"`
}

// Cluster describes the local runtime host.
type Cluster struct {
	Builds            BuildSettings  `json:"builds"`
	Can               ClusterRights  `json:"can"`
	Distribution      *string        `json:"distribution,omitempty"`
	Domains           DomainSettings `json:"domains"`
	KubernetesVersion string         `json:"kubernetesVersion"`
	Name              string         `json:"name"`
	NameSource        string         `json:"nameSource"`
}

// FailingCheck describes a failed health check.
type FailingCheck struct {
	Name   string  `json:"name"`
	Reason *string `json:"reason,omitempty"`
}

// LeaderLease describes a control-plane leader lease.
type LeaderLease struct {
	Component string `json:"component"`
	Current   bool   `json:"current"`
}

// ClusterHealth describes runtime readiness.
type ClusterHealth struct {
	Id      string         `json:"id"`
	Checks  int            `json:"checks"`
	Ready   bool           `json:"ready"`
	Failing []FailingCheck `json:"failing"`
	Leaders []LeaderLease  `json:"leaders"`
}

// ClusterEventList holds recent cluster events.
type ClusterEventList struct {
	Items     []any `json:"items"`
	Partial   bool  `json:"partial"`
	TotalSize int   `json:"totalSize"`
}

// Origin points to the underlying resource.
type Origin struct {
	Kind string `json:"kind"`
	Name string `json:"name"`
}

// ProjectHealth summarizes service health in a project.
type ProjectHealth struct {
	Services    int `json:"services"`
	Healthy     int `json:"healthy"`
	Warning     int `json:"warning"`
	Progressing int `json:"progressing"`
	Failing     int `json:"failing"`
}

// ServiceSummary summarizes one service/container in a project list.
type ServiceSummary struct {
	Id       string  `json:"id"`
	Kind     string  `json:"kind"`
	Name     string  `json:"name"`
	Health   string  `json:"health"`
	Desired  *int    `json:"desired,omitempty"`
	Ready    *int    `json:"ready,omitempty"`
	Reason   *string `json:"reason,omitempty"`
	Restarts int     `json:"restarts"`
}

// ProjectSummary represents one project in GET /api/v1/projects.
type ProjectSummary struct {
	Id          string           `json:"id"`
	Name        string           `json:"name"`
	DisplayName *string          `json:"displayName,omitempty"`
	Adopted     bool             `json:"adopted"`
	System      bool             `json:"system"`
	Origin      Origin           `json:"origin"`
	Health      *ProjectHealth   `json:"health,omitempty"`
	Services    []ServiceSummary `json:"services,omitempty"`
}

// ProjectList is returned by GET /api/v1/projects.
type ProjectList struct {
	CanCreate string           `json:"canCreate"`
	Items     []ProjectSummary `json:"items"`
}
