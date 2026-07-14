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
