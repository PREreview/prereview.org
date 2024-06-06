import type * as D from 'io-ts/Decoder'

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
  readonly error: D.DecodeError
}

export const UnableToDecodeBody = (error: D.DecodeError): UnableToDecodeBody => ({ _tag: 'UnableToDecodeBody', error })
