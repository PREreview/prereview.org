import { Temporal } from '@js-temporal/polyfill'
import { Clock, Effect, type Order, ParseResult, Schema } from 'effect'

export type Instant = Temporal.Instant
export type PlainDate = Temporal.PlainDate

export const { Instant, PlainDate } = Temporal

export const currentInstant = Effect.andThen(Clock.currentTimeMillis, millis =>
  Temporal.Instant.fromEpochMilliseconds(millis),
)

export const currentPlainDate = Effect.andThen(currentInstant, instant =>
  instant.toZonedDateTimeISO('UTC').toPlainDate(),
)

export const PlainYearMonthFromSelfSchema = Schema.instanceOf(Temporal.PlainYearMonth)

export const PlainDateFromSelfSchema = Schema.instanceOf(Temporal.PlainDate)

export const PlainDateTimeFromSelfSchema = Schema.instanceOf(Temporal.PlainDateTime)

export const InstantFromSelfSchema = Schema.instanceOf(Temporal.Instant)

export const PlainYearMonthFromPartsSchema = Schema.transformOrFail(
  Schema.Struct({
    year: Schema.Number,
    month: Schema.Number,
  }),
  PlainYearMonthFromSelfSchema,
  {
    decode: (parts, _, ast) =>
      ParseResult.try({
        try: () => Temporal.PlainYearMonth.from(parts, { overflow: 'reject' }),
        catch: () => new ParseResult.Type(ast, parts),
      }),
    encode: ParseResult.succeed,
  },
)

export const PlainYearMonthSchema = Schema.transformOrFail(Schema.String, PlainYearMonthFromSelfSchema, {
  decode: (parts, _, ast) =>
    ParseResult.try({
      try: () => Temporal.PlainYearMonth.from(parts, { overflow: 'reject' }),
      catch: () => new ParseResult.Type(ast, parts),
    }),
  encode: date => ParseResult.succeed(date.toString()),
})

export const PlainDateFromPartsSchema = Schema.transformOrFail(
  Schema.Struct({
    year: Schema.Number,
    month: Schema.Number,
    day: Schema.Number,
  }),
  PlainDateFromSelfSchema,
  {
    decode: (parts, _, ast) =>
      ParseResult.try({
        try: () => Temporal.PlainDate.from(parts, { overflow: 'reject' }),
        catch: () => new ParseResult.Type(ast, parts),
      }),
    encode: ParseResult.succeed,
  },
)

export const PlainDateTimeSchema = Schema.transformOrFail(Schema.String, PlainDateTimeFromSelfSchema, {
  decode: (parts, _, ast) =>
    ParseResult.try({
      try: () => Temporal.PlainDateTime.from(parts, { overflow: 'reject' }),
      catch: () => new ParseResult.Type(ast, parts),
    }),
  encode: dateTime => ParseResult.succeed(dateTime.toString()),
})

export const PlainDateSchema = Schema.transformOrFail(Schema.String, PlainDateFromSelfSchema, {
  decode: (parts, _, ast) =>
    ParseResult.try({
      try: () => Temporal.PlainDate.from(parts, { overflow: 'reject' }),
      catch: () => new ParseResult.Type(ast, parts),
    }),
  encode: date => ParseResult.succeed(date.toString()),
})

export const InstantSchema = Schema.transformOrFail(Schema.String, InstantFromSelfSchema, {
  decode: (parts, _, ast) =>
    ParseResult.try({
      try: () => Temporal.Instant.from(parts),
      catch: () => new ParseResult.Type(ast, parts),
    }),
  encode: date => ParseResult.succeed(date.toString()),
})

export const InstantFromMillisecondsSchema = Schema.transformOrFail(Schema.Number, InstantFromSelfSchema, {
  decode: (milliseconds, _, ast) =>
    ParseResult.try({
      try: () => Temporal.Instant.fromEpochMilliseconds(milliseconds),
      catch: () => new ParseResult.Type(ast, milliseconds),
    }),
  encode: date => ParseResult.succeed(date.epochMilliseconds),
})

export const OrderPlainDate: Order.Order<Temporal.PlainDate> = (self, that) => Temporal.PlainDate.compare(self, that)

export const OrderInstant: Order.Order<Temporal.Instant> = (self, that) => Temporal.Instant.compare(self, that)
