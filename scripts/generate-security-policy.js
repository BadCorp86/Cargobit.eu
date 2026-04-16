const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        Header, Footer, PageNumber, AlignmentType, HeadingLevel, 
        BorderStyle, WidthType, ShadingType, LevelFormat, PageBreak,
        TableOfContents } = require("docx");
const fs = require("fs");

// ============================================
// PALETTE - WR-2 Retro Green (Compliance/Legal)
// ============================================
const P = {
  primary: "2A4A3A",
  body: "1A1A1A", 
  secondary: "606060",
  accent: "C89F62",
  surface: "F4F1E9",
  white: "FFFFFF"
};

const c = (hex) => hex.replace("#", "");

// ============================================
// HELPER FUNCTIONS
// ============================================

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200, line: 360 },
    children: [new TextRun({ text, bold: true, size: 32, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150, line: 340 },
    children: [new TextRun({ text, bold: true, size: 28, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120, line: 320 },
    children: [new TextRun({ text, bold: true, size: 26, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })]
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 312, after: 120 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}

function bodyNoIndent(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 120 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 480 + level * 360 },
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• " + text, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}

function numberedItem(number, text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 480 },
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: number + " " + text, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}

function warning(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 360, right: 360 },
    spacing: { line: 312, before: 120, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: "FFF8E7" },
    border: {
      left: { style: BorderStyle.SINGLE, size: 24, color: c(P.accent) }
    },
    children: [new TextRun({ text: "⚠ " + text, size: 24, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}

function important(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 360, right: 360 },
    spacing: { line: 312, before: 120, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: "E8F4E8" },
    border: {
      left: { style: BorderStyle.SINGLE, size: 24, color: c(P.primary) }
    },
    children: [new TextRun({ text: "▶ " + text, size: 24, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}

// ============================================
// TABLE HELPERS
// ============================================

function createTable(headers, rows) {
  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent) },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent) },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" },
    insideVertical: { style: BorderStyle.NONE }
  };

  const headerCells = headers.map(h => new TableCell({
    children: [new Paragraph({ 
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: h, bold: true, size: 22, color: c(P.white), font: { ascii: "Calibri", eastAsia: "SimHei" } })]
    })],
    shading: { type: ShadingType.CLEAR, fill: c(P.primary) },
    margins: { top: 80, bottom: 80, left: 120, right: 120 }
  }));

  const dataRows = rows.map((row, idx) => new TableRow({
    children: row.map(cell => new TableCell({
      children: [new Paragraph({ 
        children: [new TextRun({ text: cell, size: 21, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
      })],
      shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? c(P.surface) : "FFFFFF" },
      margins: { top: 60, bottom: 60, left: 120, right: 120 }
    }))
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({ 
        children: headerCells,
        tableHeader: true
      }),
      ...dataRows
    ]
  });
}

// ============================================
// COVER PAGE (R2 Double-Rule Frame Style)
// ============================================

function buildCover() {
  const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
  
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    height: { value: 16838, rule: "exact" },
    borders: allNoBorders,
    rows: [
      new TableRow({
        height: { value: 16838, rule: "exact" },
        children: [
          new TableCell({
            verticalAlign: "top",
            borders: allNoBorders,
            children: [
              // Top accent line
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: c(P.accent) } },
                spacing: { after: 600 },
                children: []
              }),
              
              // Title section
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 3000, after: 200 },
                children: [new TextRun({ 
                  text: "CARGOBIT", 
                  bold: true, 
                  size: 56, 
                  color: c(P.primary),
                  font: { ascii: "Calibri", eastAsia: "SimHei" }
                })]
              }),
              
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 600 },
                children: [new TextRun({ 
                  text: "Security Policy Framework", 
                  size: 40, 
                  color: c(P.secondary),
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
                })]
              }),
              
              // Decorative line
              new Paragraph({
                alignment: AlignmentType.CENTER,
                indent: { left: 2000, right: 2000 },
                border: { 
                  top: { style: BorderStyle.SINGLE, size: 12, color: c(P.accent) } 
                },
                spacing: { before: 400, after: 600 },
                children: []
              }),
              
              // Subtitle
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [new TextRun({ 
                  text: "ISO 27001 | SOC2 | GDPR Compliant", 
                  size: 28, 
                  color: c(P.accent),
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
                })]
              }),
              
              // Version info
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 2000 },
                children: [new TextRun({ 
                  text: "Version 2.0", 
                  size: 24, 
                  color: c(P.secondary),
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
                })]
              }),
              
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [new TextRun({ 
                  text: "Document Classification: CONFIDENTIAL", 
                  size: 22, 
                  color: c(P.secondary),
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
                })]
              }),
              
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [new TextRun({ 
                  text: "Effective Date: April 16, 2026", 
                  size: 22, 
                  color: c(P.secondary),
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
                })]
              }),
              
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [new TextRun({ 
                  text: "Next Review: April 16, 2027", 
                  size: 22, 
                  color: c(P.secondary),
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
                })]
              }),
              
              // Bottom accent line
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 8, color: c(P.accent) } },
                spacing: { before: 2500 },
                children: []
              })
            ]
          })
        ]
      })
    ]
  });
}

// ============================================
// POLICY SECTIONS
// ============================================

