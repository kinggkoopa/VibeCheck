/**
 * Vulnerability Rules Library
 *
 * Semgrep patterns, OWASP Top 10 reference data, MITRE ATT&CK techniques,
 * security header recommendations, and cryptographic algorithm guidance.
 * Used by the Cyber Security Agent Swarm for rule generation and classification.
 */

// ── Types ──

export interface SemgrepRule {
  id: string;
  name: string;
  severity: string;
  description: string;
  languages: string[];
  pattern: string;
  fix_suggestion: string;
  cwe_id: string;
  owasp_category: string;
}

export interface OWASPCategory {
  id: string;
  name: string;
  description: string;
  common_cwe: string[];
  prevention: string[];
}

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  description: string;
  detection_methods: string[];
  mitigations: string[];
}

export interface SecurityHeader {
  name: string;
  recommended_value: string;
  description: string;
  impact: string;
}

export interface CryptoRecommendation {
  recommended: string[];
  acceptable: string[];
  deprecated: string[];
  params: Record<string, string>;
}

export interface VulnSummary {
  severity: string;
  count: number;
  category: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  priority: "critical" | "high" | "medium" | "low";
  applicable_to: string[];
}

export interface MitreMapping {
  technique_id: string;
  technique_name: string;
  tactic: string;
  relevance: "high" | "medium" | "low";
}

export interface CryptoValidation {
  algorithm: string;
  usage: string;
  is_appropriate: boolean;
  strength: "strong" | "acceptable" | "weak" | "broken";
  recommendation: string;
  alternatives: string[];
}

// ── OWASP Top 10 2021 ──

export const OWASP_TOP_10_2021: OWASPCategory[] = [
  {
    id: "A01:2021",
    name: "Broken Access Control",
    description: "Restrictions on what authenticated users are allowed to do are often not properly enforced. Attackers can exploit these flaws to access unauthorized functionality and/or data.",
    common_cwe: ["CWE-200", "CWE-201", "CWE-352", "CWE-425", "CWE-862", "CWE-863"],
    prevention: [
      "Deny by default except for public resources",
      "Implement access control mechanisms once and reuse throughout the application",
      "Enforce record ownership rather than accepting that the user can create/read/update/delete any record",
      "Disable web server directory listing and ensure file metadata and backup files are not present within web roots",
      "Log access control failures and alert admins when appropriate",
      "Rate limit API and controller access to minimize the harm from automated attack tooling",
      "Invalidate JWT tokens on the server after logout",
    ],
  },
  {
    id: "A02:2021",
    name: "Cryptographic Failures",
    description: "Failures related to cryptography which often lead to sensitive data exposure. This includes use of weak cryptographic algorithms, insufficient key management, and transmission of data in clear text.",
    common_cwe: ["CWE-259", "CWE-327", "CWE-331", "CWE-328", "CWE-916"],
    prevention: [
      "Classify data processed, stored, or transmitted by an application and identify which is sensitive",
      "Do not store sensitive data unnecessarily; discard it as soon as possible",
      "Encrypt all sensitive data at rest with strong algorithms (AES-256-GCM)",
      "Ensure up-to-date and strong standard algorithms, protocols, and keys are in place",
      "Encrypt all data in transit with secure protocols such as TLS 1.2+ with forward secrecy ciphers",
      "Disable caching for responses that contain sensitive data",
      "Store passwords using strong adaptive and salted hashing functions (argon2id, bcrypt, scrypt)",
    ],
  },
  {
    id: "A03:2021",
    name: "Injection",
    description: "Injection flaws such as SQL, NoSQL, OS, and LDAP injection occur when untrusted data is sent to an interpreter as part of a command or query. The attacker's hostile data can trick the interpreter into executing unintended commands or accessing data without proper authorization.",
    common_cwe: ["CWE-79", "CWE-89", "CWE-73", "CWE-20", "CWE-77", "CWE-78"],
    prevention: [
      "Use a safe API which avoids using the interpreter entirely or provides a parameterized interface",
      "Use positive server-side input validation",
      "Escape special characters using the specific escape syntax for that interpreter",
      "Use LIMIT and other SQL controls within queries to prevent mass disclosure in case of SQL injection",
      "Use ORMs and parameterized queries for database access",
      "Implement Content Security Policy (CSP) to mitigate XSS impact",
    ],
  },
  {
    id: "A04:2021",
    name: "Insecure Design",
    description: "A category focusing on risks related to design and architectural flaws, with a call for more use of threat modeling, secure design patterns, and reference architectures.",
    common_cwe: ["CWE-209", "CWE-256", "CWE-501", "CWE-522"],
    prevention: [
      "Establish and use a secure development lifecycle with AppSec professionals",
      "Use threat modeling for critical authentication, access control, business logic, and key flows",
      "Integrate security language and controls into user stories",
      "Write unit and integration tests to validate all critical flows are resistant to the threat model",
      "Segregate tier layers on the system and network layers",
      "Limit resource consumption by user or service",
    ],
  },
  {
    id: "A05:2021",
    name: "Security Misconfiguration",
    description: "The application might be vulnerable if the application stack is improperly configured, including missing security hardening, unnecessary features enabled, default accounts/passwords, overly informative error messages, or missing security headers.",
    common_cwe: ["CWE-16", "CWE-611", "CWE-1004", "CWE-1032"],
    prevention: [
      "A repeatable hardening process makes it fast and easy to deploy another environment that is properly locked down",
      "A minimal platform without any unnecessary features, components, documentation, and samples",
      "Review and update configurations appropriate to all security notes, updates, and patches",
      "Use a segmented application architecture that provides separation between components",
      "Send security directives to clients via security headers",
      "Automate verification of the effectiveness of configurations and settings in all environments",
    ],
  },
  {
    id: "A06:2021",
    name: "Vulnerable and Outdated Components",
    description: "Components such as libraries, frameworks, and other software modules run with the same privileges as the application. If a vulnerable component is exploited, such an attack can facilitate serious data loss or server takeover.",
    common_cwe: ["CWE-1104", "CWE-937"],
    prevention: [
      "Remove unused dependencies, unnecessary features, components, files, and documentation",
      "Continuously inventory the versions of both client-side and server-side components and their dependencies",
      "Only obtain components from official sources over secure links",
      "Monitor for libraries and components that are unmaintained or do not create security patches",
      "Use tools like npm audit, Snyk, or Dependabot for automated vulnerability scanning",
      "Ensure an ongoing plan for monitoring, triaging, and applying updates or configuration changes",
    ],
  },
  {
    id: "A07:2021",
    name: "Identification and Authentication Failures",
    description: "Functions related to authentication and session management are often implemented incorrectly, allowing attackers to compromise passwords, keys, or session tokens, or to exploit other implementation flaws to assume other users' identities.",
    common_cwe: ["CWE-255", "CWE-259", "CWE-287", "CWE-288", "CWE-384", "CWE-798"],
    prevention: [
      "Implement multi-factor authentication where possible to prevent automated credential stuffing and brute force attacks",
      "Do not ship or deploy with any default credentials, particularly for admin users",
      "Implement weak-password checks against a list of the top 10000 worst passwords",
      "Align password length, complexity, and rotation policies with NIST 800-63 guidelines",
      "Harden against account enumeration attacks by using the same messages for all outcomes",
      "Limit or increasingly delay failed login attempts with account lockout and monitoring",
      "Use a server-side, secure, built-in session manager that generates a new random session ID after login",
    ],
  },
  {
    id: "A08:2021",
    name: "Software and Data Integrity Failures",
    description: "Software and data integrity failures relate to code and infrastructure that does not protect against integrity violations. This includes insecure deserialization, use of software from untrusted sources, and CI/CD pipelines without integrity verification.",
    common_cwe: ["CWE-345", "CWE-353", "CWE-426", "CWE-494", "CWE-502", "CWE-565"],
    prevention: [
      "Use digital signatures or similar mechanisms to verify the software or data is from the expected source and has not been altered",
      "Ensure libraries and dependencies are consuming trusted repositories",
      "Use a software supply chain security tool such as OWASP Dependency Check or Sigstore",
      "Ensure that your CI/CD pipeline has proper segregation, configuration, and access control",
      "Do not send unsigned or unencrypted serialized data to untrusted clients without integrity check",
      "Review code and configuration changes to minimize the chance that malicious code or configuration could be introduced",
    ],
  },
  {
    id: "A09:2021",
    name: "Security Logging and Monitoring Failures",
    description: "Without logging and monitoring, breaches cannot be detected. Insufficient logging, detection, monitoring, and active response occurs when the application is not properly recording security-relevant events.",
    common_cwe: ["CWE-117", "CWE-223", "CWE-532", "CWE-778"],
    prevention: [
      "Ensure all login, access control, and server-side input validation failures can be logged with sufficient user context to identify suspicious or malicious accounts",
      "Ensure that logs are generated in a format that log management solutions can easily consume",
      "Ensure log data is encoded correctly to prevent injections or attacks on the logging or monitoring systems",
      "Ensure high-value transactions have an audit trail with integrity controls to prevent tampering or deletion",
      "Establish effective monitoring and alerting such that suspicious activities are detected and responded to within acceptable time periods",
      "Establish or adopt an incident response and recovery plan",
    ],
  },
  {
    id: "A10:2021",
    name: "Server-Side Request Forgery (SSRF)",
    description: "SSRF flaws occur whenever a web application is fetching a remote resource without validating the user-supplied URL. It allows an attacker to coerce the application to send a crafted request to an unexpected destination, even when protected by a firewall, VPN, or another type of network access control list.",
    common_cwe: ["CWE-918"],
    prevention: [
      "Segment remote resource access functionality in separate networks to reduce the impact of SSRF",
      "Enforce 'deny by default' firewall policies or network access control rules to block all but essential intranet traffic",
      "Sanitize and validate all client-supplied input data",
      "Do not send raw responses to clients",
      "Disable HTTP redirections",
      "Be aware of the URL consistency to avoid attacks such as DNS rebinding and TOCTOU race conditions",
      "Use an allowlist approach for URL schemas, ports, and destinations",
    ],
  },
];

