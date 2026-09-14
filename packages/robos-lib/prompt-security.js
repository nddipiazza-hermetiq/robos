'use strict';

/**
 * RobOS Prompt Security & Guardrails Engine
 *
 * Implements open-source security standards to ensure developers never intentionally
 * or accidentally transmit secrets, credentials, PII, or prompt injections to AI agents.
 *
 * Sourced & aligned with:
 *   - Gitleaks v8+ & TruffleHog OSS secret signature catalogs
 *   - Microsoft Presidio PII recognizers (SSN, credit card with Luhn check, emails, phones, IPs)
 *   - OWASP Top 10 for LLM Applications (LLM01: Prompt Injection & System Overrides)
 *   - Shannon Entropy analysis for high-entropy tokens
 *   - RobOS UNIX `pass` GPG URN credential boundary (`robos:hasCredential`)
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const HOME_DIR = process.env.HOME || os.homedir();
const CONFIG_DIR = path.join(HOME_DIR, '.config', 'robos');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');
const AUDIT_LOG_FILE = path.join(CONFIG_DIR, 'prompt-security-audit.json');

const PROMPT_SECURITY_MODES = ['redact', 'block', 'warn', 'audit-only', 'off'];

// ── Shannon Entropy Calculator ───────────────────────────────────────────────

/**
 * Calculate the Shannon entropy of a string (in bits per character).
 * Higher entropy indicates greater randomness (e.g. cryptographic hashes, tokens).
 *
 * @param {string} str
 * @returns {number}
 */
function calculateShannonEntropy(str) {
  if (!str || typeof str !== 'string') return 0;
  const len = str.length;
  if (len === 0) return 0;

  const freqs = {};
  for (let i = 0; i < len; i++) {
    const ch = str[i];
    freqs[ch] = (freqs[ch] || 0) + 1;
  }

  let entropy = 0;
  for (const ch in freqs) {
    const p = freqs[ch] / len;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(3));
}

// ── Luhn Algorithm for Credit Card Validation ─────────────────────────────────

/**
 * Validates a numerical string with the Luhn checksum algorithm.
 * Eliminates false positives from arbitrary 13-19 digit numbers.
 *
 * @param {string} numStr
 * @returns {boolean}
 */
function luhnCheck(numStr) {
  const digits = String(numStr).replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits.charAt(i), 10);
    if (alternate) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

// ── Well-Known Test / Dummy Allowlist ─────────────────────────────────────────

const DEFAULT_ALLOWLIST = new Set([
  'AKIAIOSFODNN7EXAMPLE',
  'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  'example.com',
  'test.com',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '000-00-0000',
  '111-11-1111',
]);

// ── OSS Rule Catalog ─────────────────────────────────────────────────────────

/**
 * Canonical OSS rule catalog inspired by Gitleaks, TruffleHog, Presidio & OWASP.
 */
