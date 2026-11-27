export class PollPartial extends HTMLElement {
  static element = 'poll-partial' as const

  private abortController?: AbortController
  private timeout?: ReturnType<typeof setTimeout>

  connectedCallback() {
    const interval = parseInterval(this.getAttribute('interval'))

    if (interval === undefined) {
      throw new TypeError('No valid interval')
    }

    if (!(this.firstElementChild instanceof HTMLElement)) {
      throw new TypeError('No partial')
    }

    this.setAttribute('aria-live', 'polite')
    hideWhenPolling(this)

    this.abortController = new AbortController()
    this.schedulePoll(interval, this.abortController.signal)
  }

  disconnectedCallback() {
    clearTimeout(this.timeout)
    this.abortController?.abort()
  }

  private schedulePoll(interval: number, signal: AbortSignal) {
    this.timeout = setTimeout(() => {
      void this.poll(signal)
    }, interval)
  }

  private async poll(signal: AbortSignal) {
    const url = new URL(document.location.href)
    url.searchParams.set('partial', '')

    try {
      const response = await fetch(url, { headers: { Accept: 'text/html' }, redirect: 'manual', signal })

      if (response.status !== 200) {
        return
      }

      const template = document.createElement('template')
      template.innerHTML = (await response.text()).trim()

      const root = template.content.firstElementChild

      if (root?.localName !== PollPartial.element) {
        this.swap(template.content)

        return
      }

      const interval = parseInterval(root.getAttribute('interval'))

      hideWhenPolling(root)
      this.swap(root)

      if (interval !== undefined) {
        this.schedulePoll(interval, signal)
      }
    } catch {
      // Stop polling on network errors or when aborted
    }
  }

  private swap(source: ParentNode) {
    const replacement = document.createElement('div')
    replacement.append(...source.childNodes)

    if (replacement.innerHTML === this.innerHTML) {
      return
    }

    this.replaceChildren(...replacement.childNodes)
  }
}

function parseInterval(value: string | null): number | undefined {
  const interval = Number(value ?? undefined)

  return Number.isInteger(interval) && interval > 0 ? interval : undefined
}

function hideWhenPolling(element: ParentNode) {
  element.querySelectorAll<HTMLElement>('[data-poll-partial-hide-when-polling="true"]').forEach(element => {
    element.hidden = true
  })
}

window.customElements.define(PollPartial.element, PollPartial)

declare global {
  interface HTMLElementTagNameMap {
    [PollPartial.element]: PollPartial
  }
}
