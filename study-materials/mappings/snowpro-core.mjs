// @ts-check
// Keyword -> topic/subtopic mapping for snowpro-core.
// Rules are checked in order; first regex that matches the question text
// (case-insensitive) wins. `fallback` guarantees every question maps somewhere.

/** @type {{ re: RegExp, topicId: string, subtopicId: string, tag: string }[]} */
const RULES = [
  // Domain 5: Data Collaboration
  { re: /marketplace|listing|native app/i, topicId: "data-collaboration", subtopicId: "marketplace-listings", tag: "marketplace" },
  { re: /data shar|reader account|provider account|consumer account|clean room|reshar/i, topicId: "data-collaboration", subtopicId: "data-sharing", tag: "sharing" },
  { re: /time travel|fail-?safe|zero-?copy|cloning|clone|replication|failover/i, topicId: "data-collaboration", subtopicId: "collaboration-protection", tag: "data-protection" },

  // Domain 3: Data Loading, Unloading, Connectivity
  { re: /snowpipe|snow pipe|auto-?ingest|stream(?!lit)|dynamic table|\btask(s)?\b/i, topicId: "data-loading-connectivity", subtopicId: "automated-ingestion", tag: "ingestion" },
  { re: /driver|connector|storage integration|api integration|git integration|kafka|jdbc|odbc/i, topicId: "data-loading-connectivity", subtopicId: "connectors-integrations", tag: "connectivity" },
  { re: /copy into|\bstage(s)?\b|file format|\bput\b|\bget\b|on_error|load(ing)? data|unload|directory table/i, topicId: "data-loading-connectivity", subtopicId: "loading-unloading", tag: "data-loading" },

  // Domain 2: Account Management and Data Governance
  { re: /resource monitor|credit usage|account_usage|cost|billing|budget/i, topicId: "account-governance", subtopicId: "monitoring-cost", tag: "cost" },
  { re: /masking|row access|row-?level|column-?level|classification|tagging|tag\b|lineage|trust center|privacy policy|encryption key/i, topicId: "account-governance", subtopicId: "data-governance", tag: "governance" },
  { re: /\brbac\b|\bdac\b|role|privilege|grant|authentication|mfa|sso|oauth|key-?pair|network polic|accountadmin|securityadmin|sysadmin|useradmin/i, topicId: "account-governance", subtopicId: "security-model", tag: "security" },

  // Domain 4: Performance Optimization, Querying, Transformation
  { re: /result cache|metadata cache|warehouse cache|caching|cached/i, topicId: "performance-transformation", subtopicId: "caching", tag: "caching" },
  { re: /query acceleration|search optimization|clustering key|materialized view|pruning/i, topicId: "performance-transformation", subtopicId: "optimize-performance", tag: "optimization" },
  { re: /query profile|spill|exploding join|queuing|query history|query attribution|workload/i, topicId: "performance-transformation", subtopicId: "evaluate-performance", tag: "performance" },
  { re: /window function|aggregate function|flatten|variant|semi-?structured|unstructured|transform|\bjson\b/i, topicId: "performance-transformation", subtopicId: "transformation", tag: "transformation" },

  // Domain 1: Architecture and Features
  { re: /notebook|streamlit|snowpark|cortex|\bml model|machine learning|\bai\b/i, topicId: "architecture-features", subtopicId: "aiml-app-development", tag: "ai-ml" },
  { re: /micro-?partition|table type|permanent table|transient table|temporary table|iceberg|external table|secure view|materialized|clustering/i, topicId: "architecture-features", subtopicId: "storage-concepts", tag: "storage" },
  { re: /warehouse|auto-?suspend|auto-?resume|scaling|multi-?cluster|\bsize\b|snowpark-?optimized/i, topicId: "architecture-features", subtopicId: "virtual-warehouses", tag: "warehouses" },
  { re: /snowsight|\bcli\b|visual studio|interface|worksheet/i, topicId: "architecture-features", subtopicId: "interfaces-tools", tag: "interfaces" },
  { re: /object|schema|database|sequence|stored procedure|\budf\b|user-?defined function|hierarchy|parameter/i, topicId: "architecture-features", subtopicId: "object-hierarchy", tag: "objects" },
  { re: /architecture|cloud services|compute layer|storage layer|edition|standard edition|enterprise edition|business critical/i, topicId: "architecture-features", subtopicId: "architecture-layers", tag: "architecture" },
];