// ── Semgrep Rule Templates ──

export const SEMGREP_RULE_TEMPLATES: Record<string, SemgrepRule> = {
  "sql-injection": {
    id: "vuln-sql-injection",
    name: "SQL Injection via String Concatenation",
    severity: "critical",
    description: "Detects SQL queries built with string concatenation or template literals using untrusted input, which can lead to SQL injection attacks.",
    languages: ["typescript", "javascript", "python"],
    pattern: `rules:
  - id: sql-injection-concat
    patterns:
      - pattern-either:
          - pattern: |
              $DB.query(\`... \${$INPUT} ...\`)
          - pattern: |
              $DB.query("..." + $INPUT + "...")
          - pattern: |
              $DB.raw(\`... \${$INPUT} ...\`)
          - pattern: |
              cursor.execute(f"... {$INPUT} ...")
          - pattern: |
              cursor.execute("..." + $INPUT + "...")
    message: "Potential SQL injection. Use parameterized queries instead of string concatenation."
    severity: ERROR
    languages: [typescript, javascript, python]`,
    fix_suggestion: "Use parameterized queries: db.query('SELECT * FROM users WHERE id = $1', [userId]) or ORM methods.",
    cwe_id: "CWE-89",
    owasp_category: "A03:2021",
  },
  "xss-reflected": {
    id: "vuln-xss-reflected",
    name: "Reflected Cross-Site Scripting (XSS)",
    severity: "high",
    description: "Detects user input being directly inserted into HTML output without encoding, enabling reflected XSS attacks.",
    languages: ["typescript", "javascript"],
    pattern: `rules:
  - id: xss-reflected
    patterns:
      - pattern-either:
          - pattern: |
              res.send(\`... \${req.query.$PARAM} ...\`)
          - pattern: |
              res.send(\`... \${req.params.$PARAM} ...\`)
          - pattern: |
              document.innerHTML = $USER_INPUT
          - pattern: |
              $EL.innerHTML = $USER_INPUT
    message: "Potential reflected XSS. Sanitize and encode user input before rendering in HTML."
    severity: WARNING
    languages: [typescript, javascript]`,
    fix_suggestion: "Use output encoding (e.g., DOMPurify.sanitize(), escape HTML entities) or frameworks with auto-escaping (React JSX).",
    cwe_id: "CWE-79",
    owasp_category: "A03:2021",
  },
  "xss-stored": {
    id: "vuln-xss-stored",
    name: "Stored Cross-Site Scripting (XSS)",
    severity: "high",
    description: "Detects patterns where data from a database or storage is rendered as HTML without sanitization, enabling stored XSS.",
    languages: ["typescript", "javascript"],
    pattern: `rules:
  - id: xss-stored
    patterns:
      - pattern-either:
          - pattern: |
              dangerouslySetInnerHTML={{__html: $DATA}}
          - pattern: |
              $EL.innerHTML = $DB_DATA
          - pattern: |
              document.write($DB_DATA)
    message: "Potential stored XSS. Data from storage must be sanitized before rendering as HTML."
    severity: WARNING
    languages: [typescript, javascript]`,
    fix_suggestion: "Use DOMPurify.sanitize() on stored data before rendering, or use React's default JSX escaping without dangerouslySetInnerHTML.",
    cwe_id: "CWE-79",
    owasp_category: "A03:2021",
  },
  "csrf-missing": {
    id: "vuln-csrf-missing",
    name: "Missing CSRF Token Protection",
    severity: "high",
    description: "Detects form submissions or state-changing POST endpoints without CSRF token validation.",
    languages: ["typescript", "javascript"],
    pattern: `rules:
  - id: csrf-missing-token
    patterns:
      - pattern: |
          app.post($ROUTE, ..., $HANDLER)
      - pattern-not: |
          app.post($ROUTE, ..., csrfProtection, ..., $HANDLER)
      - pattern-not: |
          app.post($ROUTE, ..., csrf(...), ..., $HANDLER)
    message: "POST endpoint without CSRF protection. Add CSRF token validation middleware."
    severity: WARNING
    languages: [typescript, javascript]`,
    fix_suggestion: "Use csurf middleware: app.post('/action', csrfProtection, handler) or implement double-submit cookie pattern.",
    cwe_id: "CWE-352",
    owasp_category: "A01:2021",
  },
  "hardcoded-secret": {
    id: "vuln-hardcoded-secret",
    name: "Hardcoded Secret or API Key",
    severity: "critical",
    description: "Detects hardcoded API keys, passwords, tokens, and secrets directly in source code.",
    languages: ["typescript", "javascript", "python"],
    pattern: `rules:
  - id: hardcoded-secret
    patterns:
      - pattern-either:
          - pattern: |
              $VAR = "sk_live_..."
          - pattern: |
              $VAR = "AKIA..."
          - pattern: |
              password = "..."
          - pattern: |
              api_key = "..."
          - pattern: |
              const $SECRET = "eyJ..."
    message: "Hardcoded secret detected. Use environment variables or a secrets manager."
    severity: ERROR
    languages: [typescript, javascript, python]
    metadata:
      cwe: CWE-798`,
    fix_suggestion: "Move secrets to environment variables (process.env.API_KEY) or use a secrets manager (AWS Secrets Manager, HashiCorp Vault).",
    cwe_id: "CWE-798",
    owasp_category: "A07:2021",
  },
  "insecure-hash": {
    id: "vuln-insecure-hash",
    name: "Insecure Hashing Algorithm (MD5/SHA-1)",
    severity: "high",
    description: "Detects usage of cryptographically broken hash functions (MD5, SHA-1) for security-sensitive operations like password hashing or integrity checks.",
    languages: ["typescript", "javascript", "python"],
    pattern: `rules:
  - id: insecure-hash
    patterns:
      - pattern-either:
          - pattern: |
              crypto.createHash("md5")
          - pattern: |
              crypto.createHash("sha1")
          - pattern: |
              hashlib.md5(...)
          - pattern: |
              hashlib.sha1(...)
          - pattern: |
              MD5.create()
    message: "Insecure hash algorithm. Use SHA-256, SHA-3, bcrypt, or argon2id for security operations."
    severity: WARNING
    languages: [typescript, javascript, python]`,
    fix_suggestion: "Replace MD5/SHA-1 with SHA-256 for integrity checks or argon2id/bcrypt for password hashing.",
    cwe_id: "CWE-328",
    owasp_category: "A02:2021",
  },
  "path-traversal": {
    id: "vuln-path-traversal",
    name: "Path Traversal via User Input",
    severity: "high",
    description: "Detects file system operations using user-supplied paths without sanitization, enabling directory traversal attacks.",
    languages: ["typescript", "javascript", "python"],
    pattern: `rules:
  - id: path-traversal
    patterns:
      - pattern-either:
          - pattern: |
              fs.readFile(req.params.$PATH, ...)
          - pattern: |
              fs.readFileSync(\`...\${req.query.$PARAM}...\`)
          - pattern: |
              open(request.args.get("$FILE"), ...)
          - pattern: |
              path.join($BASE, req.query.$PARAM)
    message: "Potential path traversal. Validate and sanitize file paths, use path.resolve() and verify within allowed directory."
    severity: ERROR
    languages: [typescript, javascript, python]`,
    fix_suggestion: "Use path.resolve() and verify the resolved path starts with the allowed base directory. Reject paths containing '..' sequences.",
    cwe_id: "CWE-22",
    owasp_category: "A01:2021",
  },
  "open-redirect": {
    id: "vuln-open-redirect",
    name: "Open Redirect via User Input",
    severity: "medium",
    description: "Detects redirect operations using user-controlled URLs without validation, enabling phishing attacks via open redirects.",
    languages: ["typescript", "javascript"],
    pattern: `rules:
  - id: open-redirect
    patterns:
      - pattern-either:
          - pattern: |
              res.redirect(req.query.$PARAM)
          - pattern: |
              res.redirect(req.body.$PARAM)
          - pattern: |
              window.location.href = $USER_INPUT
          - pattern: |
              window.location = $USER_INPUT
    message: "Potential open redirect. Validate redirect URLs against an allowlist of trusted domains."
    severity: WARNING
    languages: [typescript, javascript]`,
    fix_suggestion: "Validate redirect URLs against an allowlist of trusted domains, or use relative paths only. Never redirect to user-supplied absolute URLs.",
    cwe_id: "CWE-601",
    owasp_category: "A01:2021",
  },
  "ssrf": {
    id: "vuln-ssrf",
    name: "Server-Side Request Forgery (SSRF)",
    severity: "critical",
    description: "Detects HTTP requests made with user-controlled URLs, enabling SSRF attacks against internal services.",
    languages: ["typescript", "javascript", "python"],
    pattern: `rules:
  - id: ssrf
    patterns:
      - pattern-either:
          - pattern: |
              fetch(req.query.$URL)
          - pattern: |
              axios.get(req.body.$URL)
          - pattern: |
              http.get($USER_URL, ...)
          - pattern: |
              requests.get(request.args.get("$URL"))
    message: "Potential SSRF. Validate and restrict URLs to an allowlist. Block internal network addresses."
    severity: ERROR
    languages: [typescript, javascript, python]`,
    fix_suggestion: "Validate URLs against an allowlist, block internal/private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, ::1), and use a dedicated HTTP client with network restrictions.",
    cwe_id: "CWE-918",
    owasp_category: "A10:2021",
  },
  "insecure-deserialization": {
    id: "vuln-insecure-deserialization",
    name: "Insecure Deserialization",
    severity: "critical",
    description: "Detects deserialization of untrusted data which can lead to remote code execution, replay attacks, injection attacks, and privilege escalation.",
    languages: ["typescript", "javascript", "python"],
    pattern: `rules:
  - id: insecure-deserialization
    patterns:
      - pattern-either:
          - pattern: |
              eval($USER_INPUT)
          - pattern: |
              new Function($USER_INPUT)
          - pattern: |
              pickle.loads($DATA)
          - pattern: |
              yaml.load($DATA)
          - pattern: |
              JSON.parse($UNTRUSTED)
    message: "Potential insecure deserialization. Validate and sanitize data before deserialization. Avoid eval() and pickle with untrusted input."
    severity: ERROR
    languages: [typescript, javascript, python]`,
    fix_suggestion: "Never use eval() or new Function() with user input. Use yaml.safe_load() instead of yaml.load(). Validate JSON schemas before parsing untrusted JSON.",
    cwe_id: "CWE-502",
    owasp_category: "A08:2021",
  },
  "weak-random": {
    id: "vuln-weak-random",
    name: "Weak Random Number Generator for Security",
    severity: "medium",
    description: "Detects usage of Math.random() or similar weak PRNGs for security-sensitive operations like token generation, password resets, or session IDs.",
    languages: ["typescript", "javascript", "python"],
    pattern: `rules:
  - id: weak-random
    patterns:
      - pattern-either:
          - pattern: |
              Math.random()
          - pattern: |
              random.random()
          - pattern: |
              random.randint(...)
    message: "Math.random() is not cryptographically secure. Use crypto.randomBytes() or crypto.getRandomValues() for security operations."
    severity: WARNING
    languages: [typescript, javascript, python]`,
    fix_suggestion: "Use crypto.randomBytes(32).toString('hex') (Node.js) or crypto.getRandomValues() (browser) or secrets.token_hex() (Python) for security-sensitive random values.",
    cwe_id: "CWE-338",
    owasp_category: "A02:2021",
  },
  "missing-auth": {
    id: "vuln-missing-auth",
    name: "Missing Authentication Check",
    severity: "high",
    description: "Detects API endpoints or route handlers that perform sensitive operations without authentication middleware or checks.",
    languages: ["typescript", "javascript"],
    pattern: `rules:
  - id: missing-auth
    patterns:
      - pattern: |
          app.$METHOD($ROUTE, $HANDLER)
      - pattern-not: |
          app.$METHOD($ROUTE, ..., authenticate, ..., $HANDLER)
      - pattern-not: |
          app.$METHOD($ROUTE, ..., requireAuth, ..., $HANDLER)
      - pattern-not: |
          app.$METHOD($ROUTE, ..., isAuthenticated, ..., $HANDLER)
      - metavariable-regex:
          metavariable: $ROUTE
          regex: ".*(admin|user|account|settings|dashboard|profile|delete|update|create).*"
    message: "Sensitive endpoint without authentication middleware. Add authentication/authorization checks."
    severity: WARNING
    languages: [typescript, javascript]`,
    fix_suggestion: "Add authentication middleware: app.post('/admin/action', requireAuth, requireRole('admin'), handler). Use middleware chains for both authentication and authorization.",
    cwe_id: "CWE-862",
    owasp_category: "A01:2021",
  },
};

