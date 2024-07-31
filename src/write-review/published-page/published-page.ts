import { format } from 'fp-ts-routing'
import { html, plainText } from '../../html.js'
import { templatePage } from '../../page.js'
import type { PreprintTitle } from '../../preprint.js'
import { preprintReviewsMatch } from '../../routes.js'
import { isScietyPreprint, scietyUrl } from '../../sciety.js'
import type { User } from '../../user.js'
import type { PublishedReview } from '../published-review.js'

export const publishedPage = ({
  review: { doi, form },
  preprint,
  url,
  user,
}: {
  review: PublishedReview
  preprint: PreprintTitle
  url: URL
  user: User
}) =>
  templatePage({
    title: plainText`PREreview published`,
    content: html`
      <main id="main-content">
        <div class="panel">
          <h1>PREreview published</h1>

          <div>
            Your DOI <br />
            <strong class="doi" translate="no">${doi}</strong>
          </div>
        </div>

        <h2>What happens next</h2>

        <p>
          You’ll be able to see your PREreview shortly. It’ll also appear on our
          <a href="https://bit.ly/PREreview-Slack" target="_blank" rel="noopener noreferrer"
            >Community Slack<span class="visually-hidden"> (opens in a new tab)</span></a
          >${isScietyPreprint(preprint.id)
            ? html` and
                <a href="https://sciety.org/" target="_blank" rel="noopener noreferrer"
                  >Sciety<span class="visually-hidden"> (opens in a new tab)</span></a
                >`
            : ''}.
        </p>

        ${form.moreAuthors === 'yes' && form.otherAuthors.length === 0
          ? html`
              <div class="inset">
                <p>
                  Please let us know the other authors’ details (names and ORCID&nbsp;iDs), and we’ll add them to the
                  PREreview. Our email address is
                  <a href="mailto:help@prereview.org" target="_blank" rel="noopener noreferrer"
                    >help@prereview.org<span class="visually-hidden"> (opens in a new tab)</span></a
                  >.
                </p>
              </div>
            `
          : form.moreAuthors === 'yes' && form.otherAuthors.length > 0
            ? html`<p>We’ve sent emails to the other authors, inviting them to appear.</p> `
            : ''}

        <h2>Share your review</h2>

        <p>Let the community know that you published your review.</p>

        <div class="button-group" role="group">
          <a
            href="https://twitter.com/intent/tweet/?${new URLSearchParams({
              text: plainText`I’ve just published a review of “${preprint.title}”`.toString(),
              hashtags: 'PreprintReview',
              via: 'PREreview_',
              url: url.href,
            }).toString()}"
            target="_blank"
            rel="noopener noreferrer"
            class="twitter"
            >Write a Tweet<span class="visually-hidden"> (opens in a new tab)</span></a
          >
          <a
            href="https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({
              url: url.href,
            }).toString()}"
            target="_blank"
            rel="noopener noreferrer"
            class="linked-in"
            >Share it on LinkedIn<span class="visually-hidden"> (opens in a new tab)</span></a
          >
          ${isScietyPreprint(preprint.id)
            ? html` <a href="${scietyUrl(preprint.id).href}" target="_blank" rel="noopener noreferrer" class="sciety"
                >List it on Sciety<span class="visually-hidden"> (opens in a new tab)</span></a
              >`
            : ''}
        </div>

        <h2>Let us know how it went</h2>

        <p>
          <a
            href="https://calendar.google.com/calendar/u/0/selfsched?sstoken=UUw4R0F6MVo1ZWhyfGRlZmF1bHR8ZGM2YTU1OTNhYzNhY2RiN2YzNTBlYTdmZTBmMzNmNDA"
            target="_blank"
            rel="noopener noreferrer"
            >Schedule an interview<span class="visually-hidden"> (opens in a new tab)</span></a
          >
          with our product team to discuss your experience on PREreview. We gladly compensate interviewees in
          appreciation for their help!
        </p>

        <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="button">Back to preprint</a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    type: 'streamline',
    user,
  })
