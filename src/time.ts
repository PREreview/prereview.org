import { Temporal } from '@js-temporal/polyfill'
import { P, match } from 'ts-pattern'
import { Html, html } from './html'

import PlainDate = Temporal.PlainDate

export type PartialDate = PlainDate | number

export function renderDate(date: PartialDate): Html {
  return match(date)
    .with(
      P.number,
      year =>
        html`<time datetime="${year}">${new PlainDate(year, 1, 1).toLocaleString('en', { year: 'numeric' })}</time>`,
    )
    .with(
      P.instanceOf(PlainDate),
      date => html`<time datetime="${date.toString()}">${date.toLocaleString('en', { dateStyle: 'long' })}</time>`,
    )
    .exhaustive()
}
