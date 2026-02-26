/**
 * OSINT API Reference Library & Intelligence Utilities
 *
 * Provides data source catalogs, Google dork patterns, entity schemas,
 * graph algorithm references, ethical guidelines, and utility functions
 * for building OSINT tools and intelligence gathering applications.
 *
 * All utilities enforce ethical OSINT principles by default.
 */

// ── Types ──

export interface OSINTDataSource {
  name: string;
  category: "people-search" | "domain" | "social-media" | "infrastructure" | "breach" | "archive" | "search-engine" | "government";
  url: string;
  apiEndpoint: string | null;
  requiresAuth: boolean;
  freeLimit: string;
  dataFields: string[];
  legalRestrictions: string;
  useCase: string;
}

export interface GoogleDork {
  name: string;
  pattern: string;
  description: string;
  category: string;
  example: string;
}

export interface EntitySchema {
  fields: string[];
}

export interface GraphAlgorithm {
  name: string;
  description: string;
  useCase: string;
  complexity: string;
  implementation: string;
}

export interface EntityInput {
  id: string;
  type: string;
  label: string;
  attributes: Record<string, unknown>;
}

export interface RelationshipInput {
  source: string;
  target: string;
  relationship: string;
  confidence: number;
  evidence?: string;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    attributes: Record<string, unknown>;
    degree: number;
    community: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    relationship: string;
    confidence: number;
    evidence: string;
  }>;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    density: number;
    components: number;
  };
}

export interface Community {
  id: number;
  members: string[];
  label: string;
  cohesion: number;
}

export interface TimelineEvent {
  date: string;
  event: string;
  entities: string[];
  source: string;
  significance: "high" | "medium" | "low";
}

export interface FormattedTimeline {
  events: Array<{
    date: string;
    event: string;
    entities: string[];
    source: string;
    significance: "high" | "medium" | "low";
    relativePosition: number;
  }>;
  startDate: string;
  endDate: string;
  totalSpanDays: number;
}

// ── Data Source Catalog ──