function buildSection1() {
  return [
    h1("1. Security-Policy Overview (Executive Level)"),
    
    h2("1.1 Purpose"),
    body("This Security Policy Framework defines the comprehensive security requirements, controls, and governance structures for all components of the CargoBit Security Layer, including the Security Gateway, Risk Engine, Mitigation Service, Audit Service, and Notification Service. These policies ensure the protection of sensitive data, maintain regulatory compliance, and establish a robust security posture aligned with industry best practices and international standards."),
    body("The framework serves as the authoritative reference for all security-related decisions, procedures, and technical implementations within the organization. It provides clear guidance for developers, operations teams, compliance officers, and management on their respective security responsibilities and the expected standards of conduct."),
    
    h2("1.2 Scope"),
    body("The policies contained within this framework apply to all systems, processes, and personnel involved in the operation and maintenance of the CargoBit platform. This comprehensive scope ensures consistent security practices across all organizational functions and technology components."),
    
    h3("1.2.1 Technical Scope"),
    bullet("All microservices within the CargoBit architecture"),
    bullet("Internal APIs and service-to-service communication channels"),
    bullet("External-facing APIs and integration endpoints"),
    bullet("Support tools and administrative interfaces"),
    bullet("Developer workflows, CI/CD pipelines, and deployment processes"),
    bullet("Monitoring systems, alerting infrastructure, and incident response tools"),
    bullet("Database systems, caching layers, and message queues"),
    bullet("Identity and access management systems"),
    
    h3("1.2.2 Organizational Scope"),
    bullet("All employees, contractors, and third-party vendors with system access"),
    bullet("Development, operations, security, and compliance teams"),
    bullet("Management and executive leadership with security oversight responsibilities"),
    bullet("External auditors and regulatory bodies with authorized access"),
    
    h2("1.3 Objectives"),
    body("The Security Policy Framework is designed to achieve the following strategic objectives, which form the foundation of our security program and guide all security-related decisions and investments."),
    
    h3("1.3.1 Primary Security Objectives"),
    numberedItem("1.3.1.1", "Protection against fraud, unauthorized access, and malicious activities through layered security controls and continuous monitoring."),
    numberedItem("1.3.1.2", "Ensuring data integrity through cryptographic controls, access restrictions, and comprehensive audit logging mechanisms."),
    numberedItem("1.3.1.3", "Minimizing security risks through proactive threat identification, vulnerability management, and security awareness programs."),
    numberedItem("1.3.1.4", "Maintaining regulatory compliance with ISO 27001, SOC 2 Type II, GDPR, and other applicable standards and regulations."),
    
    h3("1.3.2 Operational Objectives"),
    bullet("Achieve 99.99% availability for security-critical services"),
    bullet("Maintain mean time to detect (MTTD) security incidents below 15 minutes"),
    bullet("Ensure mean time to respond (MTTR) to security incidents below 1 hour"),
    bullet("Complete 100% of required security training annually"),
    bullet("Conduct penetration testing at least annually and after significant changes"),
    
    h2("1.4 Policy Framework Structure"),
    body("This document comprises ten interconnected policy domains, each addressing specific aspects of security governance. These policies are designed to work together as a cohesive framework, with cross-references between related sections to ensure consistency and completeness."),
    
    createTable(
      ["Policy", "Description", "Primary Audience"],
      [
        ["RBAC Policy", "Role-based access control and permission governance", "All Users, IT Admins"],
        ["Secrets Management", "Secure handling of credentials and secrets", "DevOps, Security Teams"],
        ["TLS/Encryption", "Transport and data encryption standards", "Engineering, Infrastructure"],
        ["Logging & Audit", "Comprehensive logging and audit trail requirements", "Compliance, Security"],
        ["Data Retention", "Data lifecycle management and retention periods", "Data Governance, Legal"],
        ["Service Auth", "Service-to-service authentication requirements", "Architecture, DevOps"],
        ["Risk Override", "Procedures for risk level modifications", "Support, Compliance"],
        ["Mitigation", "Security mitigation procedures and controls", "Operations, Support"],
        ["Operational Security", "On-call, monitoring, and incident response", "SRE, Security Operations"]
      ]
    ),
    
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    
    h2("1.5 Compliance Requirements"),
    body("The CargoBit Security Layer operates within a regulatory framework that mandates specific security controls and practices. Compliance with these requirements is not optional and must be maintained continuously. Regular audits and assessments verify adherence to these standards."),
    
    createTable(
      ["Standard", "Scope", "Audit Frequency"],
      [
        ["ISO 27001:2022", "Information Security Management System", "Annual"],
        ["SOC 2 Type II", "Security, Availability, Confidentiality", "Annual"],
        ["GDPR", "Personal data protection (EU)", "Continuous + Annual Review"],
        ["PCI DSS", "Payment card data handling", "Annual"],
        ["NIS2 Directive", "Critical infrastructure security (EU)", "Annual"]
      ]
    ),
    
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    
    important("Policy violations may result in disciplinary action up to and including termination of employment or contract. All personnel must acknowledge understanding of these policies upon hire and annually thereafter."),
  ];
}