const OSS_RULE_CATALOG = [
  // ── 1. Cloud & Git Provider Secrets (Gitleaks / TruffleHog) ──────────────────
  {
    id: 'aws-access-key',
    name: 'AWS Access Key ID',
    category: 'secret',
    severity: 'critical',
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    placeholder: '[REDACTED:AWS_ACCESS_KEY_ID]',
    description: 'AWS IAM access key ID credential',
    validate: (val) => val !== 'AKIAIOSFODNN7EXAMPLE',
  },
  {
    id: 'aws-secret-key',
    name: 'AWS Secret Access Key',
    category: 'secret',
    severity: 'critical',
    regex: /(?:aws_secret_access_key|aws_sec_key|secret_key)\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi,
    placeholder: '[REDACTED:AWS_SECRET_ACCESS_KEY]',
    description: 'AWS 40-character secret access key',
    captureIndex: 1,
    validate: (val) => val !== 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  },
  {
    id: 'github-pat',
    name: 'GitHub Personal Access Token',
    category: 'secret',
    severity: 'critical',
    regex: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}|gho_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36})\b/g,
    placeholder: '[REDACTED:GITHUB_TOKEN]',
    description: 'GitHub personal access token, OAuth or fine-grained PAT',
  },
  {
    id: 'gitlab-pat',
    name: 'GitLab Personal Access Token',
    category: 'secret',
    severity: 'critical',
    regex: /\b(glpat-[a-zA-Z0-9_-]{20,})\b/g,
    placeholder: '[REDACTED:GITLAB_TOKEN]',
    description: 'GitLab personal access or project token',
  },
  {
    id: 'slack-token',
    name: 'Slack Token',
    category: 'secret',
    severity: 'critical',
    regex: /\b(xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9_-]*)\b/g,
    placeholder: '[REDACTED:SLACK_TOKEN]',
    description: 'Slack bot, app, or user OAuth token',
  },
  {
    id: 'stripe-key',
    name: 'Stripe API Key',
    category: 'secret',
    severity: 'critical',
    regex: /\b([sr]k_(?:live|test)_[0-9a-zA-Z]{24,})\b/g,
    placeholder: '[REDACTED:STRIPE_KEY]',
    description: 'Stripe live or test secret key',
  },
  {
    id: 'anthropic-key',
    name: 'Anthropic API Key',
    category: 'secret',
    severity: 'critical',
    regex: /\b(sk-ant-[a-zA-Z0-9_-]{32,})\b/g,
    placeholder: '[REDACTED:ANTHROPIC_API_KEY]',
    description: 'Anthropic Claude API key',
  },
  {
    id: 'openai-key',
    name: 'OpenAI API Key',
    category: 'secret',
    severity: 'critical',
    regex: /\b(sk-(?!ant-)(?:proj-)?[a-zA-Z0-9_-]{20,})\b/g,
    placeholder: '[REDACTED:OPENAI_API_KEY]',
    description: 'OpenAI platform secret API key',
  },
  {
    id: 'google-key',
    name: 'Google Cloud / Gemini API Key',
    category: 'secret',
    severity: 'critical',
    regex: /\b(AIza[0-9A-Za-z_-]{35})\b/g,
    placeholder: '[REDACTED:GOOGLE_API_KEY]',
    description: 'Google AI or Cloud service account API key',
  },
  {
    id: 'private-key',
    name: 'Private Cryptographic Key',
    category: 'secret',
    severity: 'critical',
    regex: /-----BEGIN (?:RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY(?: BLOCK)?-----[\s\S]*?-----END (?:RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY(?: BLOCK)?-----/g,
    placeholder: '[REDACTED:PRIVATE_KEY_BLOCK]',
    description: 'Asymmetric private key block (RSA, OpenSSH, PGP, EC)',
  },
  {
    id: 'database-url',
    name: 'Database URL with Password',
    category: 'secret',
    severity: 'critical',
    regex: /\b((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp(?:s)?):\/\/[^:\s/]+:)([^@\s]+)(@[^\s]+)/gi,
    placeholder: '$1[REDACTED:DB_PASSWORD]$3',
    description: 'Database connection URI containing plaintext authentication credentials',
    isCustomReplacer: true,
    replace: (full, prefix, pass, suffix) => `${prefix}[REDACTED:DB_PASSWORD]${suffix}`,
    captureIndex: 2,
  },
  {
    id: 'basic-auth-url',
    name: 'Basic Auth URL Credentials',
    category: 'secret',
    severity: 'high',
    regex: /\b(https?:\/\/[^:\s/]+:)([^@\s]+)(@[^\s]+)/gi,
    placeholder: '$1[REDACTED:BASIC_AUTH_PASSWORD]$3',
    description: 'HTTP Basic authentication embedded in URL credentials',
    isCustomReplacer: true,
    replace: (full, prefix, pass, suffix) => `${prefix}[REDACTED:BASIC_AUTH_PASSWORD]${suffix}`,
    captureIndex: 2,
  },
  {
    id: 'jwt-token',
    name: 'JSON Web Token (JWT)',
    category: 'secret',
    severity: 'high',
    regex: /\b(eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_.-]{10,})\b/g,
    placeholder: '[REDACTED:JWT_TOKEN]',
    description: 'Encoded JSON Web Token bearer credential',
  },
  {
    id: 'generic-secret-assignment',
    name: 'Plaintext Password / Secret Assignment',
    category: 'secret',
    severity: 'high',
    regex: /\b((?:api_key|apikey|secret|password|passwd|auth_token|access_token|private_token)\s*[:=]\s*['"])([^'"\s]{10,})(['"])/gi,
    placeholder: '$1[REDACTED:SECRET]$3',
    description: 'Code assignment statement assigning high-entropy string to secret variable',
    isCustomReplacer: true,
    replace: (full, prefix, secret, suffix) => `${prefix}[REDACTED:SECRET]${suffix}`,
    captureIndex: 2,
  },

  // ── 2. Personally Identifiable Information (PII - Microsoft Presidio) ────────
  {
    id: 'us-ssn',
    name: 'US Social Security Number',
    category: 'pii',
    severity: 'high',
    regex: /\b(?!000|666|9\d{2})(\d{3})-(?!00)(\d{2})-(?!0000)(\d{4})\b/g,
    placeholder: '[REDACTED:SSN]',
    description: 'US Social Security Number (9 digits formatted with hyphens)',
    validate: (val) => val !== '000-00-0000' && val !== '111-11-1111',
  },
  {
    id: 'credit-card',
    name: 'Payment Card Number',
    category: 'pii',
    severity: 'critical',
    regex: /\b((?:\d{4}[- ]?){3}\d{4}|\d{4}[- ]?\d{6}[- ]?\d{5})\b/g,
    placeholder: '[REDACTED:CREDIT_CARD]',
    description: 'Visa, Mastercard, Amex, or Discover card number verified via Luhn checksum',
    validate: (val) => luhnCheck(val),
  },
  {
    id: 'email-address',
    name: 'Personal Email Address',
    category: 'pii',
    severity: 'medium',
    regex: /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
    placeholder: '[REDACTED:EMAIL]',
    description: 'Personal or corporate email address',
    validate: (val, charIndex, fullText) => {
      const lower = val.toLowerCase();
      if (lower.endsWith('@example.com') || lower.endsWith('@test.com') || lower.endsWith('@localhost')) return false;
      if (fullText && typeof charIndex === 'number') {
        const before = fullText.slice(Math.max(0, charIndex - 40), charIndex);
        if (/https?:\/\/[^\s/]*:[^\s/]*$/.test(before) || /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp(?:s)?):\/\/[^\s/]*:[^\s/]*$/.test(before)) {
          return false;
        }
      }
      return true;
    },
  },
  {
    id: 'phone-number',
    name: 'Telephone Number',
    category: 'pii',
    severity: 'medium',
    regex: /(?:\+?1[-.\s]?)?\(?([2-9]\d{2})\)?[-.\s]?([2-9]\d{2})[-.\s]?(\d{4})\b/g,
    placeholder: '[REDACTED:PHONE_NUMBER]',
    description: 'Standard North American or international telephone number',
  },
  {
    id: 'private-ip',
    name: 'Internal Private IP Address',
    category: 'pii',
    severity: 'low',
    regex: /\b((?:10\.\d{1,3}\.\d{1,3}\.\d{1,3})|(?:172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})|(?:192\.168\.\d{1,3}\.\d{1,3}))\b/g,
    placeholder: '[REDACTED:INTERNAL_IP]',
    description: 'RFC 1918 internal network IP address',
  },

  // ── 3. Prompt Injection & System Overrides (OWASP LLM01) ─────────────────────
  {
    id: 'prompt-injection-override',
    name: 'System Prompt Override Directive',
    category: 'prompt_injection',
    severity: 'critical',
    regex: /\b(?:ignore|disregard|forget|override)\s+(?:all\s+)?(?:previous|prior|above|system)\s+(?:instructions|prompts|rules|directives)\b/gi,
    placeholder: '[REDACTED:PROMPT_INJECTION_OVERRIDE]',
    description: 'Heuristic pattern attempting to wipe or override prior system governance prompts',
  },
  {
    id: 'prompt-injection-jailbreak',
    name: 'Jailbreak / Uncensored Mode Attempt',
    category: 'prompt_injection',
    severity: 'critical',
    regex: /\b(?:you are now in (?:developer|dan|jailbreak|unfiltered|god) mode|bypass (?:all\s+)?(?:safety|content|security) filters?|act as an unfiltered ai)\b/gi,
    placeholder: '[REDACTED:JAILBREAK_ATTEMPT]',
    description: 'Attempt to force AI model into unfiltered or jailbroken behavior mode',
  },
  {
    id: 'data-exfiltration-command',
    name: 'Dangerous Local Credential Exfiltration',
    category: 'exfiltration',
    severity: 'critical',
    regex: /\b(?:curl|wget|nc|netcat)\s+.*(?:~?\/\.ssh|\/etc\/(?:shadow|passwd)|~?\/\.password-store|~?\/\.aws|~?\/\.gnupg)\b/gi,
    placeholder: '[REDACTED:DANGEROUS_EXFILTRATION_COMMAND]',
    description: 'Shell command attempting to stream sensitive host files or credentials to external network',
  },
  {
    id: 'password-store-dump',
    name: 'Direct Password Store Extraction',
    category: 'exfiltration',
    severity: 'critical',
    regex: /\b(?:cat|head|tail|less|more|strings)\s+~?\/\.password-store\b/gi,
    placeholder: '[REDACTED:PASSWORD_STORE_ACCESS]',
    description: 'Unauthorized direct dump command on RobOS UNIX pass repository',
  },
];

