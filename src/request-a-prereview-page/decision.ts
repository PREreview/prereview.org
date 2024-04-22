import type { IndeterminatePreprintId, PreprintId } from '../types/preprint-id'
import type * as Form from './form'

export type Decision =
  | DenyAccess
  | RequireLogIn
  | ShowError
  | ShowNotAPreprint
  | ShowUnknownPreprint
  | ShowUnsupportedPreprint
  | ShowUnsupportedDoi
  | ShowUnsupportedUrl
  | ShowForm

export interface DenyAccess {
  _tag: 'DenyAccess'
}

export interface RequireLogIn {
  _tag: 'RequireLogIn'
}

export interface ShowError {
  _tag: 'ShowError'
}

export interface ShowNotAPreprint {
  _tag: 'ShowNotAPreprint'
}

export interface ShowUnknownPreprint {
  _tag: 'ShowUnknownPreprint'
  preprint: IndeterminatePreprintId
}

export interface ShowUnsupportedPreprint {
  _tag: 'ShowUnsupportedPreprint'
  preprint: PreprintId
}

export interface ShowUnsupportedDoi {
  _tag: 'ShowUnsupportedDoi'
}

export interface ShowUnsupportedUrl {
  _tag: 'ShowUnsupportedUrl'
}

export interface ShowForm {
  _tag: 'ShowForm'
  form: Form.IncompleteForm
}

export const RequireLogIn: RequireLogIn = { _tag: 'RequireLogIn' }

export const DenyAccess: DenyAccess = { _tag: 'DenyAccess' }

export const ShowError: ShowError = { _tag: 'ShowError' }

export const ShowNotAPreprint: ShowNotAPreprint = { _tag: 'ShowNotAPreprint' }

export const ShowUnknownPreprint = (preprint: IndeterminatePreprintId): ShowUnknownPreprint => ({
  _tag: 'ShowUnknownPreprint',
  preprint,
})

export const ShowUnsupportedPreprint = (preprint: PreprintId): ShowUnsupportedPreprint => ({
  _tag: 'ShowUnsupportedPreprint',
  preprint,
})

export const ShowUnsupportedDoi: ShowUnsupportedDoi = { _tag: 'ShowUnsupportedDoi' }

export const ShowUnsupportedUrl: ShowUnsupportedUrl = { _tag: 'ShowUnsupportedUrl' }

export const ShowForm = (form: Form.IncompleteForm): ShowForm => ({ _tag: 'ShowForm', form })