function buildSection2() {
  return [
    h1("2. RBAC Policy (Roles, Permissions, Governance)"),
    
    h2("2.1 Overview"),
    body("Role-Based Access Control (RBAC) forms the foundation of our authorization model, ensuring that users have access only to the resources and functions necessary for their job responsibilities. This principle of least privilege minimizes the risk of unauthorized access and reduces the potential impact of compromised accounts."),
    
    h2("2.2 Role Definitions"),
    body("The following roles are defined within the CargoBit Security Layer. Each role has specific permissions and restrictions designed to align with job functions while maintaining security boundaries."),
    
    createTable(
      ["Role", "Description", "Security Permissions"],
      [
        ["User", "End users of the platform (Shippers, Drivers, Dispatchers)", "No direct security actions; subject to all security checks"],
        ["Support", "First-level support agents", "Risk override (Yellow → Green only); Ticket handling"],
        ["Compliance", "Compliance officers and investigators", "Risk override (all levels); KYB decisions; Audit access"],
        ["Security Engineer", "Technical security personnel", "Policy changes; Audit review; Security configurations"],
        ["Admin", "System administrators", "No override rights (separation of duties enforced)"]
      ]
    ),
    
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    
    warning("Critical Separation of Duties: Administrators must NOT have Risk Override permissions. This separation prevents both accidental and intentional bypassing of security controls by privileged users."),
    
    h2("2.3 Permission Matrix"),
    body("The Permission Matrix defines the exact permissions granted to each role. This matrix is enforced at runtime by the Security Gateway and cannot be modified without following the formal change management process."),
    
    h3("2.3.1 Core Permissions by Role"),
    
    createTable(
      ["Permission", "User", "Support", "Compliance", "Security Eng", "Admin"],
      [
        ["View Own Profile", "✓", "✓", "✓", "✓", "✓"],
        ["View Any Profile", "✗", "✓", "✓", "✓", "✓"],
        ["Override Risk (Yellow→Green)", "✗", "✓", "✓", "✗", "✗"],
        ["Override Risk (Red→Yellow)", "✗", "✗", "✓", "✗", "✗"],
        ["Override Risk (Red→Green)", "✗", "✗", "✓", "✗", "✗"],
        ["Modify Security Policies", "✗", "✗", "✗", "✓", "✗"],
        ["Access Audit Logs", "✗", "Limited", "✓", "✓", "✓"],
        ["Manage System Config", "✗", "✗", "✗", "✓", "✓"],
        ["Create/Modify Users", "✗", "✗", "✗", "✗", "✓"]
      ]
    ),
    
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    
    h2("2.4 Permission Matrix Governance"),
    body("The Permission Matrix is a critical security component that requires strict governance controls. Changes to the matrix follow a formal approval process to ensure all modifications are appropriate, documented, and auditable."),
    
    h3("2.4.1 Governance Requirements"),
    bullet("The Permission Matrix is read-only at runtime; no dynamic modifications are permitted."),
    bullet("All changes must be implemented via Pull Request with code review."),
    bullet("Four-eyes review is mandatory for all permission changes (two approvers required)."),
    bullet("Version control through Git maintains complete change history."),
    bullet("Hash validation at Gateway startup detects unauthorized modifications."),
    bullet("Emergency changes require Security Officer approval within 24 hours."),
    
    h3("2.4.2 Change Management Process"),
    numberedItem("Step 1:", "Submit Pull Request with detailed justification for permission changes."),
    numberedItem("Step 2:", "Security Engineer conducts initial review and risk assessment."),
    numberedItem("Step 3:", "Compliance Officer reviews for regulatory implications."),
    numberedItem("Step 4:", "Second approver from different team validates the change."),
    numberedItem("Step 5:", "Changes merge to develop branch for testing."),
    numberedItem("Step 6:", "Security testing validates no unintended access granted."),
    numberedItem("Step 7:", "Changes deploy to production with audit trail."),
    
    h2("2.5 Role Assignment Procedures"),
    body("Role assignments are managed through a formal request and approval process. The principle of least privilege guides all role assignments, ensuring users receive only the minimum permissions necessary for their job functions."),
    
    h3("2.5.1 Standard Role Assignment"),
    bullet("Manager submits role request through IT Service Management system."),
    bullet("Request must include business justification and duration."),
    bullet("Security team reviews request against principle of least privilege."),
    bullet("Approval requires manager and security officer sign-off."),
    bullet("Role assignment logged in audit system with expiration date."),
    bullet("Automatic review triggered 30 days before expiration."),
    
    h3("2.5.2 Emergency Access"),
    bullet("Emergency access requires Security Officer verbal approval."),
    bullet("Maximum duration: 4 hours."),
    bullet("Full audit logging of all actions during emergency access."),
    bullet("Mandatory review within 24 hours of emergency access grant."),
    bullet("Incident report required for any extended emergency access."),
    
    important("Regular access reviews are conducted quarterly. All role assignments without active business justification will be revoked during these reviews."),
  ];
}

function buildSection3() {
  return [
    h1("3. Secrets Management Policy"),
    
    h2("3.1 Overview"),
    body("Secrets management is critical to protecting sensitive credentials, API keys, and cryptographic materials. This policy establishes mandatory requirements for the secure generation, storage, rotation, and destruction of all secrets within the CargoBit Security Layer."),
    
    h2("3.2 Secrets Storage Requirements"),
    body("All secrets must be stored in approved secrets management systems. Storing secrets in code repositories, configuration files, CI/CD logs, or any other unapproved location is strictly prohibited."),
    
    h3("3.2.1 Approved Secrets Management Systems"),
    bullet("Azure Key Vault (primary for Azure deployments)"),
    bullet("AWS Secrets Manager (primary for AWS deployments)"),
    bullet("HashiCorp Vault (for hybrid and on-premises environments)"),
    bullet("Kubernetes Secrets (only when encrypted at rest with external KMS)"),
    
    h3("3.2.2 Prohibited Storage Locations"),
    bullet("Source code repositories (public or private)"),
    bullet("Configuration files committed to version control"),
    bullet("CI/CD pipeline logs or artifacts"),
    bullet("Documentation files (including README files)"),
    bullet("Email communications"),
    bullet("Chat/messaging platforms"),
    bullet("Local development machines (unencrypted)"),
    
    warning("Any discovery of secrets in prohibited locations must be immediately reported to the Security team. The secret must be rotated within 1 hour of discovery, and an incident report filed."),
    
    h2("3.3 Secrets Rotation"),
    body("Regular rotation of secrets reduces the window of opportunity for attackers to exploit compromised credentials. Different types of secrets have different rotation requirements based on their sensitivity and usage patterns."),
    
    createTable(
      ["Secret Type", "Rotation Frequency", "Rotation Trigger"],
      [
        ["Service Tokens", "Every 24 hours", "Automatic; manual on incident"],
        ["API Keys", "Every 90 days", "Automatic; manual on compromise"],
        ["Database Credentials", "Every 30 days", "Automatic; manual on personnel change"],
        ["Encryption Keys", "Every 365 days", "Planned; requires key ceremony"],
        ["SSH Keys", "Every 180 days", "Semi-automatic; user-initiated"],
        ["TLS Certificates", "Every 90 days", "Automatic via ACME"],
        ["Admin Passwords", "Every 90 days", "Manual; enforced by policy"]
      ]
    ),
    
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    
    h3("3.3.1 Emergency Rotation"),
    body("Immediate rotation is required under the following circumstances:"),
    bullet("Suspected or confirmed credential compromise"),
    bullet("Personnel termination or role change"),
    bullet("Security incident involving the system using the secret"),
    bullet("Discovery of secret in unauthorized location"),
    bullet("Compliance audit finding"),
    
    h2("3.4 Secrets Access Control"),
    body("Access to secrets follows the principle of least privilege. Services and individuals can only retrieve the secrets necessary for their specific functions."),
    
    h3("3.4.1 Service Access Requirements"),
    bullet("Services must authenticate using mTLS with valid service identity."),
    bullet("Each service receives only its designated secrets."),
    bullet("Secrets access is logged with timestamp, service identity, and secret name."),
    bullet("Anomaly detection alerts on unusual access patterns."),
    bullet("Access denied by default; explicit allow-list configuration required."),
    
    h3("3.4.2 Human Access Requirements"),
    bullet("Human access requires MFA authentication."),
    bullet("Access limited to DevOps, Security, and designated on-call personnel."),
    bullet("Just-in-time access model: permissions granted for specific task duration."),
    bullet("All access attempts logged and reviewed weekly."),
    bullet("Break-glass procedures for emergency access with mandatory review."),
    
    h2("3.5 Secrets in Development and Testing"),
    body("Development and testing environments require special handling to prevent production secrets from being exposed while maintaining functional testing capabilities."),
    
    bullet("Development environments use dedicated, non-production secrets."),
    bullet("Test environments use synthetic secrets or secret references."),
    bullet("Production secrets never used in development or testing."),
    bullet("CI/CD pipelines inject secrets at runtime; never stored in code."),
    bullet("Local development uses .env files excluded from version control."),
    bullet("Pre-commit hooks scan for accidental secret inclusion."),
    
    important("All production secrets must be unique from development/test secrets. Never reuse credentials across environments."),
  ];
}