export const OSINT_DATA_SOURCES: OSINTDataSource[] = [
  // People Search
  {
    name: "Have I Been Pwned",
    category: "breach",
    url: "https://haveibeenpwned.com",
    apiEndpoint: "https://haveibeenpwned.com/api/v3",
    requiresAuth: true,
    freeLimit: "Rate-limited, API key required",
    dataFields: ["email", "breach_name", "breach_date", "data_classes"],
    legalRestrictions: "API key required. Ethical use only — do not use to target individuals without authorization.",
    useCase: "Check if email addresses appear in known data breaches",
  },
  {
    name: "Public Court Records (PACER)",
    category: "people-search",
    url: "https://pacer.uscourts.gov",
    apiEndpoint: null,
    requiresAuth: true,
    freeLimit: "$0.10/page, free for first $30/quarter",
    dataFields: ["case_number", "parties", "filing_date", "court", "case_type", "docket_entries"],
    legalRestrictions: "US federal courts only. Registration required. Subject to court rules on data use.",
    useCase: "Search federal court filings, case records, and party information",
  },
  {
    name: "OpenCorporates",
    category: "people-search",
    url: "https://opencorporates.com",
    apiEndpoint: "https://api.opencorporates.com/v0.4",
    requiresAuth: false,
    freeLimit: "500 requests/month (free tier)",
    dataFields: ["company_name", "jurisdiction", "registration_number", "status", "officers", "filings"],
    legalRestrictions: "Open data. Commercial use requires API key. Attribution required.",
    useCase: "Search global company registrations, officers, and corporate structures",
  },
  {
    name: "Voter Registration Records",
    category: "people-search",
    url: "https://voterrecords.com",
    apiEndpoint: null,
    requiresAuth: false,
    freeLimit: "Web search free, bulk requires purchase",
    dataFields: ["name", "address", "party_affiliation", "registration_date", "voter_status"],
    legalRestrictions: "Varies by state. Many states restrict commercial use. Some require justification for bulk access.",
    useCase: "Verify voter registration status and basic demographic information",
  },
  {
    name: "US SEC EDGAR",
    category: "government",
    url: "https://www.sec.gov/edgar",
    apiEndpoint: "https://efts.sec.gov/LATEST/search-index?q=",
    requiresAuth: false,
    freeLimit: "10 requests/second",
    dataFields: ["company_name", "cik", "filing_type", "filing_date", "documents", "insider_transactions"],
    legalRestrictions: "Public data. Fair access policy — must identify user-agent. No excessive automated access.",
    useCase: "Search corporate filings, insider transactions, and financial disclosures",
  },

  // Domain & DNS
  {
    name: "WHOIS Lookup",
    category: "domain",
    url: "https://who.is",
    apiEndpoint: "https://www.whoisxmlapi.com/whoisserver/WhoisService",
    requiresAuth: true,
    freeLimit: "500 queries/month (WhoisXML API free tier)",
    dataFields: ["registrant", "registrar", "creation_date", "expiration_date", "nameservers", "status"],
    legalRestrictions: "GDPR reduced WHOIS data visibility for EU domains. Rate limits enforced.",
    useCase: "Look up domain registration information and ownership history",
  },
  {
    name: "SecurityTrails",
    category: "domain",
    url: "https://securitytrails.com",
    apiEndpoint: "https://api.securitytrails.com/v1",
    requiresAuth: true,
    freeLimit: "50 queries/month (free tier)",
    dataFields: ["dns_records", "subdomains", "historical_dns", "associated_domains", "ip_neighbors"],
    legalRestrictions: "API key required. Free tier limited. Must comply with terms of service.",
    useCase: "DNS history, subdomain enumeration, and domain intelligence",
  },
  {
    name: "crt.sh (Certificate Transparency)",
    category: "domain",
    url: "https://crt.sh",
    apiEndpoint: "https://crt.sh/?output=json",
    requiresAuth: false,
    freeLimit: "Unlimited (public service, be respectful)",
    dataFields: ["common_name", "issuer", "not_before", "not_after", "serial_number", "san_entries"],
    legalRestrictions: "Public certificate transparency logs. No restrictions on data use.",
    useCase: "Discover SSL certificates and subdomains via Certificate Transparency logs",
  },
  {
    name: "DNSDumpster",
    category: "domain",
    url: "https://dnsdumpster.com",
    apiEndpoint: null,
    requiresAuth: false,
    freeLimit: "Web interface free, rate limited",
    dataFields: ["dns_records", "mx_records", "txt_records", "host_records", "map_visualization"],
    legalRestrictions: "Free for non-commercial use. No official API — web scraping discouraged.",
    useCase: "DNS reconnaissance and domain mapping",
  },

  // Social Media
  {
    name: "X/Twitter API",
    category: "social-media",
    url: "https://developer.twitter.com",
    apiEndpoint: "https://api.twitter.com/2",
    requiresAuth: true,
    freeLimit: "Free tier: 1,500 tweets/month write, limited read",
    dataFields: ["tweets", "user_profile", "followers", "following", "likes", "lists"],
    legalRestrictions: "Developer agreement required. No bulk collection of user data. Strict rate limits. No scraping.",
    useCase: "Search tweets, analyze user profiles, and monitor public conversations",
  },
  {
    name: "Reddit API",
    category: "social-media",
    url: "https://www.reddit.com/dev/api",
    apiEndpoint: "https://oauth.reddit.com",
    requiresAuth: true,
    freeLimit: "60 requests/minute (OAuth)",
    dataFields: ["posts", "comments", "user_profile", "subreddits", "karma", "post_history"],
    legalRestrictions: "OAuth required. Rate limited. Must comply with Reddit API terms. No commercial use without agreement.",
    useCase: "Search posts, comments, and user activity across subreddits",
  },
  {
    name: "GitHub API",
    category: "social-media",
    url: "https://docs.github.com/en/rest",
    apiEndpoint: "https://api.github.com",
    requiresAuth: false,
    freeLimit: "60 requests/hour (unauth), 5000/hour (auth)",
    dataFields: ["repositories", "commits", "user_profile", "organizations", "gists", "issues", "pull_requests"],
    legalRestrictions: "Public repos freely accessible. Rate limits enforced. Must identify via User-Agent.",
    useCase: "Discover developer profiles, code contributions, and organizational affiliations",
  },
  {
    name: "LinkedIn (Public Profiles)",
    category: "social-media",
    url: "https://www.linkedin.com",
    apiEndpoint: null,
    requiresAuth: true,
    freeLimit: "No free API for profile scraping",
    dataFields: ["name", "headline", "experience", "education", "skills", "connections"],
    legalRestrictions: "STRICTLY NO SCRAPING per LinkedIn TOS. Use only official Marketing/Sales API with approval. hiQ v. LinkedIn ruling provides limited legal context.",
    useCase: "Professional network analysis — use official API only with proper authorization",
  },

  // Infrastructure
  {
    name: "Shodan",
    category: "infrastructure",
    url: "https://www.shodan.io",
    apiEndpoint: "https://api.shodan.io",
    requiresAuth: true,
    freeLimit: "Free tier: limited queries, no filters",
    dataFields: ["ip", "ports", "services", "banners", "os", "organization", "geolocation", "vulnerabilities"],
    legalRestrictions: "API key required. Free tier very limited. Do not use to exploit discovered services.",
    useCase: "Discover internet-connected devices, open ports, and running services",
  },
  {
    name: "Censys",
    category: "infrastructure",
    url: "https://search.censys.io",
    apiEndpoint: "https://search.censys.io/api",
    requiresAuth: true,
    freeLimit: "250 queries/month (free community tier)",
    dataFields: ["ip", "protocols", "services", "certificates", "autonomous_system", "location"],
    legalRestrictions: "Account required. Community tier limited. Research and authorized use only.",
    useCase: "Internet-wide scan data for hosts, certificates, and services",
  },
  {
    name: "GreyNoise",
    category: "infrastructure",
    url: "https://www.greynoise.io",
    apiEndpoint: "https://api.greynoise.io/v3",
    requiresAuth: true,
    freeLimit: "Community API: limited daily queries",
    dataFields: ["ip", "classification", "noise", "riot", "tags", "first_seen", "last_seen", "cve"],
    legalRestrictions: "API key required. Community tier free but limited. Enterprise features paid.",
    useCase: "Identify benign scanners vs. malicious actors on the internet",
  },

  // Search Engines
  {
    name: "Google Custom Search",
    category: "search-engine",
    url: "https://developers.google.com/custom-search",
    apiEndpoint: "https://www.googleapis.com/customsearch/v1",
    requiresAuth: true,
    freeLimit: "100 queries/day (free tier)",
    dataFields: ["title", "link", "snippet", "cached_page", "file_type", "metadata"],
    legalRestrictions: "API key + Custom Search Engine ID required. Limited to 100 free queries/day. Paid for more.",
    useCase: "Programmatic Google search with advanced operators for OSINT dorking",
  },
  {
    name: "Bing Search API",
    category: "search-engine",
    url: "https://www.microsoft.com/en-us/bing/apis/bing-web-search-api",
    apiEndpoint: "https://api.bing.microsoft.com/v7.0/search",
    requiresAuth: true,
    freeLimit: "1,000 transactions/month (free tier)",
    dataFields: ["web_pages", "images", "news", "videos", "related_searches"],
    legalRestrictions: "Azure subscription required. Free tier: 1K calls/month. Must display results per TOS.",
    useCase: "Alternative search API with different indexing — useful for cross-referencing Google results",
  },
  {
    name: "DuckDuckGo Instant Answer",
    category: "search-engine",
    url: "https://duckduckgo.com",
    apiEndpoint: "https://api.duckduckgo.com/?format=json",
    requiresAuth: false,
    freeLimit: "Rate limited (no official limit published)",
    dataFields: ["abstract", "related_topics", "results", "answer", "definition"],
    legalRestrictions: "Free and open. Instant Answer API only — not full search. Be respectful with rate.",
    useCase: "Quick entity lookups and topic summaries without tracking",
  },

  // Archive
  {
    name: "Wayback Machine",
    category: "archive",
    url: "https://web.archive.org",
    apiEndpoint: "https://web.archive.org/web/timemap/json",
    requiresAuth: false,
    freeLimit: "No published limit (rate limit applies)",
    dataFields: ["archived_url", "timestamp", "status_code", "mime_type", "snapshot"],
    legalRestrictions: "Public service by Internet Archive. Respectful use expected. robots.txt honored retroactively by some.",
    useCase: "View historical versions of websites — detect content changes, removed pages, and past configurations",
  },
  {
    name: "Archive.org Full-Text Search",
    category: "archive",
    url: "https://archive.org",
    apiEndpoint: "https://archive.org/advancedsearch.php?output=json",
    requiresAuth: false,
    freeLimit: "Free public API, rate limited",
    dataFields: ["title", "creator", "date", "description", "mediatype", "collection", "downloads"],
    legalRestrictions: "Public domain and open access materials. Respect individual item licenses.",
    useCase: "Search books, media, software, and web archives for historical intelligence",
  },

  // Government
  {
    name: "US Federal Register",
    category: "government",
    url: "https://www.federalregister.gov",
    apiEndpoint: "https://www.federalregister.gov/api/v1",
    requiresAuth: false,
    freeLimit: "1,000 requests/day",
    dataFields: ["title", "abstract", "document_number", "agency", "publication_date", "type", "full_text"],
    legalRestrictions: "Public data. No restrictions on use. API is free.",
    useCase: "Search federal regulations, proposed rules, executive orders, and agency notices",
  },
  {
    name: "OFAC Sanctions List",
    category: "government",
    url: "https://sanctionssearch.ofac.treas.gov",
    apiEndpoint: "https://sanctionssearch.ofac.treas.gov/api",
    requiresAuth: false,
    freeLimit: "Unlimited (public service)",
    dataFields: ["name", "type", "program", "country", "aliases", "ids", "addresses"],
    legalRestrictions: "Public data. No restrictions. Used for compliance screening.",
    useCase: "Screen entities against US sanctions and embargo lists",
  },
  {
    name: "Interpol Notices",
    category: "government",
    url: "https://www.interpol.int/How-we-work/Notices",
    apiEndpoint: "https://ws-public.interpol.int/notices/v1",
    requiresAuth: false,
    freeLimit: "Public API, rate limited",
    dataFields: ["name", "nationality", "date_of_birth", "charge", "notice_type", "issuing_country"],
    legalRestrictions: "Public notices only. Red notices are requests, not arrest warrants. Verify through official channels.",
    useCase: "Search international wanted persons and missing persons notices",
  },

  // Breach
  {
    name: "DeHashed",
    category: "breach",
    url: "https://dehashed.com",
    apiEndpoint: "https://api.dehashed.com/search",
    requiresAuth: true,
    freeLimit: "No free tier — paid subscription required",
    dataFields: ["email", "username", "password_hash", "name", "phone", "address", "ip"],
    legalRestrictions: "PAID ONLY. Strictly for authorized security research and credential monitoring. Never use for unauthorized access.",
    useCase: "Search breach databases for credential exposure — authorized security assessments only",
  },
];

