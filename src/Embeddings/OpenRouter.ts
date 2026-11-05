import type { OpenRouterClient } from '@effect/ai-openrouter'
import { Array, Effect, pipe, Schema } from 'effect'
import { UnableToGetMatches, type Embedding } from './Shared.ts'
import { Float32ArraySchema } from './Float32Array.ts'
import type { Tokenizer } from '@huggingface/tokenizers'

interface TitleAndAbstract {
  title: string
  abstract: string
}

export const generateEmbeddings: <T extends TitleAndAbstract>(
  papers: ReadonlyArray<T>,
  openRouter: OpenRouterClient.Service,
  tokenizer: Tokenizer,
) => Effect.Effect<ReadonlyArray<T & { embedding: Embedding }>, UnableToGetMatches> = Effect.fn(
  'Embeddings.generateEmbeddings',
)(
  function* <T extends TitleAndAbstract>(
    papers: ReadonlyArray<T>,
    openRouter: OpenRouterClient.Service,
    tokenizer: Tokenizer,
  ) {
    const inputGroups = pipe(papers, Array.chunksOf(200))

    return yield* Effect.forEach(
      inputGroups,
      Effect.fnUntraced(function* (papers) {
        const response = yield* openRouter.client.createEmbeddings({
          payload: {
            model: 'thenlper/gte-large',
            encoding_format: 'float',
            input: papers.map(paper => truncateToModelLimit(`${paper.title}\n\n${paper.abstract}`, 512, tokenizer)),
          },
        })

        return yield* Effect.forEach(response.data, (item, position) =>
          Effect.map(Schema.decodeUnknownEffect(Float32ArraySchema)(item.embedding), embedding => ({
            // oxlint-disable-next-line typescript/no-non-null-assertion
            ...papers[item.index ?? position]!,
            embedding,
          })),
        )
      }),
    ).pipe(Effect.map(Array.flatten))
  },
  Effect.tapError(error => Effect.logError('Failed to generate embeddings').pipe(Effect.annotateLogs({ error }))),
  Effect.mapError(cause => new UnableToGetMatches({ cause })),
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
