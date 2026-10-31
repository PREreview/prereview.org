import { Result, identity, pipe, Schema, String, type Brand, SchemaTransformation, flow } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { EffectToFpts } from '../RefactoringUtilities/index.ts'
import { NonEmptyStringSchema, type NonEmptyString } from './NonEmptyString.ts'

export type Name = NonEmptyString & Brand.Brand<'Name'>

const NormalizedWhitespaceSchema = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({ decode: flow(String.replaceAll(/\s+/g, ' '), String.trim), encode: identity }),
  ),
)

export const NameSchema = pipe(
  NormalizedWhitespaceSchema.pipe(Schema.decodeTo(NonEmptyStringSchema)),
  Schema.brand('Name'),
)

export const NameC = C.fromDecoder(
  pipe(
    D.string,
    D.parse(s => EffectToFpts.either(Result.mapError(Schema.decodeResult(NameSchema)(s), () => D.error(s, 'Name')))),
  ),
)

export const Name = (name: string) => NameSchema.make(name)
