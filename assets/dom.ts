import { DefaultLocale, isSupportedLocale, type SupportedLocale } from './locales/index.js'

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
  const href = link.getAttribute('href')

  if (href?.[0] !== '#') {
    return null
  }

  return document.getElementById(href.slice(1))
}

export function getLang(element: HTMLElement): string {
  return element.closest('[lang]')?.getAttribute('lang') ?? ''
}

export function getLocale(element: HTMLElement): SupportedLocale {
  const lang = getLang(element)

  return isSupportedLocale(lang) ? lang : DefaultLocale
}