function buildSection4() {
  return [
    h1("4. TLS / Encryption Policy"),
    
    h2("4.1 Overview"),
    body("Encryption is a fundamental security control that protects data confidentiality and integrity. This policy establishes mandatory encryption requirements for data in transit and at rest, along with specific cryptographic standards that must be followed."),
    
    h2("4.2 Transport Encryption"),
    body("All network communications must be encrypted using Transport Layer Security (TLS). Unencrypted communications are prohibited for all internal and external data transfers."),
    
    h3("4.2.1 TLS Requirements"),
    bullet("TLS 1.3 is required for all new implementations."),
    bullet("TLS 1.2 is permitted only for legacy system compatibility with documented exception."),
    bullet("TLS 1.1 and earlier are prohibited and must be disabled."),
    bullet("No fallback to unencrypted connections under any circumstances."),
    bullet("HSTS (HTTP Strict Transport Security) must be enabled on all web endpoints."),
    bullet("Perfect Forward Secrecy (PFS) using ECDHE cipher suites is mandatory."),
    
    h3("4.2.2 Approved Cipher Suites"),
    bullet("TLS_AES_256_GCM_SHA384 (TLS 1.3 preferred)"),
    bullet("TLS_CHACHA20_POLY1305_SHA256 (TLS 1.3)"),
    bullet("TLS_AES_128_GCM_SHA256 (TLS 1.3)"),
    bullet("ECDHE-RSA-AES256-GCM-SHA384 (TLS 1.2 only)"),
    bullet("ECDHE-RSA-CHACHA20-POLY1305 (TLS 1.2 only)"),
    
    h3("4.2.3 Certificate Management"),
    bullet("All certificates must be issued by approved Certificate Authorities."),
    bullet("Wildcard certificates prohibited for high-security environments."),
    bullet("Certificate transparency logging required for all public certificates."),
    bullet("Automatic renewal via ACME protocol (Let's Encrypt or equivalent)."),
    bullet("Certificate expiration monitoring with 30-day warning alerts."),
    
    h2("4.3 Data Encryption at Rest"),
    body("All stored data must be encrypted using approved encryption algorithms. This applies to databases, file systems, backups, and any other persistent storage."),
    
    h3("4.3.1 Database Encryption"),
    bullet("AES-256 encryption for all database contents."),
    bullet("Transparent Data Encryption (TDE) for database files."),
    bullet("Column-level encryption for highly sensitive fields."),
    bullet("Encryption keys stored in approved secrets management system."),
    bullet("Database-level encryption keys separate from application keys."),
    
    h3("4.3.2 Backup Encryption"),
    bullet("All backups encrypted with AES-256 before storage."),
    bullet("Backup encryption keys stored separately from backup data."),
    bullet("Cross-region backup replication maintains encryption."),
    bullet("Backup restoration requires authorized key access."),
    
    h2("4.4 Sensitive Field Encryption"),
    body("Certain data fields require additional protection beyond standard encryption due to their sensitivity. Special handling requirements apply to these fields."),
    
    createTable(
      ["Data Type", "Encryption Method", "Additional Controls"],
      [
        ["2FA Codes", "bcrypt hash (cost factor 12)", "Short TTL; max 3 attempts"],
        ["GPS Coordinates", "Salted SHA-256 hash", "Location-based access control"],
        ["IBAN Data", "Tokenized reference only", "Anonymized age buckets"],
        ["Personal Identifiers", "AES-256-GCM", "Key rotation every 90 days"],
        ["Payment Data", "PCI DSS compliant encryption", "HSM-backed key storage"]
      ]
    ),
    
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    
    h2("4.5 Key Management"),
    body("Cryptographic keys are critical security assets that require careful management throughout their lifecycle, from generation through destruction."),
    
    h3("4.5.1 Key Generation"),
    bullet("Keys must be generated using cryptographically secure random number generators."),
    bullet("Key generation must occur within approved HSM or key management systems."),
    bullet("Key generation events are logged with operator identity."),
    bullet("Dual control required for root and master key generation."),
    
    h3("4.5.2 Key Storage"),
    bullet("Keys stored only in approved key management systems."),
    bullet("HSM protection for high-value keys (root CA, signing keys)."),
    bullet("Key access requires MFA authentication."),
    bullet("Keys never stored in application memory longer than necessary."),
    
    h3("4.5.3 Key Rotation"),
    bullet("Regular rotation per the schedule defined in Secrets Management Policy."),
    bullet("Support for old and new keys during rotation transition period."),
    bullet("Automated rotation for data encryption keys."),
    bullet("Key ceremony process for root and master key rotation."),
    
    warning("Lost or compromised encryption keys must be reported immediately. Data encrypted with compromised keys must be re-encrypted with new keys."),
  ];
}

