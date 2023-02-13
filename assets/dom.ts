export function preventDefault(event: Event) {
  event.preventDefault()
}

export function forceFocus(element: HTMLElement): void {
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1')
    element.addEventListener('blur', () => element.removeAttribute('tabindex'), { once: true })
  }

  element.focus()
}

export function disableButton(button: HTMLButtonElement): void {
  button.setAttribute('aria-disabled', 'true')
  button.addEventListener('click', preventDefault)
}

export function enableButton(button: HTMLButtonElement): void {
  button.setAttribute('aria-disabled', 'false')
  button.removeEventListener('click', preventDefault)
}

export function getTargetElement(link: HTMLAnchorElement): HTMLElement | null {
  const fragment = link.href.split('#').pop()

  if (!fragment) {
    return null
  }

  return document.getElementById(fragment)
}
