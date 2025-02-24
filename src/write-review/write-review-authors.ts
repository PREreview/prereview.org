import { Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as I from 'fp-ts/lib/Identity.js'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { mustDeclareUseOfAi } from '../feature-flags.js'
import { type MissingE, hasAnError, missingE } from '../form.js'
import { html, plainText, rawHtml, sendHtml } from '../html.js'
import { DefaultLocale, type SupportedLocale, translate } from '../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import { templatePage } from '../page.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import {
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewMatch,
  writeReviewPersonaMatch,
} from '../routes.js'
import { type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'
import { backNav, errorPrefix, errorSummary, prereviewOfSuffix, saveAndContinueButton } from './shared-elements.js'

export const writeReviewAuthors = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.apS('locale', RM.of(DefaultLocale)),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.apSW('mustDeclareUseOfAi', RM.rightReader(mustDeclareUseOfAi)),
      RM.ichainW(state => match(state).with({ method: 'POST' }, handleAuthorsForm).otherwise(showAuthorsForm)),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            RM.fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with('form-unavailable', P.instanceOf(Error), () => serviceUnavailable)
          .exhaustive(),
      ),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with({ _tag: 'PreprintIsNotFound' }, () => notFound)
      .with({ _tag: 'PreprintIsUnavailable' }, () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showAuthorsForm = flow(
  RM.fromReaderK(
    ({ form, preprint, user, locale }: { form: Form; preprint: PreprintTitle; user: User; locale: SupportedLocale }) =>
      authorsForm(
        preprint,
        {
          moreAuthors: E.right(form.moreAuthors),
          moreAuthorsApproved: E.right(form.moreAuthorsApproved),
        },
        user,
        locale,
      ),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAuthorsErrorForm = (preprint: PreprintTitle, user: User, locale: SupportedLocale) =>
  flow(
    RM.fromReaderK((form: AuthorsForm) => authorsForm(preprint, form, user, locale)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleAuthorsForm = ({
  form,
  preprint,
  user,
  locale,
  mustDeclareUseOfAi,
}: {
  form: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
  mustDeclareUseOfAi: boolean
}) =>
  pipe(
    RM.decodeBody(body =>
      pipe(
        I.Do,
        I.let('moreAuthors', () => pipe(MoreAuthorsFieldD.decode(body), E.mapLeft(missingE))),
        I.let('moreAuthorsApproved', ({ moreAuthors }) =>
          match(moreAuthors)
            .with({ right: 'yes' }, () => pipe(MoreAuthorsApprovedFieldD.decode(body), E.mapLeft(missingE)))
            .otherwise(() => E.right(undefined)),
        ),
        E.right,
      ),
    ),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('moreAuthors', fields.moreAuthors),
        E.apS('moreAuthorsApproved', fields.moreAuthorsApproved),
        E.let('otherAuthors', () => form.otherAuthors ?? []),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.bindTo('form'),
    RM.ichainMiddlewareKW(state =>
      match(state)
        .with({ form: { moreAuthors: 'yes' } }, () =>
          seeOther(format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })),
        )
        .otherwise(({ form }) => redirectToNextForm(preprint.id)(form, mustDeclareUseOfAi)),
    ),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ moreAuthors: P.any }, showAuthorsErrorForm(preprint, user, locale))
        .exhaustive(),
    ),
  )

const MoreAuthorsFieldD = pipe(
  D.struct({
    moreAuthors: D.literal('yes', 'yes-private', 'no'),
  }),
  D.map(Struct.get('moreAuthors')),
)

const MoreAuthorsApprovedFieldD = pipe(
  D.struct({
    moreAuthorsApproved: D.literal('yes'),
  }),
  D.map(Struct.get('moreAuthorsApproved')),
)

interface AuthorsForm {
  readonly moreAuthors: E.Either<MissingE, 'yes' | 'yes-private' | 'no' | undefined>
  readonly moreAuthorsApproved: E.Either<MissingE, 'yes' | undefined>
}

function authorsForm(preprint: PreprintTitle, form: AuthorsForm, user: User, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale)

  return templatePage({
    title: pipe(
      t('write-review', 'didYouReviewWithAnyoneElse')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    content: html`
      <nav>${backNav(locale, format(writeReviewPersonaMatch.formatter, { id: preprint.id }))}</nav>

      <main id="form">
        <form method="post" action="${format(writeReviewAuthorsMatch.formatter, { id: preprint.id })}" novalidate>
          ${error ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

          <div ${rawHtml(E.isLeft(form.moreAuthors) ? 'class="error"' : '')}>
            <conditional-inputs>
              <fieldset
                role="group"
                aria-describedby="more-authors-tip"
                ${rawHtml(
                  E.isLeft(form.moreAuthors) ? 'aria-invalid="true" aria-errormessage="more-authors-error"' : '',
                )}
              >
                <legend>
                  <h1>${rawHtml(t('write-review', 'didYouReviewWithAnyoneElse')())}</h1>
                </legend>

                <p id="more-authors-tip" role="note">${t('write-review', 'thisCanIncludePeopleWho')()}</p>

                ${E.isLeft(form.moreAuthors)
                  ? html`
                      <div class="error-message" id="more-authors-error">
                        <span class="visually-hidden">Error:</span>
                        ${match(form.moreAuthors.left)
                          .with({ _tag: 'MissingE' }, t('write-review', 'selectYesIfYouReviewedWithSomeoneElse'))
                          .exhaustive()}
                      </div>
                    `
                  : ''}

                <ol>
                  <li>
                    <label>
                      <input
                        name="moreAuthors"
                        id="more-authors-no"
                        type="radio"
                        value="no"
                        ${match(form.moreAuthors)
                          .with({ right: 'no' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('write-review', 'noIReviewedAlone')()}</span>
                    </label>
                  </li>
                  <li>
                    <label>
                      <input
                        name="moreAuthors"
                        type="radio"
                        value="yes-private"
                        ${match(form.moreAuthors)
                          .with({ right: 'yes-private' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('write-review', 'yesButDoNotWantToBeListed')()}</span>
                    </label>
                  </li>
                  <li>
                    <label>
                      <input
                        name="moreAuthors"
                        type="radio"
                        value="yes"
                        aria-controls="more-authors-yes-control"
                        ${match(form.moreAuthors)
                          .with({ right: 'yes' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('write-review', 'yesAndWantToBeListed')()}</span>
                    </label>
                    <div class="conditional" id="more-authors-yes-control">
                      <div ${rawHtml(E.isLeft(form.moreAuthorsApproved) ? 'class="error"' : '')}>
                        ${E.isLeft(form.moreAuthorsApproved)
                          ? html`
                              <div class="error-message" id="more-authors-approved-error">
                                <span class="visually-hidden">Error:</span>
                                ${match(form.moreAuthorsApproved.left)
                                  .with(
                                    { _tag: 'MissingE' },
                                    t('write-review', 'confirmOtherAuthorsHaveReadAndApproved'),
                                  )
                                  .exhaustive()}
                              </div>
                            `
                          : ''}

                        <label>
                          <input
                            name="moreAuthorsApproved"
                            id="more-authors-approved-yes"
                            type="checkbox"
                            value="yes"
                            ${match(form.moreAuthorsApproved)
                              .with({ right: 'yes' }, () => 'checked')
                              .with({ right: undefined }, () => '')
                              .with(
                                { left: { _tag: 'MissingE' } },
                                () => html`aria-invalid="true" aria-errormessage="more-authors-approved-error"`,
                              )
                              .exhaustive()}
                          />
                          <span>${t('write-review', 'theyHaveReadAndApproved')()}</span>
                        </label>
                      </div>
                    </div>
                  </li>
                </ol>
              </fieldset>
            </conditional-inputs>
          </div>

          ${saveAndContinueButton(locale)}
        </form>
      </main>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: AuthorsForm) => html`
  ${E.isLeft(form.moreAuthors)
    ? html`
        <li>
          <a href="#more-authors-no">
            ${match(form.moreAuthors.left)
              .with({ _tag: 'MissingE' }, translate(locale, 'write-review', 'selectYesIfYouReviewedWithSomeoneElse'))
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
  ${E.isLeft(form.moreAuthorsApproved)
    ? html`
        <li>
          <a href="#more-authors-approved-yes">
            ${match(form.moreAuthorsApproved.left)
              .with({ _tag: 'MissingE' }, translate(locale, 'write-review', 'confirmOtherAuthorsHaveReadAndApproved'))
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
`
