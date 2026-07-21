// @ts-check
// Keyword -> topic/subtopic mapping for aws-developer-associate (DVA-C02).

/** @type {{ re: RegExp, topicId: string, subtopicId: string, tag: string }[]} */
const RULES = [
  // Domain 4: Troubleshooting and Optimization
  { re: /x-?ray|trace|tracing|observability|structured logging|health check|readiness probe|annotation/i, topicId: "troubleshooting-optimization", subtopicId: "observability", tag: "observability" },
  { re: /concurrency|profile|bottleneck|optimi[sz]e|caching|elasticache|dax|cloudfront cache|request header|resource usage/i, topicId: "troubleshooting-optimization", subtopicId: "optimization", tag: "optimization" },
  { re: /debug|root cause|cloudwatch log|logs insights|custom metric|embedded metric|troubleshoot|metrics, logs/i, topicId: "troubleshooting-optimization", subtopicId: "root-cause", tag: "troubleshooting" },

  // Domain 3: Deployment
  { re: /codepipeline|codebuild|codedeploy|blue\/green|blue-green|canary|rolling deployment|rollback|ci\/cd|pipeline|packaging option|custom domain/i, topicId: "deployment", subtopicId: "cicd", tag: "cicd" },
  { re: /cloudformation|\bsam\b|infrastructure as code|\biac\b|test event|lambda alias|stack update|cdk/i, topicId: "deployment", subtopicId: "iac-testing", tag: "iac" },
  { re: /appconfig|artifact|integration test|mock api|deploy|staging|elastic beanstalk|amplify/i, topicId: "deployment", subtopicId: "artifacts", tag: "deployment" },

  // Domain 2: Security
  { re: /secret|secrets manager|parameter store|pii|phi|sensitive data|data classification|sanitiz|masking|multi-?tenant/i, topicId: "security", subtopicId: "sensitive-data", tag: "sensitive-data" },
  { re: /\bkms\b|encrypt|decrypt|key rotation|certificate|private ca|at rest|in transit|client-side encryption|server-side encryption/i, topicId: "security", subtopicId: "encryption", tag: "encryption" },
  { re: /cognito|\biam\b|\bsts\b|assume.*role|bearer token|federat|authenticat|authoriz|permission|principal|policy|credentials/i, topicId: "security", subtopicId: "authn-authz", tag: "security" },

  // Domain 1: Development with AWS Services
  { re: /dynamodb|partition key|\bgsi\b|\blsi\b|query.*scan|scan.*query|consistency|eventually consistent|strongly consistent|opensearch|elasticache|\brds\b|aurora|data store|caching service/i, topicId: "development", subtopicId: "data-stores", tag: "data-stores" },
  { re: /lambda|dead-?letter|\bdlq\b|destination|layer|cold start|provisioned concurrency|runtime|handler/i, topicId: "development", subtopicId: "lambda", tag: "lambda" },
  { re: /\bsqs\b|\bsns\b|eventbridge|step functions|api gateway|\bapi\b|sdk|event-?driven|microservice|fanout|messaging|stateless|stateful|circuit breaker|retry|kinesis|appsync/i, topicId: "development", subtopicId: "app-code", tag: "development" },
];

export function assign(q) {
  const text = q.question || "";
  for (const r of RULES) {
    if (r.re.test(text)) return { topicId: r.topicId, subtopicId: r.subtopicId };
  }
  return null;
}

export function fallback() {
  return { topicId: "development", subtopicId: "app-code" };
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
// Optional topic enrichment for author-topics.mjs. Only a couple of subtopics
// are enriched here to demonstrate a mix of enriched and bare subtopics in the
// UI; the rest render as before. Only optional Subtopic study fields are
// merged — ids, weights, names, descriptions, and keyPoints are untouched.
// ---------------------------------------------------------------------------

const DOCS = "https://docs.aws.amazon.com";

/** @type {Record<string, { content?: string, references?: string[], difficulty?: "easy"|"medium"|"hard", estimatedStudyMinutes?: number }>} */
const ENRICHMENT = {
  lambda: {
    difficulty: "medium",
    estimatedStudyMinutes: 45,
    content:
      "**AWS Lambda** runs code without managing servers.\n\n- Handle failures with a **dead-letter queue (DLQ)** or **destinations**.\n- Reduce **cold starts** with **provisioned concurrency**.\n- Share dependencies across functions with **layers**.\n- Tune memory (which also scales CPU) to balance cost and latency.",
    references: [
      `${DOCS}/lambda/latest/dg/welcome.html`,
      `${DOCS}/lambda/latest/dg/provisioned-concurrency.html`,
    ],
  },
  encryption: {
    difficulty: "hard",
    estimatedStudyMinutes: 40,
    content:
      "Protect data with **AWS KMS**:\n\n- Encrypt **at rest** (server-side) and **in transit** (TLS).\n- Use **customer managed keys** for control over rotation and policies.\n- **Envelope encryption** wraps data keys with a KMS key; enable automatic **key rotation** where possible.",
    references: [`${DOCS}/kms/latest/developerguide/overview.html`],
  },
};

export function enrichSubtopic(_topic, subtopic) {
  return ENRICHMENT[subtopic.id] || {};
}