function buildSection5() {
  return [
    h1("5. Logging & Audit Policy"),
    
    h2("5.1 Overview"),
    body("Comprehensive logging and audit trails are essential for security monitoring, incident investigation, and regulatory compliance. This policy establishes requirements for what must be logged, how logs must be protected, and how long they must be retained."),
    
    h2("5.2 Audit Log Requirements"),
    body("Audit logs capture security-relevant events and provide an immutable record of actions taken within the system. These logs are critical for forensic analysis and compliance verification."),
    
    h3("5.2.1 Mandatory Log Fields"),
    body("Every audit log entry must contain the following fields to ensure completeness and traceability:"),
    
    createTable(
      ["Field", "Description", "Example"],
      [
        ["actorId", "Unique identifier of the user/service performing action", "u_1001, svc_transport"],
        ["action", "Type of action performed", "LOGIN, RISK_OVERRIDE, PAYOUT"],
        ["decision", "Result of security evaluation", "ALLOWED, BLOCKED, MITIGATION"],
        ["riskScore", "Risk score at time of action", "0-100"],
        ["correlationId", "Unique identifier linking related events", "corr-abc123"],
        ["timestamp", "Precise time of event (UTC)", "2026-04-16T14:32:15.123Z"],
        ["entityType", "Type of entity affected", "USER, TRANSACTION, COMPANY"],
        ["entityId", "Unique identifier of affected entity", "tx_3001, u_1001"],
        ["sourceIp", "IP address of request origin", "192.168.1.100"],
        ["userAgent", "Client application identifier", "CargoBit/2.0"]
      ]
    ),
    
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    
    h3("5.2.2 Events Requiring Audit Logging"),
    bullet("All authentication attempts (successful and failed)"),
    bullet("All authorization decisions (allow, deny, mitigation required)"),
    bullet("Risk score calculations and level changes"),
    bullet("Risk overrides (manual score modifications)"),
    bullet("Permission changes and role assignments"),
    bullet("Configuration modifications affecting security"),
    bullet("Data export and bulk operations"),
    bullet("Administrative actions (user creation, deletion, modification)"),
    bullet("Security policy changes"),
    bullet("System start/stop/restart events"),
    
    h2("5.3 Audit Log Protection"),
    body("Audit logs are critical security assets that must be protected from tampering, unauthorized access, and loss."),
    
    h3("5.3.1 Integrity Protection"),
    bullet("Audit logs are append-only; no modifications or deletions permitted."),
    bullet("Hash chain validation detects any tampering attempts."),
    bullet("Digital signatures on log batches provide authenticity verification."),
    bullet("Log integrity verification runs daily with alerts on anomalies."),
    
    h3("5.3.2 Access Control"),
    bullet("WORM (Write Once Read Many) storage prevents modification."),
    bullet("Read access limited to Security Engineers and Compliance Officers."),
    bullet("All log access generates additional audit entry."),
    bullet("Log access requires MFA authentication."),
    
    h3("5.3.3 Storage and Backup"),
    bullet("Logs stored in dedicated, isolated log storage infrastructure."),
    bullet("Cross-region replication for disaster recovery."),
    bullet("Backup encryption with separate key management."),
    bullet("Regular restore testing (quarterly)."),
    
    h2("5.4 Log Monitoring and Alerting"),
    body("Real-time monitoring of audit logs enables rapid detection of security incidents and policy violations."),
    
    h3("5.4.1 Real-Time Alerts"),
    bullet("Multiple failed authentication attempts from single source"),
    bullet("Risk score exceeding threshold (RED level reached)"),
    bullet("Privilege escalation attempts"),
    bullet("Unusual access patterns (geographic anomalies, time anomalies)"),
    bullet("Bulk data access or export operations"),
    bullet("Configuration changes outside change windows"),
    
    h3("5.4.2 Daily Reports"),
    bullet("Summary of all security events by category"),
    bullet("List of risk overrides with justification"),
    bullet("Failed access attempts and blocked actions"),
    bullet("New user creations and role assignments"),
    bullet("System configuration changes"),
    
    important("Audit logs must never contain sensitive data such as passwords, full credit card numbers, or encryption keys. Such data must be masked or hashed before logging."),
  ];
}

function buildSection6() {
  return [
    h1("6. Data Retention Policy"),
    
    h2("6.1 Overview"),
    body("This policy defines the retention periods for different types of data within the CargoBit Security Layer. Retention periods balance operational needs, regulatory requirements, and data minimization principles. Data must be securely deleted when retention periods expire."),
    
    h2("6.2 Retention Periods"),
    body("The following retention periods apply to different data categories. These periods represent minimum requirements; longer retention may be required for specific legal or regulatory purposes."),
    
    createTable(
      ["Data Type", "Retention Period", "Regulatory Basis"],
      [
        ["Audit Logs", "5 years", "ISO 27001, SOC2, GDPR"],
        ["Risk Events", "2 years", "Fraud analysis requirements"],
        ["Mitigation Events", "1 year", "Support traceability"],
        ["Notification Records", "90 days", "Debugging purposes"],
        ["Support Tickets", "3 years", "Compliance requirements"],
        ["User Profiles", "Duration of relationship + 1 year", "GDPR, business needs"],
        ["Transaction Records", "7 years", "Financial regulations"],
        ["Session Data", "24 hours", "Security monitoring"],
        ["Performance Metrics", "90 days", "Operational needs"],
        ["Security Incidents", "7 years", "Legal and compliance"]
      ]
    ),
    
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    
    h2("6.3 Data Deletion Procedures"),
    body("When retention periods expire, data must be securely deleted following approved procedures. Deletion must be complete and irreversible."),
    
    h3("6.3.1 Automated Deletion"),
    bullet("Automated jobs run daily to identify expired data."),
    bullet("Deletion candidates flagged 7 days before scheduled deletion."),
    bullet("Compliance team reviews deletion queue weekly."),
    bullet("Secure deletion using cryptographic erasure where applicable."),
    bullet("Deletion confirmation logged in audit system."),
    
    h3("6.3.2 Manual Deletion Requests"),
    bullet("GDPR Article 17 (Right to Erasure) requests processed within 30 days."),
    bullet("Verification of requestor identity required."),
    bullet("Legal hold check before any deletion."),
    bullet("Deletion scope documented and communicated to requestor."),
    
    h2("6.4 Legal Hold"),
    body("When litigation, investigation, or regulatory inquiry is anticipated or ongoing, normal retention schedules may be overridden by legal hold requirements."),
    
    bullet("Legal hold prevents deletion of relevant data regardless of retention period."),
    bullet("Legal team specifies scope and duration of hold."),
    bullet("Systems tagged to prevent automated deletion."),
    bullet("Hold release requires Legal department authorization."),
    bullet("Post-hold deletion follows standard procedures."),
    
    h2("6.5 Data Minimization"),
    body("Data minimization reduces risk by collecting and retaining only the data necessary for specified purposes. This principle applies throughout the data lifecycle."),
    
    bullet("Collect only data necessary for the stated purpose."),
    bullet("Use anonymization or pseudonymization where possible."),
    bullet("Implement data aggregation for analytics where individual records not needed."),
    bullet("Regular review of data collection practices."),
    bullet("Quarterly data inventory audits."),
    
    important("Any data retention beyond specified periods requires documented business justification and Compliance Officer approval. Extensions must be reviewed annually."),
  ];
}