// ── Google Dork Patterns ──

export const GOOGLE_DORK_PATTERNS: GoogleDork[] = [
  // Basic operators
  {
    name: "Site Restriction",
    pattern: "site:{domain}",
    description: "Restrict search to a specific domain or subdomain",
    category: "basic",
    example: 'site:example.com "confidential"',
  },
  {
    name: "URL Pattern",
    pattern: "inurl:{keyword}",
    description: "Find pages with specific keywords in the URL",
    category: "basic",
    example: "inurl:admin login",
  },
  {
    name: "Title Search",
    pattern: "intitle:{keyword}",
    description: "Find pages with specific keywords in the page title",
    category: "basic",
    example: 'intitle:"index of" /backup',
  },
  {
    name: "File Type",
    pattern: "filetype:{extension}",
    description: "Search for specific file types",
    category: "basic",
    example: "filetype:pdf site:example.com",
  },
  {
    name: "Body Text",
    pattern: "intext:{keyword}",
    description: "Find pages with specific keywords in the page body",
    category: "basic",
    example: 'intext:"password" filetype:log',
  },
  {
    name: "Cache",
    pattern: "cache:{url}",
    description: "View Google's cached version of a page",
    category: "basic",
    example: "cache:example.com/page",
  },
  {
    name: "Link Search",
    pattern: "link:{url}",
    description: "Find pages that link to a specific URL",
    category: "basic",
    example: "link:example.com",
  },
  {
    name: "Related Sites",
    pattern: "related:{url}",
    description: "Find sites similar to a specific URL",
    category: "basic",
    example: "related:example.com",
  },

  // Advanced combos — Exposed directories
  {
    name: "Open Directory Listing",
    pattern: 'intitle:"index of" "{target}"',
    description: "Find exposed directory listings on a target domain. For authorized recon only.",
    category: "directory-exposure",
    example: 'intitle:"index of" site:example.com',
  },
  {
    name: "Parent Directory",
    pattern: 'intitle:"index of" "parent directory" site:{domain}',
    description: "Find exposed parent directory pages. For authorized recon only.",
    category: "directory-exposure",
    example: 'intitle:"index of" "parent directory" site:example.com',
  },

  // Config files
  {
    name: "Exposed Config Files",
    pattern: "filetype:env OR filetype:ini OR filetype:conf site:{domain}",
    description: "Search for exposed configuration files. For authorized security assessments only.",
    category: "config-exposure",
    example: "filetype:env site:example.com",
  },
  {
    name: "Git Config Exposure",
    pattern: 'inurl:".git" intitle:"index of" site:{domain}',
    description: "Find exposed .git directories. For authorized recon only.",
    category: "config-exposure",
    example: 'inurl:".git" intitle:"index of" site:example.com',
  },
  {
    name: "WordPress Config",
    pattern: "filetype:txt inurl:wp-config site:{domain}",
    description: "Find exposed WordPress configuration. For authorized assessments only.",
    category: "config-exposure",
    example: "filetype:txt inurl:wp-config site:example.com",
  },

  // Login pages
  {
    name: "Login Page Discovery",
    pattern: "inurl:login OR inurl:signin OR inurl:admin site:{domain}",
    description: "Discover login and admin pages on a target domain",
    category: "login-discovery",
    example: "inurl:login site:example.com",
  },
  {
    name: "Admin Panel",
    pattern: 'intitle:"admin" OR intitle:"dashboard" inurl:admin site:{domain}',
    description: "Find admin panels and dashboards. For authorized recon only.",
    category: "login-discovery",
    example: 'intitle:"admin" site:example.com',
  },

  // Error messages
  {
    name: "SQL Error Messages",
    pattern: '"SQL syntax" OR "mysql_fetch" OR "ORA-" site:{domain}',
    description: "Find pages with database error messages. For authorized security testing only.",
    category: "error-exposure",
    example: '"SQL syntax" site:example.com',
  },
  {
    name: "PHP Error Messages",
    pattern: '"Fatal error" OR "Warning:" filetype:php site:{domain}',
    description: "Find PHP error pages that may leak information. For authorized assessments only.",
    category: "error-exposure",
    example: '"Fatal error" filetype:php site:example.com',
  },
  {
    name: "Stack Trace Exposure",
    pattern: '"Exception" "stack trace" site:{domain}',
    description: "Find exposed stack traces. For authorized security testing only.",
    category: "error-exposure",
    example: '"Exception" "stack trace" site:example.com',
  },

  // Database dumps
  {
    name: "Database Dump Files",
    pattern: "filetype:sql OR filetype:db OR filetype:sqlite site:{domain}",
    description: "Find exposed database files. For authorized security assessments only. Report responsibly.",
    category: "data-exposure",
    example: "filetype:sql site:example.com",
  },
  {
    name: "Spreadsheet Data",
    pattern: "filetype:xlsx OR filetype:csv \"password\" OR \"ssn\" OR \"credit card\" site:{domain}",
    description: "Find exposed spreadsheets with sensitive data. For authorized assessments only.",
    category: "data-exposure",
    example: 'filetype:xlsx "password" site:example.com',
  },

  // Document discovery
  {
    name: "Sensitive Documents",
    pattern: 'filetype:pdf OR filetype:docx "confidential" OR "internal" site:{domain}',
    description: "Find potentially sensitive documents. For authorized recon only.",
    category: "document-discovery",
    example: 'filetype:pdf "confidential" site:example.com',
  },
  {
    name: "Email Harvesting",
    pattern: '"@{domain}" filetype:txt OR filetype:csv OR filetype:xlsx',
    description: "Find files containing email addresses for a domain",
    category: "document-discovery",
    example: '"@example.com" filetype:csv',
  },
];

