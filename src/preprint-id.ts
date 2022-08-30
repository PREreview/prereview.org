import { Doi } from 'doi-ts'

export type PreprintId = BiorxivPreprintId | MedrxivPreprintId

export interface BiorxivPreprintId {
  readonly type: 'biorxiv'
  readonly doi: Doi<'1101'>
}

export interface MedrxivPreprintId {
  readonly type: 'medrxiv'
  readonly doi: Doi<'1101'>
}
