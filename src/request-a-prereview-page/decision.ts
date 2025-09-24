import type { IndeterminatePreprintId, PreprintId } from '../Preprints/index.ts'
import type { ReviewRequestPreprintId } from '../review-request.ts'
import type * as Form from './form.ts'

export type Decision =
  | BeginFlow
  | ShowError
  | ShowNotAPreprint
  | ShowUnknownPreprint
  | ShowUnsupportedPreprint
  | ShowUnsupportedDoi
  | ShowUnsupportedUrl
  | ShowFormWithErrors
  | ShowEmptyForm

export interface BeginFlow {
  _tag: 'BeginFlow'
  preprint: ReviewRequestPreprintId
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

export interface ShowFormWithErrors {
  _tag: 'ShowFormWithErrors'
  form: Form.InvalidForm
}

export interface ShowEmptyForm {
  _tag: 'ShowEmptyForm'
}

export const BeginFlow = (preprint: ReviewRequestPreprintId): BeginFlow => ({ _tag: 'BeginFlow', preprint })

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

export const ShowFormWithErrors = (form: Form.InvalidForm): ShowFormWithErrors => ({
  _tag: 'ShowFormWithErrors',
  form,
})

export const ShowEmptyForm: ShowEmptyForm = { _tag: 'ShowEmptyForm' }
