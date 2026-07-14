// @ts-check
// Keyword -> topic/subtopic mapping for aws-data-engineer-associate (DEA-C01).

/** @type {{ re: RegExp, topicId: string, subtopicId: string, tag: string }[]} */
const RULES = [
  // Domain 4: Data Security and Governance
  { re: /cloudtrail|audit|\bconfig\b|macie|\bpii\b|data privacy|sovereignty|governance|data sharing|access history/i, topicId: "security-governance", subtopicId: "audit-privacy", tag: "governance" },
  { re: /\bkms\b|encrypt|decrypt|masking|anonymiz|in transit|at rest/i, topicId: "security-governance", subtopicId: "encryption-masking", tag: "encryption" },
  { re: /lake formation|custom.*policy|least privilege|authoriz|tag-based|attribute-based|role-based|grant.*access|database user/i, topicId: "security-governance", subtopicId: "authorization", tag: "authorization" },
  { re: /security group|\biam\b|secrets manager|credential|rotate|authenticat|access point|privatelink|\brole\b/i, topicId: "security-governance", subtopicId: "authentication", tag: "authentication" },

  // Domain 3: Data Operations and Support
  { re: /data quality|empty field|data consistency|sampling|data skew|databrew.*quality/i, topicId: "operations-support", subtopicId: "data-quality", tag: "data-quality" },
  { re: /cloudwatch|monitor|logging|troubleshoot.*pipeline|logs insights|performance issue|traceability/i, topicId: "operations-support", subtopicId: "monitor-pipelines", tag: "monitoring" },
  { re: /athena|quicksight|visualiz|\bsql\b|create view|apache spark|aggregation|rolling average|pivot|jupyter|clean data/i, topicId: "operations-support", subtopicId: "analyze", tag: "analytics" },
  { re: /automate.*processing|mwaa|step functions|\bglue\b.*process|orchestrat.*airflow|prepare data|scheduler/i, topicId: "operations-support", subtopicId: "automate-processing", tag: "processing" },

  // Domain 2: Data Store Management
  { re: /schema|data model|lineage|partition strateg|compression|indexing|vectoriz|schema conversion|\bdms\b/i, topicId: "data-store-management", subtopicId: "data-modeling", tag: "data-modeling" },
  { re: /lifecycle|s3 lifecycle|storage tier|versioning|\bttl\b|expire data|glacier|unload/i, topicId: "data-store-management", subtopicId: "lifecycle", tag: "lifecycle" },
  { re: /catalog|glue crawler|hive metastore|discover schema|synchronize partition/i, topicId: "data-store-management", subtopicId: "cataloging", tag: "cataloging" },
  { re: /data store|redshift|dynamodb|memorydb|iceberg|open table|vector index|hnsw|\bivf\b|federated quer|spectrum|neptune|documentdb|keyspaces/i, topicId: "data-store-management", subtopicId: "choose-store", tag: "data-store" },

  // Domain 1: Data Ingestion and Transformation
  { re: /\biac\b|infrastructure as code|cloudformation|\bcdk\b|\bsam\b|version control|distributed computing|optimize code|concurrency/i, topicId: "ingestion-transformation", subtopicId: "programming", tag: "programming" },
  { re: /orchestrat|mwaa|step functions|serverless workflow|fault toleran|\bsns\b|\bsqs\b|workflow/i, topicId: "ingestion-transformation", subtopicId: "orchestration", tag: "orchestration" },
  { re: /transform|parquet|\bemr\b|\bglue\b|\bjdbc\b|\bodbc\b|integrate data|container.*performance|volume.*velocity|\bllm\b/i, topicId: "ingestion-transformation", subtopicId: "transformation", tag: "transformation" },
  { re: /ingest|kinesis|\bmsk\b|kafka|streaming source|batch source|appflow|throttl|rate limit|event trigger|fan-in|fan-out|replayab/i, topicId: "ingestion-transformation", subtopicId: "ingestion", tag: "ingestion" },
];

export function assign(q) {
  const text = q.question || "";
  for (const r of RULES) {
    if (r.re.test(text)) return { topicId: r.topicId, subtopicId: r.subtopicId };
  }
  return null;
}

export function fallback() {
  return { topicId: "ingestion-transformation", subtopicId: "ingestion" };
}

export function tagsFor(q) {
  const text = q.question || "";
  const tags = [];
  for (const r of RULES) {
    if (r.re.test(text) && !tags.includes(r.tag)) tags.push(r.tag);
  }
  return tags.slice(0, 4);
}
