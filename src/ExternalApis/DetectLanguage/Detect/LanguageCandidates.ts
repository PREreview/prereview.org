import { Schema } from 'effect'

export const LanguageCandidates = Schema.Array(
  Schema.Struct({
    language: Schema.Trimmed.check(Schema.isNonEmpty()),
    score: Schema.Number,
  }),
)