// ── Entity Type Schemas ──

export const ENTITY_TYPES: Record<string, EntitySchema> = {
  person: {
    fields: [
      "name",
      "email",
      "phone",
      "address",
      "social_profiles",
      "employer",
      "job_title",
      "education",
      "date_of_birth",
      "aliases",
      "known_associates",
      "public_records",
    ],
  },
  organization: {
    fields: [
      "name",
      "domain",
      "employees",
      "industry",
      "registration",
      "headquarters",
      "subsidiaries",
      "key_personnel",
      "annual_revenue",
      "founding_date",
      "tax_id",
      "public_filings",
    ],
  },
  domain: {
    fields: [
      "name",
      "registrar",
      "creation_date",
      "expiration_date",
      "dns_records",
      "ssl_cert",
      "nameservers",
      "ip_addresses",
      "subdomains",
      "whois_history",
      "technologies",
      "hosting_provider",
    ],
  },
  "ip-address": {
    fields: [
      "ip",
      "asn",
      "geolocation",
      "open_ports",
      "services",
      "hostname",
      "organization",
      "isp",
      "country",
      "abuse_contact",
      "blacklists",
      "reputation_score",
    ],
  },
  "social-account": {
    fields: [
      "platform",
      "username",
      "url",
      "followers",
      "following",
      "posts",
      "bio",
      "profile_image",
      "creation_date",
      "verification_status",
      "linked_accounts",
      "activity_frequency",
    ],
  },
};

// ── Graph Algorithm Reference ──

