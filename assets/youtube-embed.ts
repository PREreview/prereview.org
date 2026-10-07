/* eslint-disable no-comments/disallowComments */
/**
 * @license
 * Adapted from lite-youtube-embed (https://github.com/paulirish/lite-youtube-embed)
 * Copyright 2019 Paul Irish
 * Licensed under the Apache License, Version 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
 *
 * Modified by PREreview: rewritten as a progressive enhancement of a server-rendered link, only embedding when the
 * browser supports credentialless iframes, without the YouTube Player API, noscript iframe or poster image handling.
 */

export class YouTubeEmbed extends HTMLElement {
  static element = 'youtube-embed' as const

  connectedCallback() {
    const videoId = this.dataset['videoId']
    const title = this.dataset['title'] ?? ''
    const link = this.querySelector('a')

    // Our Cross-Origin-Embedder-Policy blocks the iframe unless the browser supports credentialless iframes.
    if (typeof videoId !== 'string' || !(link instanceof HTMLAnchorElement) || !supportsCredentiallessIframes()) {
      return
    }

    link.removeAttribute('href')
    link.setAttribute('role', 'button')
    link.classList.add('unstyled-button')
    link.setAttribute('tabindex', '0')
    link.setAttribute('aria-label', `Watch video: ${title}`)

    const label = link.querySelector('span')

    if (label instanceof HTMLSpanElement) {
      label.lang = 'en'
      label.dir = 'ltr'
      label.textContent = 'Watch Video'
    }

    link.addEventListener('click', () => {
      this.activate(link, videoId, title)
    })

    link.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return
      }

      event.preventDefault()
      this.activate(link, videoId, title)
    })

    link.addEventListener('pointerover', warmConnections, { once: true })
    link.addEventListener('focus', warmConnections, { once: true })
  }

  private activate(link: HTMLAnchorElement, videoId: string, title: string) {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('credentialless', '')
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1`
    iframe.title = title
    iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
    iframe.allowFullscreen = true
    // YouTube refuses to play without a referrer.
    iframe.referrerPolicy = 'strict-origin-when-cross-origin'
    iframe.width = '480'
    iframe.height = '270'

    const describedBy = link.getAttribute('aria-describedby')

    if (typeof describedBy === 'string') {
      iframe.setAttribute('aria-describedby', describedBy)
    }

    link.replaceWith(iframe)
    iframe.focus()
  }
}

window.customElements.define(YouTubeEmbed.element, YouTubeEmbed)

declare global {
  interface HTMLElementTagNameMap {
    [YouTubeEmbed.element]: YouTubeEmbed
  }
}

function supportsCredentiallessIframes() {
  return 'credentialless' in HTMLIFrameElement.prototype
}

function warmConnections() {
  if (document.head.querySelector('link[rel="preconnect"][href="https://www.youtube-nocookie.com"]')) {
    return
  }

  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = 'https://www.youtube-nocookie.com'
  document.head.append(link)
}
