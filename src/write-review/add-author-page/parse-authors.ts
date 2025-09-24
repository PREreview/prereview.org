import { Array, Iterable, Option, String, flow, pipe } from 'effect'
import { EmailAddress, NonEmptyString } from '../../types/index.ts'

export const parseAuthors = (
  authors: string,
): Option.Option<
  Array.NonEmptyReadonlyArray<{ name: NonEmptyString.NonEmptyString; emailAddress: EmailAddress.EmailAddress }>
> =>
  pipe(
    String.linesIterator(authors),
    Iterable.map(flow(String.replaceAll(/[,\s]+/g, ' '), String.trim)),
    Iterable.filter(String.isNonEmpty),
    Iterable.map(
      flow(
        Option.liftPredicate(line => (line.match(/@/g) ?? []).length === 1),
        Option.filter(line => (line.match(/"/g) ?? []).length === 0),
        Option.map(String.split(' ')),
        Option.andThen(parts =>
          Option.firstSomeOf([
            Array.matchRight(parts, {
              onEmpty: () => Option.none(),
              onNonEmpty: (init, last) => {
                try {
                  return Option.some({
                    name: NonEmptyString.NonEmptyString(init.join(' ')),
                    emailAddress: EmailAddress.EmailAddress(last),
                  })
                } catch {
                  return Option.none()
                }
              },
            }),
            Array.matchLeft(parts, {
              onEmpty: () => Option.none(),
              onNonEmpty: (head, tail) => {
                try {
                  return Option.some({
                    name: NonEmptyString.NonEmptyString(tail.join(' ')),
                    emailAddress: EmailAddress.EmailAddress(head),
                  })
                } catch {
                  return Option.none()
                }
              },
            }),
          ]),
        ),
      ),
    ),
    Option.all,
    Option.filter(authors => Array.isNonEmptyReadonlyArray(authors)),
  )
