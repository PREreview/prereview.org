import { Html, html } from './html'

export function renderDate(date: Date): Html {
  return html`<time datetime="${toISODateString(date)}">${date.toLocaleDateString('en', { dateStyle: 'long' })}</time>`
}

function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0]
}
