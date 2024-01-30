import { match } from 'ts-pattern'
import { accessDeniedMessage } from './access-denied-message'
import { failureMessage } from './failure-message'

export const connectOrcidError = ({ error }: { error: string }) =>
  match(error)
    .with('access_denied', () => accessDeniedMessage)
    .otherwise(() => failureMessage)
