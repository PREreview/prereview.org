import { hasRegistrant } from 'doi-ts'
import * as O from 'fp-ts/lib/Option.js'
import { type Refinement, fromOptionK } from 'fp-ts/lib/Refinement.js'
import { pipe } from 'fp-ts/lib/function.js'
import { P, match } from 'ts-pattern'
import type {
  AfricarxivOsfPreprintId,
  BiorxivPreprintId,
  EdarxivPreprintId,
  MedrxivPreprintId,
  MetaarxivPreprintId,
  OsfPreprintsPreprintId,
  PreprintId,
  PsyarxivPreprintId,
  ResearchSquarePreprintId,
  ScieloPreprintId,
  SocarxivPreprintId,
} from './types/preprint-id.js'

export type PreprintIdSupportedBySciety =
  | AfricarxivOsfPreprintId
  | BiorxivPreprintId
  | EdarxivPreprintId
  | MedrxivPreprintId
  | MetaarxivPreprintId
  | OsfPreprintsPreprintId
  | PsyarxivPreprintId
  | ResearchSquarePreprintId
  | ScieloPreprintId
  | SocarxivPreprintId

export const isScietyPreprint: Refinement<PreprintId, PreprintIdSupportedBySciety> = fromOptionK(
  (preprint: PreprintId) =>
    match(preprint)
      .returnType<O.Option<PreprintIdSupportedBySciety>>()
      .with(
        {
          type: P.union(
            'biorxiv',
            'edarxiv',
            'medrxiv',
            'metaarxiv',
            'osf-preprints',
            'psyarxiv',
            'research-square',
            'scielo',
            'socarxiv',
          ),
        },
        O.some,
      )
      .with({ type: 'africarxiv', value: P.when(pipe(hasRegistrant('31730'))) }, O.some)
      .otherwise(() => O.none),
)

export const scietyUrl = (preprint: PreprintIdSupportedBySciety) => {
  const url = new URL('https://sciety.org/articles/activity/')
  url.pathname = `articles/activity/${preprint.value
    .replace(/%/g, '%25')
    .replace(/\/(\.{1,2})\//g, '/$1%2F')
    .replace(/\\/g, '%5C')}`

  return url
}