// ── MITRE ATT&CK Techniques ──

export const MITRE_ATTACK_TECHNIQUES: MitreTechnique[] = [
  {
    id: "T1078",
    name: "Valid Accounts",
    tactic: "Initial Access",
    description: "Adversaries may obtain and abuse credentials of existing accounts as a means of gaining Initial Access, Persistence, Privilege Escalation, or Defense Evasion.",
    detection_methods: ["Monitor authentication logs for unusual login patterns", "Detect logins from unusual geographic locations", "Alert on concurrent sessions from different IPs"],
    mitigations: ["Multi-factor authentication", "Privileged account management", "Regular credential rotation"],
  },
  {
    id: "T1190",
    name: "Exploit Public-Facing Application",
    tactic: "Initial Access",
    description: "Adversaries may attempt to take advantage of a weakness in an Internet-facing computer or program using software, data, or commands in order to cause unintended or unanticipated behavior.",
    detection_methods: ["Web application firewalls", "Intrusion detection systems", "Application-level logging and anomaly detection"],
    mitigations: ["Regular patching and updates", "Input validation", "Web application firewalls", "Network segmentation"],
  },
  {
    id: "T1133",
    name: "External Remote Services",
    tactic: "Initial Access",
    description: "Adversaries may leverage external-facing remote services to initially access and/or persist within a network. Remote services such as VPNs, Citrix, and other access mechanisms allow users to connect to internal enterprise network resources from external locations.",
    detection_methods: ["Monitor remote access logs", "Detect unusual access times or locations", "Track VPN connection anomalies"],
    mitigations: ["Multi-factor authentication", "Network segmentation", "Limit access to remote services"],
  },
  {
    id: "T1566",
    name: "Phishing",
    tactic: "Initial Access",
    description: "Adversaries may send phishing messages to gain access to victim systems. All forms of phishing are electronically delivered social engineering to target users.",
    detection_methods: ["Email gateway filtering", "URL reputation checking", "Attachment sandboxing", "User reporting mechanisms"],
    mitigations: ["Security awareness training", "Email filtering", "URL filtering", "Multi-factor authentication"],
  },
  {
    id: "T1059",
    name: "Command and Scripting Interpreter",
    tactic: "Execution",
    description: "Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries. These interfaces and languages provide ways of interacting with computer systems.",
    detection_methods: ["Process monitoring", "Command-line logging", "Script block logging", "Behavioral analysis"],
    mitigations: ["Disable or restrict scripting engines", "Application control policies", "Code signing enforcement"],
  },
  {
    id: "T1203",
    name: "Exploitation for Client Execution",
    tactic: "Execution",
    description: "Adversaries may exploit software vulnerabilities in client applications to execute code. Browser-based exploitation, office document exploits, and third-party application vulnerabilities are common vectors.",
    detection_methods: ["Endpoint detection and response", "Exploit prevention tools", "Application crash monitoring"],
    mitigations: ["Keep software updated", "Application sandboxing", "Exploit protection features"],
  },
  {
    id: "T1053",
    name: "Scheduled Task/Job",
    tactic: "Persistence",
    description: "Adversaries may abuse task scheduling functionality to facilitate initial or recurring execution of malicious code.",
    detection_methods: ["Monitor scheduled task creation", "Audit cron jobs", "Track task scheduler events"],
    mitigations: ["Restrict task scheduling permissions", "Audit scheduled tasks regularly", "Use application allowlisting"],
  },
  {
    id: "T1136",
    name: "Create Account",
    tactic: "Persistence",
    description: "Adversaries may create an account to maintain access to victim systems. Accounts may be created on the local system, domain, or cloud tenant.",
    detection_methods: ["Monitor account creation events", "Alert on unexpected new accounts", "Track privilege assignments"],
    mitigations: ["Multi-factor authentication for account creation", "Privileged account management", "Account auditing"],
  },
  {
    id: "T1548",
    name: "Abuse Elevation Control Mechanism",
    tactic: "Privilege Escalation",
    description: "Adversaries may circumvent mechanisms designed to control elevate privileges to gain higher-level permissions.",
    detection_methods: ["Monitor privilege escalation events", "Track sudo/UAC usage", "Detect unusual privilege changes"],
    mitigations: ["Enforce least privilege", "Audit privilege escalation requests", "Use application control"],
  },
  {
    id: "T1068",
    name: "Exploitation for Privilege Escalation",
    tactic: "Privilege Escalation",
    description: "Adversaries may exploit software vulnerabilities in an attempt to elevate privileges. Exploitation of a software vulnerability occurs when an adversary takes advantage of a programming error in a program.",
    detection_methods: ["Exploit detection tools", "System call monitoring", "Behavioral analysis"],
    mitigations: ["Regular patching", "Exploit protection", "Kernel hardening", "Application isolation"],
  },
  {
    id: "T1070",
    name: "Indicator Removal",
    tactic: "Defense Evasion",
    description: "Adversaries may delete or alter generated artifacts on a host system including logs and captured files to remove evidence of their presence.",
    detection_methods: ["Centralized logging", "File integrity monitoring", "Log tamper detection"],
    mitigations: ["Remote log storage", "Protected log files", "Write-once storage for critical logs"],
  },
  {
    id: "T1027",
    name: "Obfuscated Files or Information",
    tactic: "Defense Evasion",
    description: "Adversaries may attempt to make an executable or file difficult to discover or analyze by encrypting, encoding, or otherwise obfuscating its contents.",
    detection_methods: ["Static analysis tools", "Entropy analysis", "Sandbox detonation", "Behavioral monitoring"],
    mitigations: ["Antivirus/antimalware", "Behavior-based detection", "Content inspection"],
  },
  {
    id: "T1110",
    name: "Brute Force",
    tactic: "Credential Access",
    description: "Adversaries may use brute force techniques to gain access to accounts when passwords are unknown or when password hashes are obtained.",
    detection_methods: ["Account lockout monitoring", "Failed authentication tracking", "Rate limiting alerts"],
    mitigations: ["Account lockout policies", "Multi-factor authentication", "Strong password policies", "Rate limiting"],
  },
  {
    id: "T1555",
    name: "Credentials from Password Stores",
    tactic: "Credential Access",
    description: "Adversaries may search for common password storage locations to obtain user credentials. Passwords are stored in several places on a system depending on the OS and applications.",
    detection_methods: ["Monitor access to credential stores", "Detect credential dumping tools", "Track keychain/vault access"],
    mitigations: ["Limit credential caching", "Use hardware security modules", "Encrypt credential stores"],
  },
  {
    id: "T1046",
    name: "Network Service Discovery",
    tactic: "Discovery",
    description: "Adversaries may attempt to get a listing of services running on remote hosts and local network infrastructure devices, including those that may be vulnerable to remote software exploitation.",
    detection_methods: ["Network flow monitoring", "Port scan detection", "Service enumeration alerts"],
    mitigations: ["Network segmentation", "Firewall rules", "Intrusion detection systems"],
  },
  {
    id: "T1083",
    name: "File and Directory Discovery",
    tactic: "Discovery",
    description: "Adversaries may enumerate files and directories or may search in specific locations of a host or network share for certain information within a file system.",
    detection_methods: ["File access monitoring", "Unusual directory enumeration patterns", "Data loss prevention"],
    mitigations: ["File system access controls", "Audit file access", "Data classification"],
  },
  {
    id: "T1071",
    name: "Application Layer Protocol",
    tactic: "Command and Control",
    description: "Adversaries may communicate using OSI application layer protocols to avoid detection/network filtering by blending in with existing traffic.",
    detection_methods: ["Deep packet inspection", "DNS query monitoring", "HTTP/HTTPS traffic analysis", "Anomaly detection"],
    mitigations: ["Network intrusion detection", "SSL/TLS inspection", "DNS filtering"],
  },
  {
    id: "T1041",
    name: "Exfiltration Over C2 Channel",
    tactic: "Exfiltration",
    description: "Adversaries may steal data by exfiltrating it over an existing command and control channel. The data may be compressed and/or encrypted before exfiltration.",
    detection_methods: ["Data loss prevention", "Network traffic analysis", "Unusual data transfer volumes"],
    mitigations: ["Network segmentation", "Data loss prevention", "Encryption monitoring"],
  },
  {
    id: "T1567",
    name: "Exfiltration Over Web Service",
    tactic: "Exfiltration",
    description: "Adversaries may use an existing, legitimate external Web service to exfiltrate data rather than their primary command and control channel.",
    detection_methods: ["Monitor cloud service API calls", "Track unusual upload volumes", "Web proxy logging"],
    mitigations: ["Restrict cloud service access", "Data loss prevention", "Web content filtering"],
  },
  {
    id: "T1499",
    name: "Endpoint Denial of Service",
    tactic: "Impact",
    description: "Adversaries may perform Endpoint Denial of Service attacks to degrade or block the availability of services to users.",
    detection_methods: ["Resource usage monitoring", "Traffic pattern analysis", "Service availability monitoring"],
    mitigations: ["Rate limiting", "Content delivery networks", "Auto-scaling", "DDoS protection services"],
  },
];

