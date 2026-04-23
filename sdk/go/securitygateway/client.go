// ============================================
// CARGOBIT SECURITY GATEWAY SDK - GO
// Version: 1.2.0
// Based on OpenAPI 3.0.3 Specification
// ============================================

package securitygateway

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ============================================
// TYPES
// ============================================

type Role string
type EntityType string
type RiskLevel string
type Decision string
type MitigationType string

const (
	RoleAdmin            Role = "ADMIN"
	RoleSupport          Role = "SUPPORT"
	RoleShipperCompany   Role = "SHIPPER_COMPANY"
	RoleShipperPrivate   Role = "SHIPPER_PRIVATE"
	RoleDispatcher       Role = "DISPATCHER"
	RoleDriverSelfEmployed Role = "DRIVER_SELF_EMPLOYED"
	RoleMarketer         Role = "MARKETER"

	EntityUser        EntityType = "user"
	EntityCompany     EntityType = "company"
	EntityTransaction EntityType = "transaction"
	EntityTransport   EntityType = "transport"
	EntityWallet      EntityType = "wallet"
	EntityVehicle     EntityType = "vehicle"
	EntityOffer       EntityType = "offer"

	RiskGreen  RiskLevel = "green"
	RiskYellow RiskLevel = "yellow"
	RiskRed    RiskLevel = "red"

	DecisionAllowed             Decision = "allowed"
	DecisionAllowedWithMitig   Decision = "allowed_with_mitigation"
	DecisionPermissionDenied   Decision = "permission_denied"
	DecisionBlocked            Decision = "blocked"

	MitigationDelay         MitigationType = "delay"
	Mitigation2FA           MitigationType = "2fa"
	MitigationGPSCheck      MitigationType = "gps_check"
	MitigationExtraLogging  MitigationType = "extra_logging"
	MitigationDocumentRecheck MitigationType = "document_recheck"
	MitigationManualReview  MitigationType = "manual_review"
	MitigationAmountLimit   MitigationType = "amount_limit"
)

// ============================================
// STRUCTS
// ============================================

type UserContext struct {
	ID        string `json:"id"`
	Role      Role   `json:"role"`
	CompanyID string `json:"companyId,omitempty"`
	Email     string `json:"email,omitempty"`
}

type EntityContext struct {
	Type    EntityType         `json:"type"`
	ID      string             `json:"id"`
	Context map[string]any     `json:"context,omitempty"`
}

type SecurityCheckRequest struct {
	RequestID string        `json:"requestId"`
	User      UserContext   `json:"user"`
	Action    string        `json:"action"`
	Entity    EntityContext `json:"entity"`
}

type RiskInfo struct {
	Score          *int      `json:"score,omitempty"`
	Level          *RiskLevel `json:"level,omitempty"`
	TriggeredRules []string  `json:"triggeredRules,omitempty"`
}

type SecurityCheckResponse struct {
	Allowed         bool          `json:"allowed"`
	Decision        Decision      `json:"decision"`
	Risk            *RiskInfo     `json:"risk,omitempty"`
	Mitigations     []MitigationType `json:"mitigations,omitempty"`
	ErrorCode       string        `json:"errorCode,omitempty"`
	Message         string        `json:"message,omitempty"`
	SupportTicketID string        `json:"supportTicketId,omitempty"`
	CorrelationID   string        `json:"correlationId,omitempty"`
}

type PermissionValidateRequest struct {
	User   UserContext `json:"user"`
	Action string      `json:"action"`
}

type PermissionValidateResponse struct {
	Allowed   bool   `json:"allowed"`
	ErrorCode string `json:"errorCode,omitempty"`
	Message   string `json:"message,omitempty"`
}

type RiskOverrideInput struct {
	EntityType EntityType `json:"entityType"`
	EntityID   string     `json:"entityId"`
	NewLevel   RiskLevel  `json:"newLevel"`
	NewScore   *int       `json:"newScore,omitempty"`
	Reason     string     `json:"reason"`
	ActorID    string     `json:"actorId"`
	ExpiresAt  string     `json:"expiresAt,omitempty"`
}

type RiskOverrideResult struct {
	Status    string    `json:"status"`
	Message   string    `json:"message,omitempty"`
	Risk      *RiskInfo `json:"risk,omitempty"`
	ErrorCode string    `json:"errorCode,omitempty"`
}

type MitigationApplyInput struct {
	EntityType     MitigationType `json:"entityType"`
	EntityID       string         `json:"entityId"`
	Action         string         `json:"action"`
	MitigationType MitigationType `json:"mitigationType"`
	Context        map[string]any `json:"context,omitempty"`
}

type MitigationApplyResult struct {
	Status       string `json:"status"`
	MitigationID string `json:"mitigationId,omitempty"`
	Message      string `json:"message,omitempty"`
	ExecuteAt    string `json:"executeAt,omitempty"`
	ErrorCode    string `json:"errorCode,omitempty"`
}

type RiskStatus struct {
	EntityType     EntityType `json:"entityType"`
	EntityID       string     `json:"entityId"`
	Score          *int       `json:"score,omitempty"`
	Level          *RiskLevel `json:"level,omitempty"`
	LastUpdated    string     `json:"lastUpdated,omitempty"`
	TriggeredRules []string   `json:"triggeredRules,omitempty"`
	Override       *struct {
		Active    bool   `json:"active"`
		Reason    string `json:"reason,omitempty"`
		ActorID   string `json:"actorId,omitempty"`
		ExpiresAt string `json:"expiresAt,omitempty"`
	} `json:"override,omitempty"`
}