export const GRAPH_ALGORITHMS: GraphAlgorithm[] = [
  {
    name: "PageRank",
    description: "Measures node importance based on the structure of incoming links. Nodes with many high-quality incoming connections receive higher scores.",
    useCase: "Identify the most influential entities in a network — key people, organizations, or domains that many others connect to.",
    complexity: "O(V + E) per iteration, typically 20-100 iterations",
    implementation: `function pageRank(nodes: string[], edges: [string, string][], damping = 0.85, iterations = 100): Map<string, number> {
  const n = nodes.length;
  const rank = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const inLinks = new Map<string, string[]>();

  nodes.forEach(node => {
    rank.set(node, 1 / n);
    outDegree.set(node, 0);
    inLinks.set(node, []);
  });

  edges.forEach(([src, tgt]) => {
    outDegree.set(src, (outDegree.get(src) ?? 0) + 1);
    inLinks.get(tgt)?.push(src);
  });

  for (let i = 0; i < iterations; i++) {
    const newRank = new Map<string, number>();
    nodes.forEach(node => {
      let sum = 0;
      for (const src of inLinks.get(node) ?? []) {
        sum += (rank.get(src) ?? 0) / (outDegree.get(src) ?? 1);
      }
      newRank.set(node, (1 - damping) / n + damping * sum);
    });
    rank.forEach((_, key) => rank.set(key, newRank.get(key) ?? 0));
  }
  return rank;
}`,
  },
  {
    name: "Betweenness Centrality",
    description: "Measures how often a node lies on the shortest path between other nodes. High betweenness indicates a bridge or broker role.",
    useCase: "Identify gatekeepers, brokers, or intermediaries who control information flow between groups.",
    complexity: "O(V * E) using Brandes algorithm",
    implementation: `function betweennessCentrality(nodes: string[], edges: [string, string][]): Map<string, number> {
  const bc = new Map<string, number>();
  nodes.forEach(n => bc.set(n, 0));
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n, []));
  edges.forEach(([s, t]) => { adj.get(s)?.push(t); adj.get(t)?.push(s); });

  for (const s of nodes) {
    const stack: string[] = [];
    const pred = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const dist = new Map<string, number>();
    const delta = new Map<string, number>();
    nodes.forEach(n => { pred.set(n, []); sigma.set(n, 0); dist.set(n, -1); delta.set(n, 0); });
    sigma.set(s, 1); dist.set(s, 0);
    const queue = [s];
    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);
      for (const w of adj.get(v) ?? []) {
        if (dist.get(w)! < 0) { queue.push(w); dist.set(w, dist.get(v)! + 1); }
        if (dist.get(w) === dist.get(v)! + 1) { sigma.set(w, sigma.get(w)! + sigma.get(v)!); pred.get(w)?.push(v); }
      }
    }
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred.get(w) ?? []) {
        delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      }
      if (w !== s) bc.set(w, bc.get(w)! + delta.get(w)!);
    }
  }
  const n = nodes.length;
  if (n > 2) bc.forEach((v, k) => bc.set(k, v / ((n - 1) * (n - 2))));
  return bc;
}`,
  },
  {
    name: "Closeness Centrality",
    description: "Measures the average shortest distance from a node to all other nodes. Nodes with high closeness can spread information efficiently.",
    useCase: "Find entities that can most quickly reach or be reached by all others in the network.",
    complexity: "O(V * (V + E)) using BFS from each node",
    implementation: `function closenessCentrality(nodes: string[], edges: [string, string][]): Map<string, number> {
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n, []));
  edges.forEach(([s, t]) => { adj.get(s)?.push(t); adj.get(t)?.push(s); });
  const cc = new Map<string, number>();

  for (const src of nodes) {
    const dist = new Map<string, number>();
    dist.set(src, 0);
    const queue = [src];
    while (queue.length > 0) {
      const v = queue.shift()!;
      for (const w of adj.get(v) ?? []) {
        if (!dist.has(w)) { dist.set(w, dist.get(v)! + 1); queue.push(w); }
      }
    }
    let totalDist = 0;
    dist.forEach(d => totalDist += d);
    const reachable = dist.size - 1;
    cc.set(src, reachable > 0 && totalDist > 0 ? reachable / totalDist : 0);
  }
  return cc;
}`,
  },
  {
    name: "Community Detection (Louvain)",
    description: "Detects communities by optimizing modularity. Iteratively assigns nodes to communities that maximize internal density vs external connections.",
    useCase: "Discover clusters of closely related entities — organizational departments, affiliated groups, or coordinated networks.",
    complexity: "O(E * log V) typical, near-linear in practice",
    implementation: `function louvainCommunities(nodes: string[], edges: [string, string, number][]): Map<string, number> {
  // Simplified Louvain: greedy modularity optimization
  const community = new Map<string, number>();
  nodes.forEach((n, i) => community.set(n, i));
  const adj = new Map<string, Array<{ target: string; weight: number }>>();
  nodes.forEach(n => adj.set(n, []));
  let totalWeight = 0;
  edges.forEach(([s, t, w]) => {
    adj.get(s)?.push({ target: t, weight: w });
    adj.get(t)?.push({ target: s, weight: w });
    totalWeight += w;
  });
  if (totalWeight === 0) return community;
  let improved = true;
  while (improved) {
    improved = false;
    for (const node of nodes) {
      const currentComm = community.get(node)!;
      const neighborComms = new Map<number, number>();
      for (const { target, weight } of adj.get(node) ?? []) {
        const c = community.get(target)!;
        neighborComms.set(c, (neighborComms.get(c) ?? 0) + weight);
      }
      let bestComm = currentComm;
      let bestGain = 0;
      neighborComms.forEach((weight, comm) => {
        if (comm !== currentComm && weight > bestGain) {
          bestGain = weight;
          bestComm = comm;
        }
      });
      if (bestComm !== currentComm) { community.set(node, bestComm); improved = true; }
    }
  }
  return community;
}`,
  },
  {
    name: "Connected Components",
    description: "Finds groups of nodes where every node can reach every other node through edges. Disconnected groups form separate components.",
    useCase: "Identify isolated clusters — entities that have no connection to the main network may be suspicious or unrelated.",
    complexity: "O(V + E) using BFS/DFS",
    implementation: `function connectedComponents(nodes: string[], edges: [string, string][]): Map<string, number> {
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n, []));
  edges.forEach(([s, t]) => { adj.get(s)?.push(t); adj.get(t)?.push(s); });
  const component = new Map<string, number>();
  let componentId = 0;

  for (const start of nodes) {
    if (component.has(start)) continue;
    const queue = [start];
    component.set(start, componentId);
    while (queue.length > 0) {
      const v = queue.shift()!;
      for (const w of adj.get(v) ?? []) {
        if (!component.has(w)) { component.set(w, componentId); queue.push(w); }
      }
    }
    componentId++;
  }
  return component;
}`,
  },
  {
    name: "Shortest Path (BFS)",
    description: "Finds the shortest path between two nodes in an unweighted graph using breadth-first search.",
    useCase: "Determine the closest connection between two entities — how many hops separate a person from an organization.",
    complexity: "O(V + E)",
    implementation: `function shortestPath(nodes: string[], edges: [string, string][], source: string, target: string): string[] | null {
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n, []));
  edges.forEach(([s, t]) => { adj.get(s)?.push(t); adj.get(t)?.push(s); });
  const parent = new Map<string, string | null>();
  parent.set(source, null);
  const queue = [source];

  while (queue.length > 0) {
    const v = queue.shift()!;
    if (v === target) {
      const path: string[] = [];
      let current: string | null = target;
      while (current !== null) { path.unshift(current); current = parent.get(current) ?? null; }
      return path;
    }
    for (const w of adj.get(v) ?? []) {
      if (!parent.has(w)) { parent.set(w, v); queue.push(w); }
    }
  }
  return null;
}`,
  },
  {
    name: "Degree Distribution",
    description: "Computes the degree (number of connections) of each node and the overall distribution. Reveals network structure (scale-free, random, etc.).",
    useCase: "Identify hub entities with unusually high connectivity. Power-law distributions suggest key players.",
    complexity: "O(V + E)",
    implementation: `function degreeDistribution(nodes: string[], edges: [string, string][]): { degrees: Map<string, number>; distribution: Map<number, number> } {
  const degrees = new Map<string, number>();
  nodes.forEach(n => degrees.set(n, 0));
  edges.forEach(([s, t]) => {
    degrees.set(s, (degrees.get(s) ?? 0) + 1);
    degrees.set(t, (degrees.get(t) ?? 0) + 1);
  });
  const distribution = new Map<number, number>();
  degrees.forEach(d => distribution.set(d, (distribution.get(d) ?? 0) + 1));
  return { degrees, distribution };
}`,
  },
];

