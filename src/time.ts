import { Temporal } from '@js-temporal/polyfill'
import { Html, html } from './html'

import PlainDate = Temporal.PlainDate

export function renderDate(date: PlainDate): Html {
  return html`<time datetime="${date.toString()}">${date.toLocaleString('en', { dateStyle: 'long' })}</time>`
}