export function assign(q) {
  const text = q.question || "";
  for (const r of RULES) {
    if (r.re.test(text)) return { topicId: r.topicId, subtopicId: r.subtopicId };
  }
  return null;
}

export function fallback() {
  // Default bucket: architecture fundamentals.
  return { topicId: "architecture-features", subtopicId: "architecture-layers" };
}

export function tagsFor(q) {
  const text = q.question || "";
  const tags = [];
  for (const r of RULES) {
    if (r.re.test(text) && !tags.includes(r.tag)) tags.push(r.tag);
  }
  return tags.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Optional topic enrichment for author-topics.mjs.
// Keyed by subtopic id; returns any of the optional Subtopic study fields
// (content, references, difficulty, estimatedStudyMinutes). Only these fields
// are merged in — ids, weights, names, descriptions, and keyPoints are never
// touched, so the strict data test keeps passing.
// ---------------------------------------------------------------------------

const DOCS = "https://docs.snowflake.com";

/** @type {Record<string, { content?: string, references?: string[], difficulty?: "easy"|"medium"|"hard", estimatedStudyMinutes?: number }>} */
const ENRICHMENT = {
  "architecture-layers": {
    difficulty: "easy",
    estimatedStudyMinutes: 40,
    content:
      "Snowflake's architecture separates **storage**, **compute**, and **cloud services** so each scales independently.\n\n- **Cloud Services** — authentication, metadata, the query optimizer, and access control.\n- **Compute** — virtual warehouses that process queries; add more warehouses without contending for the same resources.\n- **Storage** — data persisted as compressed, columnar micro-partitions in cloud object storage.\n\n> Editions (Standard → Enterprise → Business Critical → VPS) layer on additional security, compliance, and features rather than more compute.",
    references: [
      `${DOCS}/en/user-guide/intro-key-concepts`,
      `${DOCS}/en/user-guide/intro-editions`,
    ],
  },
  "interfaces-tools": {
    difficulty: "easy",
    estimatedStudyMinutes: 20,
    content:
      "You can reach the same account and objects through multiple interfaces:\n\n- **Snowsight** — the modern web UI for worksheets, dashboards, and monitoring.\n- **Snowflake CLI** and **SnowSQL** — command-line access for scripting and automation.\n- **Drivers & IDE integrations** (e.g. the VS Code extension) — connect tools and applications.",
    references: [`${DOCS}/en/user-guide/ui-snowsight`],
  },
  "object-hierarchy": {
    difficulty: "medium",
    estimatedStudyMinutes: 30,
    content:
      "Objects are organized in a hierarchy. Organization and account objects sit above **databases**, which contain **schemas**, which contain tables, views, stages, file formats, UDFs, procedures, pipes, streams, tasks, and more.\n\nResolve objects with fully-qualified names: `database.schema.object`. Parameters follow a precedence order of **account → user → session**.",
    references: [`${DOCS}/en/sql-reference/name-resolution`],
  },
  "virtual-warehouses": {
    difficulty: "medium",
    estimatedStudyMinutes: 45,
    content:
      "A **virtual warehouse** is the compute that runs queries.\n\n- **Sizing (up/down)** changes per-cluster power for heavier queries.\n- **Scaling (in/out)** with multi-cluster warehouses handles more concurrent users.\n- **Auto-suspend / auto-resume** pause idle compute to control cost.\n\nBilling is per-second with a 60-second minimum whenever a warehouse is running.",
    references: [
      `${DOCS}/en/user-guide/warehouses-overview`,
      `${DOCS}/en/user-guide/warehouses-multicluster`,
    ],
  },
  "storage-concepts": {
    difficulty: "hard",
    estimatedStudyMinutes: 50,
    content:
      "Data lives in immutable, compressed, columnar **micro-partitions**. Snowflake automatically keeps metadata (min/max, distinct counts) per micro-partition, enabling **pruning** — skipping partitions that cannot match a query.\n\nOn very large tables, a **clustering key** keeps related data co-located to improve pruning. Choose table types deliberately: permanent, temporary, transient, external, dynamic, or Apache Iceberg.",
    references: [
      `${DOCS}/en/user-guide/tables-micro-partitions`,
      `${DOCS}/en/user-guide/tables-clustering-keys`,
    ],
  },
  "aiml-app-development": {
    difficulty: "medium",
    estimatedStudyMinutes: 35,
    content:
      "Snowflake supports building AI/ML and apps close to the data:\n\n- **Snowpark** runs Python, Java, and Scala inside Snowflake.\n- **Notebooks** and **Streamlit in Snowflake** enable interactive development and apps.\n- **Cortex** offers AI SQL functions, Cortex Search, and Cortex Analyst.",
    references: [`${DOCS}/en/guides-overview-ai-features`],
  },
  "security-model": {
    difficulty: "hard",
    estimatedStudyMinutes: 50,
    content:
      "Access is governed by **RBAC**: privileges are granted to **roles**, and roles are granted to **users** (and to other roles to form hierarchies). Snowflake also uses **DAC**, where the owning role can grant access to its objects.\n\nKnow the system roles — **ACCOUNTADMIN**, **SECURITYADMIN**, **USERADMIN**, **SYSADMIN**, **PUBLIC** — and authentication options: MFA, SSO/federation, OAuth, and key-pair.",
    references: [
      `${DOCS}/en/user-guide/security-access-control-overview`,
      `${DOCS}/en/user-guide/admin-user-management`,
    ],
  },
  "data-governance": {
    difficulty: "medium",
    estimatedStudyMinutes: 40,
    content:
      "Governance features protect and describe data:\n\n- **Dynamic Data Masking** and **row access policies** enforce column- and row-level security.\n- **Data classification** and **object tagging** label and categorize sensitive data.\n- **Data lineage**, the **Trust Center**, and end-to-end **encryption with key rotation** round out the posture.",
    references: [`${DOCS}/en/user-guide/governance-overview`],
  },
  "monitoring-cost": {
    difficulty: "medium",
    estimatedStudyMinutes: 30,
    content:
      "**Resource monitors** track warehouse credit usage and can notify or suspend when thresholds are hit — at no extra cost. The **ACCOUNT_USAGE** schema exposes account-wide usage and metadata for cost analysis.",
    references: [
      `${DOCS}/en/user-guide/resource-monitors`,
      `${DOCS}/en/sql-reference/account-usage`,
    ],
  },
  "loading-unloading": {
    difficulty: "medium",
    estimatedStudyMinutes: 45,
    content:
      "Bulk data movement centers on **stages**, **file formats**, and **COPY**:\n\n- **Stages** can be internal (user/table/named) or external (S3/Azure/GCS).\n- `COPY INTO <table>` loads staged files; `COPY INTO <location>` unloads.\n- `PUT` uploads to an internal stage; `GET` downloads.\n- `ON_ERROR` (CONTINUE / SKIP_FILE / ABORT_STATEMENT) controls load behavior; load metadata prevents reloading the same file.",
    references: [
      `${DOCS}/en/user-guide/data-load-overview`,
      `${DOCS}/en/sql-reference/sql/copy-into-table`,
    ],
  },
  "automated-ingestion": {
    difficulty: "hard",
    estimatedStudyMinutes: 40,
    content:
      "For continuous ingestion:\n\n- **Snowpipe** loads files in micro-batches as they arrive (serverless).\n- **Snowpipe Streaming** ingests rows with low latency, no staging.\n- **Streams** track changes (CDC); **Tasks** schedule SQL and chain into DAGs; **Dynamic Tables** declaratively maintain transformed results.",
    references: [
      `${DOCS}/en/user-guide/data-load-snowpipe-intro`,
      `${DOCS}/en/user-guide/streams-intro`,
    ],
  },
  "connectors-integrations": {
    difficulty: "easy",
    estimatedStudyMinutes: 25,
    content:
      "Connect programmatically with **drivers** (JDBC, ODBC, Python, Node.js, Go, .NET). **Connectors** integrate systems such as Kafka and Spark. **Storage integrations** reference external cloud storage without embedding credentials in SQL; **API** and **Git** integrations connect external services and repositories.",
    references: [`${DOCS}/en/user-guide/conns-drivers`],
  },
  "evaluate-performance": {
    difficulty: "hard",
    estimatedStudyMinutes: 45,
    content:
      "Use the **Query Profile** to diagnose slow queries — watch for bytes **spilled** to local/remote storage, poor **pruning**, **exploding joins**, and **queuing**. The **ACCOUNT_USAGE** query history and query attribution views help track trends. Spilling usually signals an undersized warehouse.",
    references: [`${DOCS}/en/user-guide/ui-query-profile`],
  },
  "optimize-performance": {
    difficulty: "medium",
    estimatedStudyMinutes: 40,
    content:
      "Speed-up options, chosen by workload:\n\n- **Query Acceleration Service** — offloads parts of scan-heavy queries.\n- **Search Optimization Service** — accelerates selective point lookups.\n- **Clustering keys** — improve pruning on large tables.\n- **Materialized views** — precompute and store results for fast reads.",
    references: [
      `${DOCS}/en/user-guide/search-optimization-service`,
      `${DOCS}/en/user-guide/views-materialized`,
    ],
  },
  "caching": {
    difficulty: "medium",
    estimatedStudyMinutes: 30,
    content:
      "Three cache layers reduce work:\n\n1. **Result cache** — returns identical query results for 24 hours (extendable), independent of any warehouse.\n2. **Metadata cache** — answers metadata-only queries instantly from cloud services.\n3. **Warehouse (local disk) cache** — holds recently accessed micro-partition data per warehouse.",
    references: [`${DOCS}/en/user-guide/querying-persisted-results`],
  },
  "transformation": {
    difficulty: "medium",
    estimatedStudyMinutes: 35,
    content:
      "Transform structured and **semi-structured** data (VARIANT with `FLATTEN`), plus unstructured data. **Aggregate functions** summarize across groups; **window functions** compute across ordered partitions without collapsing rows.",
    references: [
      `${DOCS}/en/user-guide/querying-semistructured`,
      `${DOCS}/en/sql-reference/functions-analytic`,
    ],
  },
  "collaboration-protection": {
    difficulty: "medium",
    estimatedStudyMinutes: 35,
    content:
      "Continuous data protection features:\n\n- **Zero-copy cloning** — instant, metadata-only copies of databases, schemas, and tables.\n- **Time Travel** — query/restore historical data within the retention period (up to 90 days on Enterprise).\n- **Fail-safe** — a non-configurable 7-day Snowflake-managed recovery window after Time Travel expires.\n- **Replication & failover** — business continuity across regions and clouds.",
    references: [
      `${DOCS}/en/user-guide/data-time-travel`,
      `${DOCS}/en/user-guide/object-clone`,
    ],
  },
  "data-sharing": {
    difficulty: "medium",
    estimatedStudyMinutes: 30,
    content:
      "**Secure Data Sharing** shares live, read-only data with **no copy** between provider and consumer accounts — consumers always see current data. **Reader accounts** let non-Snowflake consumers access shared data. **Direct shares**, resharing, and **data clean rooms** enable richer collaboration.",
    references: [`${DOCS}/en/user-guide/data-sharing-intro`],
  },
  "marketplace-listings": {
    difficulty: "easy",
    estimatedStudyMinutes: 20,
    content:
      "The **Snowflake Marketplace** publishes data and applications to consumers. **Listings** can be private (targeted) or public (broadly discoverable), and **Native Apps** distribute application logic alongside data. Marketplace listings are built on Secure Data Sharing.",
    references: [`${DOCS}/en/user-guide/data-marketplace`],
  },
};

export function enrichSubtopic(_topic, subtopic) {
  return ENRICHMENT[subtopic.id] || {};
}
