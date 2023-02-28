export class EditorToolbar extends HTMLElement {
  static element = 'editor-toolbar' as const

  constructor() {
    super()
  }

  connectedCallback() {
    const setFocusTo = (button: HTMLButtonElement) => {
      this.buttons.forEach(button => button.setAttribute('tabindex', '-1'))
      button.setAttribute('tabindex', '0')
      button.focus()
    }

    const setFocusToFirstCandidate = (items: ReadonlyArray<HTMLButtonElement>) => {
      const first = items.find(button => !button.disabled)

      if (!first) {
        return
      }

      setFocusTo(first)
    }

    const setFocusToLastCandidate = (items: ReadonlyArray<HTMLButtonElement>) => {
      const last = items
        .slice()
        .reverse()
        .find(button => !button.disabled)

      if (!last) {
        return
      }

      setFocusTo(last)
    }

    const setFocusToFirst = () => setFocusToFirstCandidate([...this.buttons])

    const setFocusToLast = () => setFocusToLastCandidate([...this.buttons])

    const setFocusToNext = () => {
      const current = this.current

      if (!current) {
        return
      }

      const buttons = [...this.buttons]
      const index = buttons.indexOf(current)
      setFocusToFirstCandidate(buttons.slice(index + 1))
    }

    const setFocusToPrevious = () => {
      const current = this.current

      if (!current) {
        return
      }

      const buttons = [...this.buttons]
      const index = buttons.indexOf(current)
      setFocusToLastCandidate(buttons.slice(0, index))
    }

    this.addEventListener(
      'keydown',
      event => {
        switch (event.key) {
          case 'ArrowLeft':
            setFocusToPrevious()
            break
          case 'ArrowRight':
            setFocusToNext()
            break
          case 'ArrowUp':
          case 'Home':
            setFocusToFirst()
            break
          case 'ArrowDown':
          case 'End':
            setFocusToLast()
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
      button.addEventListener('click', () => setFocusTo(button))
    })
    buttons[0].setAttribute('tabindex', '0')
  }

  private get current() {
    return this.querySelector<HTMLButtonElement>('button[type="button"][tabindex="0"]')
  }

  private get buttons() {
    return this.querySelectorAll<HTMLButtonElement>('button[type="button"]')
  }
}

window.customElements.define(EditorToolbar.element, EditorToolbar)
