import { Temporal } from '@js-temporal/polyfill'
import { P, match } from 'ts-pattern'
import { type Html, html } from './html.js'

import PlainDate = Temporal.PlainDate
import PlainYearMonth = Temporal.PlainYearMonth

export type PartialDate = PlainDate | PlainYearMonth | number

export const renderDate =
  (locale: string) =>
  (date: PartialDate): Html =>
    match(date)
      .with(
        P.number,
        year =>
          html`<time datetime="${year}"
            >${new PlainDate(year, 1, 1).toLocaleString(locale, { year: 'numeric' })}</time
          >`,
      )
      .when(
        isPlainYearMonth,
        date =>
          html`<time datetime="${date.toString()}"
            >${date.toLocaleString(locale, { calendar: date.calendarId, month: 'long', year: 'numeric' })}</time
          >`,
      )
      .when(
        isPlainDate,
        date => html`<time datetime="${date.toString()}">${date.toLocaleString(locale, { dateStyle: 'long' })}</time>`,
      )
      .exhaustive()

function isPlainDate(value: unknown): value is PlainDate {
  return typeof value === 'object' && value?.constructor.name === 'PlainDate'
}

function isPlainYearMonth(value: unknown): value is PlainYearMonth {
  return typeof value === 'object' && value?.constructor.name === 'PlainYearMonth'
}
