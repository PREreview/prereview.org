import { OpenRouterClient } from '@effect/ai-openrouter'
import { Temporal } from '@js-temporal/polyfill'
import { Effect, Layer } from 'effect'
import * as _ from '../../src/Embeddings/index.ts'
import type { Embedding } from '../../src/Embeddings/Shared.ts'
import { BiorxivOrMedrxivPreprintId } from '../../src/Preprints/index.ts'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import * as TestPgClient from '../TestPgClient.ts'
import { expect, it } from '../vitest.ts'

const biorxiv = (doi: `10.1101/${string}`) => new BiorxivOrMedrxivPreprintId({ value: Doi(doi) })

const embedding = (...values: ReadonlyArray<number>): Embedding =>
  Float32Array.from({ length: 1024 }, (_, index) => values[index] ?? 0)

const embeddings: Record<string, Embedding> = {
  'Close\n\nAbstract': embedding(1, 0.1),
  'Far\n\nAbstract': embedding(0, 1),
  'Input\n\nAbstract': embedding(1, 0),
}

const OpenRouterClientTest = Layer.succeed(OpenRouterClient.OpenRouterClient, {
  client: {
    createEmbeddings: ({ payload }: { payload: { input: ReadonlyArray<string> } }) =>
      Effect.succeed({
        data: payload.input.map((input, index) => ({
          embedding: globalThis.Array.from(embeddings[input] ?? []),
          index,
        })),
      }),
  },
} as unknown as OpenRouterClient.Service)

it.effect('finds works with requests that match', () =>
  Effect.gen(function* () {
    const embeddings = yield* _.Embeddings

    yield* embeddings.addRequests([
      {
        preprintId: biorxiv('10.1101/far'),
        title: 'Far',
        abstract: 'Abstract',
        authors: [],
        requestedAt: Temporal.Instant.from('2025-01-01T00:00:00Z'),
        language: 'en',
      },
      {
        preprintId: biorxiv('10.1101/close'),
        title: 'Close',
        abstract: 'Abstract',
        authors: [],
        requestedAt: Temporal.Instant.from('2025-02-01T00:00:00Z'),
        language: 'en',
      },
    ])

    const actual = yield* embeddings.getMatches(
      [{ doi: Doi('10.1101/input'), title: 'Input', abstract: 'Abstract', authors: [] }],
      OrcidId('0000-0002-1825-0097'),
      ['en'],
    )

    expect(actual).toStrictEqual([
      {
        preprintId: biorxiv('10.1101/close'),
        distance: expect.closeTo(0.005, 3),
        latestRequest: Temporal.Instant.from('2025-02-01T00:00:00Z'),
      },
      {
        preprintId: biorxiv('10.1101/far'),
        distance: expect.closeTo(1, 3),
        latestRequest: Temporal.Instant.from('2025-01-01T00:00:00Z'),
      },
    ])
  }).pipe(Effect.provide(_.embeddingsLayer), Effect.provide([OpenRouterClientTest, TestPgClient.layer])),
)
