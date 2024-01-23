import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { type CanInviteAuthorsEnv, canInviteAuthors } from '../feature-flags'
import { type InvalidE, type MissingE, getInput, hasAnError, invalidE, missingE } from '../form'
import { html, plainText, rawHtml } from '../html'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../preprint'
import { type PageResponse, RedirectResponse, StreamlinePageResponse } from '../response'
import { writeReviewAddAuthorMatch, writeReviewAuthorsMatch, writeReviewMatch } from '../routes'
import { type EmailAddress, EmailAddressC } from '../types/email-address'
import type { IndeterminatePreprintId } from '../types/preprint-id'
import { type NonEmptyString, NonEmptyStringC } from '../types/string'
import type { User } from '../user'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from './form'

export const writeReviewAddAuthor = ({
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
  PageResponse | RedirectResponse | StreamlinePageResponse
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
          RTE.apS(
            'user',
            pipe(
              RTE.fromNullable('no-session' as const)(user),
              RTE.chainFirstW(
                flow(
                  RTE.fromReaderK(canInviteAuthors),
                  RTE.filterOrElse(
                    (canInviteAuthors): canInviteAuthors is true => canInviteAuthors,
                    () => 'not-found' as const,
                  ),
                ),
              ),
            ),
          ),
          RTE.let('preprint', () => preprint),
          RTE.let('method', () => method),
          RTE.let('body', () => body),
          RTE.bindW('form', ({ preprint, user }) => getForm(user.orcid, preprint.id)),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('not-found', () => pageNotFound)
                  .with('form-unavailable', () => havingProblemsPage)
                  .exhaustive(),
              ),
            state =>
              match(state)
                .with({ form: { moreAuthors: 'yes' }, method: 'POST' }, handleAddAuthorForm)
                .with({ form: { moreAuthors: 'yes' } }, ({ preprint }) =>
                  RT.of(
                    addAuthorForm({
                      form: {
                        name: E.right(undefined),
                        emailAddress: E.right(undefined),
                      },
                      preprint,
                    }),
                  ),
                )
                .otherwise(() => RT.of(pageNotFound)),
          ),
        ),
    ),
  )

const handleAddAuthorForm = ({
  body,
  form,
  preprint,
  user,
}: {
  body: unknown
  form: Form
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RTE.Do,
    RTE.let('name', () => pipe(NameFieldD.decode(body), E.mapLeft(missingE))),
    RTE.let('emailAddress', () =>
      pipe(
        EmailAddressFieldD.decode(body),
        E.mapLeft(error =>
          match(getInput('emailAddress')(error))
            .with(P.union(P.when(O.isNone), { value: '' }), () => missingE())
            .with({ value: P.select() }, invalidE)
            .exhaustive(),
        ),
      ),
    ),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('name', fields.name),
        E.apS('emailAddress', fields.emailAddress),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.map(author => ({ otherAuthors: [...(form.otherAuthors ?? []), author] })),
    RTE.map(updateForm(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage)
          .with({ name: P.any }, form => addAuthorForm({ form, preprint }))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const NameFieldD = pipe(D.struct({ name: NonEmptyStringC }), D.map(get('name')))

const EmailAddressFieldD = pipe(
  D.struct({ emailAddress: pipe(D.string, D.map(s.trim), D.compose(EmailAddressC)) }),
  D.map(get('emailAddress')),
)

interface AddAuthorForm {
  readonly name: E.Either<MissingE, NonEmptyString | undefined>
  readonly emailAddress: E.Either<MissingE | InvalidE, EmailAddress | undefined>
}

function addAuthorForm({ form, preprint }: { form: AddAuthorForm; preprint: PreprintTitle }) {
  const error = hasAnError(form)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Add an author – PREreview of “${preprint.title}”`,
    nav: html`<a href="${format(writeReviewAuthorsMatch.formatter, { id: preprint.id })}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(writeReviewAddAuthorMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(form.name)
                    ? html`
                        <li>
                          <a href="#name">
                            ${match(form.name.left)
                              .with({ _tag: 'MissingE' }, () => 'Enter their name')
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                  ${E.isLeft(form.emailAddress)
                    ? html`
                        <li>
                          <a href="#email-address">
                            ${match(form.emailAddress.left)
                              .with({ _tag: 'MissingE' }, () => 'Enter their email address')
                              .with(
                                { _tag: 'InvalidE' },
                                () => 'Enter an email address in the correct format, like name@example.com',
                              )
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <h1>Add an author</h1>

        <div ${rawHtml(E.isLeft(form.name) ? 'class="error"' : '')}>
          <h2><label for="name">Name</label></h2>

          ${E.isLeft(form.name)
            ? html`
                <div class="error-message" id="name-error">
                  <span class="visually-hidden">Error:</span>
                  ${match(form.name.left)
                    .with({ _tag: 'MissingE' }, () => 'Enter their name')
                    .exhaustive()}
                </div>
              `
            : ''}

          <input
            name="name"
            id="name"
            type="text"
            spellcheck="false"
            ${match(form.name)
              .with({ right: P.select(P.string) }, value => html`value="${value}"`)
              .with({ right: undefined }, () => '')
              .with({ left: { _tag: 'MissingE' } }, () => '')
              .exhaustive()}
            ${E.isLeft(form.name) ? html`aria-invalid="true" aria-errormessage="name-error"` : ''}
          />
        </div>

        <div ${rawHtml(E.isLeft(form.name) ? 'class="error"' : '')}>
          <h2><label for="email-address">Email address</label></h2>

          ${E.isLeft(form.emailAddress)
            ? html`
                <div class="error-message" id="email-address-error">
                  <span class="visually-hidden">Error:</span>
                  ${match(form.emailAddress.left)
                    .with({ _tag: 'MissingE' }, () => 'Enter their email address')
                    .with(
                      { _tag: 'InvalidE' },
                      () => 'Enter an email address in the correct format, like name@example.com',
                    )
                    .exhaustive()}
                </div>
              `
            : ''}

          <input
            name="emailAddress"
            id="email-address"
            type="text"
            inputmode="email"
            spellcheck="false"
            autocomplete="email"
            ${match(form.emailAddress)
              .with({ right: P.select(P.string) }, value => html`value="${value}"`)
              .with({ right: undefined }, () => '')
              .with({ left: { _tag: 'MissingE' } }, () => '')
              .with({ left: { _tag: 'InvalidE', actual: P.select() } }, value => html`value="${value}"`)
              .exhaustive()}
            ${E.isLeft(form.emailAddress) ? html`aria-invalid="true" aria-errormessage="email-address-error"` : ''}
          />
        </div>

        <button>Save and continue</button>
      </form>
    `,
    canonical: format(writeReviewAddAuthorMatch.formatter, { id: preprint.id }),
    skipToLabel: 'form',
    js: ['error-summary.js'],
  })
}