// ── PromptSecurityGuard Class ────────────────────────────────────────────────

class PromptSecurityGuard {
  constructor(options = {}) {
    this.options = options;
    this._config = this._loadSettings();
  }

  /**
   * Load settings from ~/.config/robos/settings.json or fallback.
   */
  _loadSettings() {
    let settings = {};
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      }
    } catch {
      settings = {};
    }

    const mode = this.options.mode || settings.prompt_security_mode || 'redact';
    const scanSecrets = settings.prompt_security_scan_secrets !== undefined ? Boolean(settings.prompt_security_scan_secrets) : true;
    const scanPII = settings.prompt_security_scan_pii !== undefined ? Boolean(settings.prompt_security_scan_pii) : true;
    const scanInjection = settings.prompt_security_scan_injection !== undefined ? Boolean(settings.prompt_security_scan_injection) : true;
    const entropyCheck = settings.prompt_security_entropy_check !== undefined ? Boolean(settings.prompt_security_entropy_check) : true;
    const entropyThreshold = parseFloat(settings.prompt_security_entropy_threshold || '4.5') || 4.5;

    let allowlist = new Set(DEFAULT_ALLOWLIST);
    if (settings.prompt_security_allowlist) {
      const items = String(settings.prompt_security_allowlist).split(',').map(s => s.trim()).filter(Boolean);
      items.forEach(i => allowlist.add(i));
    }
    if (this.options.allowlist && Array.isArray(this.options.allowlist)) {
      this.options.allowlist.forEach(i => allowlist.add(i));
    }

    let blocklist = [];
    if (settings.prompt_security_blocklist) {
      blocklist = String(settings.prompt_security_blocklist).split(',').map(s => s.trim()).filter(Boolean);
    }
    if (this.options.blocklist && Array.isArray(this.options.blocklist)) {
      blocklist = blocklist.concat(this.options.blocklist);
    }

    return {
      mode,
      scanSecrets,
      scanPII,
      scanInjection,
      entropyCheck,
      entropyThreshold,
      allowlist,
      blocklist,
    };
  }

  /**
   * Scan prompt text for sensitive findings and prompt injection markers.
   *
   * @param {string} text — input prompt
   * @param {object} [scanOpts] — runtime scan options
   * @returns {{
   *   allowed: boolean,
   *   mode: string,
   *   riskLevel: 'none'|'low'|'medium'|'high'|'critical',
   *   findings: Array<object>,
   *   redactedText: string,
   *   cleanText: string,
   *   summary: string
   * }}
   */
  scan(text, scanOpts = {}) {
    if (!text || typeof text !== 'string') {
      return {
        allowed: true,
        mode: this._config.mode,
        riskLevel: 'none',
        findings: [],
        redactedText: '',
        cleanText: '',
        summary: 'Empty text passed to prompt security scanner.',
      };
    }

    const cfg = { ...this._config, ...scanOpts };
    if (cfg.mode === 'off') {
      return {
        allowed: true,
        mode: 'off',
        riskLevel: 'none',
        findings: [],
        redactedText: text,
        cleanText: text,
        summary: 'Prompt security checks are disabled (mode=off).',
      };
    }

    const findings = [];
    let workingText = text;

    // 1. Scan OSS Rule Catalog
    for (const rule of OSS_RULE_CATALOG) {
      if (rule.category === 'secret' && !cfg.scanSecrets) continue;
      if (rule.category === 'pii' && !cfg.scanPII) continue;
      if ((rule.category === 'prompt_injection' || rule.category === 'exfiltration') && !cfg.scanInjection) continue;

      const regex = new RegExp(rule.regex);
      let match;

      while ((match = regex.exec(text)) !== null) {
        const fullMatch = match[0];
        const targetVal = rule.captureIndex ? match[rule.captureIndex] : fullMatch;

        if (cfg.allowlist && cfg.allowlist.has(targetVal)) continue;

        const charIndex = rule.captureIndex ? (match.index + fullMatch.indexOf(targetVal)) : match.index;
        if (rule.validate && !rule.validate(targetVal, charIndex, text)) continue;

        // Determine line number
        const line = text.slice(0, charIndex).split('\n').length;

        findings.push({
          ruleId: rule.id,
          name: rule.name,
          category: rule.category,
          severity: rule.severity,
          matchedText: targetVal,
          line,
          index: charIndex,
          length: targetVal.length,
          spanIndex: match.index,
          spanLength: fullMatch.length,
          placeholder: rule.placeholder,
          description: rule.description,
        });
      }
    }

    // 2. Custom Blocklist Keywords
    if (cfg.blocklist && cfg.blocklist.length > 0) {
      for (const forbidden of cfg.blocklist) {
        if (!forbidden) continue;
        const idx = text.toLowerCase().indexOf(forbidden.toLowerCase());
        if (idx !== -1) {
          const line = text.slice(0, idx).split('\n').length;
          findings.push({
            ruleId: 'custom-blocklist',
            name: `Forbidden Term: "${forbidden}"`,
            category: 'blocklist',
            severity: 'high',
            matchedText: forbidden,
            line,
            index: idx,
            length: forbidden.length,
            placeholder: '[REDACTED:FORBIDDEN_TERM]',
            description: `User-defined forbidden term found in prompt`,
          });
        }
      }
    }

    // 3. Shannon Entropy Check on Unclassified Long Tokens
    if (cfg.entropyCheck) {
      // Find candidate string tokens (e.g. alphanumeric strings between quotes, colons, or spaces >= 24 chars)
      const tokenRegex = /(?:['":\s]|^)([A-Za-z0-9+/_-]{24,})(?:['":\s]|$)/g;
      let tokMatch;
      while ((tokMatch = tokenRegex.exec(text)) !== null) {
        let candidate = tokMatch[1];
        if (candidate.startsWith('=')) candidate = candidate.slice(1);
        if (candidate.length < 24) continue;
        if (cfg.allowlist && cfg.allowlist.has(candidate)) continue;

        const candIndex = tokMatch.index + tokMatch[0].indexOf(candidate);
        const candEnd = candIndex + candidate.length;

        // Skip if this token overlaps ANY already captured finding
        const overlaps = findings.some(f => {
          const fStart = f.index;
          const fEnd = f.index + f.length;
          return Math.max(candIndex, fStart) < Math.min(candEnd, fEnd);
        });
        if (overlaps) continue;

        const entropy = calculateShannonEntropy(candidate);
        if (entropy >= cfg.entropyThreshold) {
          const line = text.slice(0, candIndex).split('\n').length;
          findings.push({
            ruleId: 'high-entropy-secret',
            name: `High-Entropy Token (${entropy} bits/char)`,
            category: 'secret',
            severity: 'high',
            matchedText: candidate,
            line,
            index: candIndex,
            length: candidate.length,
            placeholder: '[REDACTED:HIGH_ENTROPY_TOKEN]',
            description: `Potential unclassified secret or API key with Shannon entropy ${entropy} >= ${cfg.entropyThreshold}`,
            entropy,
          });
        }
      }
    }

    // 4. Resolve overlapping findings by severity precedence (critical > high > medium > low)
    const nonOverlappingFindings = [];
    const sevWeights = { critical: 4, high: 3, medium: 2, low: 1 };
    const sortedBySev = [...findings].sort((a, b) => (sevWeights[b.severity] || 0) - (sevWeights[a.severity] || 0));
    for (const f of sortedBySev) {
      const fStart = f.spanIndex !== undefined ? f.spanIndex : f.index;
      const fEnd = fStart + (f.spanLength !== undefined ? f.spanLength : f.length);
      const hasConflict = nonOverlappingFindings.some(existing => {
        const eStart = existing.spanIndex !== undefined ? existing.spanIndex : existing.index;
        const eEnd = eStart + (existing.spanLength !== undefined ? existing.spanLength : existing.length);
        return Math.max(fStart, eStart) < Math.min(fEnd, eEnd);
      });
      if (!hasConflict) {
        nonOverlappingFindings.push(f);
      }
    }
    findings.length = 0;
    findings.push(...nonOverlappingFindings.sort((a, b) => a.index - b.index));

    // 5. Calculate Overall Risk Level
    let riskLevel = 'none';
    if (findings.some(f => f.severity === 'critical')) {
      riskLevel = 'critical';
    } else if (findings.some(f => f.severity === 'high')) {
      riskLevel = 'high';
    } else if (findings.some(f => f.severity === 'medium')) {
      riskLevel = 'medium';
    } else if (findings.length > 0) {
      riskLevel = 'low';
    }

    // 5. Build Redacted Output
    let redactedText = text;
    // Apply custom rule replacers first
    for (const rule of OSS_RULE_CATALOG) {
      if (rule.isCustomReplacer && rule.replace) {
        const r = new RegExp(rule.regex);
        redactedText = redactedText.replace(r, rule.replace);
      }
    }

    // Apply standard replacements from findings (sorted in reverse index order to preserve offsets)
    const sortedFindings = [...findings].sort((a, b) => b.index - a.index);
    for (const f of sortedFindings) {
      if (f.placeholder && !f.placeholder.startsWith('$')) {
        // Safe string replacement
        redactedText = redactedText.split(f.matchedText).join(f.placeholder);
      }
    }

    // 6. Policy Action Decision
    let allowed = true;
    let summary = 'Prompt passed all security checks.';

    if (findings.length > 0) {
      const distinctTypes = [...new Set(findings.map(f => f.name))];
      summary = `Detected ${findings.length} sensitive item(s): ${distinctTypes.join(', ')}.`;

      if (cfg.mode === 'block') {
        allowed = false;
        summary = `Prompt blocked by security policy: detected ${distinctTypes.join(', ')}.`;
      } else if (cfg.mode === 'redact') {
        allowed = true;
        summary = `Prompt sanitized via redaction: masked ${distinctTypes.join(', ')}.`;
      } else if (cfg.mode === 'warn') {
        allowed = true;
        summary = `Prompt contains sensitive data warnings: ${distinctTypes.join(', ')}.`;
      }

      // Record in audit log if findings exist
      this.logAudit({
        timestamp: new Date().toISOString(),
        mode: cfg.mode,
        allowed,
        riskLevel,
        findingsCount: findings.length,
        findingTypes: distinctTypes,
        summary,
      });
    }

    return {
      allowed,
      mode: cfg.mode,
      riskLevel,
      findings,
      redactedText,
      cleanText: redactedText,
      summary,
    };
  }

  /**
   * Convenience method to quickly redact sensitive data from a prompt.
   *
   * @param {string} text
   * @param {object} [options]
   * @returns {string}
   */
  redact(text, options = {}) {
    const result = this.scan(text, { ...options, mode: 'redact' });
    return result.redactedText;
  }

  /**
   * Append an audit event to ~/.config/robos/prompt-security-audit.json
   */
  logAudit(record) {
    try {
      let logData = [];
      if (fs.existsSync(AUDIT_LOG_FILE)) {
        try { logData = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf8')); } catch { logData = []; }
      } else {
        const dir = path.dirname(AUDIT_LOG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      }

      logData.push(record);
      // Keep last 200 audit entries
      if (logData.length > 200) logData = logData.slice(-200);

      fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logData, null, 2), 'utf8');
    } catch {
      // Non-blocking audit logger
    }
  }

  /**
   * Returns a copy of the active configuration.
   */
  getConfig() {
    return { ...this._config };
  }
}

// ── Singleton and Function Helpers ───────────────────────────────────────────

const defaultGuard = new PromptSecurityGuard();

function scanPrompt(text, options) {
  return defaultGuard.scan(text, options);
}

function redactPrompt(text, options) {
  return defaultGuard.redact(text, options);
}

module.exports = {
  PromptSecurityGuard,
  scanPrompt,
  redactPrompt,
  calculateShannonEntropy,
  luhnCheck,
  OSS_RULE_CATALOG,
  PROMPT_SECURITY_MODES,
  DEFAULT_ALLOWLIST,
};
