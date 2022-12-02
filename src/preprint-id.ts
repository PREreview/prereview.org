import { Doi, hasRegistrant } from 'doi-ts'
import { Refinement } from 'fp-ts/Refinement'

export type PreprintId =
  | AfricarxivPreprintId
  | ArxivPreprintId
  | BiorxivPreprintId
  | EartharxivPreprintId
  | EdarxivPreprintId
  | EngrxivPreprintId
  | MedrxivPreprintId
  | OsfPreprintId
  | PsyarxivPreprintId
  | ResearchSquarePreprintId
  | ScieloPreprintId
  | SocarxivPreprintId

export interface AfricarxivPreprintId {
  readonly type: 'africarxiv'
  readonly doi: Doi<'31730'>
}

export interface ArxivPreprintId {
  readonly type: 'arxiv'
  readonly doi: Doi<'48550'>
}

export interface BiorxivPreprintId {
  readonly type: 'biorxiv'
  readonly doi: Doi<'1101'>
}

export interface EartharxivPreprintId {
  readonly type: 'eartharxiv'
  readonly doi: Doi<'31223'>
}

export interface EdarxivPreprintId {
  readonly type: 'edarxiv'
  readonly doi: Doi<'35542'>
}

export interface EngrxivPreprintId {
  readonly type: 'engrxiv'
  readonly doi: Doi<'31224'>
}

export interface MedrxivPreprintId {
  readonly type: 'medrxiv'
  readonly doi: Doi<'1101'>
}

export interface OsfPreprintId {
  readonly type: 'osf'
  readonly doi: Doi<'31219'>
}

export interface PsyarxivPreprintId {
  readonly type: 'psyarxiv'
  readonly doi: Doi<'31234'>
}

export interface ResearchSquarePreprintId {
  readonly type: 'research-square'
  readonly doi: Doi<'21203'>
}

export interface ScieloPreprintId {
  readonly type: 'scielo'
  readonly doi: Doi<'1590'>
}

export interface SocarxivPreprintId {
  readonly type: 'socarxiv'
  readonly doi: Doi<'31235'>
}

export const isPreprintDoi: Refinement<Doi, PreprintId['doi']> = hasRegistrant(
  '1101',
  '1590',
  '21203',
  '31219',
  '31223',
  '31224',
  '31234',
  '31235',
  '31730',
  '35542',
  '48550',
)
