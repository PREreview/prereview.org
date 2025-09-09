import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import type { PreprintTitle } from '../../preprint.js'
import { StreamlinePageResponse } from '../../response.js'
import { preprintReviewsMatch } from '../../routes.js'
import { isScietyPreprint, scietyUrl } from '../../sciety.js'
import type { PublishedReview } from '../published-review.js'

export const publishedPage = ({
  review: { doi, form },
  preprint,
  url,
  locale,
}: {
  review: PublishedReview
  preprint: PreprintTitle
  url: URL
  locale: SupportedLocale
}) => {
  const t = translate(locale)
  const opensInNewTab = t('write-review', 'opensInNewTab')()
  const communitySlack = (text: string) =>
    html`<a href="https://bit.ly/PREreview-Slack" target="_blank" rel="noopener noreferrer"
      >${text}<span class="visually-hidden"> (${opensInNewTab})</span></a
    >`.toString()
  const sciety = (text: string) =>
    html`<a href="https://sciety.org/" target="_blank" rel="noopener noreferrer"
      >${text}<span class="visually-hidden"> (${opensInNewTab})</span></a
    >`.toString()
  const mailtoHelp = html`<a href="mailto:help@prereview.org" target="_blank" rel="noopener noreferrer"
    >help@prereview.org<span class="visually-hidden"> (${opensInNewTab})</span></a
  >`.toString()

  return StreamlinePageResponse({
    title: plainText(t('write-review', 'prereviewPublishedTitle')()),
    main: html`
      <div class="panel">
        <h1>${t('write-review', 'prereviewPublishedTitle')()}</h1>

        <div>
          ${t('write-review', 'yourDoi')()} <br />
          <strong class="doi" translate="no">${doi}</strong>
        </div>
      </div>

      <h2>${t('write-review', 'whatHappensNext')()}</h2>

      <p>
        ${rawHtml(
          isScietyPreprint(preprint.id)
            ? t('write-review', 'whereYouCanSeeYourPrereviewSciety')({ communitySlack, sciety })
            : t('write-review', 'whereYouCanSeeYourPrereview')({ communitySlack }),
        )}
      </p>

      ${form.moreAuthors === 'yes' && form.otherAuthors.length === 0
        ? html`
            <div class="inset">
              <p>${rawHtml(t('write-review', 'letUsKnowAuthorDetails')({ mailtoHelp }))}</p>
            </div>
          `
        : form.moreAuthors === 'yes' && form.otherAuthors.length > 0
          ? html`<p>${t('write-review', 'sentEmailsToAuthors')()}</p> `
          : ''}
      ${form.persona === 'public'
        ? html`
            <h2>${t('write-review', 'shareYourReview')()}</h2>

            <p>${t('write-review', 'letAuthorsKnow')()}</p>

            <p>${t('write-review', 'letCommunityKnow')()}</p>

            <div class="button-group" role="group">
              <a
                href="https://bsky.app/intent/compose?${new URLSearchParams({
                  text: plainText`I’ve just published a #PreprintReview of “${preprint.title}” on @prereview.bsky.social ${url.href}
`.toString(),
                }).toString()}"
                target="_blank"
                rel="noopener noreferrer"
                class="bluesky"
                >${t('write-review', 'shareOnBluesky')()}<span class="visually-hidden"> (${opensInNewTab})</span></a
              >
              <a
                href="https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({
                  url: url.href,
                }).toString()}"
                target="_blank"
                rel="noopener noreferrer"
                class="linked-in"
                >${t('write-review', 'shareOnLinkedin')()}<span class="visually-hidden"> (${opensInNewTab})</span></a
              >
              ${isScietyPreprint(preprint.id)
                ? html` <a
                    href="${scietyUrl(preprint.id).href}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="sciety"
                    >${t('write-review', 'listOnSciety')()}<span class="visually-hidden"> (${opensInNewTab})</span></a
                  >`
                : ''}
            </div>
          `
        : ''}

      <h2>${t('write-review', 'howItWent')()}</h2>

      <p>
        ${rawHtml(
          t(
            'write-review',
            'scheduleAnInterview',
          )({
            link: (s: string) =>
              html`
                <a
                  href="https://calendar.google.com/calendar/u/0/selfsched?sstoken=UUw4R0F6MVo1ZWhyfGRlZmF1bHR8ZGM2YTU1OTNhYzNhY2RiN2YzNTBlYTdmZTBmMzNmNDA"
                  target="_blank"
                  rel="noopener noreferrer"
                  >${s}<span class="visually-hidden"> (${opensInNewTab})</span></a
                >
              `.toString(),
          }),
        )}
      </p>

      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="button"
        >${t('write-review', 'backToPreprint')()}</a
      >
    `,
  })
}
