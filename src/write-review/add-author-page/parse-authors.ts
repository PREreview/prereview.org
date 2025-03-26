import { type Array, Option } from 'effect'
import type { EmailAddress, NonEmptyString } from '../../types/index.js'

export const parseAuthors = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  authors: string,
): Option.Option<
  Array.NonEmptyReadonlyArray<{ name: NonEmptyString.NonEmptyString; emailAddress: EmailAddress.EmailAddress }>
> => Option.none()