type HealthCheckResponse struct {
	Status       string `json:"status"`
	Service      string `json:"service"`
	Version      string `json:"version"`
	Port         int    `json:"port"`
	Dependencies struct {
		RiskEngine string `json:"riskEngine"`
		Database   string `json:"database"`
	} `json:"dependencies"`
	Uptime int `json:"uptime"`
}

// ============================================
// CLIENT INTERFACE
// ============================================

type Client interface {
	SecurityCheck(ctx context.Context, req SecurityCheckRequest) (*SecurityCheckResponse, error)
	ValidatePermissions(ctx context.Context, user UserContext, action string) (*PermissionValidateResponse, error)
	OverrideRisk(ctx context.Context, input RiskOverrideInput) (*RiskOverrideResult, error)
	ApplyMitigation(ctx context.Context, input MitigationApplyInput) (*MitigationApplyResult, error)
	GetRiskStatus(ctx context.Context, entityType EntityType, entityID string) (*RiskStatus, error)
	HealthCheck(ctx context.Context) (*HealthCheckResponse, error)
}

// ============================================
// CLIENT IMPLEMENTATION
// ============================================

type ClientOptions struct {
	BaseURL       string
	TokenProvider func() (string, error)
	Timeout       time.Duration
	Retries       int
}

type client struct {
	baseURL       string
	tokenProvider func() (string, error)
	timeout       time.Duration
	retries       int
	httpClient    *http.Client
}

func NewClient(opts ClientOptions) Client {
	if opts.Timeout == 0 {
		opts.Timeout = 30 * time.Second
	}
	if opts.Retries == 0 {
		opts.Retries = 3
	}

	return &client{
		baseURL:       opts.BaseURL,
		tokenProvider: opts.TokenProvider,
		timeout:       opts.Timeout,
		retries:       opts.Retries,
		httpClient: &http.Client{
			Timeout: opts.Timeout,
		},
	}
}

// ============================================
// API METHODS
// ============================================

func (c *client) SecurityCheck(ctx context.Context, req SecurityCheckRequest) (*SecurityCheckResponse, error) {
	var result SecurityCheckResponse
	err := c.doRequest(ctx, "POST", "/security/check", req, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *client) ValidatePermissions(ctx context.Context, user UserContext, action string) (*PermissionValidateResponse, error) {
	req := PermissionValidateRequest{
		User:   user,
		Action: action,
	}
	var result PermissionValidateResponse
	err := c.doRequest(ctx, "POST", "/security/permissions/validate", req, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *client) OverrideRisk(ctx context.Context, input RiskOverrideInput) (*RiskOverrideResult, error) {
	var result RiskOverrideResult
	err := c.doRequest(ctx, "POST", "/security/risk/override", input, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *client) ApplyMitigation(ctx context.Context, input MitigationApplyInput) (*MitigationApplyResult, error) {
	var result MitigationApplyResult
	err := c.doRequest(ctx, "POST", "/security/mitigation/apply", input, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *client) GetRiskStatus(ctx context.Context, entityType EntityType, entityID string) (*RiskStatus, error) {
	path := fmt.Sprintf("/security/risk/%s/%s", entityType, entityID)
	var result RiskStatus
	err := c.doRequest(ctx, "GET", path, nil, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *client) HealthCheck(ctx context.Context) (*HealthCheckResponse, error) {
	var result HealthCheckResponse
	err := c.doRequest(ctx, "GET", "/security/health", nil, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// ============================================
// INTERNAL METHODS
// ============================================

func (c *client) doRequest(ctx context.Context, method, path string, body any, result any) error {
	var lastError error

	for attempt := 1; attempt <= c.retries; attempt++ {
		var reqBody io.Reader
		if body != nil {
			jsonBody, err := json.Marshal(body)
			if err != nil {
				return fmt.Errorf("failed to marshal request body: %w", err)
			}
			reqBody = bytes.NewReader(jsonBody)
		}

		url := c.baseURL + path
		req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
		if err != nil {
			return fmt.Errorf("failed to create request: %w", err)
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")

		if c.tokenProvider != nil {
			token, err := c.tokenProvider()
			if err != nil {
				return fmt.Errorf("failed to get token: %w", err)
			}
			req.Header.Set("Authorization", "Bearer "+token)
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastError = err
			if attempt < c.retries {
				time.Sleep(time.Second * time.Duration(attempt))
				continue
			}
			return fmt.Errorf("request failed after %d retries: %w", c.retries, lastError)
		}
		defer resp.Body.Close()

		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return fmt.Errorf("failed to read response body: %w", err)
		}

		if resp.StatusCode >= 400 && resp.StatusCode < 500 {
			// Client error - don't retry
			if err := json.Unmarshal(respBody, result); err != nil {
				return fmt.Errorf("failed to unmarshal error response: %w", err)
			}
			return nil
		}

		if resp.StatusCode >= 500 {
			// Server error - retry
			lastError = fmt.Errorf("server error: %d", resp.StatusCode)
			if attempt < c.retries {
				time.Sleep(time.Second * time.Duration(attempt))
				continue
			}
		}

		if err := json.Unmarshal(respBody, result); err != nil {
			return fmt.Errorf("failed to unmarshal response: %w", err)
		}

		return nil
	}

	return fmt.Errorf("request failed after %d retries: %w", c.retries, lastError)
}
