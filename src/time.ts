import { Temporal } from '@js-temporal/polyfill'
import { Match, pipe } from 'effect'
import { html } from './html.ts'

export type PartialDate = Temporal.PlainDate | Temporal.PlainYearMonth | number

export const renderDate = (locale: string) => (date: PartialDate) =>
  html`<time datetime="${date.toString()}">${renderDateString(locale)(date)}</time>`

export const renderDateString = (locale: string) =>
  pipe(
    Match.type<PartialDate>(),
    Match.when(Match.number, year => new Temporal.PlainDate(year, 1, 1).toLocaleString(locale, { year: 'numeric' })),
    Match.when(isPlainYearMonth, date =>
      date.toLocaleString(locale, { calendar: date.calendarId, month: 'long', year: 'numeric' }),
    ),
    Match.when(isPlainDate, date => date.toLocaleString(locale, { dateStyle: 'long' })),
    Match.exhaustive,
  )

function isPlainDate(value: unknown): value is Temporal.PlainDate {
  return typeof value === 'object' && value?.constructor.name === 'PlainDate'
}

function isPlainYearMonth(value: unknown): value is Temporal.PlainYearMonth {
  return typeof value === 'object' && value?.constructor.name === 'PlainYearMonth'
}
