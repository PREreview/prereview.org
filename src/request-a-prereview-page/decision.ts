export type Decision = DenyAccess | RequireLogIn | ShowError | ShowForm

export interface DenyAccess {
  _tag: 'DenyAccess'
}

export interface RequireLogIn {
  _tag: 'RequireLogIn'
}

export interface ShowError {
  _tag: 'ShowError'
}

export interface ShowForm {
  _tag: 'ShowForm'
}

export const RequireLogIn: RequireLogIn = { _tag: 'RequireLogIn' }

export const DenyAccess: DenyAccess = { _tag: 'DenyAccess' }

export const ShowError: ShowError = { _tag: 'ShowError' }

export const ShowForm: ShowForm = { _tag: 'ShowForm' }