// ── Ethical Guidelines ──

export const ETHICAL_GUIDELINES = {
  principles: [
    "Only collect and use publicly available, legally accessible information.",
    "Respect the privacy and dignity of all individuals — subjects and non-subjects alike.",
    "Apply data minimization: collect only what is strictly necessary for the stated purpose.",
    "Maintain transparency about data collection methods and purposes.",
    "Ensure all activities comply with applicable local, national, and international laws.",
    "Never use OSINT capabilities for harassment, stalking, doxxing, or intimidation.",
    "Verify information from multiple independent sources before drawing conclusions.",
    "Document the chain of evidence and maintain analytical objectivity.",
    "Consider the potential harm your investigation could cause and mitigate risks.",
    "Follow responsible disclosure practices for any vulnerabilities or sensitive findings.",
  ],
  prohibited_uses: [
    "Stalking, harassment, or intimidation of any individual.",
    "Doxxing — publishing private information to expose or endanger someone.",
    "Unauthorized surveillance of individuals without legal basis.",
    "Accessing or attempting to access password-protected or private systems.",
    "Exploiting discovered vulnerabilities without authorization.",
    "Discrimination based on race, religion, gender, sexual orientation, or other protected characteristics.",
    "Gathering intelligence for blackmail, extortion, or coercion.",
    "Violating terms of service of data sources through scraping or abuse.",
    "Circumventing privacy controls, paywalls, or access restrictions.",
    "Selling or distributing collected personal data without legal basis.",
  ],
  required_disclaimers: [
    "This tool is designed for authorized, ethical use only.",
    "Users must comply with all applicable laws and regulations in their jurisdiction.",
    "Data collected through this tool should not be used for harassment, stalking, or unauthorized surveillance.",
    "This tool accesses only publicly available information and does not bypass access controls.",
    "Results should be verified through multiple independent sources before taking action.",
    "The tool creator assumes no liability for misuse of generated intelligence or tools.",
  ],
  data_retention_rules: [
    "Retain collected data only for the duration necessary to complete the stated investigation.",
    "Delete personal data within 90 days of investigation completion unless legal hold requires retention.",
    "Anonymize data in reports where specific identity is not necessary for the analysis.",
    "Implement access controls — only authorized personnel should access raw intelligence data.",
    "Maintain an audit log of all data access and processing activities.",
    "Provide data subjects with access to their data upon request where legally required.",
  ],
  consent_requirements: [
    "Obtain informed consent when directly engaging with investigation subjects.",
    "Inform subjects of data collection when required by applicable privacy regulations.",
    "Provide opt-out mechanisms where legally required (e.g., CCPA).",
    "Document the legal basis for data processing (legitimate interest, consent, legal obligation).",
    "For GDPR subjects, conduct a Data Protection Impact Assessment (DPIA) for high-risk processing.",
    "Maintain records of processing activities as required by regulations.",
  ],
  responsible_disclosure_steps: [
    "If you discover a security vulnerability, do not exploit it.",
    "Document the vulnerability with sufficient detail for remediation.",
    "Attempt to contact the affected organization through official security channels (security@domain, /.well-known/security.txt).",
    "Allow a reasonable time window (typically 90 days) for remediation before any disclosure.",
    "If the organization is unresponsive, consider contacting CERT/CC or relevant national CERT.",
    "Never disclose vulnerabilities publicly before the affected party has had reasonable time to patch.",
    "If the vulnerability poses immediate risk to public safety, coordinate expedited disclosure with authorities.",
  ],
} as const;

// ── Utility Functions ──

/**
 * Constructs an optimized search query for an entity type using known identifiers.
 */
export function buildSearchQuery(
  entityType: string,
  identifiers: Record<string, string>
): string {
  const schema = ENTITY_TYPES[entityType];
  if (!schema) {
    return Object.values(identifiers).filter(Boolean).join(" ");
  }

  const parts: string[] = [];

  // Build query based on entity type and available identifiers
  switch (entityType) {
    case "person": {
      if (identifiers.name) parts.push(`"${identifiers.name}"`);
      if (identifiers.email) parts.push(`"${identifiers.email}"`);
      if (identifiers.employer) parts.push(`"${identifiers.employer}"`);
      if (identifiers.phone) parts.push(`"${identifiers.phone}"`);
      if (identifiers.address) parts.push(`"${identifiers.address}"`);
      break;
    }
    case "organization": {
      if (identifiers.name) parts.push(`"${identifiers.name}"`);
      if (identifiers.domain) parts.push(`site:${identifiers.domain}`);
      if (identifiers.industry) parts.push(identifiers.industry);
      if (identifiers.registration) parts.push(`"${identifiers.registration}"`);
      break;
    }
    case "domain": {
      if (identifiers.name) parts.push(`site:${identifiers.name}`);
      if (identifiers.registrar) parts.push(`"${identifiers.registrar}"`);
      break;
    }
    case "ip-address": {
      if (identifiers.ip) parts.push(`"${identifiers.ip}"`);
      if (identifiers.asn) parts.push(`"${identifiers.asn}"`);
      break;
    }
    case "social-account": {
      if (identifiers.platform && identifiers.username) {
        parts.push(`site:${identifiers.platform}.com "${identifiers.username}"`);
      } else if (identifiers.username) {
        parts.push(`"${identifiers.username}"`);
      }
      break;
    }
    default: {
      Object.values(identifiers).filter(Boolean).forEach((v) => parts.push(`"${v}"`));
    }
  }

  return parts.join(" ");
}

