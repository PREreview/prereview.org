import { match } from 'ts-pattern'
import type { SupportedLocale } from '../locales/index.ts'
import { accessDeniedMessage } from './access-denied-message.ts'
import { connectFailureMessage } from './failure-message.ts'

export const connectOrcidError = ({ error, locale }: { error: string; locale: SupportedLocale }) =>
  match(error)
    .with('access_denied', () => accessDeniedMessage(locale))
    .otherwise(() => connectFailureMessage(locale))
