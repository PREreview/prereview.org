import { HttpClientRequest, HttpClientResponse, type HttpClient } from '@effect/platform'
import { Array, Effect, pipe, type Redacted, Schema } from 'effect'
import { UnableToGetSurveyPapers, type Embedding } from './Shared.ts'
import { Float32ArraySchema } from './Float32Array.ts'
import type { Tokenizer } from '@huggingface/tokenizers'

interface TitleAndAbstract {
  title: string
  abstract: string
}

const EmbeddingResponse = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      embedding: Float32ArraySchema,
      index: Schema.Number,
      object: Schema.Literal('embedding'),
    }),
  ),
  model: Schema.String,
  object: Schema.Literal('list'),
  usage: Schema.Struct({
    prompt_tokens: Schema.Number,
    total_tokens: Schema.Number,
  }),
})

export const generateEmbeddings = <T extends TitleAndAbstract>(
  papers: ReadonlyArray<T>,
  apiKey: Redacted.Redacted,
  httpClient: HttpClient.HttpClient,
  tokenizer: Tokenizer,
): Effect.Effect<ReadonlyArray<T & { embedding: Embedding }>, UnableToGetSurveyPapers> =>
  Effect.gen(function* () {
    const inputGroups = pipe(papers, Array.chunksOf(200))

    return yield* Effect.forEach(
      inputGroups,
      Effect.fnUntraced(function* (papers) {
        const request = yield* pipe(
          HttpClientRequest.post('https://openrouter.ai/api/v1/embeddings'),
          HttpClientRequest.bearerToken(apiKey),
          HttpClientRequest.bodyJson({
            model: 'thenlper/gte-large',
            input: papers.map(paper => truncateToModelLimit(`${paper.title}\n\n${paper.abstract}`, 512, tokenizer)),
          }),
        )

        const response = yield* httpClient.execute(request)
        yield* HttpClientResponse.filterStatusOk(response)

        const parsed = yield* HttpClientResponse.schemaBodyJson(EmbeddingResponse)(response)

        return parsed.data.map(item => ({
          // oxlint-disable-next-line typescript/no-non-null-assertion
          ...papers[item.index]!,
          embedding: item.embedding,
        }))
      }),
    ).pipe(Effect.map(Array.flatten))
  }).pipe(
    Effect.tapError(
      Effect.fnUntraced(function* (error) {
        yield* Effect.annotateLogsScoped({ error })

        if (error._tag === 'ResponseError' && error.reason === 'StatusCode') {
          yield* Effect.ignore(
            Effect.andThen(error.response.json, responseBody => Effect.annotateLogsScoped({ responseBody })),
          )
        }

        yield* Effect.logError('Failed to generate embeddings')
      }, Effect.scoped),
    ),
    Effect.mapError(cause => new UnableToGetSurveyPapers({ cause })),
  )

const specialTokensChargedByEndpoint = 2

const countTokensExcludingSpecials = (text: string, tokenizer: Tokenizer): number =>
  tokenizer.encode(text, { add_special_tokens: false }).ids.length

const longestPrefixWithinBudget = (text: string, budget: number, tokenizer: Tokenizer): string => {
  const fitsWithin = (length: number) => countTokensExcludingSpecials(text.slice(0, length), tokenizer) <= budget

  if (fitsWithin(text.length)) return text

  let longestMeasuredToFit = 0
  let shortestMeasuredNotToFit = text.length

  while (longestMeasuredToFit + 1 < shortestMeasuredNotToFit) {
    const candidate = Math.ceil((longestMeasuredToFit + shortestMeasuredNotToFit) / 2)

    if (fitsWithin(candidate)) longestMeasuredToFit = candidate
    else shortestMeasuredNotToFit = candidate
  }

  return text.slice(0, longestMeasuredToFit)
}

export const truncateToModelLimit = (text: string, maxTokens: number, tokenizer: Tokenizer): string => {
  const budget = maxTokens - specialTokensChargedByEndpoint

  return budget > 0 ? longestPrefixWithinBudget(text, budget, tokenizer) : ''
}
