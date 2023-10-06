import { hasRegistrant } from 'doi-ts'
import * as O from 'fp-ts/Option'
import { type Refinement, fromOptionK } from 'fp-ts/Refinement'
import { pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import type {
  AfricarxivOsfPreprintId,
  BiorxivPreprintId,
  EdarxivPreprintId,
  MedrxivPreprintId,
  MetaarxivPreprintId,
  OsfPreprintId,
  PreprintId,
  PsyarxivPreprintId,
  ResearchSquarePreprintId,
  ScieloPreprintId,
  SocarxivPreprintId,
} from './preprint-id'

export type PreprintIdSupportedBySciety =
  | AfricarxivOsfPreprintId
  | BiorxivPreprintId
  | EdarxivPreprintId
  | MedrxivPreprintId
  | MetaarxivPreprintId
  | OsfPreprintId
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
            'osf',
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
