export class ModelBackendSelector {
  constructor(options = {}) {
    this.mode = options.mode ?? process.env.MODELING_BACKEND ?? 'openclaw'
    this.categoryFocus = options.categoryFocus ?? [
      'court-ruling',
      'agency-approval',
      'implementation-delay',
      'legislative-milestone',
    ]
  }

  getConfig() {
    return {
      mode: this.mode,
      categoryFocus: this.categoryFocus,
      backends: {
        openclaw: {
          label: 'OpenClaw provider routing',
          strengths: ['deep reruns', 'policy/legal reasoning', 'operator integration'],
        },
        api_key: {
          label: 'OpenAI-compatible API backend',
          strengths: ['portable remote inference', 'predictable deployment'],
        },
        local: {
          label: 'Local model backend',
          strengths: ['privacy', 'local-first scanning', 'resilience'],
        },
      },
    }
  }

  select(task = {}) {
    const kind = task.kind ?? 'analysis'
    const category = task.category ?? 'court-ruling'
    const urgency = task.urgency ?? 'normal'
    const focused = this.categoryFocus.includes(category)

    if (!focused) {
      return {
        backend: 'local',
        reason: `Category ${category} is outside focus set; routing to local backend to conserve API budget.`,
      }
    }

    if (kind === 'deep-rerun') {
      return {
        backend: 'openclaw',
        reason: 'Deep reruns for focused policy/legal markets require strongest reasoning backend.',
      }
    }

    if (kind === 'fast-rerun') {
      if (urgency === 'high') {
        return {
          backend: 'openclaw',
          reason: 'High-urgency fast reruns routed to OpenClaw for quality + speed.',
        }
      }
      return {
        backend: this.mode === 'local' ? 'local' : 'api_key',
        reason: 'Fast reruns use low-latency backend for focused market categories.',
      }
    }

    if (kind === 'rule-parse') {
      return {
        backend: 'openclaw',
        reason: 'Settlement wording and procedural parsing require deep legal reasoning.',
      }
    }

    if (urgency === 'high') {
      return {
        backend: 'openclaw',
        reason: 'High-urgency work routed to OpenClaw to minimize error risk.',
      }
    }

    return {
      backend: this.mode,
      reason: 'Default backend selected for focused category work.',
    }
  }
}