// ── Security Headers ──

export const SECURITY_HEADERS: Record<string, SecurityHeader> = {
  "Content-Security-Policy": {
    name: "Content-Security-Policy",
    recommended_value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    description: "Controls which resources the browser is allowed to load for a given page, mitigating XSS and data injection attacks.",
    impact: "Prevents XSS attacks by restricting script sources, blocks clickjacking via frame-ancestors, and limits data exfiltration via connect-src.",
  },
  "Strict-Transport-Security": {
    name: "Strict-Transport-Security",
    recommended_value: "max-age=63072000; includeSubDomains; preload",
    description: "Forces browsers to use HTTPS for all future requests to the domain, preventing protocol downgrade attacks and cookie hijacking.",
    impact: "Prevents man-in-the-middle attacks by ensuring all communication is encrypted via TLS.",
  },
  "X-Frame-Options": {
    name: "X-Frame-Options",
    recommended_value: "DENY",
    description: "Prevents the page from being embedded in iframes, protecting against clickjacking attacks.",
    impact: "Blocks clickjacking attacks where an attacker overlays a transparent iframe to trick users into clicking hidden elements.",
  },
  "X-Content-Type-Options": {
    name: "X-Content-Type-Options",
    recommended_value: "nosniff",
    description: "Prevents the browser from MIME-sniffing a response away from the declared content type, reducing drive-by download attacks.",
    impact: "Prevents browsers from interpreting files as a different MIME type, blocking MIME confusion attacks.",
  },
  "Referrer-Policy": {
    name: "Referrer-Policy",
    recommended_value: "strict-origin-when-cross-origin",
    description: "Controls how much referrer information is included with requests, protecting sensitive URL parameters from leaking to third parties.",
    impact: "Prevents leaking of sensitive URL paths and query parameters to external sites.",
  },
  "Permissions-Policy": {
    name: "Permissions-Policy",
    recommended_value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
    description: "Controls which browser features and APIs can be used on the page, reducing the attack surface from compromised scripts.",
    impact: "Restricts access to sensitive browser APIs like camera, microphone, and geolocation, limiting what malicious scripts can access.",
  },
  "X-XSS-Protection": {
    name: "X-XSS-Protection",
    recommended_value: "0",
    description: "Disables the legacy XSS filter in older browsers. Modern CSP is preferred. Setting to 0 avoids known edge cases where the filter itself introduces vulnerabilities.",
    impact: "Prevents the legacy XSS auditor from creating vulnerabilities. Use CSP instead for XSS protection.",
  },
  "Cross-Origin-Opener-Policy": {
    name: "Cross-Origin-Opener-Policy",
    recommended_value: "same-origin",
    description: "Isolates the browsing context from cross-origin documents, preventing cross-origin attacks like Spectre.",
    impact: "Prevents cross-origin window references, mitigating side-channel attacks and cross-origin information leaks.",
  },
  "Cross-Origin-Resource-Policy": {
    name: "Cross-Origin-Resource-Policy",
    recommended_value: "same-origin",
    description: "Prevents other origins from loading your resources, protecting against cross-origin data theft.",
    impact: "Blocks cross-origin reads of resources, preventing data theft via speculative execution attacks.",
  },
  "Cross-Origin-Embedder-Policy": {
    name: "Cross-Origin-Embedder-Policy",
    recommended_value: "require-corp",
    description: "Prevents loading cross-origin resources that do not explicitly grant permission, enabling cross-origin isolation.",
    impact: "Required for SharedArrayBuffer and high-resolution timers. Enables full cross-origin isolation when combined with COOP.",
  },
  "Cache-Control": {
    name: "Cache-Control",
    recommended_value: "no-store, no-cache, must-revalidate, private",
    description: "Controls how responses are cached. For sensitive pages, prevents caching to avoid data leakage from shared caches.",
    impact: "Prevents sensitive data from being stored in browser or proxy caches where it could be accessed by other users.",
  },
};

