import { Array, Iterable, Option, String, flow, pipe } from 'effect'
import { EmailAddress, Name } from '../../../types/index.ts'

export const parseAuthors = (
  authors: string,
): Option.Option<Array.NonEmptyReadonlyArray<{ name: Name.Name; emailAddress: EmailAddress.EmailAddress }>> =>
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
              onNonEmpty: Option.liftThrowable((init, last) => ({
                name: Name.Name(init.join(' ')),
                emailAddress: EmailAddress.EmailAddress(last),
              })),
            }),
            Array.matchLeft(parts, {
              onEmpty: () => Option.none(),
              onNonEmpty: Option.liftThrowable((head, tail) => ({
                name: Name.Name(tail.join(' ')),
                emailAddress: EmailAddress.EmailAddress(head),
              })),
            }),
          ]),
        ),
      ),
    ),
    Option.all,
    Option.filter(authors => Array.isNonEmptyReadonlyArray(authors)),
  )