function buildSection7() {
  return [
    h1("7. Service-to-Service Authentication Policy"),
    
    h2("7.1 Overview"),
    body("Service-to-service communication within the CargoBit architecture requires strong authentication to prevent unauthorized access and ensure that only legitimate services can interact with each other. This policy establishes the authentication requirements for all inter-service communication."),
    
    h2("7.2 Authentication Requirements"),
    body("All service-to-service calls must be authenticated. Network-level trust is never sufficient for authentication purposes."),
    
    h3("7.2.1 mTLS Requirements"),
    bullet("Mutual TLS (mTLS) required for all service-to-service communication."),
    bullet("Each service has unique X.509 certificate identifying it."),
    bullet("Certificate validation includes: issuer, validity period, revocation status."),
    bullet("Certificate rotation automated with 7-day overlap period."),
    bullet("Short-lived certificates preferred (maximum 24-hour validity)."),
    
    h3("7.2.2 Service JWT Requirements"),
    bullet("Services issue short-lived JWT tokens for authorization."),
    bullet("JWT must include: issuer (iss), audience (aud), expiration (exp)."),
    bullet("Maximum token lifetime: 5 minutes."),
    bullet("Rotating signing keys with 24-hour overlap during rotation."),
    bullet("JWT signature algorithm: RS256 or ES256."),
    
    h2("7.3 Token Validation"),
    body("Every service must validate incoming tokens before processing requests. Validation failures must result in request rejection with appropriate logging."),
    
    h3("7.3.1 Validation Steps"),
    numberedItem("Step 1:", "Verify issuer (iss) matches expected service identity."),
    numberedItem("Step 2:", "Verify audience (aud) includes current service."),
    numberedItem("Step 3:", "Verify signature using current or previous signing key."),
    numberedItem("Step 4:", "Verify expiration (exp) has not passed."),
    numberedItem("Step 5:", "Verify service role is authorized for requested action."),
    numberedItem("Step 6:", "Check token against revocation list (if applicable)."),
    
    h3("7.3.2 Validation Failure Handling"),
    bullet("Return 401 Unauthorized for invalid/expired tokens."),
    bullet("Log validation failure with token claims (excluding sensitive data)."),
    bullet("Rate limit repeated failures from same source."),
    bullet("Alert on anomalous validation failure patterns."),
    
    h2("7.4 Zero Trust Architecture"),
    body("The CargoBit Security Layer implements Zero Trust principles, assuming that no network location is inherently trustworthy. Every request must be authenticated and authorized regardless of origin."),
    
    h3("7.4.1 Zero Trust Principles"),
    bullet("Never trust based on network location alone."),
    bullet("Verify every request, every time."),
    bullet("Assume breach; design for lateral movement prevention."),
    bullet("Least privilege access for all services."),
    bullet("Continuous monitoring and validation."),
    
    h3("7.4.2 Implementation"),
    bullet("Service mesh (Istio/Linkerd) enforces mTLS automatically."),
    bullet("Network policies restrict pod-to-pod communication."),
    bullet("Service identities managed via SPIFFE/SPIRE."),
    bullet("Authorization policies defined per service pair."),
    bullet("Regular access reviews and policy audits."),
    
    warning("Services must never share credentials or tokens. Each service must have its own unique identity and credentials."),
  ];
}

function buildSection8() {
  return [
    h1("8. Risk Override Policy"),
    
    h2("8.1 Overview"),
    body("Risk overrides allow authorized personnel to modify the risk level of users, companies, or transactions when legitimate business circumstances require it. This policy defines who can perform overrides, under what conditions, and what documentation is required."),
    
    h2("8.1 Override Authority Matrix"),
    body("Different roles have different override capabilities based on their authorization level and the principle of least privilege."),
    
    createTable(
      ["Role", "Override Capability", "Conditions"],
      [
        ["Support Agent", "Yellow → Green only", "Requires documented verification"],
        ["Compliance Officer", "All transitions allowed", "Requires justification; may need approval"],
        ["Security Engineer", "No override capability", "Policy change only"],
        ["Admin", "No override capability", "Separation of duties enforced"]
      ]
    ),
    
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    
    h2("8.2 Override Requirements"),
    body("All risk overrides must include specific information to ensure proper documentation and audit trail."),
    
    h3("8.2.1 Required Fields"),
    bullet("reason: Detailed explanation of why override is necessary."),
    bullet("actorId: Unique identifier of person performing override."),
    bullet("newLevel: Target risk level (green, yellow, or red)."),
    bullet("newScore: Target risk score (0-100)."),
    bullet("evidenceReference: Link to supporting documentation."),
    bullet("approvalId: Reference to approval if required."),
    
    h3("8.2.2 Override Documentation"),
    bullet("All overrides logged in audit system immediately."),
    bullet("Supporting documentation attached or referenced."),
    bullet("For Red → Green overrides: Compliance Officer secondary approval required."),
    bullet("Override justification must be reviewable by auditors."),
    
    h2("8.3 Override Workflow"),
    body("The following workflow governs the risk override process, ensuring appropriate oversight and documentation."),
    
    numberedItem("Step 1:", "Agent identifies need for override through investigation."),
    numberedItem("Step 2:", "Agent gathers supporting evidence and documentation."),
    numberedItem("Step 3:", "Agent submits override request through approved interface."),
    numberedItem("Step 4:", "System validates agent has required authority."),
    numberedItem("Step 5:", "If required, request routes to approver."),
    numberedItem("Step 6:", "Upon approval, system applies override."),
    numberedItem("Step 7:", "Audit log entry created with all details."),
    numberedItem("Step 8:", "Notification sent to Security team for awareness."),
    
    h2("8.4 Override Monitoring"),
    body("All override activity is monitored to detect potential abuse or unusual patterns."),
    
    bullet("Daily summary of all overrides sent to Compliance team."),
    bullet("Weekly review of override patterns and trends."),
    bullet("Alert on: unusual volume, same entity multiple overrides, out-of-hours overrides."),
    bullet("Monthly audit sample of overrides for quality review."),
    bullet("Quarterly analysis of override effectiveness."),
    
    important("Override authority can be revoked for: abuse, failure to document properly, or bypassing approval requirements. Revocation requires Security Officer approval."),
  ];
}

