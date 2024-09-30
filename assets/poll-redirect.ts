export class PollRedirect extends HTMLElement {
  static element = 'poll-redirect' as const

  async connectedCallback() {
    const initial = this.firstElementChild
    const processing = initial?.nextElementSibling
    const completed = processing?.nextElementSibling

    if (!(initial instanceof HTMLDivElement)) {
      throw new Error('No visible text')
    }

    if (!(processing instanceof HTMLDivElement)) {
      throw new Error('No processing text')
    }

    if (!(completed instanceof HTMLDivElement)) {
      throw new Error('No completed text')
    }

    this.setAttribute('aria-live', 'polite')
    initial.hidden = true
    processing.hidden = false
    completed.hidden = true

    await poll(
      () => fetch(document.location.href, { method: 'HEAD', redirect: 'manual' }),
      response => response.status !== 200,
      1_000,
    )
      .then(() => {
        initial.hidden = true
        processing.hidden = true
        completed.hidden = false
      })
      .catch(() => {
        initial.hidden = false
        processing.hidden = true
        completed.hidden = true
      })
  }
}

window.customElements.define(PollRedirect.element, PollRedirect)

declare global {
  interface HTMLElementTagNameMap {
    [PollRedirect.element]: PollRedirect
  }
}

function poll<T>(callApiFn: () => Promise<T>, test: (value: T) => boolean, time: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const executePoll = () => {
      callApiFn()
        .then(value => {
          if (test(value)) {
            return resolve(value)
          }

          setTimeout(executePoll, time)
        })
        .catch((error: unknown) => reject(error instanceof Error ? error : new Error(String(error))))
    }

    setTimeout(executePoll, time)
  })
}
