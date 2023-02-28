export class EditorToolbar extends HTMLElement {
  static element = 'editor-toolbar' as const

  constructor() {
    super()
  }

  connectedCallback() {
    this.addEventListener(
      'keydown',
      event => {
        switch (event.key) {
          case 'ArrowLeft':
            this.setFocusToPrevious()
            break
          case 'ArrowRight':
            this.setFocusToNext()
            break
          case 'ArrowUp':
          case 'Home':
            this.setFocusToFirst()
            break
          case 'ArrowDown':
          case 'End':
            this.setFocusToLast()
            break
          default:
            return
        }

        event.preventDefault()
      },
      true,
    )

    const buttons = this.buttons
    buttons.forEach(button => {
      button.setAttribute('tabindex', '-1')
      button.addEventListener('click', () => this.setFocusTo(button))
    })
    buttons[0].setAttribute('tabindex', '0')
  }

  private get current() {
    return this.querySelector<HTMLButtonElement>('button[type="button"][tabindex="0"]')
  }

  private get buttons() {
    return this.querySelectorAll<HTMLButtonElement>('button[type="button"]')
  }

  private setFocusTo(button: HTMLButtonElement) {
    this.buttons.forEach(button => button.setAttribute('tabindex', '-1'))
    button.setAttribute('tabindex', '0')
    button.focus()
  }

  private setFocusToFirstCandidate(items: ReadonlyArray<HTMLButtonElement>) {
    const first = items.find(button => !button.disabled)

    if (!first) {
      return
    }

    this.setFocusTo(first)
  }

  private setFocusToLastCandidate(items: ReadonlyArray<HTMLButtonElement>) {
    const last = items
      .slice()
      .reverse()
      .find(button => !button.disabled)

    if (!last) {
      return
    }

    this.setFocusTo(last)
  }

  private setFocusToFirst() {
    this.setFocusToFirstCandidate([...this.buttons])
  }

  private setFocusToLast() {
    this.setFocusToLastCandidate([...this.buttons])
  }

  private setFocusToNext() {
    const current = this.current

    if (!current) {
      return
    }

    const buttons = [...this.buttons]
    const index = buttons.indexOf(current)
    this.setFocusToFirstCandidate(buttons.slice(index + 1))
  }

  private setFocusToPrevious = () => {
    const current = this.current

    if (!current) {
      return
    }

    const buttons = [...this.buttons]
    const index = buttons.indexOf(current)
    this.setFocusToLastCandidate(buttons.slice(0, index))
  }
}

window.customElements.define(EditorToolbar.element, EditorToolbar)
