const flourishOrigin = 'https://flo.uri.sh'

export class FlourishEmbed extends HTMLElement {
  static element = 'flourish-embed' as const

  private iframe: HTMLIFrameElement | undefined

  connectedCallback() {
    const visualizationId = this.dataset['visualizationId']
    const title = this.dataset['title'] ?? ''
    const link = this.querySelector('a')

    if (
      typeof visualizationId !== 'string' ||
      !(link instanceof HTMLAnchorElement) ||
      !supportsCredentiallessIframes()
    ) {
      return
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('credentialless', '')
    iframe.setAttribute(
      'sandbox',
      'allow-same-origin allow-forms allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation',
    )
    iframe.src = `${flourishOrigin}/visualisation/${encodeURIComponent(visualizationId)}/embed?auto=1`
    iframe.title = title
    iframe.loading = 'lazy'
    iframe.style.blockSize = `${initialHeight(this.offsetWidth)}px`

    const describedBy = link.getAttribute('aria-describedby')

    if (typeof describedBy === 'string') {
      iframe.setAttribute('aria-describedby', describedBy)
    }

    this.iframe = iframe
    window.addEventListener('message', this.onMessage)

    link.replaceWith(iframe)
  }

  disconnectedCallback() {
    window.removeEventListener('message', this.onMessage)
  }

  private onMessage = (event: MessageEvent) => {
    if (this.iframe === undefined || event.origin !== flourishOrigin || event.source !== this.iframe.contentWindow) {
      return
    }

    const height = resizeHeight(event.data)

    if (height === undefined) {
      return
    }

    this.iframe.style.blockSize = height
  }
}

window.customElements.define(FlourishEmbed.element, FlourishEmbed)

declare global {
  interface HTMLElementTagNameMap {
    [FlourishEmbed.element]: FlourishEmbed
  }
}

function supportsCredentiallessIframes() {
  return 'credentialless' in HTMLIFrameElement.prototype
}

function initialHeight(width: number) {
  if (width > 999) {
    return 650
  }

  if (width > 599) {
    return 575
  }

  return 400
}

function resizeHeight(data: unknown): string | undefined {
  const message = parseMessage(data)

  if (typeof message !== 'object' || message === null) {
    return undefined
  }

  if (
    !('sender' in message) ||
    message.sender !== 'Flourish' ||
    !('method' in message) ||
    message.method !== 'resize'
  ) {
    return undefined
  }

  if (!('height' in message)) {
    return undefined
  }

  if (typeof message.height === 'number' && Number.isFinite(message.height) && message.height >= 0) {
    return `${message.height}px`
  }

  if (typeof message.height === 'string' && /^\d+(?:\.\d+)?px$/.test(message.height)) {
    return message.height
  }

  return undefined
}

function parseMessage(data: unknown): unknown {
  if (typeof data !== 'string') {
    return data
  }

  try {
    return JSON.parse(data)
  } catch {
    return undefined
  }
}
