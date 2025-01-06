import { Temporal } from '@js-temporal/polyfill'
import { Match, pipe } from 'effect'
import { html } from './html.js'

import PlainDate = Temporal.PlainDate
import PlainYearMonth = Temporal.PlainYearMonth

export type PartialDate = PlainDate | PlainYearMonth | number

export const renderDate = (locale: string) =>
  pipe(
    Match.type<PartialDate>(),
    Match.when(
      Match.number,
      year =>
        html`<time datetime="${year}">${new PlainDate(year, 1, 1).toLocaleString(locale, { year: 'numeric' })}</time>`,
    ),
    Match.when(
      isPlainYearMonth,
      date =>
        html`<time datetime="${date.toString()}"
          >${date.toLocaleString(locale, { calendar: date.calendarId, month: 'long', year: 'numeric' })}</time
        >`,
    ),
    Match.when(
      isPlainDate,
      date => html`<time datetime="${date.toString()}">${date.toLocaleString(locale, { dateStyle: 'long' })}</time>`,
    ),
    Match.exhaustive,
  )

function isPlainDate(value: unknown): value is PlainDate {
  return typeof value === 'object' && value?.constructor.name === 'PlainDate'
}

function isPlainYearMonth(value: unknown): value is PlainYearMonth {
  return typeof value === 'object' && value?.constructor.name === 'PlainYearMonth'
}
