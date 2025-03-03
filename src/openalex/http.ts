import type { ParseResult } from 'effect'

export interface NetworkError {
  readonly _tag: 'NetworkError'
  readonly error: Error
}

export const NetworkError = (error: Error): NetworkError => ({ _tag: 'NetworkError', error })

export interface UnexpectedStatusCode {
  readonly _tag: 'UnexpectedStatusCode'
  readonly actual: number
}

export const UnexpectedStatusCode = (actual: number): UnexpectedStatusCode => ({ _tag: 'UnexpectedStatusCode', actual })

export interface UnableToDecodeBody {
  readonly _tag: 'UnableToDecodeBody'
  readonly error?: ParseResult.ParseError
}

export const UnableToDecodeBody = (error?: ParseResult.ParseError): UnableToDecodeBody => ({
  _tag: 'UnableToDecodeBody',
  error,
})
