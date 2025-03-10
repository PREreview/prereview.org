import { match } from 'ts-pattern'
import type { SupportedLocale } from '../locales/index.js'
import { accessDeniedMessage } from './access-denied-message.js'
import { connectFailureMessage } from './failure-message.js'

export const connectOrcidError = ({ error, locale }: { error: string; locale: SupportedLocale }) =>
  match(error)
    .with('access_denied', () => accessDeniedMessage(locale))
    .otherwise(() => connectFailureMessage(locale))
