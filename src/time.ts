import { Temporal } from '@js-temporal/polyfill'
import { P, match } from 'ts-pattern'
import { type Html, html } from './html'

import PlainDate = Temporal.PlainDate
import PlainYearMonth = Temporal.PlainYearMonth

export type PartialDate = PlainDate | PlainYearMonth | number

export function renderDate(date: PartialDate): Html {
  return match(date)
    .with(
      P.number,
      year =>
        html`<time datetime="${year}">${new PlainDate(year, 1, 1).toLocaleString('en', { year: 'numeric' })}</time>`,
    )
    .with(
      P.instanceOf(PlainYearMonth),
      date =>
        html`<time datetime="${date.toString()}"
          >${date.toLocaleString('en', { calendar: date.calendarId, month: 'long', year: 'numeric' })}</time
        >`,
    )
    .with(
      P.instanceOf(PlainDate),
      date => html`<time datetime="${date.toString()}">${date.toLocaleString('en', { dateStyle: 'long' })}</time>`,
    )
    .exhaustive()
}