// ── Crypto Recommendations ──

export const CRYPTO_RECOMMENDATIONS: Record<string, CryptoRecommendation> = {
  "hashing": {
    recommended: ["argon2id", "bcrypt"],
    acceptable: ["SHA-256", "SHA-384", "SHA-512", "SHA-3-256", "SHA-3-512", "BLAKE2b"],
    deprecated: ["MD5", "SHA-1", "MD4", "RIPEMD-128"],
    params: {
      "argon2id_memory": "65536 KiB (64 MB)",
      "argon2id_iterations": "3",
      "argon2id_parallelism": "4",
      "bcrypt_rounds": "12",
    },
  },
  "encryption": {
    recommended: ["AES-256-GCM"],
    acceptable: ["AES-128-GCM", "ChaCha20-Poly1305", "AES-256-CBC with HMAC-SHA256"],
    deprecated: ["DES", "3DES", "RC4", "Blowfish", "AES-ECB"],
    params: {
      "aes_256_gcm_nonce": "96 bits (12 bytes), never reuse",
      "aes_256_gcm_tag": "128 bits (16 bytes)",
      "chacha20_nonce": "96 bits (12 bytes) for IETF variant",
    },
  },
  "key-exchange": {
    recommended: ["X25519", "P-384", "P-256"],
    acceptable: ["RSA-2048", "RSA-3072", "RSA-4096", "DH-2048"],
    deprecated: ["RSA-1024", "DH-1024", "P-192"],
    params: {
      "rsa_min_bits": "2048 (prefer 3072+)",
      "ecdh_recommended": "X25519 for performance, P-384 for compliance",
    },
  },
  "signing": {
    recommended: ["Ed25519", "ECDSA-P256", "ECDSA-P384"],
    acceptable: ["RSA-PSS-2048", "RSA-PSS-3072", "RSA-PKCS1-v1.5-2048"],
    deprecated: ["RSA-1024", "DSA", "ECDSA-P192"],
    params: {
      "ed25519_key_size": "256 bits (fixed)",
      "rsa_pss_salt_length": "Hash length (32 bytes for SHA-256)",
    },
  },
  "kdf": {
    recommended: ["argon2id", "scrypt"],
    acceptable: ["PBKDF2-SHA256", "HKDF-SHA256"],
    deprecated: ["PBKDF2-SHA1", "PBKDF2-MD5"],
    params: {
      "scrypt_N": "2^17 (131072)",
      "scrypt_r": "8",
      "scrypt_p": "1",
      "pbkdf2_iterations": "600000 minimum for SHA-256",
      "hkdf_usage": "Key expansion only, not password hashing",
    },
  },
};

