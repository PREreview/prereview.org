import { Match } from 'effect'
import type { SupportedLocale } from '../../locales/index.ts'
import { accessDeniedMessage } from './access-denied-message.ts'
import { connectFailureMessage } from './failure-message.ts'

export const connectOrcidError = ({ error, locale }: { error: string; locale: SupportedLocale }) =>
  Match.value(error).pipe(
    Match.when('access_denied', () => accessDeniedMessage(locale)),
    Match.orElse(() => connectFailureMessage(locale)),
  )