function buildSection9() {
  return [
    h1("9. Mitigation Policy"),
    
    h2("9.1 Overview"),
    body("Mitigation actions are applied when transactions or users fall into the YELLOW risk category. These actions provide additional security controls while allowing legitimate business activities to proceed. This policy defines the types of mitigations, their parameters, and operational requirements."),
    
    h2("9.2 Mitigation Types"),
    body("The following mitigation types are available within the CargoBit Security Layer. Each type has specific parameters and constraints."),
    
    h3("9.2.1 Delay Mitigation"),
    bullet("Purpose: Provide time for additional verification or fraud detection."),
    bullet("Maximum Duration: 48 hours."),
    bullet("Applicable Actions: Payouts, high-value transactions."),
    bullet("Queue Lag Requirement: < 2 seconds from creation to queue processing."),
    bullet("User Notification: Required upon delay initiation."),
    
    h3("9.2.2 Two-Factor Authentication (2FA)"),
    bullet("Purpose: Verify user identity through secondary channel."),
    bullet("Code Validity: 5 minutes from generation."),
    bullet("Maximum Attempts: 3 before lockout."),
    bullet("Storage: One-way hash only (bcrypt, cost factor 12)."),
    bullet("Delivery Channels: SMS, Email, Authenticator App."),
    
    h3("9.2.3 GPS Verification"),
    bullet("Purpose: Confirm user location matches expected area."),
    bullet("Maximum Radius: 50 km from expected location."),
    bullet("Country Whitelist: Must be on approved countries list."),
    bullet("Storage: Salted hash of coordinates."),
    bullet("Accuracy Requirement: GPS accuracy must be < 100m."),
    
    h3("9.2.4 Extra Logging"),
    bullet("Purpose: Enhanced monitoring of flagged activities."),
    bullet("Implementation: Immediate activation; no user interaction required."),
    bullet("Duration: Until risk level returns to GREEN."),
    bullet("Scope: All user actions during logging period."),
    bullet("Retention: Standard audit log retention (5 years)."),
    
    h2("9.3 Mitigation State Machine"),
    body("Mitigations progress through defined states. Understanding the state transitions ensures proper handling of each mitigation."),
    
    createTable(
      ["State", "Description", "Valid Transitions"],
      [
        ["pending", "Mitigation created, awaiting processing", "waiting_for_user, completed, failed"],
        ["waiting_for_user", "User action required", "completed, failed, expired"],
        ["completed", "Successfully resolved", "Terminal state"],
        ["failed", "Could not complete", "Terminal state"],
        ["expired", "Time limit exceeded", "Terminal state"]
      ]
    ),
    
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    
    h2("9.4 Mitigation Monitoring"),
    body("Operational monitoring ensures mitigations function correctly and do not create undue business impact."),
    
    h3("9.4.1 Key Metrics"),
    bullet("Mitigation creation rate (per type, per hour)"),
    bullet("Average time to completion (per type)"),
    bullet("Expiration rate (percentage of expired mitigations)"),
    bullet("User completion rate (percentage of successful user actions)"),
    bullet("Queue lag (time from creation to first processing)"),
    
    h3("9.4.2 Alert Thresholds"),
    bullet("Queue lag > 2 seconds: Warning"),
    bullet("Queue lag > 5 seconds: Critical"),
    bullet("Expiration rate > 10%: Warning"),
    bullet("Expiration rate > 25%: Critical"),
    bullet("2FA delivery failure > 1%: Critical"),
    
    warning("Mitigations that fail or expire must trigger support ticket creation for manual review. No transaction should proceed without resolution."),
  ];
}