// ── Utility Functions ──

/**
 * Get a Semgrep rule by its key identifier.
 */
export function getSemgrepRule(ruleKey: string): SemgrepRule | undefined {
  return SEMGREP_RULE_TEMPLATES[ruleKey];
}

/**
 * Generate a combined Semgrep YAML configuration for running
 * selected rules against a codebase.
 */
export function generateSemgrepConfig(rules: string[]): string {
  const selectedRules = rules
    .map((key) => SEMGREP_RULE_TEMPLATES[key])
    .filter((rule): rule is SemgrepRule => rule !== undefined);

  if (selectedRules.length === 0) {
    return "# No valid rules selected\nrules: []";
  }

  const ruleEntries = selectedRules.map((rule) => {
    // Extract the rule content from the pattern (strip the outer "rules:" wrapper)
    const patternLines = rule.pattern.split("\n");
    const ruleContent = patternLines
      .filter((line) => !line.trim().startsWith("rules:"))
      .map((line) => {
        // Remove 2 spaces of indentation since we re-nest under a single "rules:" key
        if (line.startsWith("  ")) return line.slice(2);
        return line;
      })
      .join("\n");
    return ruleContent;
  });

  return `# Auto-generated Semgrep configuration
# Rules: ${selectedRules.map((r) => r.name).join(", ")}
# Generated by VibeCheck Cyber Security Agent
rules:
${ruleEntries.map((entry) => entry.split("\n").map((line) => `  ${line}`).join("\n")).join("\n")}`;
}

/**
 * Classify a vulnerability description by mapping keywords
 * to OWASP categories, CWE IDs, and severity levels.
 */
export function classifyVulnerability(description: string): { owasp: string; cwe: string; severity: string } {
  const lower = description.toLowerCase();

  // Keyword-to-classification mapping
  const mappings: Array<{ keywords: string[]; owasp: string; cwe: string; severity: string }> = [
    { keywords: ["sql injection", "sqli", "parameterized", "query concatenation"], owasp: "A03:2021", cwe: "CWE-89", severity: "critical" },
    { keywords: ["xss", "cross-site scripting", "script injection", "innerhtml"], owasp: "A03:2021", cwe: "CWE-79", severity: "high" },
    { keywords: ["csrf", "cross-site request forgery", "anti-forgery"], owasp: "A01:2021", cwe: "CWE-352", severity: "high" },
    { keywords: ["ssrf", "server-side request forgery", "internal request"], owasp: "A10:2021", cwe: "CWE-918", severity: "critical" },
    { keywords: ["path traversal", "directory traversal", "../ ", "file inclusion"], owasp: "A01:2021", cwe: "CWE-22", severity: "high" },
    { keywords: ["open redirect", "url redirect", "redirect validation"], owasp: "A01:2021", cwe: "CWE-601", severity: "medium" },
    { keywords: ["hardcoded secret", "hardcoded password", "api key in code", "credential in source"], owasp: "A07:2021", cwe: "CWE-798", severity: "critical" },
    { keywords: ["md5", "sha-1", "sha1", "weak hash", "insecure hash"], owasp: "A02:2021", cwe: "CWE-328", severity: "high" },
    { keywords: ["deserialization", "pickle", "eval(", "unsafe eval"], owasp: "A08:2021", cwe: "CWE-502", severity: "critical" },
    { keywords: ["math.random", "weak random", "predictable random"], owasp: "A02:2021", cwe: "CWE-338", severity: "medium" },
    { keywords: ["missing auth", "no authentication", "unauthenticated", "broken access"], owasp: "A01:2021", cwe: "CWE-862", severity: "high" },
    { keywords: ["missing encryption", "plaintext", "unencrypted", "clear text"], owasp: "A02:2021", cwe: "CWE-311", severity: "high" },
    { keywords: ["command injection", "os command", "shell injection"], owasp: "A03:2021", cwe: "CWE-78", severity: "critical" },
    { keywords: ["buffer overflow", "memory corruption", "out of bounds"], owasp: "A03:2021", cwe: "CWE-120", severity: "critical" },
    { keywords: ["information disclosure", "error message", "stack trace", "verbose error"], owasp: "A05:2021", cwe: "CWE-209", severity: "medium" },
    { keywords: ["outdated", "vulnerable component", "dependency", "known vulnerability"], owasp: "A06:2021", cwe: "CWE-1104", severity: "high" },
    { keywords: ["session fixation", "session hijack", "cookie insecure"], owasp: "A07:2021", cwe: "CWE-384", severity: "high" },
    { keywords: ["logging failure", "missing logs", "no audit trail"], owasp: "A09:2021", cwe: "CWE-778", severity: "medium" },
  ];

  for (const mapping of mappings) {
    if (mapping.keywords.some((kw) => lower.includes(kw))) {
      return { owasp: mapping.owasp, cwe: mapping.cwe, severity: mapping.severity };
    }
  }

  return { owasp: "A04:2021", cwe: "CWE-1000", severity: "medium" };
}

/**
 * Calculate a weighted risk score from a list of vulnerability summaries.
 * Returns a score (0-100, higher = more risk), a level, and a breakdown by severity.
 */
export function calculateRiskScore(vulnerabilities: VulnSummary[]): { score: number; level: string; breakdown: Record<string, number> } {
  const severityWeights: Record<string, number> = {
    critical: 10,
    high: 7,
    medium: 4,
    low: 2,
    info: 0.5,
  };

  const breakdown: Record<string, number> = {};
  let totalWeight = 0;
  let maxPossible = 0;

  for (const vuln of vulnerabilities) {
    const weight = severityWeights[vuln.severity.toLowerCase()] ?? 3;
    const contribution = weight * vuln.count;
    breakdown[vuln.severity] = contribution;
    totalWeight += contribution;
    maxPossible += 10 * vuln.count;
  }

  // Normalize to 0-100 scale
  const score = maxPossible > 0 ? Math.min(100, Math.round((totalWeight / maxPossible) * 100)) : 0;

  let level: string;
  if (score >= 80) level = "Critical";
  else if (score >= 60) level = "High";
  else if (score >= 40) level = "Medium";
  else if (score >= 20) level = "Low";
  else level = "Minimal";

  return { score, level, breakdown };
}

