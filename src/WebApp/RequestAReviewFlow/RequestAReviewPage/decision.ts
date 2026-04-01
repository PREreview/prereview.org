import type { IndeterminatePreprintId, PreprintId } from '../../../Preprints/index.ts'
import type * as RequestAReviewForm from './RequestAReviewForm.ts'

export type Decision =
  | BeginFlow
  | ShowError
  | ShowNotAPreprint
  | ShowUnknownPreprint
  | ShowUnsupportedDoi
  | ShowUnsupportedUrl
  | ShowFormWithErrors
  | ShowEmptyForm

export interface BeginFlow {
  _tag: 'BeginFlow'
  preprint: PreprintId
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

export interface ShowUnsupportedDoi {
  _tag: 'ShowUnsupportedDoi'
}

export interface ShowUnsupportedUrl {
  _tag: 'ShowUnsupportedUrl'
}

export interface ShowFormWithErrors {
  _tag: 'ShowFormWithErrors'
  form: RequestAReviewForm.InvalidForm
}

export interface ShowEmptyForm {
  _tag: 'ShowEmptyForm'
}

export const BeginFlow = (preprint: PreprintId): BeginFlow => ({ _tag: 'BeginFlow', preprint })

export const ShowError: ShowError = { _tag: 'ShowError' }

export const ShowNotAPreprint: ShowNotAPreprint = { _tag: 'ShowNotAPreprint' }

export const ShowUnknownPreprint = (preprint: IndeterminatePreprintId): ShowUnknownPreprint => ({
  _tag: 'ShowUnknownPreprint',
  preprint,
})

export const ShowUnsupportedDoi: ShowUnsupportedDoi = { _tag: 'ShowUnsupportedDoi' }

export const ShowUnsupportedUrl: ShowUnsupportedUrl = { _tag: 'ShowUnsupportedUrl' }

export const ShowFormWithErrors = (form: RequestAReviewForm.InvalidForm): ShowFormWithErrors => ({
  _tag: 'ShowFormWithErrors',
  form,
})

export const ShowEmptyForm: ShowEmptyForm = { _tag: 'ShowEmptyForm' }