function buildSection10() {
  return [
    h1("10. Operational Security Policy"),
    
    h2("10.1 Overview"),
    body("Operational security encompasses the day-to-day practices, procedures, and controls that maintain the security posture of the CargoBit Security Layer. This policy addresses on-call responsibilities, monitoring requirements, and incident response procedures."),
    
    h2("10.2 On-Call Requirements"),
    body("24/7 on-call coverage ensures rapid response to security incidents and system issues affecting the security layer."),
    
    h3("10.2.1 On-Call Responsibilities"),
    bullet("Maintain 24/7 coverage through rotation schedule."),
    bullet("Respond to pages within 15 minutes."),
    bullet("Escalate to next level if unable to resolve within 30 minutes."),
    bullet("Document all actions taken during on-call shifts."),
    bullet("Participate in post-incident reviews for incidents handled."),
    
    h3("10.2.2 Required Access"),
    body("On-call personnel must have access to the following systems:"),
    bullet("Grafana dashboards for real-time metrics visualization."),
    bullet("Log aggregation system (ELK/Splunk) for log analysis."),
    bullet("Alertmanager for alert acknowledgment and silencing."),
    bullet("Runbooks for standard operating procedures."),
    bullet("Incident management system for ticket creation and tracking."),
    bullet("Communication channels (Slack/PagerDuty) for team coordination."),
    
    h2("10.3 Monitoring and Alerting"),
    body("Comprehensive monitoring provides visibility into system health and security posture."),
    
    h3("10.3.1 Critical Alerts (Immediate Response Required)"),
    bullet("RED-Spike: Sudden increase in high-risk classifications."),
    bullet("Risk-Engine Timeout: Risk engine not responding within SLA."),
    bullet("Mitigation Queue Lag: Queue processing delay exceeds threshold."),
    bullet("Audit Write Failures: Unable to persist audit logs."),
    bullet("Notification Failures: Unable to deliver security notifications."),
    bullet("Authentication Service Down: Users unable to authenticate."),
    
    h3("10.3.2 Warning Alerts (Review Within 4 Hours)"),
    bullet("Elevated error rates above normal baseline."),
    bullet("Certificate expiration within 7 days."),
    bullet("Secret rotation failures."),
    bullet("Unusual geographic access patterns."),
    bullet("Rate limit threshold approaching."),
    
    h2("10.4 Incident Response"),
    body("The incident response process ensures systematic handling of security incidents from detection through resolution and lessons learned."),
    
    h3("10.4.1 Response Timeline"),
    
    createTable(
      ["Phase", "Timeline", "Responsible"],
      [
        ["Detection", "Automated monitoring or user report", "Monitoring Systems"],
        ["Triage", "Within 15 minutes", "On-Call Engineer"],
        ["Initial Assessment", "Within 30 minutes", "On-Call Engineer"],
        ["Containment", "As soon as possible", "Security Team"],
        ["Root Cause Analysis", "Within 48 hours", "Incident Team"],
        ["Post-Mortem", "Within 72 hours", "All Stakeholders"],
        ["Implementation of Fixes", "Per severity", "Development Team"]
      ]
    ),
    
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    
    h3("10.4.2 Severity Levels"),
    
    createTable(
      ["Severity", "Description", "Response Time", "Escalation"],
      [
        ["P1 - Critical", "Security breach or data exposure", "Immediate", "CTO, Security Officer"],
        ["P2 - High", "Service degradation or control failure", "15 minutes", "Engineering Manager"],
        ["P3 - Medium", "Partial functionality impact", "1 hour", "Team Lead"],
        ["P4 - Low", "Minor issues, no business impact", "4 hours", "On-Call"]
      ]
    ),
    
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    
    h3("10.4.3 Post-Incident Requirements"),
    bullet("Blameless post-mortem document created for all P1/P2 incidents."),
    bullet("Timeline of events documented with timestamps."),
    bullet("Root cause identified and documented."),
    bullet("Action items assigned with owners and deadlines."),
    bullet("Lessons learned shared with broader team."),
    bullet("Runbook updates where applicable."),
    
    h2("10.5 Change Management"),
    body("Changes to security-critical systems require additional scrutiny and controls."),
    
    bullet("All changes to security policies require Security Officer approval."),
    bullet("Changes to authentication systems require 4-eyes review."),
    bullet("Production changes require change ticket and approval."),
    bullet("Emergency changes require retrospective approval within 24 hours."),
    bullet("All changes logged in audit system with before/after states."),
    
    important("During active security incidents, all non-emergency changes to security systems are frozen until incident resolution is confirmed."),
  ];
}

// ============================================
// BUILD DOCUMENT
// ============================================

async function buildDocument() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 24, color: c(P.body) },
          paragraph: { spacing: { line: 312 } }
        },
        heading1: {
          run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 32, bold: true, color: c(P.primary) }
        },
        heading2: {
          run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 28, bold: true, color: c(P.primary) }
        },
        heading3: {
          run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 26, bold: true, color: c(P.primary) }
        }
      }
    },
    sections: [
      // Cover Section
      {
        properties: {
          page: { margin: { top: 0, bottom: 0, left: 0, right: 0 } }
        },
        children: [buildCover()]
      },
      // TOC Section
      {
        properties: {
          page: { margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })]
          }),
          new TableOfContents({
            stylesWithLevels: [
              { level: 0, styleName: "Heading1" },
              { level: 1, styleName: "Heading2" },
              { level: 2, styleName: "Heading3" }
            ]
          }),
          new Paragraph({
            children: [new PageBreak()]
          })
        ]
      },
      // Body Section
      {
        properties: {
          page: { 
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
            pageNumbers: { start: 1, formatType: "decimal" }
          }
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "CargoBit Security Policy Framework v2.0", size: 20, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
            })]
          })
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "— ", size: 20, color: c(P.secondary) }),
                new TextRun({ children: [PageNumber.CURRENT], size: 20, color: c(P.secondary) }),
                new TextRun({ text: " —", size: 20, color: c(P.secondary) })
              ]
            })]
          })
        },
        children: [
          ...buildSection1(),
          new Paragraph({ children: [new PageBreak()] }),
          ...buildSection2(),
          new Paragraph({ children: [new PageBreak()] }),
          ...buildSection3(),
          new Paragraph({ children: [new PageBreak()] }),
          ...buildSection4(),
          new Paragraph({ children: [new PageBreak()] }),
          ...buildSection5(),
          new Paragraph({ children: [new PageBreak()] }),
          ...buildSection6(),
          new Paragraph({ children: [new PageBreak()] }),
          ...buildSection7(),
          new Paragraph({ children: [new PageBreak()] }),
          ...buildSection8(),
          new Paragraph({ children: [new PageBreak()] }),
          ...buildSection9(),
          new Paragraph({ children: [new PageBreak()] }),
          ...buildSection10(),
          
          // Document End
          new Paragraph({ spacing: { before: 600 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [new TextRun({ text: "— End of Document —", size: 22, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            children: [new TextRun({ text: "Document ID: SEC-POL-2026-001", size: 20, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Classification: CONFIDENTIAL", size: 20, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
          })
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("/home/z/my-project/download/CargoBit_Security_Policy_Framework.docx", buffer);
  console.log("✅ Security Policy Framework generated: /home/z/my-project/download/CargoBit_Security_Policy_Framework.docx");
}

buildDocument().catch(console.error);
