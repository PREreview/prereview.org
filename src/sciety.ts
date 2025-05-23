import { hasRegistrant } from 'doi-ts'
import { Option, pipe, type Predicate } from 'effect'
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

export const isScietyPreprint: Predicate.Refinement<PreprintId, PreprintIdSupportedBySciety> = Option.toRefinement(
  (preprint: PreprintId) =>
    match(preprint)
      .returnType<Option.Option<PreprintIdSupportedBySciety>>()
      .with(
        {
          _tag: P.union(
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
        Option.some,
      )
      .with({ _tag: 'africarxiv', value: P.when(pipe(hasRegistrant('31730'))) }, Option.some)
      .otherwise(Option.none),
)

export const scietyUrl = (preprint: PreprintIdSupportedBySciety) => {
  const url = new URL('https://sciety.org/articles/activity/')
  url.pathname = `articles/activity/${preprint.value
    .replace(/%/g, '%25')
    .replace(/\/(\.{1,2})\//g, '/$1%2F')
    .replace(/\\/g, '%5C')}`

  return url
}
