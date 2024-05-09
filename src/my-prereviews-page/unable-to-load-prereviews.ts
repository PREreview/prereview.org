import { havingProblemsPage } from '../http-error'
import type * as Response from '../response'

export interface UnableToLoadPrereviews {
  readonly _tag: 'UnableToLoadPrereviews'
}

export const UnableToLoadPrereviews: UnableToLoadPrereviews = {
  _tag: 'UnableToLoadPrereviews',
}

export const toResponse: (unableToLoadPrereviews: UnableToLoadPrereviews) => Response.Response = () =>
  havingProblemsPage
