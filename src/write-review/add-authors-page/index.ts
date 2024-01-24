import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { type CanInviteAuthorsEnv, canInviteAuthors } from '../../feature-flags'
import { missingE } from '../../form'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../../preprint'
import { type LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import { writeReviewAddAuthorMatch, writeReviewMatch } from '../../routes'
import type { IndeterminatePreprintId } from '../../types/preprint-id'
import type { User } from '../../user'
import { type Form, type FormStoreEnv, getForm, nextFormMatch } from '../form'
import { addAuthorsForm } from './add-authors-form'
import { cannotAddAuthorsForm } from './cannot-add-authors-form'

export const writeReviewAddAuthors = ({
  body,
  id,
  method,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  method: string
  user?: User
}): RT.ReaderTask<
  CanInviteAuthorsEnv & FormStoreEnv & GetPreprintTitleEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with('not-found', () => pageNotFound)
            .with('unavailable', () => havingProblemsPage)
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.apS('user', pipe(RTE.fromNullable('no-session' as const)(user))),
          RTE.let('preprint', () => preprint),
          RTE.let('method', () => method),
          RTE.let('body', () => body),
          RTE.bindW('form', ({ preprint, user }) => getForm(user.orcid, preprint.id)),
          RTE.bindW('canInviteAuthors', ({ user }) => RTE.fromReader(canInviteAuthors(user))),
          RTE.let('authors', ({ form }) => form.otherAuthors ?? []),
          RTE.matchW(
            error =>
              match(error)
                .with('no-form', 'no-session', () =>
                  RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                )
                .with('form-unavailable', () => havingProblemsPage)
                .exhaustive(),
            state =>
              match(state)
                .with({ canInviteAuthors: false, form: { moreAuthors: 'yes' }, method: 'POST' }, ({ form }) =>
                  RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
                )
                .with({ canInviteAuthors: false, form: { moreAuthors: 'yes' } }, cannotAddAuthorsForm)
                .with({ canInviteAuthors: true, form: { moreAuthors: 'yes' }, authors: P.when(RA.isEmpty) }, () =>
                  RedirectResponse({ location: format(writeReviewAddAuthorMatch.formatter, { id: preprint.id }) }),
                )
                .with({ canInviteAuthors: true, form: { moreAuthors: 'yes' }, method: 'POST' }, handleAddAuthorsForm)
                .with({ canInviteAuthors: true, form: { moreAuthors: 'yes' } }, state =>
                  addAuthorsForm({ ...state, form: { anotherAuthor: E.right(undefined) } }),
                )
                .otherwise(() => pageNotFound),
          ),
        ),
    ),
  )

const handleAddAuthorsForm = ({ body, form, preprint }: { body: unknown; form: Form; preprint: PreprintTitle }) =>
  pipe(
    E.Do,
    E.let('anotherAuthor', () => pipe(AnotherAuthorFieldD.decode(body), E.mapLeft(missingE))),
    E.chain(fields =>
      pipe(
        E.Do,
        E.apS('anotherAuthor', fields.anotherAuthor),
        E.mapLeft(() => fields),
      ),
    ),
    E.matchW(
      error => addAuthorsForm({ form: error, preprint }),
      state =>
        match(state)
          .with({ anotherAuthor: 'yes' }, () =>
            RedirectResponse({ location: format(writeReviewAddAuthorMatch.formatter, { id: preprint.id }) }),
          )
          .with({ anotherAuthor: 'no' }, () =>
            RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
          )
          .exhaustive(),
    ),
  )

const AnotherAuthorFieldD = pipe(
  D.struct({
    anotherAuthor: D.literal('yes', 'no'),
  }),
  D.map(get('anotherAuthor')),
)
