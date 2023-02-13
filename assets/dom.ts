export function preventDefault(event: Event) {
  event.preventDefault()
}

export function disableButton(button: HTMLButtonElement): void {
  button.setAttribute('aria-disabled', 'true')
  button.addEventListener('click', preventDefault)
}

export function enableButton(button: HTMLButtonElement): void {
  button.setAttribute('aria-disabled', 'false')
  button.removeEventListener('click', preventDefault)
}
