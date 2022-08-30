import { Doi } from 'doi-ts'

export type PreprintId = BiorxivPreprintId | MedrxivPreprintId | ScieloPreprintId

export interface BiorxivPreprintId {
  readonly type: 'biorxiv'
  readonly doi: Doi<'1101'>
}

export interface MedrxivPreprintId {
  readonly type: 'medrxiv'
  readonly doi: Doi<'1101'>
}

export interface ScieloPreprintId {
  readonly type: 'scielo'
  readonly doi: Doi<'1590'>
}
