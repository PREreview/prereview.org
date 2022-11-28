import { Doi } from 'doi-ts'

export type PreprintId =
  | AfricarxivPreprintId
  | BiorxivPreprintId
  | MedrxivPreprintId
  | OsfPreprintId
  | PsyarxivPreprintId
  | ResearchSquarePreprintId
  | ScieloPreprintId

export interface AfricarxivPreprintId {
  readonly type: 'africarxiv'
  readonly doi: Doi<'31730'>
}

export interface BiorxivPreprintId {
  readonly type: 'biorxiv'
  readonly doi: Doi<'1101'>
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
