import { Temporal } from '@js-temporal/polyfill'
import { Clock, Effect, type Order, Schema, SchemaIssue, SchemaGetter } from 'effect'

export type Instant = Temporal.Instant
export type PlainDate = Temporal.PlainDate

export const { Instant, PlainDate } = Temporal

export const currentInstant = Effect.map(Clock.currentTimeMillis, millis =>
  Temporal.Instant.fromEpochMilliseconds(millis),
)

export const currentPlainDate = Effect.map(currentInstant, instant => instant.toZonedDateTimeISO('UTC').toPlainDate())

export const PlainYearMonthFromSelfSchema = Schema.instanceOf(Temporal.PlainYearMonth)

export const PlainDateFromSelfSchema = Schema.instanceOf(Temporal.PlainDate)

export const PlainDateTimeFromSelfSchema = Schema.instanceOf(Temporal.PlainDateTime)

export const InstantFromSelfSchema = Schema.instanceOf(Temporal.Instant)

export const PlainYearMonthFromPartsSchema = Schema.Struct({
  year: Schema.Number,
  month: Schema.Number,
}).pipe(
  Schema.decodeTo(PlainYearMonthFromSelfSchema, {
    decode: SchemaGetter.transformEffect(parts =>
      Effect.try({
        try: () => Temporal.PlainYearMonth.from(parts, { overflow: 'reject' }),
        catch: () => new SchemaIssue.InvalidValue(undefined, parts),
      }),
    ),
    encode: SchemaGetter.transformEffect(Effect.succeed),
  }),
)

export const PlainYearMonthSchema = Schema.String.pipe(
  Schema.decodeTo(PlainYearMonthFromSelfSchema, {
    decode: SchemaGetter.transformEffect(parts =>
      Effect.try({
        try: () => Temporal.PlainYearMonth.from(parts, { overflow: 'reject' }),
        catch: () => new SchemaIssue.InvalidValue(undefined, parts),
      }),
    ),
    encode: SchemaGetter.transformEffect(date => Effect.succeed(date.toString())),
  }),
)

export const PlainDateFromPartsSchema = Schema.Struct({
  year: Schema.Number,
  month: Schema.Number,
  day: Schema.Number,
}).pipe(
  Schema.decodeTo(PlainDateFromSelfSchema, {
    decode: SchemaGetter.transformEffect(parts =>
      Effect.try({
        try: () => Temporal.PlainDate.from(parts, { overflow: 'reject' }),
        catch: () => new SchemaIssue.InvalidValue(undefined, parts),
      }),
    ),
    encode: SchemaGetter.transformEffect(Effect.succeed),
  }),
)

export const PlainDateTimeSchema = Schema.String.pipe(
  Schema.decodeTo(PlainDateTimeFromSelfSchema, {
    decode: SchemaGetter.transformEffect(parts =>
      Effect.try({
        try: () => Temporal.PlainDateTime.from(parts, { overflow: 'reject' }),
        catch: () => new SchemaIssue.InvalidValue(undefined, parts),
      }),
    ),
    encode: SchemaGetter.transformEffect(dateTime => Effect.succeed(dateTime.toString())),
  }),
)

export const PlainDateSchema = Schema.String.pipe(
  Schema.decodeTo(PlainDateFromSelfSchema, {
    decode: SchemaGetter.transformEffect(parts =>
      Effect.try({
        try: () => Temporal.PlainDate.from(parts, { overflow: 'reject' }),
        catch: () => new SchemaIssue.InvalidValue(undefined, parts),
      }),
    ),
    encode: SchemaGetter.transformEffect(date => Effect.succeed(date.toString())),
  }),
)

export const InstantSchema = Schema.String.pipe(
  Schema.decodeTo(InstantFromSelfSchema, {
    decode: SchemaGetter.transformEffect(parts =>
      Effect.try({
        try: () => Temporal.Instant.from(parts),
        catch: () => new SchemaIssue.InvalidValue(undefined, parts),
      }),
    ),
    encode: SchemaGetter.transformEffect(date => Effect.succeed(date.toString())),
  }),
)

export const InstantFromMillisecondsSchema = Schema.Number.pipe(
  Schema.decodeTo(InstantFromSelfSchema, {
    decode: SchemaGetter.transformEffect(milliseconds =>
      Effect.try({
        try: () => Temporal.Instant.fromEpochMilliseconds(milliseconds),
        catch: () => new SchemaIssue.InvalidValue(undefined, milliseconds),
      }),
    ),
    encode: SchemaGetter.transformEffect(date => Effect.succeed(date.epochMilliseconds)),
  }),
)

export const OrderPlainDate: Order.Order<Temporal.PlainDate> = (self, that) => Temporal.PlainDate.compare(self, that)

export const OrderInstant: Order.Order<Temporal.Instant> = (self, that) => Temporal.Instant.compare(self, that)