/**
 * Generate a security checklist based on the application type.
 */
export function generateSecurityChecklist(appType: string): ChecklistItem[] {
  const common: ChecklistItem[] = [
    { id: "common-01", category: "Authentication", item: "Implement multi-factor authentication (MFA)", priority: "critical", applicable_to: ["web-app", "api", "mobile", "iot"] },
    { id: "common-02", category: "Authentication", item: "Use strong password hashing (argon2id or bcrypt)", priority: "critical", applicable_to: ["web-app", "api", "mobile", "iot"] },
    { id: "common-03", category: "Authorization", item: "Implement role-based access control (RBAC)", priority: "high", applicable_to: ["web-app", "api", "mobile", "iot"] },
    { id: "common-04", category: "Data Protection", item: "Encrypt all data in transit with TLS 1.2+", priority: "critical", applicable_to: ["web-app", "api", "mobile", "iot"] },
    { id: "common-05", category: "Data Protection", item: "Encrypt sensitive data at rest with AES-256-GCM", priority: "high", applicable_to: ["web-app", "api", "mobile", "iot"] },
    { id: "common-06", category: "Input Validation", item: "Validate and sanitize all user input server-side", priority: "critical", applicable_to: ["web-app", "api", "mobile", "iot"] },
    { id: "common-07", category: "Logging", item: "Implement comprehensive security event logging", priority: "high", applicable_to: ["web-app", "api", "mobile", "iot"] },
    { id: "common-08", category: "Logging", item: "Set up log monitoring and alerting", priority: "high", applicable_to: ["web-app", "api", "mobile", "iot"] },
    { id: "common-09", category: "Dependencies", item: "Scan dependencies for known vulnerabilities", priority: "high", applicable_to: ["web-app", "api", "mobile", "iot"] },
    { id: "common-10", category: "Secrets", item: "Store all secrets in environment variables or secret manager", priority: "critical", applicable_to: ["web-app", "api", "mobile", "iot"] },
  ];

  const webApp: ChecklistItem[] = [
    { id: "web-01", category: "Headers", item: "Configure Content-Security-Policy (CSP) header", priority: "high", applicable_to: ["web-app"] },
    { id: "web-02", category: "Headers", item: "Enable Strict-Transport-Security (HSTS)", priority: "critical", applicable_to: ["web-app"] },
    { id: "web-03", category: "Headers", item: "Set X-Frame-Options to DENY", priority: "high", applicable_to: ["web-app"] },
    { id: "web-04", category: "Headers", item: "Set X-Content-Type-Options to nosniff", priority: "medium", applicable_to: ["web-app"] },
    { id: "web-05", category: "XSS", item: "Use output encoding for all rendered user data", priority: "critical", applicable_to: ["web-app"] },
    { id: "web-06", category: "CSRF", item: "Implement CSRF token protection on state-changing operations", priority: "high", applicable_to: ["web-app"] },
    { id: "web-07", category: "Session", item: "Configure secure, HttpOnly, SameSite cookie attributes", priority: "high", applicable_to: ["web-app"] },
    { id: "web-08", category: "Session", item: "Implement session timeout and rotation on privilege change", priority: "high", applicable_to: ["web-app"] },
  ];

  const api: ChecklistItem[] = [
    { id: "api-01", category: "Authentication", item: "Implement JWT with short expiration and refresh token rotation", priority: "critical", applicable_to: ["api"] },
    { id: "api-02", category: "Rate Limiting", item: "Apply rate limiting to all API endpoints", priority: "high", applicable_to: ["api"] },
    { id: "api-03", category: "Validation", item: "Validate request schemas (JSON Schema or Zod)", priority: "high", applicable_to: ["api"] },
    { id: "api-04", category: "CORS", item: "Configure strict CORS with allowlist of trusted origins", priority: "high", applicable_to: ["api"] },
    { id: "api-05", category: "Documentation", item: "Document all endpoints and their authorization requirements", priority: "medium", applicable_to: ["api"] },
    { id: "api-06", category: "Versioning", item: "Implement API versioning for backward-compatible security updates", priority: "medium", applicable_to: ["api"] },
    { id: "api-07", category: "Throttling", item: "Implement request size limits and payload validation", priority: "high", applicable_to: ["api"] },
    { id: "api-08", category: "Keys", item: "Implement API key rotation and revocation mechanisms", priority: "high", applicable_to: ["api"] },
  ];

  const mobile: ChecklistItem[] = [
    { id: "mobile-01", category: "Storage", item: "Use platform-specific secure storage (Keychain/Keystore)", priority: "critical", applicable_to: ["mobile"] },
    { id: "mobile-02", category: "Network", item: "Implement certificate pinning for critical API connections", priority: "high", applicable_to: ["mobile"] },
    { id: "mobile-03", category: "Binary", item: "Enable code obfuscation and anti-tampering protections", priority: "high", applicable_to: ["mobile"] },
    { id: "mobile-04", category: "Biometric", item: "Implement biometric authentication where available", priority: "medium", applicable_to: ["mobile"] },
    { id: "mobile-05", category: "Debug", item: "Disable debug logging and developer tools in production builds", priority: "critical", applicable_to: ["mobile"] },
    { id: "mobile-06", category: "Clipboard", item: "Clear sensitive data from clipboard after timeout", priority: "medium", applicable_to: ["mobile"] },
  ];

  const iot: ChecklistItem[] = [
    { id: "iot-01", category: "Firmware", item: "Implement secure firmware update mechanism with code signing", priority: "critical", applicable_to: ["iot"] },
    { id: "iot-02", category: "Network", item: "Use mutual TLS (mTLS) for device-to-server communication", priority: "critical", applicable_to: ["iot"] },
    { id: "iot-03", category: "Identity", item: "Provision unique device certificates during manufacturing", priority: "high", applicable_to: ["iot"] },
    { id: "iot-04", category: "Hardware", item: "Use hardware security modules (TPM/TEE) for key storage", priority: "high", applicable_to: ["iot"] },
    { id: "iot-05", category: "Boot", item: "Implement secure boot chain verification", priority: "critical", applicable_to: ["iot"] },
    { id: "iot-06", category: "Default", item: "Require credential change on first boot, no default passwords", priority: "critical", applicable_to: ["iot"] },
  ];

  const normalized = appType.toLowerCase().replace(/\s+/g, "-");

  const typeMap: Record<string, ChecklistItem[]> = {
    "web-app": [...common, ...webApp],
    "api": [...common, ...api],
    "mobile": [...common, ...mobile],
    "iot": [...common, ...iot],
  };

  return typeMap[normalized] ?? common;
}

/**
 * Map a vulnerability description to relevant MITRE ATT&CK techniques
 * using keyword matching.
 */
