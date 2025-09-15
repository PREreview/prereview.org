import { Option, type Predicate } from 'effect'
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
} from './Preprints/index.js'

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
            'AfricarxivOsfPreprintId',
            'BiorxivPreprintId',
            'EdarxivPreprintId',
            'MedrxivPreprintId',
            'MetaarxivPreprintId',
            'OsfPreprintsPreprintId',
            'PsyarxivPreprintId',
            'ResearchSquarePreprintId',
            'ScieloPreprintId',
            'SocarxivPreprintId',
          ),
        },
        Option.some,
      )
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
