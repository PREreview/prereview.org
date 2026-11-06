import { Temporal } from '@js-temporal/polyfill'
import { Effect, pipe, Schema } from 'effect'
import { SqlClient } from 'effect/sql'
import type { LanguageCode } from 'iso-639-1'
import { type Embedding, PgVector } from '../../src/Embeddings/Shared.ts'
import {
  ensureRequestEmbeddingsTable,
  findExistingWorks,
  storeEmbeddings,
} from '../../src/Embeddings/WorksWithRequests.ts'
import {
  BiorxivOrMedrxivPreprintId,
  type IndeterminatePreprintId,
  PhilsciPreprintId,
} from '../../src/Preprints/index.ts'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import * as TestPgClient from '../TestPgClient.ts'
import { describe, expect, it } from '../vitest.ts'

const biorxiv = (doi: `10.1101/${string}`) => new BiorxivOrMedrxivPreprintId({ value: Doi(doi) })

const embedding = (...values: ReadonlyArray<number>): Embedding =>
  Float32Array.from({ length: 1024 }, (_, index) => values[index] ?? 0)

const row = (
  preprintId: IndeterminatePreprintId,
  {
    language = 'en',
    authors = [OrcidId('0000-0002-1825-0097')],
    latestRequest = Temporal.Instant.from('2025-01-02T06:00:00Z'),
    embedding: rowEmbedding = embedding(1, 2, 3),
  }: {
    language?: LanguageCode
    authors?: ReadonlyArray<OrcidId>
    latestRequest?: Temporal.Instant
    embedding?: Embedding
  } = {},
) => ({ preprintId, language, authors, latestRequest, embedding: rowEmbedding })

const StoredRow = Schema.Struct({
  preprint_id: Schema.String,
  language: Schema.String,
  authors: Schema.Array(Schema.String),
  latest_request: Schema.Date,
  embedding: PgVector,
})

const setUp = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  yield* sql`CREATE EXTENSION IF NOT EXISTS vector`
  yield* ensureRequestEmbeddingsTable(sql)

  return sql
})

describe('findExistingWorks', () => {
  it.effect('returns the preprint IDs already stored, ignoring the case of DOIs', () =>
    Effect.gen(function* () {
      const sql = yield* setUp

      yield* storeEmbeddings(
        [row(biorxiv('10.1101/already')), row(biorxiv('10.1101/stored')), row(new PhilsciPreprintId({ value: 123 }))],
        sql,
      )

      const actual = yield* findExistingWorks(
        [
          biorxiv('10.1101/already'),
          biorxiv('10.1101/missing'),
          biorxiv('10.1101/Stored'),
          new PhilsciPreprintId({ value: 123 }),
        ],
        sql,
      )

      expect(actual).toStrictEqual(
        new Set([biorxiv('10.1101/already'), biorxiv('10.1101/stored'), new PhilsciPreprintId({ value: 123 })]),
      )
    }).pipe(Effect.provide(TestPgClient.layer)),
  )

  it.effect('returns an empty set when given no preprint IDs', () =>
    Effect.gen(function* () {
      const sql = yield* setUp

      yield* storeEmbeddings([row(biorxiv('10.1101/stored'))], sql)

      const actual = yield* findExistingWorks([], sql)

      expect(actual).toStrictEqual(new Set())
    }).pipe(Effect.provide(TestPgClient.layer)),
  )
})

describe('storeEmbeddings', () => {
  it.effect('stores the rows with lowercased DOIs', () =>
    Effect.gen(function* () {
      const sql = yield* setUp

      yield* storeEmbeddings(
        [
          row(biorxiv('10.1101/A')),
          row(new PhilsciPreprintId({ value: 123 }), {
            language: 'es',
            authors: [OrcidId('0000-0002-6109-0367'), OrcidId('0000-0003-4921-6155')],
            latestRequest: Temporal.Instant.from('2025-03-04T05:06:07Z'),
            embedding: embedding(0.5, -0.25),
          }),
        ],
        sql,
      )

      const actual = yield* pipe(
        sql`
          SELECT
            preprint_id,
            language,
            authors,
            latest_request,
            embedding::text AS embedding
          FROM
            request_embeddings
          ORDER BY
            preprint_id
        `,
        Effect.andThen(Schema.decodeUnknownEffect(Schema.Array(StoredRow))),
      )

      expect(actual).toStrictEqual([
        {
          preprint_id: 'doi:10.1101/a',
          language: 'en',
          authors: ['0000-0002-1825-0097'],
          latest_request: new Date('2025-01-02T06:00:00Z'),
          embedding: embedding(1, 2, 3),
        },
        {
          preprint_id: 'https://philsci-archive.pitt.edu/123/',
          language: 'es',
          authors: ['0000-0002-6109-0367', '0000-0003-4921-6155'],
          latest_request: new Date('2025-03-04T05:06:07Z'),
          embedding: embedding(0.5, -0.25),
        },
      ])
    }).pipe(Effect.provide(TestPgClient.layer)),
  )

  it.effect('keeps existing rows', () =>
    Effect.gen(function* () {
      const sql = yield* setUp

      yield* storeEmbeddings([row(biorxiv('10.1101/a'), { language: 'en' })], sql)
      yield* storeEmbeddings([row(biorxiv('10.1101/A'), { language: 'es' })], sql)

      const actual = yield* sql`
        SELECT
          preprint_id,
          language
        FROM
          request_embeddings
      `

      expect(actual).toStrictEqual([{ preprint_id: 'doi:10.1101/a', language: 'en' }])
    }).pipe(Effect.provide(TestPgClient.layer)),
  )

  it.effect('does nothing for an empty list', () =>
    Effect.gen(function* () {
      const sql = yield* setUp

      yield* storeEmbeddings([], sql)

      const actual = yield* sql`
        SELECT
          COUNT(*)::int AS count
        FROM
          request_embeddings
      `

      expect(actual).toStrictEqual([{ count: 0 }])
    }).pipe(Effect.provide(TestPgClient.layer)),
  )
})