/**
 * Builds a Google dork query for a target domain or entity.
 */
export function generateGoogleDork(target: string, dorkType: string): string {
  const dork = GOOGLE_DORK_PATTERNS.find(
    (d) => d.name.toLowerCase().replace(/\s+/g, "-") === dorkType.toLowerCase().replace(/\s+/g, "-") ||
           d.category === dorkType
  );

  if (!dork) {
    return `site:${target}`;
  }

  return dork.pattern.replace(/{domain}/g, target).replace(/{target}/g, target).replace(/{keyword}/g, target);
}

/**
 * Calculates a weighted multi-source confidence score.
 *
 * Sources with higher confidence and more corroboration produce higher scores.
 */
export function calculateEntityConfidence(
  sources: Array<{ source: string; confidence: number }>
): number {
  if (sources.length === 0) return 0;

  // Weight by source reliability
  const sourceWeights: Record<string, number> = {
    government: 0.95,
    court_records: 0.90,
    corporate_filings: 0.85,
    domain_registration: 0.80,
    certificate_transparency: 0.80,
    breach_database: 0.70,
    social_media: 0.60,
    web_archive: 0.55,
    search_engine: 0.50,
    user_submitted: 0.30,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const { source, confidence } of sources) {
    const sourceWeight = sourceWeights[source.toLowerCase().replace(/\s+/g, "_")] ?? 0.50;
    const combinedWeight = sourceWeight * confidence;
    weightedSum += confidence * combinedWeight;
    totalWeight += combinedWeight;
  }

  if (totalWeight === 0) return 0;

  // Base confidence from weighted average
  let result = weightedSum / totalWeight;

  // Corroboration bonus: multiple sources increase confidence
  const corroborationBonus = Math.min(0.15, (sources.length - 1) * 0.05);
  result = Math.min(1, result + corroborationBonus);

  return Math.round(result * 1000) / 1000;
}

/**
 * Constructs a graph structure from raw entity and relationship data.
 */
export function buildEntityGraph(
  entities: EntityInput[],
  relationships: RelationshipInput[]
): GraphData {
  // Build adjacency for degree calculation
  const degreeMap = new Map<string, number>();
  entities.forEach((e) => degreeMap.set(e.id, 0));

  const validEdges: GraphData["edges"] = [];
  const nodeIds = new Set(entities.map((e) => e.id));

  for (const rel of relationships) {
    if (!nodeIds.has(rel.source) || !nodeIds.has(rel.target)) continue;
    degreeMap.set(rel.source, (degreeMap.get(rel.source) ?? 0) + 1);
    degreeMap.set(rel.target, (degreeMap.get(rel.target) ?? 0) + 1);
    validEdges.push({
      source: rel.source,
      target: rel.target,
      relationship: rel.relationship,
      confidence: rel.confidence,
      evidence: rel.evidence ?? "",
    });
  }

  // Compute connected components for community assignment
  const componentMap = new Map<string, number>();
  let componentId = 0;
  const adj = new Map<string, string[]>();
  entities.forEach((e) => adj.set(e.id, []));
  validEdges.forEach((e) => {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });

  for (const entity of entities) {
    if (componentMap.has(entity.id)) continue;
    const queue = [entity.id];
    componentMap.set(entity.id, componentId);
    while (queue.length > 0) {
      const v = queue.shift()!;
      for (const w of adj.get(v) ?? []) {
        if (!componentMap.has(w)) {
          componentMap.set(w, componentId);
          queue.push(w);
        }
      }
    }
    componentId++;
  }

  const nodes: GraphData["nodes"] = entities.map((e) => ({
    id: e.id,
    type: e.type,
    label: e.label,
    attributes: e.attributes,
    degree: degreeMap.get(e.id) ?? 0,
    community: componentMap.get(e.id) ?? 0,
  }));

  // Calculate density
  const maxEdges = entities.length > 1 ? (entities.length * (entities.length - 1)) / 2 : 1;
  const density = validEdges.length / maxEdges;

  return {
    nodes,
    edges: validEdges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: validEdges.length,
      density: Math.round(density * 1000) / 1000,
      components: componentId,
    },
  };
}

/**
 * Simple community detection using connected components.
 * For more advanced detection, use the Louvain pseudocode in GRAPH_ALGORITHMS.
 */
export function detectCommunities(
  graph: GraphData,
  _algorithm?: string
): Community[] {
  const communities = new Map<number, string[]>();

  for (const node of graph.nodes) {
    const comm = node.community;
    if (!communities.has(comm)) {
      communities.set(comm, []);
    }
    communities.get(comm)!.push(node.id);
  }

  const result: Community[] = [];
  communities.forEach((members, id) => {
    // Calculate cohesion: internal edges / possible internal edges
    const internalEdges = graph.edges.filter(
      (e) => members.includes(e.source) && members.includes(e.target)
    ).length;
    const possibleEdges = members.length > 1 ? (members.length * (members.length - 1)) / 2 : 1;
    const cohesion = Math.round((internalEdges / possibleEdges) * 1000) / 1000;

    result.push({
      id,
      members,
      label: `Community ${id + 1} (${members.length} members)`,
      cohesion,
    });
  });

  return result.sort((a, b) => b.members.length - a.members.length);
}

/**
 * Formats events into a chronological timeline with relative positioning.
 */
export function generateTimeline(events: TimelineEvent[]): FormattedTimeline {
  if (events.length === 0) {
    return {
      events: [],
      startDate: "",
      endDate: "",
      totalSpanDays: 0,
    };
  }

  // Sort by date
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const startTime = new Date(sorted[0].date).getTime();
  const endTime = new Date(sorted[sorted.length - 1].date).getTime();
  const totalSpan = endTime - startTime;

  const formattedEvents = sorted.map((event) => ({
    ...event,
    relativePosition:
      totalSpan > 0
        ? Math.round(((new Date(event.date).getTime() - startTime) / totalSpan) * 1000) / 1000
        : 0,
  }));

  return {
    events: formattedEvents,
    startDate: sorted[0].date,
    endDate: sorted[sorted.length - 1].date,
    totalSpanDays: Math.round(totalSpan / (1000 * 60 * 60 * 24)),
  };
}