export function mapToMitreAttack(vulnerability: string): MitreMapping[] {
  const lower = vulnerability.toLowerCase();
  const mappings: MitreMapping[] = [];

  const keywordMap: Array<{ keywords: string[]; technique_id: string; technique_name: string; tactic: string; relevance: "high" | "medium" | "low" }> = [
    { keywords: ["credential", "password", "authentication", "login", "brute force"], technique_id: "T1110", technique_name: "Brute Force", tactic: "Credential Access", relevance: "high" },
    { keywords: ["valid account", "default credential", "shared account"], technique_id: "T1078", technique_name: "Valid Accounts", tactic: "Initial Access", relevance: "high" },
    { keywords: ["exploit", "vulnerability", "rce", "remote code execution"], technique_id: "T1190", technique_name: "Exploit Public-Facing Application", tactic: "Initial Access", relevance: "high" },
    { keywords: ["phishing", "social engineering", "spear phishing"], technique_id: "T1566", technique_name: "Phishing", tactic: "Initial Access", relevance: "high" },
    { keywords: ["command injection", "script injection", "eval", "exec"], technique_id: "T1059", technique_name: "Command and Scripting Interpreter", tactic: "Execution", relevance: "high" },
    { keywords: ["privilege escalation", "elevation", "sudo", "admin"], technique_id: "T1548", technique_name: "Abuse Elevation Control Mechanism", tactic: "Privilege Escalation", relevance: "high" },
    { keywords: ["persistence", "backdoor", "scheduled task", "cron"], technique_id: "T1053", technique_name: "Scheduled Task/Job", tactic: "Persistence", relevance: "medium" },
    { keywords: ["account creation", "new user", "unauthorized account"], technique_id: "T1136", technique_name: "Create Account", tactic: "Persistence", relevance: "medium" },
    { keywords: ["log tampering", "evidence removal", "log deletion"], technique_id: "T1070", technique_name: "Indicator Removal", tactic: "Defense Evasion", relevance: "high" },
    { keywords: ["obfuscation", "encoding", "encryption of payload"], technique_id: "T1027", technique_name: "Obfuscated Files or Information", tactic: "Defense Evasion", relevance: "medium" },
    { keywords: ["port scan", "service discovery", "network scan", "reconnaissance"], technique_id: "T1046", technique_name: "Network Service Discovery", tactic: "Discovery", relevance: "medium" },
    { keywords: ["file enumeration", "directory listing", "path traversal"], technique_id: "T1083", technique_name: "File and Directory Discovery", tactic: "Discovery", relevance: "medium" },
    { keywords: ["exfiltration", "data theft", "data leak", "data breach"], technique_id: "T1041", technique_name: "Exfiltration Over C2 Channel", tactic: "Exfiltration", relevance: "high" },
    { keywords: ["cloud storage", "s3 bucket", "blob storage", "web service exfil"], technique_id: "T1567", technique_name: "Exfiltration Over Web Service", tactic: "Exfiltration", relevance: "medium" },
    { keywords: ["denial of service", "dos", "ddos", "resource exhaustion"], technique_id: "T1499", technique_name: "Endpoint Denial of Service", tactic: "Impact", relevance: "high" },
    { keywords: ["c2", "command and control", "beacon", "callback"], technique_id: "T1071", technique_name: "Application Layer Protocol", tactic: "Command and Control", relevance: "high" },
    { keywords: ["credential store", "password manager", "keychain"], technique_id: "T1555", technique_name: "Credentials from Password Stores", tactic: "Credential Access", relevance: "medium" },
    { keywords: ["remote service", "vpn", "rdp", "ssh"], technique_id: "T1133", technique_name: "External Remote Services", tactic: "Initial Access", relevance: "medium" },
    { keywords: ["client exploit", "browser exploit", "document exploit"], technique_id: "T1203", technique_name: "Exploitation for Client Execution", tactic: "Execution", relevance: "medium" },
    { keywords: ["kernel exploit", "local exploit", "privilege vulnerability"], technique_id: "T1068", technique_name: "Exploitation for Privilege Escalation", tactic: "Privilege Escalation", relevance: "high" },
  ];

  for (const mapping of keywordMap) {
    if (mapping.keywords.some((kw) => lower.includes(kw))) {
      mappings.push({
        technique_id: mapping.technique_id,
        technique_name: mapping.technique_name,
        tactic: mapping.tactic,
        relevance: mapping.relevance,
      });
    }
  }

  return mappings;
}

/**
 * Validate whether a cryptographic algorithm is appropriate for
 * a given use case and return recommendations.
 */
export function validateCryptoChoice(algorithm: string, usage: string): CryptoValidation {
  const normalizedAlgo = algorithm.toLowerCase().replace(/[_\s-]+/g, "");
  const normalizedUsage = usage.toLowerCase();

  // Determine the category based on usage
  let category: string;
  if (normalizedUsage.includes("password") || normalizedUsage.includes("hash")) {
    category = "hashing";
  } else if (normalizedUsage.includes("encrypt") || normalizedUsage.includes("cipher") || normalizedUsage.includes("aes") || normalizedUsage.includes("storage")) {
    category = "encryption";
  } else if (normalizedUsage.includes("key exchange") || normalizedUsage.includes("handshake") || normalizedUsage.includes("dh") || normalizedUsage.includes("ecdh")) {
    category = "key-exchange";
  } else if (normalizedUsage.includes("sign") || normalizedUsage.includes("verify") || normalizedUsage.includes("jwt") || normalizedUsage.includes("certificate")) {
    category = "signing";
  } else if (normalizedUsage.includes("derive") || normalizedUsage.includes("kdf") || normalizedUsage.includes("key derivation")) {
    category = "kdf";
  } else {
    category = "encryption"; // default
  }

  const rec = CRYPTO_RECOMMENDATIONS[category];
  if (!rec) {
    return {
      algorithm,
      usage,
      is_appropriate: false,
      strength: "weak",
      recommendation: "Unable to classify usage. Consult a cryptography specialist.",
      alternatives: [],
    };
  }

  // Check if the algorithm is in any list
  const isRecommended = rec.recommended.some((r) => r.toLowerCase().replace(/[_\s-]+/g, "") === normalizedAlgo);
  const isAcceptable = rec.acceptable.some((a) => a.toLowerCase().replace(/[_\s-]+/g, "") === normalizedAlgo);
  const isDeprecated = rec.deprecated.some((d) => d.toLowerCase().replace(/[_\s-]+/g, "") === normalizedAlgo);

  if (isRecommended) {
    return {
      algorithm,
      usage,
      is_appropriate: true,
      strength: "strong",
      recommendation: `${algorithm} is a recommended choice for ${usage}. Follow parameter guidelines in documentation.`,
      alternatives: [],
    };
  }

  if (isAcceptable) {
    return {
      algorithm,
      usage,
      is_appropriate: true,
      strength: "acceptable",
      recommendation: `${algorithm} is acceptable for ${usage}, but consider upgrading to: ${rec.recommended.join(", ")}.`,
      alternatives: rec.recommended,
    };
  }

  if (isDeprecated) {
    return {
      algorithm,
      usage,
      is_appropriate: false,
      strength: "broken",
      recommendation: `${algorithm} is DEPRECATED and UNSAFE for ${usage}. Migrate immediately to: ${rec.recommended.join(", ")}.`,
      alternatives: rec.recommended,
    };
  }

  return {
    algorithm,
    usage,
    is_appropriate: false,
    strength: "weak",
    recommendation: `${algorithm} is not recognized for ${usage}. Recommended alternatives: ${rec.recommended.join(", ")}.`,
    alternatives: rec.recommended,
  };
}
