import { Temporal } from '@js-temporal/polyfill'
import { ParseResult, Schema } from 'effect'

export const PlainYearMonthFromSelfSchema = Schema.instanceOf(Temporal.PlainYearMonth)

export const PlainDateFromSelfSchema = Schema.instanceOf(Temporal.PlainDate)

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