/**
 * Classifies a data field by sensitivity level.
 */
export function classifyDataSensitivity(
  dataField: string
): "public" | "semi-private" | "private" | "sensitive" {
  const field = dataField.toLowerCase().replace(/[_\-\s]+/g, "");

  // Sensitive — legally protected or high risk
  const sensitiveFields = [
    "ssn", "socialsecuritynumber", "taxid", "passport", "driverslicense",
    "creditcard", "bankaccount", "financialaccount", "password", "passwordhash",
    "medicalrecord", "healthdata", "biometric", "geneticdata", "sexualorientation",
    "religiousbelief", "politicalopinion", "tradeunionmembership", "criminalrecord",
  ];
  if (sensitiveFields.some((s) => field.includes(s))) return "sensitive";

  // Private — personally identifiable but not legally protected in the same way
  const privateFields = [
    "email", "phone", "phonenumber", "address", "homeaddress", "dateofbirth",
    "dob", "birthdate", "salary", "income", "ip", "ipaddress", "gps",
    "geolocation", "deviceid", "macaddress",
  ];
  if (privateFields.some((s) => field.includes(s))) return "private";

  // Semi-private — publicly findable but not freely shared
  const semiPrivateFields = [
    "employer", "jobtitle", "education", "school", "university",
    "socialmedia", "socialprofile", "username", "followers", "following",
    "linkedinprofile", "facebookprofile", "twitterhandle",
  ];
  if (semiPrivateFields.some((s) => field.includes(s))) return "semi-private";

  // Public — generally available
  return "public";
}

/**
 * Generates an appropriate ethical/legal disclaimer for an OSINT tool.
 */
export function generateEthicalDisclaimer(toolPurpose: string): string {
  const purpose = toolPurpose.toLowerCase();

  let specificWarning = "";
  if (purpose.includes("person") || purpose.includes("people") || purpose.includes("profile")) {
    specificWarning = " This tool must not be used for stalking, harassment, doxxing, or any form of unauthorized personal surveillance.";
  } else if (purpose.includes("breach") || purpose.includes("credential") || purpose.includes("password")) {
    specificWarning = " Breach data must only be used for authorized security assessments and credential monitoring. Never attempt to use discovered credentials for unauthorized access.";
  } else if (purpose.includes("scan") || purpose.includes("port") || purpose.includes("infrastructure")) {
    specificWarning = " Infrastructure scanning must only be performed on systems you own or have explicit written authorization to test. Unauthorized scanning may violate the Computer Fraud and Abuse Act (CFAA) and similar laws.";
  } else if (purpose.includes("social") || purpose.includes("scrape") || purpose.includes("crawl")) {
    specificWarning = " Respect the terms of service of all platforms. Do not scrape data in violation of platform policies. Comply with rate limits and robots.txt directives.";
  }

  return `LEGAL DISCLAIMER: This tool is provided for authorized, ethical intelligence gathering purposes only. Users are solely responsible for ensuring their use complies with all applicable local, national, and international laws and regulations, including but not limited to GDPR, CCPA, CFAA, and the UK Computer Misuse Act.${specificWarning} The authors and distributors of this tool assume no liability for misuse. By using this tool, you acknowledge that you have proper authorization for your intended use case.`;
}

/**
 * Validates whether a proposed OSINT scope is ethical and legal.
 */
export function validateOSINTScope(
  scope: string
): { isValid: boolean; warnings: string[]; recommendations: string[] } {
  const scopeLower = scope.toLowerCase();
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let isValid = true;

  // Red flags — likely prohibited
  const prohibitedPatterns = [
    { pattern: /stalk/i, warning: "Scope appears to involve stalking, which is illegal and prohibited." },
    { pattern: /harass/i, warning: "Scope appears to involve harassment, which is prohibited." },
    { pattern: /dox/i, warning: "Scope appears to involve doxxing, which is prohibited." },
    { pattern: /blackmail/i, warning: "Scope appears to involve blackmail or extortion, which is illegal." },
    { pattern: /extort/i, warning: "Scope appears to involve extortion, which is illegal." },
    { pattern: /hack\s+into/i, warning: "Unauthorized system access is illegal under CFAA and similar laws." },
    { pattern: /break\s+into/i, warning: "Unauthorized system access is illegal." },
    { pattern: /spy\s+on\s+(my\s+)?(ex|spouse|partner|girlfriend|boyfriend)/i, warning: "Surveilling individuals without authorization is illegal and unethical." },
    { pattern: /without\s+(their\s+)?consent/i, warning: "Activities without consent may violate privacy laws." },
  ];

  for (const { pattern, warning } of prohibitedPatterns) {
    if (pattern.test(scope)) {
      warnings.push(warning);
      isValid = false;
    }
  }

  // Cautionary patterns — need guardrails
  if (/person|individual|someone/i.test(scopeLower)) {
    recommendations.push("When investigating individuals, ensure you have a legitimate legal basis and apply data minimization principles.");
  }

  if (/scrape|crawl/i.test(scopeLower)) {
    recommendations.push("Ensure all scraping complies with robots.txt and terms of service. Implement respectful rate limiting.");
  }

  if (/breach|leak|dump/i.test(scopeLower)) {
    recommendations.push("Breach data should only be used for authorized security assessments. Never attempt credential reuse.");
  }

  if (/social\s*media/i.test(scopeLower)) {
    recommendations.push("Respect platform terms of service. Use official APIs where available. Do not create fake accounts for investigation.");
  }

  if (/company|corporate|business/i.test(scopeLower)) {
    recommendations.push("Corporate intelligence is generally lower risk but still ensure compliance with trade secret laws and competitive intelligence ethics.");
  }

  if (/infrastructure|network|scan/i.test(scopeLower)) {
    recommendations.push("Obtain written authorization before scanning any infrastructure. Document scope and authorization.");
  }

  // General recommendations
  if (recommendations.length === 0 && isValid) {
    recommendations.push("Document your authorization and legal basis before proceeding.");
    recommendations.push("Apply data minimization — collect only what is necessary.");
  }

  return { isValid, warnings, recommendations };
}
