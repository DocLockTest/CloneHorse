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

    if (!this.categoryFocus.includes(category)) {
      return {
        backend: this.mode,
        reason: `Category ${category} is outside current focus set; defaulting to configured backend.`,
      }
    }

    if (kind === 'deep-rerun') {
      return {
        backend: this.mode === 'local' ? 'api_key' : this.mode,
        reason: 'Deep reruns for focused policy/legal markets prefer strongest reasoning backend.',
      }
    }

    if (kind === 'fast-rerun') {
      return {
        backend: this.mode === 'api_key' ? 'api_key' : this.mode,
        reason: 'Fast reruns stay on the low-latency configured backend for our focused market categories.',
      }
    }

    if (kind === 'rule-parse') {
      return {
        backend: this.mode,
        reason: 'Settlement wording and procedural parsing remain on the primary focused backend.',
      }
    }

    if (urgency === 'high') {
      return {
        backend: this.mode,
        reason: 'High-urgency market work stays on the default backend to avoid routing overhead.',
      }
    }

    return {
      backend: this.mode,
      reason: 'Default backend selected for focused category work.',
    }
  }
}
