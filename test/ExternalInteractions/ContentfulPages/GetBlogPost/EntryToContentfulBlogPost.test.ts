import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { expect, it } from '@effect/vitest'
import { assertEquals } from '@effect/vitest/utils'
import resolveResponse from 'contentful-resolve-response'
import { Array, Effect, HashSet, Layer, pipe, Schema, Struct } from 'effect'
import { Locale } from '../../../../src/Context.ts'
import { Entries } from '../../../../src/ExternalApis/Contentful/index.ts'
import * as _ from '../../../../src/ExternalInteractions/ContentfulPages/GetBlogPost/EntryToContentfulBlogPost.ts'
import { Author, ContentfulBlogPost } from '../../../../src/ExternalInteractions/ContentfulPages/index.ts'
import { html } from '../../../../src/html.ts'
import { DefaultLocale } from '../../../../src/locales/index.ts'
import { Name } from '../../../../src/types/Name.ts'
import { Instant } from '../../../../src/types/Temporal.ts'

it.effect.each<{
  response: string
  index: number
  expected: ContentfulBlogPost
}>([
  {
    response: 'blog-posts-multiple-authors',
    index: 0,
    expected: new ContentfulBlogPost({
      title: html`PREreview platform news, 31 October 2025`,
      channel: 'weeknote',
      authors: [new Author({ name: Name('Chad Sansing') }), new Author({ name: Name('Chris Wilkinson') })],
      publishedAt: Instant.from('2025-10-31T14:00:00Z'),
      heroImage: undefined,
      excerpt: undefined,
      html: html`
        <p>
          <span>Thanks for checking out the latest update from the product team at <a href="/">PREreview.org</a>.</span>
        </p>
        <h1 id="whats-new-at-prereview"><span>What’s new at PREreview?</span></h1>
        <p>
          <span
            >We’re continuing to improve
            <a href="https://content.prereview.org/now-you-can-review-datasets-on-prereview-org/"
              >our new dataset review workflow</a
            >
            this week. Soon, we’ll display dataset reviews alongside preprint reviews on our webpage and community
            Slack. We’ve also added support for more registrant DOIs from Dryad to allow for the review of older
            datasets. We’ll automate the process for adding multiple authors shortly, as well.</span
          >
        </p>
        <h1 id="whats-next"><span>What’s next?</span></h1>
        <p>
          <span
            >Up next we’ll add our-use-of-AI declaration step to the dataset review workflow. Next month, we’re
            prototyping more individualized matchmaking between community members and reviews and requests that might
            interest them. We’re also prepping for our next all-hands retreat in November.</span
          >
        </p>
      `,
      locale: DefaultLocale,
      js: HashSet.empty(),
    }),
  },
  {
    response: 'blog-posts-newsletter',
    index: 0,
    expected: new ContentfulBlogPost({
      title: html`PREreview August 2026 Newsletter`,
      channel: 'newsletter',
      authors: [new Author({ name: Name('Pia Tavella') })],
      publishedAt: Instant.from('2026-08-21T14:13:47Z'),
      heroImage: {
        url: {
          avif: new URL(
            'https://images.ctfassets.net/66hjlpng9xzg/7aBxOS0x2pdbBGdTG4wNDy/ea85d7b23b575a26734e1185c9dfcb04/August-newsletter-featured-image.png?fm=avif',
          ),
          webp: new URL(
            'https://images.ctfassets.net/66hjlpng9xzg/7aBxOS0x2pdbBGdTG4wNDy/ea85d7b23b575a26734e1185c9dfcb04/August-newsletter-featured-image.png?fm=webp',
          ),
          default: new URL(
            'https://images.ctfassets.net/66hjlpng9xzg/7aBxOS0x2pdbBGdTG4wNDy/ea85d7b23b575a26734e1185c9dfcb04/August-newsletter-featured-image.png',
          ),
        },
        width: 1200,
        height: 675,
        altText: '"PREreview August Newsletter" header over photo of raindrops creating ripples on a water surface',
        caption: html`
          <p>
            <span>
              “Raindrops creating ripples on water reflecting sunset colors” shared on
              <a href="https://www.pickpik.com/en/free-stock-photo-yvjvu">PickPik</a> under Open License
            </span>
          </p>
        `,
      },
      excerpt:
        'In the past couple of months, PREreview’s team and community members have been actively championing open research evaluation, while cultivating new relationships around the globe. Dive in, and help us ripple further.',
      html: html`
        <p>
          <span>
            In the past couple of months, PREreview’s team and community members have been actively championing open
            research evaluation, while cultivating new relationships around the globe. Dive in, and help us ripple
            further.
          </span>
        </p>
        <h3 id="last-days-to-register-for-our-review-a-thon-with-your-club">
          <span>Last Days to Register for our Review-a-thon with your Club!</span>
        </h3>
        <picture>
          <source
            srcset="
              https://images.ctfassets.net/66hjlpng9xzg/6BmOyODL93skgyxtdKpoXT/35795ed414b2f2f7ce0e459dab0a73cf/PRW-for-newsletter-300x300-1.png?fm=avif
            "
            type="image/avif"
          />
          <source
            srcset="
              https://images.ctfassets.net/66hjlpng9xzg/6BmOyODL93skgyxtdKpoXT/35795ed414b2f2f7ce0e459dab0a73cf/PRW-for-newsletter-300x300-1.png?fm=webp
            "
            type="image/webp"
          />
          <img
            src="https://images.ctfassets.net/66hjlpng9xzg/6BmOyODL93skgyxtdKpoXT/35795ed414b2f2f7ce0e459dab0a73cf/PRW-for-newsletter-300x300-1.png"
            width="300"
            height="300"
            alt="Peer Review Week logo"
            loading="lazy"
          />
        </picture>
        <p>
          <span>
            To celebrate 2026 <a href="https://peerreviewweek.net/"><b>Peer Review Week</b></a
            ><b> (September 14-18)</b>, PREreview is organizing a <b>Review-a-thon</b>: a global event where
            newly-formed and existing <a href="/clubs">PREreview Clubs</a> synchronously carry out collaborative reviews
            of preprints and datasets. Our goal is to showcase how human, community-driven peer review can help drive
            change in the research evaluation culture.
          </span>
        </p>
        <p>
          <span>
            Participating Clubs that organize and carry out at least one collaborative review during Peer Review Week,
            and publish the resulting PREreview(s)—co-authored by two or more people—within the following two weeks will
            be entered into a <b>raffle for a 500 USD fund</b> to support their future group activities.
          </span>
        </p>
        <p>
          <span>
            Registration for the Review-a-thon is open through <b>August 31, 2026</b>. We especially want to encourage
            participation from communities that review in <b>languages other than English</b>,
            <b>groups reviewing datasets and data papers</b>, as well as clubs specializing in
            <b>social sciences and humanities</b>. Gather your lab, classroom, journal club, department, or scholarly
            community to give constructive feedback on a research output as a team!
          </span>
        </p>
        <a href="https://sites.google.com/prereview.org/review-a-thon/about?authuser=4" class="button">
          <span>LEARN MORE &amp; REGISTER</span>
        </a>
        <p>
          <span>
            💌 Please let us know if you have any questions at
            <a href="mailto:community@prereview.org">community@prereview.org</a>, and check out the<a
              href="https://sites.google.com/prereview.org/review-a-thon/faqs?authuser=4"
            >
              FAQs section</a
            >
            on the website. Feel free to extend the invite to colleagues and reshare it on social media.
          </span>
        </p>
        <hr />
        <h3 id="prereview-in-dialogue"><span>PREreview in Dialogue</span></h3>
        <figure>
          <picture>
            <source
              srcset="
                https://images.ctfassets.net/66hjlpng9xzg/7xeXutu3K4YyrmbEh5h38m/a9f7226e0e3d12c522d0cf9924e61c8c/dialogue-newsletter-inside-image-300x300.png?fm=avif
              "
              type="image/avif"
            />
            <source
              srcset="
                https://images.ctfassets.net/66hjlpng9xzg/7xeXutu3K4YyrmbEh5h38m/a9f7226e0e3d12c522d0cf9924e61c8c/dialogue-newsletter-inside-image-300x300.png?fm=webp
              "
              type="image/webp"
            />
            <img
              src="https://images.ctfassets.net/66hjlpng9xzg/7xeXutu3K4YyrmbEh5h38m/a9f7226e0e3d12c522d0cf9924e61c8c/dialogue-newsletter-inside-image-300x300.png"
              width="300"
              height="300"
              alt="Hand-drawn sketch of two male and one female characters chatting with papers in their hands and a cellphone. A hand-written phrase reads “let’s chat” in the bottom-left corner."
              loading="lazy"
            />
          </picture>
          <figcaption>
            <p>
              <span>Credits: by Getillustrations. Canva Pro licensed content.</span>
            </p>
          </figcaption>
        </figure>
        <figure>
          <youtube-embed data-video-id="dQw4w9WgXcQ" data-title="PREreview in Dialogue">
            <a
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              class="youtube-video"
              aria-describedby="youtube-caption-2YtVid3oEmb3dXmPlE0aBc"
            >
              <img
                src="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
                width="480"
                height="360"
                alt=""
                loading="lazy"
              />
              <span lang="en" dir="ltr">
                Watch <cite class="visually-hidden">PREreview in Dialogue</cite> on YouTube
              </span>
            </a>
          </youtube-embed>
          <figcaption id="youtube-caption-2YtVid3oEmb3dXmPlE0aBc">
            <p>
              <span>A conversation about <i>open peer review</i></span>
            </p>
          </figcaption>
        </figure>
        <p>
          <span>
            <b>Pia Tavella at the IV Encuentro de la Red Chilena de Revistas Científicas de Acceso Abierto</b>
          </span>
        </p>
        <p>
          <span>
            The
            <a href="https://redrevistascientificas.uestatales.cl/"
              >Red Chilena de Revistas Científicas de Acceso Abierto</a
            >
            (Chilean Network for Open Access Journals) convenes more than 200 scientific journals managed by 15 public
            universities to strengthen shared capacities and professionalize the editorial teams. On the 10th and 11th
            of August, journal editors, librarians, university administrators, and researchers gathered at the network’s
            fourth annual meeting held in Santiago de Chile to share their reflections and experiences in scholarly
            communications. The event agenda spanned from academic integrity, new technologies applied to editorial
            workflows and data privacy, to trends in open science, scientometrics and open peer review.
          </span>
        </p>
        <p>
          <span>
            <b>Pia Tavella</b>, PREreview’s Communications and Engagement Officer, gave both a
            <a href="https://doi.org/10.5281/zenodo.21777105">talk on Open Peer Review models</a> and a more interactive
            <a href="https://doi.org/10.5281/zenodo.21880647"
              >workshop about pathways for early-career researchers and journal editors to engage with PREreview</a
            >. The meeting was a unique opportunity to exchange knowledge on the challenges and initiatives shaping
            scholarly communications, and to build relationships with the open access ecosystem in Latin America.
          </span>
        </p>
        <p>
          <span><b>Daniela Saderi at September 2026 OpenCon Librarian Community Call</b></span>
        </p>
        <p>
          <span>
            <a href="https://www.opencon.community/">OpenCon</a> supports a dynamic, diverse, and growing community that
            works year-round to advance Open Access, Open Education, and Open Data. On September 8, 2026, they’re
            holding a Community Call aimed at folks working at the intersection of libraries and Open.
          </span>
        </p>
        <p>
          <span>
            In this session, PREreview Executive Director and Co-founder<b> Daniela Saderi</b> will explore how open
            review models can expand participation, create new opportunities for learning and dialogue, and strengthen
            trust in research. The talk will also address the role librarians can play as educators, connectors, and
            stewards of open scholarly infrastructure in helping shape a future where knowledge is held in trust by the
            many, rather than controlled by the few.
          </span>
        </p>
        <p>
          <span>
            OpenCon Community Calls are not recorded to support a safer environment for honest discussion. While the
            September 2026 OpenCon Librarian Community Call is only open for library staff to register, the
            <a href="https://docs.google.com/document/d/17Vp0oQIn66aFkq7ZBKUyodWQwLbqIkYzjbTXtTP96Lc/edit?usp=sharing"
              >notes</a
            >
            will be made public.
          </span>
        </p>
        <p>
          <span><b>Rosario Rogel Salazar at open peer review workshop organized by Red de Politólogas</b></span>
        </p>
        <p>
          <span>
            <a href="https://sites.google.com/view/reddepolitologas/inicio?authuser=0">Red de Politólogas</a> is an
            international network that brings together one of the largest communities of female political scientists in
            the world. Their mission is to strengthen the visibility, leadership, and professional development of women
            in political science, an historically male-dominated field. The network has several
            <a href="https://sites.google.com/view/reddepolitologas/liderazgo-editorial?authuser=0"
              >members with leadership roles</a
            >
            in specialized scientific journals who advocate for more gender diversity in editorial boards.
          </span>
        </p>
        <p>
          <span>
            On August 21st, 2026, <b>PREreview Champion Rosario Rogel Salazar </b>is delivering a members-only workshop
            on open peer review for scientific journals. The activity is collaboratively organized by the Red de
            Politólogas together with Revista Argentina de Ciencia Política, Revista Mexicana de Derecho Electoral,
            Revista de Ciencia Política (Santiago), Revista Mexicana de Ciencias Políticas y Sociales, Iconos, Revista
            de Ciencias Sociales, Brazilian Political Sciences Review, Revista SAAP, Revista Electrónica del Instituto
            de Investigaciones Jurídicas y Sociales &quot;Ambrosio Gioja&quot;, and PREreview.
          </span>
        </p>
        <hr />
        <h3 id="prereview-champions-in-action"><span>PREreview Champions in Action!</span></h3>
        <figure>
          <picture>
            <source
              srcset="
                https://images.ctfassets.net/66hjlpng9xzg/7LIsbgSGrQUNlIkYmj0q1K/a8c103d8fdf0efb746df210a08a23d20/champions-300x300.png?fm=avif
              "
              type="image/avif"
            />
            <source
              srcset="
                https://images.ctfassets.net/66hjlpng9xzg/7LIsbgSGrQUNlIkYmj0q1K/a8c103d8fdf0efb746df210a08a23d20/champions-300x300.png?fm=webp
              "
              type="image/webp"
            />
            <img
              src="https://images.ctfassets.net/66hjlpng9xzg/7LIsbgSGrQUNlIkYmj0q1K/a8c103d8fdf0efb746df210a08a23d20/champions-300x300.png"
              width="300"
              height="300"
              alt="A group of eight hands and arms with all different skin tones, accessories, and clothes creating a heart shape around the PREreview logo."
              loading="lazy"
            />
          </picture>
          <figcaption>
            <p>
              <span>Credits: “Diverse Hands Making Heart” by Vectorfair Y. Canva Pro licensed content</span>
            </p>
          </figcaption>
        </figure>
        <p>
          <span>
            For the past couple of months, 2026 PREreview Champions have been spreading out the word about open peer
            review across their local communities and building opportunities for others to engage with the Open Science
            movement.
          </span>
        </p>
        <p>
          <span><b>In June:</b></span>
        </p>
        <ul>
          <li>
            <span>
              2026 PREreview Champions <b>Daniel Adediran</b>, <b>Morlai Sesay</b> and <b>Mabel B. Omoniwa</b> organized
              the &quot;Democratizing Peer Review: Empowering Early-Career Researchers through Open and Collaborative
              Science&quot; webinar, joined by 2024 PREreview Champion <b>Seun Olufemi</b> as an invited speaker.</span
            >
          </li>
        </ul>
        <p>
          <span><b>In July:</b></span>
        </p>
        <ul>
          <li>
            <span
              ><b>Shitondo Yahila</b> organized an Open Research Symposium with support from The University of Zambia
              Medical Students Association. The event was targeted at undergraduate healthcare students and early-career
              researchers. A total of 80+ people participated in three different sessions, including a Live
              Review!</span
            >
          </li>
          <li>
            <span
              ><b>Daniel Adediran</b>, <b>Morlai Sesay</b> and <b>Deborah Mariama Kamara</b> hosted a webinar on
              &quot;Empowering Undergraduate and Postgraduate Students as Agents of Change in Peer Review Across All
              Communities&quot;.</span
            >
          </li>
          <li>
            <span
              ><b>Alan Colin Arce </b>published an insights report for the Open Scholarship Policy Observatory under the
              title “Perceptions, Impact, and the State of Open Peer Review”. Available in
              <a href="https://ospolicyobservatory.uvic.ca/perceptions-impact-and-the-state-of-open-peer-review/"
                >English</a
              >
              and <a href="https://ospolicyobservatory.uvic.ca/evaluation-ouverte/">French</a>.</span
            >
          </li>
        </ul>
        <hr />
        <h3 id="modular-peer-review-working-group-learnings-and-next-steps">
          <span>Modular Peer Review Working Group: Learnings and Next Steps</span>
        </h3>
        <picture>
          <source
            srcset="
              https://images.ctfassets.net/66hjlpng9xzg/6YLGkTOchGcjmM8pnmcmgk/6439ef7448cd7320b707da998d02c7b4/Newsletter-images---small--300-x-300-px---5-.jpg?fm=avif
            "
            type="image/avif"
          />
          <source
            srcset="
              https://images.ctfassets.net/66hjlpng9xzg/6YLGkTOchGcjmM8pnmcmgk/6439ef7448cd7320b707da998d02c7b4/Newsletter-images---small--300-x-300-px---5-.jpg?fm=webp
            "
            type="image/webp"
          />
          <img
            src="https://images.ctfassets.net/66hjlpng9xzg/6YLGkTOchGcjmM8pnmcmgk/6439ef7448cd7320b707da998d02c7b4/Newsletter-images---small--300-x-300-px---5-.jpg"
            width="300"
            height="300"
            alt="Continuous Science Foundation and PREreview logos joined by a plus sign, representing collaboration."
            loading="lazy"
          />
        </picture>
        <p>
          <span>
            Research is an iterative process: questions evolve, methods change, and analyses get refined. What if peer
            review could arrive at those moments where it has the greatest potential to improve the work, rather than
            centering only on the final output?
          </span>
        </p>
        <p>
          <span>
            That concept was core to the Modular Peer Review Working Group endeavour between January and July, 2026.
            Convened by the <a href="https://continuousfoundation.org/">Continuous Science Foundation</a> &amp;
            PREreview, more than 60 researchers, infrastructure builders, publishers, and community members generated
            practical, testable ideas for integrating useful and timely feedback across the research lifecycle.
          </span>
        </p>
        <p>
          <span>
            PREreview deeply thanks everyone who participated and contributed their thoughts to the Modular Peer Review
            Working Group. The final report captures not only the foundations we built together, but is also an
            <b>open invitation for others in the scholarly communications ecosystem</b> to help shape what comes next.
            Please reach out to share your questions, feedback, and collaboration proposals to expand on this work.
          </span>
        </p>
        <a href="https://articles.continuousfoundation.org/articles/modular-peer-review/report" class="button">
          <span>READ THE FINAL REPORT</span>
        </a>
        <hr />
        <h3 id="events"><span>Events</span></h3>
        <figure>
          <picture>
            <source
              srcset="
                https://images.ctfassets.net/66hjlpng9xzg/4ZisgVJ2U8zfBoTrQ3G7LG/5a1e57841869e6358ceca1230436e92a/2025-newsletter-images--1-.png?fm=avif
              "
              type="image/avif"
            />
            <source
              srcset="
                https://images.ctfassets.net/66hjlpng9xzg/4ZisgVJ2U8zfBoTrQ3G7LG/5a1e57841869e6358ceca1230436e92a/2025-newsletter-images--1-.png?fm=webp
              "
              type="image/webp"
            />
            <img
              src="https://images.ctfassets.net/66hjlpng9xzg/4ZisgVJ2U8zfBoTrQ3G7LG/5a1e57841869e6358ceca1230436e92a/2025-newsletter-images--1-.png"
              width="300"
              height="300"
              alt="A red megaphone icon outlined in black against a white background."
              loading="lazy"
            />
          </picture>
          <figcaption>
            <p><span>Credits: Wena Vega from sketchify</span></p>
          </figcaption>
        </figure>
        <p>
          <span><b>Upcoming events</b></span>
        </p>
        <ul>
          <li>
            <span
              ><b>August 26, 2026 - 13:00 UTC —</b> “Metadata for All with Wikidata” free webinar. Speakers will address
              FAIR open data principles, strategies to mitigate systemic information gaps, and the value of public
              access to reference datasets for elevating marginalized demographics and promoting scholarly
              dissemination.
              <a href="https://force11.org/post/webinar-metadata-for-all-with-wikidata/">More info and registration</a
              >.</span
            >
          </li>
          <li>
            <span
              ><b>September 8, 2026 - 19:00 UTC —</b> “Are You That White Ally? Recognizing &amp; Interrupting White
              Narcissism in NPs” free-of-charge strategy session by Healing Equity United.
              <a
                href="https://www.eventbrite.com/e/are-you-that-white-ally-recognizing-interrupting-white-narcissism-in-nps-tickets-1992842143497?aff=oddtdtcreator"
                >More info and registration</a
              >.</span
            >
          </li>
          <li>
            <span
              ><b>September 14-18, 2026</b> <b>—</b>
              <a href="https://peerreviewweek.net/events.php">Peer Review Week events &amp; activities</a> from around
              the globe.</span
            >
          </li>
          <li>
            <span
              ><b>September 15, 2026 - 12:00 UTC —</b> <a href="https://www.rcmcooperative.com/#">RCM Cooperative</a> is
              launching a monthly meetup series, open to anyone working in or around research community management.
              <a href="https://www.rcmcooperative.com/blog/introducing-monthly-meetups/">Learn more and register</a
              >.</span
            >
          </li>
        </ul>
        <p>
          <span><b>Recent events</b></span>
        </p>
        <ul>
          <li>
            <span
              ><b>August 12, 2026 — </b>“Metadata health check: A tour of the Crossref Participation Reports tool”,
              about how to assess your metadata quality, understand why complete metadata matters, and identify ways to
              improve the completeness and quality of your Crossref metadata.
              <a href="https://youtu.be/d9i9Ko1PCiE?si=D-HFj6xTUz-rzfL2">Recording available</a>.</span
            >
          </li>
          <li>
            <span
              ><b>June 2, 2026 — </b>CHORUS Forum: Future of Preprints. Speakers: Katie Corker (ASAPbio), Dawn Melley
              (IEEE), Ben Mudrak (American Chemical Society/ChemRxiv), Kelly Cohen (Optica Publishing Group), and
              Samantha Hindle (bioRxiv &amp; medRxiv).
              <a href="https://youtu.be/Z3egFUvw7q4?si=xtpi3DHQvz87iKBe">Recording available</a></span
            >
          </li>
          <li>
            <span
              ><b>June 2-4, 2026 — </b>European Association of Science Editors (EASE) Summer Symposium 2026.
              <a href="https://sh1.sendinblue.com/amzp8hmkclpfe.html?t=1782740530901"
                >Recordings of the free sessions</a
              >
              are available.</span
            >
          </li>
        </ul>
        <hr />
        <h3 id="highlights-from-our-slack-community"><span>Highlights from our Slack Community</span></h3>
        <picture>
          <source
            srcset="
              https://images.ctfassets.net/66hjlpng9xzg/3D56aYtUlBhKOXXDh1Q34d/7549db830de79805d575f2adb2c0c282/Slack-highlights---300x300.png?fm=avif
            "
            type="image/avif"
          />
          <source
            srcset="
              https://images.ctfassets.net/66hjlpng9xzg/3D56aYtUlBhKOXXDh1Q34d/7549db830de79805d575f2adb2c0c282/Slack-highlights---300x300.png?fm=webp
            "
            type="image/webp"
          />
          <img
            src="https://images.ctfassets.net/66hjlpng9xzg/3D56aYtUlBhKOXXDh1Q34d/7549db830de79805d575f2adb2c0c282/Slack-highlights---300x300.png"
            width="300"
            height="300"
            alt="The PREreview logo at the top and Slack logo at the bottom with the image of a paper in white on a red background"
            loading="lazy"
          />
        </picture>
        <ul>
          <li>
            <span
              ><b
                ><b><b>What we are reading:</b></b></b
              ></span
            >
          </li>
        </ul>
        <p>
          <span
            >-<a href="https://upstream.force11.org/community-peer-review-to-build-resilience/"
              ><i>Community Peer Review for Resistance and Resilience</i></a
            >, by Christopher Steven Marcum &amp; Daniela Saderi (PREreview)-<a
              href="https://sciencepolitics.org/2026/08/17/science-doesnt-need-better-journals-it-needs-better-incentives/"
              ><i>Science Doesn’t Need Better Journals. It Needs Better Incentives</i></a
            >, by JP Flores &amp; Hannah Frank-<a
              href="https://www.inasp.info/publications/support-preprint-sharing-six-levers-equitable-research-access"
              ><i>How to Support Preprint Sharing: Six Levers to Advance Equitable Research Access</i></a
            >, a policy paper published by INASP-<a
              href="https://katinamagazine.org/content/article/open-knowledge/2026/equity-in-open-access-means-thinking-beyond-fees"
              ><i>Equity in Open Access Means Thinking Beyond Fees</i></a
            >, by Johan Rooryck-<a href="https://doi.org/10.6084/m9.figshare.32685351"
              ><i>The Future of Peer Review: A system-wide perspective</i></a
            >, the report of the Research on Research Institute (RoRI) project conducted from 2023-2026-<a
              href="https://reseaucirce.org/en/nouvelles/vers-une-evaluation-ouverte-repenser-levaluation-par-les-pairs-en-contexte-de-science-ouverte/"
              ><i>Towards open assessment: rethinking peer review in the context of open science</i></a
            ><i>,</i> a report by the Circé Network in Canada</span
          >
        </p>
        <ul>
          <li>
            <span>
              The <b>OSPARK Bootcamp</b> (20 September - 12 November, 2026) is a hands-on programme designed to help
              Open Research ambassadors build practical outreach and marketing skills. The bootcamp combines a
              <b>6-week online course with a 2-day in-person workshop </b>in Zurich (Switzerland), giving participants
              the tools, feedback, and community to develop a communication strategy for their own initiative.
              Participation is free, with a limited number of travel stipends available.
              <a href="https://events.digital-research.academy/event/137/">Apply by August 23, 2026</a>.
            </span>
          </li>
          <li>
            <span>
              openRxiv is looking for an <b>Engineering Manager</b> who combines hands-on technical depth with
              people-first management, all while championing openRxiv’s mission of accelerating open, accessible
              science. Remote, full-time position, based in the U.S. or some international countries.
              <a href="https://openrxiv.applytojob.com/apply/ggcbCVGkSQ/Engineering-Manager">Apply here</a>.
            </span>
          </li>
          <li>
            <span>
              <a href="https://translate-science.codeberg.page/prereview.html">Translate Science</a>, una comunidad
              unida en torno a su interés por la ciencia abierta multilingüe, está organizando una
              <b>revisión en vivo en español para participar del Review-a-thon</b>! La sesión está programada para el 16
              de septiembre, de 14:00 a 15:30 UTC. Visita el sitio web para conocer más sobre su Club de PREreview y
              sumarte a su lista de correos.
            </span>
          </li>
        </ul>
        <p>
          <span>
            If you are looking for your next career step, check out the openings in our
            <a href="https://prereviewcommunity.slack.com/archives/C05B18Z33B9">#jobs-and-opportunities</a> channel, and
            share any of your own.
          </span>
        </p>
        <p>
          <span>
            You can also find lots of preprint authors requesting feedback on their work in our
            <a href="https://prereviewcommunity.slack.com/archives/C05B95LEN5C">#request-a-review</a> channel.
          </span>
        </p>
        <a href="https://bit.ly/PREreview-Slack" class="button">
          <span>JOIN THE CONVERSATION</span>
        </a>
      `,
      locale: DefaultLocale,
      js: HashSet.make('youtube-embed.js' as const),
    }),
  },
  {
    response: 'blog-posts-interview',
    index: 0,
    expected: new ContentfulBlogPost({
      title: html`An interview with PREreview Champion Mabel Omoniwa`,
      channel: 'blog',
      authors: [new Author({ name: Name('Pia Tavella') })],
      publishedAt: Instant.from('2026-08-26T13:04:49Z'),
      heroImage: {
        url: {
          avif: new URL(
            'https://images.ctfassets.net/66hjlpng9xzg/5s0piRdgTblQmCygABe2gj/41b32f59679824ca6a1e61113b011538/Mabel-blog-header-2.png?fm=avif',
          ),
          webp: new URL(
            'https://images.ctfassets.net/66hjlpng9xzg/5s0piRdgTblQmCygABe2gj/41b32f59679824ca6a1e61113b011538/Mabel-blog-header-2.png?fm=webp',
          ),
          default: new URL(
            'https://images.ctfassets.net/66hjlpng9xzg/5s0piRdgTblQmCygABe2gj/41b32f59679824ca6a1e61113b011538/Mabel-blog-header-2.png',
          ),
        },
        width: 1200,
        height: 675,
        altText: undefined,
        caption: undefined,
      },
      excerpt:
        'In this piece, Mabel weighs on the opportunities Open Peer Review presents to early-career researchers and scholars from resource-constrained settings, while considering the conditions needed to foster its adoption.',
      html: html`
        <p>
          <span>
            In this piece, Mabel weighs on the opportunities Open Peer Review presents to early-career researchers and
            scholars from resource-constrained settings, while considering the conditions needed to foster its adoption.
          </span>
        </p>
        <h3 id="why-did-you-decide-to-apply-for-the-prereview-champions-program">
          <span>Why did you decide to apply for the PREreview Champions program?</span>
        </h3>
        <blockquote>
          <p>
            <span>
              I applied for the <a href="/champions-program">Champions program</a> because I was increasingly interested
              in how research can become more open, collaborative, and accessible, particularly for early-career
              researchers. I was already developing an interest in research and scholarly communication, but I wanted to
              understand open peer review beyond simply knowing what it meant. I wanted to learn how researchers could
              actively participate in the review process, contribute constructively to scientific discussions, and help
              make research communication more inclusive.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              I was also particularly drawn to the community aspect of the program. Coming from Nigeria, I see how
              <b
                >differences in access to mentorship, research networks, publishing opportunities, and scholarly
                resources can shape who gets heard in science</b
              >. I saw PREreview Champions as an opportunity not only to develop my own skills but also to take what I
              learned back to my community.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              Ultimately, I applied because I wanted to move from being interested in open science to becoming someone
              who actively contributes to it.
            </span>
          </p>
        </blockquote>
        <h3 id="how-was-your-experience-during-the-training-part-of-the-program">
          <span>How was your experience during the training part of the program?</span>
        </h3>
        <blockquote>
          <p>
            <span>
              The training experience exceeded my expectations. I came into the program interested in Open Science and
              peer review, but the training gave me a much broader understanding of the principles, history, and
              practical realities behind them. I particularly appreciated learning how different components of Open
              Science connect and why openness in research communication matters.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              One of my favorite aspects was the opportunity to learn collaboratively with other Champions. It was
              valuable to hear perspectives from people working in different contexts and to
              <b
                >think together about how we could translate what we were learning into meaningful activities within our
                own communities</b
              >.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              Another highlight was moving from theory to practice. The programme encouraged us to think beyond simply
              understanding open peer review, and actually consider how we could facilitate conversations, engage
              researchers, and create opportunities for others to participate.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              If I had to identify a less-favorite part, it would probably be the challenge of balancing the programme
              activities with my other academic and professional commitments. However, that also taught me an important
              lesson about planning and communicating consistently within a team.
            </span>
          </p>
        </blockquote>
        <h3
          id="to-complete-the-program-champions-have-to-organize-and-deliver-their-own-engagement-activities-in-their-local-communities-tell-us-a-bit-about-yours"
        >
          <span>
            To complete the program, Champions have to organize and deliver their own engagement activities in their
            local communities. Tell us a bit about yours
          </span>
        </h3>
        <blockquote>
          <p>
            <span>
              Our engagement activity was a virtual webinar and practical preprint review session titled “<a
                href="https://www.linkedin.com/posts/mabel-omoniwa-192794293_reflecting-on-our-prereview-champions-webinar-activity-7476485670501482496-Gg3s?utm_source=share&amp;utm_medium=member_desktop&amp;rcm=ACoAADyWEY4Bw_pSnR5WrSl0dYsaJArj_UNwX6A"
                >Democratizing Peer Review: Empowering Early-Career Researchers through Open and Collaborative
                Science</a
              >.” It was designed primarily for early-career researchers, students, and others interested in research
              and scholarly communication within the wider African research community.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              The session introduced 26 participants to the history and principles of open peer review, the role of
              preprints, bias in peer review, and the practical process of engaging with preprints. We also incorporated
              a live preprint review component so<b>
                participants could move from learning about open peer review to experiencing it in practice</b
              >.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              The feedback we got through the post-event survey was very encouraging. Confidence in writing constructive
              reviewer comments increased from 2.77/5 to 4.29/5, while confidence in submitting to a preprint server
              increased from 2.15/5 to 3.43/5. Every survey respondent said they would recommend the workshop to a
              colleague.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              My biggest takeaway was that there is significant interest in open peer review, but many early-career
              researchers simply need exposure, mentorship, and a safe environment to participate.
            </span>
          </p>
        </blockquote>
        <h3
          id="what-impacts-do-you-think-open-peer-review-practices-can-have-on-the-scholarly-communications-landscape-in-your-country-and-region"
        >
          <span>
            What impacts do you think open peer review practices can have on the scholarly communications landscape in
            your country and region?
          </span>
        </h3>
        <blockquote>
          <p>
            <span>
              I think open peer review could contribute significantly to making scholarly communication more
              transparent, inclusive, and participatory in Nigeria and across Africa. Traditional research and
              publishing systems can sometimes feel difficult to navigate, particularly for early-career researchers who
              may have limited access to experienced mentors and established research networks.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              Open peer review creates an opportunity to make the review process more visible and to help researchers
              develop reviewing skills earlier in their careers. It can also
              <b
                >encourage constructive scientific dialogue rather than positioning peer review purely as a gatekeeping
                mechanism</b
              >.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              For researchers in resource-constrained settings, open practices can also support
              <b>greater visibility and participation in global research conversations</b>. Preprints, collaborative
              review, and recognition for review contributions can create additional pathways for researchers to share
              their work and contribute to the work of others.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              However, <b>I believe adoption will require awareness-building and capacity development</b>. Researchers
              need practical guidance on how these models work, how to review responsibly, and how to navigate concerns
              around bias, ethics, and research quality. That is why community-based initiatives and mentorship are
              particularly important.
            </span>
          </p>
        </blockquote>
        <h3 id="would-you-recommend-participating-in-the-prereview-champions-program-to-others">
          <span>Would you recommend participating in the PREreview Champions program to others?</span>
        </h3>
        <blockquote>
          <p>
            <span>
              Absolutely. I would particularly recommend the PREreview Champions program to early-career researchers,
              students, researchers who are interested in scholarly communication, and anyone curious about Open Science
              but unsure about how to begin engaging with it.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              One thing I appreciated about the program is that you do not have to arrive as an expert. It provides an
              <b
                >environment where you can learn, ask questions, collaborate with others, and gradually develop the
                confidence to engage with open peer review</b
              >.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              I would especially encourage researchers from underrepresented or resource-constrained research
              communities to consider opportunities like this. Open Science can feel like a complex global conversation,
              but programmes such as PREreview Champions create opportunities to bring that conversation into local
              communities and adapt it to their realities.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              <b
                >For me, the greatest value was not only learning about open peer review but also being challenged to
                become an active contributor.</b
              >
              You leave with knowledge, a community, and the opportunity to turn what you have learned into something
              that benefits others.
            </span>
          </p>
        </blockquote>
        <h3 id="before-we-wrap-up-is-there-anything-else-youd-like-to-share">
          <span>Before we wrap up, is there anything else you’d like to share?</span>
        </h3>
        <blockquote>
          <p>
            <span>
              One of my biggest reflections from this experience is that Open Science becomes much more meaningful when
              people are given opportunities to participate, rather than simply being told about its principles. The
              PREreview Champions program gave me the opportunity to move from learning about open peer review to
              facilitating conversations around it within my community.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              I would like to continue building on that experience by supporting more practical engagement with
              preprints and open peer review. I am particularly interested in facilitating
              <a href="/live-reviews">Live Review</a> sessions where early-career researchers can learn by doing, and I
              am also exploring the process of preparing and sharing research as a preprint.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              More broadly, I hope to continue working at the intersection of biomedical research, health innovation,
              and evidence-informed practice, while advocating for approaches that make scientific knowledge more
              accessible and collaborative.
            </span>
          </p>
        </blockquote>
        <blockquote>
          <p>
            <span>
              If there is one message I would leave with other early-career researchers, it is this:
              <b>you do not have to wait until you are a senior researcher to contribute to the research ecosystem</b>.
              There are meaningful ways to participate, learn, review, collaborate, and help others learn alongside you.
            </span>
          </p>
        </blockquote>
      `,
      locale: DefaultLocale,
      js: HashSet.empty(),
    }),
  },
  {
    response: 'blog-posts-large-hero-image',
    index: 0,
    expected: new ContentfulBlogPost({
      title: html`2026 Q1 PREreview Advisory Committee Meeting Minutes`,
      channel: 'blog',
      authors: [new Author({ name: Name('Sam Hindle') })],
      publishedAt: Instant.from('2026-03-31T16:47:11Z'),
      heroImage: {
        url: {
          avif: new URL(
            'https://images.ctfassets.net/66hjlpng9xzg/5ZrxgBlBK24JRfVuxp5Xu4/239db95c59d28f4f56a7d2573c6fe9c9/AC-meeting-minutes-banner.png?w=1600&fm=avif',
          ),
          webp: new URL(
            'https://images.ctfassets.net/66hjlpng9xzg/5ZrxgBlBK24JRfVuxp5Xu4/239db95c59d28f4f56a7d2573c6fe9c9/AC-meeting-minutes-banner.png?w=1600&fm=webp',
          ),
          default: new URL(
            'https://images.ctfassets.net/66hjlpng9xzg/5ZrxgBlBK24JRfVuxp5Xu4/239db95c59d28f4f56a7d2573c6fe9c9/AC-meeting-minutes-banner.png?w=1600',
          ),
        },
        width: 1600,
        height: 900,
        altText: '"PREreview Advisory Committee Meeting Minutes - March 3, 2026" banner',
        caption: undefined,
      },
      excerpt:
        'Welcome to new AC members, goodbye and gratitude to Kristen Ratan. Overview of PREreview governance and the role of the Advisory Committee. Review of strategic plan activities and finance overview.',
      html: html`
        <p><span>2026 Quarter 1 Meeting: March 3, 2026 - 16:30 to 18:00 UTC</span></p>
        <h3 id="attendees"><span>Attendees</span></h3>
        <p>
          <span>
            Daniela Saderi, Christopher Marcum, Aurelia Munene, Monica Granados, Malvika Sharan, Kristen Ratan, Sam
            Hindle, Kirstie Whitaker, Lamis Elkheir
          </span>
        </p>
        <h3 id="agenda"><span>Agenda</span></h3>
        <p>
          <span>
            <b>I. </b
            ><a
              href="https://content.prereview.org/change-is-in-the-air-for-our-advisory-committee-welcomes-goodbyes-and-deep-gratitude-to-all/"
              ><b>Welcomes and goodbyes</b></a
            ><b
              >: New AC members, and celebrate Kristen’s departure from the AC after 6 years of service - Thank you,
              Kristen!</b
            >
          </span>
        </p>
        <p>
          <span>
            <b>II. Overview of PREreview governance and the role of the Advisory Committee</b>a. Advisory Committee
            Handbook and Charter discussed
          </span>
        </p>
        <p>
          <span>
            b. Governance and decision-making at PREreview presented and discussed. Public Slide deck: PREreview. (2026,
            March 31). <i>Governance and Decision-Making at PREreview</i>. Zenodo.
            <a href="https://doi.org/10.5281/zenodo.19355617">https://doi.org/10.5281/zenodo.19355617</a>
          </span>
        </p>
        <p>
          <span>
            c. Discussed vacancy for the Treasurer role and the possibility of having a Finance Committee of several AC
            members
          </span>
        </p>
        <p>
          <span>
            <b>III. Review of strategic plan activities and finance overview</b>a. PREreview
            <a href="https://zenodo.org/records/18261903">3Y Strategic Plan document</a> and
            <a href="https://zenodo.org/records/18612994">deck</a> discussed1) AC discussed how PREreview measures
            impact and implements feedback from the community, in relation to shaping KRs and strategic plan.
          </span>
        </p>
        <p><span>b. Finances and funding opportunities overview</span></p>
      `,
      locale: DefaultLocale,
      js: HashSet.empty(),
    }),
  },
  {
    response: 'blog-posts-video',
    index: 0,
    expected: new ContentfulBlogPost({
      title: html`Call to Help Rapidly Review COVID-19 Preprints`,
      channel: 'blog',
      authors: [new Author({ name: Name('Daniela Saderi') })],
      publishedAt: Instant.from('2020-09-22T21:08:05Z'),
      heroImage: undefined,
      excerpt: undefined,
      html: html`
        <figure>
          <picture>
            <source
              srcset="
                https://images.ctfassets.net/dapbmjoaf8gb/13WMqACJmEZWeqJFMiDER7/465e1be2e6acef1c34304b0200f545bf/Screen-Shot-2020-09-14-at-10.58.31-AM.png?fm=avif
              "
              type="image/avif"
            />
            <source
              srcset="
                https://images.ctfassets.net/dapbmjoaf8gb/13WMqACJmEZWeqJFMiDER7/465e1be2e6acef1c34304b0200f545bf/Screen-Shot-2020-09-14-at-10.58.31-AM.png?fm=webp
              "
              type="image/webp"
            />
            <img
              src="https://images.ctfassets.net/dapbmjoaf8gb/13WMqACJmEZWeqJFMiDER7/465e1be2e6acef1c34304b0200f545bf/Screen-Shot-2020-09-14-at-10.58.31-AM.png"
              width="1312"
              height="590"
              alt=""
              loading="lazy"
            />
          </picture>

          <figcaption>
            <p>
              <span>
                Organizations that have signed and endorsed the
                <a href="https://oaspa.org/covid-19-publishers-open-letter-of-intent-rapid-review/">Open Letter</a>
                published on April 27, 2020.
              </span>
            </p>
          </figcaption>
        </figure>
        <p>
          <span>
            The COVID-19 pandemic is pushing the boundaries of research evaluation and dissemination towards more
            collaborative and open workflows that include sharing research as preprints and engaging the research
            community in the review of these early versions of research manuscripts.
          </span>
        </p>
        <p>
          <span>
            On April 2020, PREreview joined a group of publishers and scholarly communications organizations in
            <a href="https://oaspa.org/scholarly-publishers-working-together-during-covid-19-pandemic/"
              >announcing a joint initiative</a
            >
            that makes a direct call to the community—publishers, editors, reviewers, and authors—to work together to
            maximize the efficiency of peer review of COVID-19 research from preprints to journal submission and beyond.
          </span>
        </p>
        <p>
          <span>
            The focus so far has been the review of research already submitted to journals. To speed up the process even
            further, <b>WE NEED YOUR HELP to also triage preprints</b>. Help us prioritize the most important work so
            that it can be more rapidly advanced through peer review, flagging any issues or concerns with the research
            as soon as possible.
          </span>
        </p>
        <p>
          <span>
            <b>Sign up </b
            ><a
              href="https://docs.google.com/forms/d/e/1FAIpQLSf7MILluJtO9xV2QXznWVd66UQU4puow4wSk7iwLz7iYcykfA/viewform"
              ><b>here</b></a
            ><b> to be added to the rapid review list and received more information on how to help.</b>
          </span>
        </p>
        <blockquote>
          <p>
            <span>
              <i
                >As part of this initiative, our goal at PREreview is to manage the engagement and recruitment of the
                volunteer rapid reviewers to review COVID-19 preprints on Outbreak Science Rapid PREreview (OSrPRE),
                connect them to journal editors, and ultimately expedite COVID-19 research publication.</i
              >
            </span>
          </p>
        </blockquote>
        <p>
          <span>
            This week we emailed the 1700+ researchers who have already volunteered to help, inviting them to rapidly
            review preprints on the free and open platform
            <a href="https://outbreaksci.prereview.org"><b>Outbreak Science Rapid PREreview</b></a
            >. There, any researcher with an ORCID iD can rapidly review outbreak-related preprints as well as request
            reviews from other community members.
          </span>
        </p>
        <p><span>Below is a How-To Video on how to engage on Outbreak Science Rapid PREreview.</span></p>
        <video controls loading="lazy" preload="metadata">
          <source
            src="https://videos.ctfassets.net/dapbmjoaf8gb/3tR7iNkeOL3cpnBDAhARZA/bc040658c7c8377b05f3f82ad505eda1/How-To_Evaluate_Preprints_on_Outbreak_Science_Rapid_PREreview.mp4"
            type="video/mp4"
          />
        </video>
        <p>
          <span>
            For general questions or concerns related to the use of the platform, please email us at
            <a href="mailto:outbreaksci@prereview.org">outbreaksci@prereview.org</a>.
          </span>
        </p>
        <p>
          <span>
            For questions or concerns relative to our role in this initiative, please email
            <a href="mailto:c19rapidreview@prereview.org">c19rapidreview@prereview.org</a>.
          </span>
        </p>
      `,
      locale: DefaultLocale,
      js: HashSet.empty(),
    }),
  },
  {
    response: 'blog-posts-media-gallery',
    index: 0,
    expected: new ContentfulBlogPost({
      title: html`PREreview August 2026 Newsletter`,
      channel: 'newsletter',
      authors: [new Author({ name: Name('Pia Tavella') })],
      publishedAt: Instant.from('2026-08-21T14:13:47Z'),
      heroImage: {
        url: {
          avif: new URL(
            'https://images.ctfassets.net/dapbmjoaf8gb/2Qb9tN7N6Mw935NWtFFyu0/ab2023325b5ac652b284bf5b431d307b/August-newsletter-featured-image.png?fm=avif',
          ),
          webp: new URL(
            'https://images.ctfassets.net/dapbmjoaf8gb/2Qb9tN7N6Mw935NWtFFyu0/ab2023325b5ac652b284bf5b431d307b/August-newsletter-featured-image.png?fm=webp',
          ),
          default: new URL(
            'https://images.ctfassets.net/dapbmjoaf8gb/2Qb9tN7N6Mw935NWtFFyu0/ab2023325b5ac652b284bf5b431d307b/August-newsletter-featured-image.png',
          ),
        },
        width: 1200,
        height: 675,
        altText: '"PREreview August Newsletter" header over photo of raindrops creating ripples on a water surface',
        caption: html`
          <p>
            <span>
              “Raindrops creating ripples on water reflecting sunset colors” shared on
              <a href="https://www.pickpik.com/en/free-stock-photo-yvjvu">PickPik</a> under Open License
            </span>
          </p>
        `,
      },
      excerpt:
        'In the past couple of months, PREreview’s team and community members have been actively championing open research evaluation, while cultivating new relationships around the globe. Dive in, and help us ripple further.',
      html: html`
        <p>
          <span>
            In the past couple of months, PREreview’s team and community members have been actively championing open
            research evaluation, while cultivating new relationships around the globe. Dive in, and help us ripple
            further.
          </span>
        </p>
        <h3 id="last-days-to-register-for-our-review-a-thon-with-your-club">
          <span>Last Days to Register for our Review-a-thon with your Club!</span>
        </h3>
        <picture>
          <source
            srcset="
              https://images.ctfassets.net/dapbmjoaf8gb/1amxw9aFi3DYbazZvIRUWW/2b929832ad8b22e42b7ea08f540da24b/PRW-for-newsletter-300x300-1.png?fm=avif
            "
            type="image/avif"
          />
          <source
            srcset="
              https://images.ctfassets.net/dapbmjoaf8gb/1amxw9aFi3DYbazZvIRUWW/2b929832ad8b22e42b7ea08f540da24b/PRW-for-newsletter-300x300-1.png?fm=webp
            "
            type="image/webp"
          />
          <img
            src="https://images.ctfassets.net/dapbmjoaf8gb/1amxw9aFi3DYbazZvIRUWW/2b929832ad8b22e42b7ea08f540da24b/PRW-for-newsletter-300x300-1.png"
            width="300"
            height="300"
            alt="Peer Review Week logo"
            loading="lazy"
          />
        </picture>
        <p>
          <span>
            To celebrate 2026 <a href="https://peerreviewweek.net/"><b>Peer Review Week</b></a
            ><b> (September 14-18)</b>, PREreview is organizing a <b>Review-a-thon</b>: a global event where
            newly-formed and existing <a href="/clubs">PREreview Clubs</a> synchronously carry out collaborative reviews
            of preprints and datasets. Our goal is to showcase how human, community-driven peer review can help drive
            change in the research evaluation culture.
          </span>
        </p>
        <p>
          <span>
            Participating Clubs that organize and carry out at least one collaborative review during Peer Review Week,
            and publish the resulting PREreview(s)—co-authored by two or more people—within the following two weeks will
            be entered into a <b>raffle for a 500 USD fund</b> to support their future group activities.
          </span>
        </p>
        <p>
          <span>
            Registration for the Review-a-thon is open through <b>August 31, 2026</b>. We especially want to encourage
            participation from communities that review in <b>languages other than English</b>,
            <b>groups reviewing datasets and data papers</b>, as well as clubs specializing in
            <b>social sciences and humanities</b>. Gather your lab, classroom, journal club, department, or scholarly
            community to give constructive feedback on a research output as a team!
          </span>
        </p>
        <a href="https://sites.google.com/prereview.org/review-a-thon/about?authuser=4" class="button"
          ><span>LEARN MORE &amp; REGISTER</span></a
        >
        <p>
          <span>
            💌 Please let us know if you have any questions at
            <a href="mailto:community@prereview.org">community@prereview.org</a>, and check out the<a
              href="https://sites.google.com/prereview.org/review-a-thon/faqs?authuser=4"
            >
              FAQs section</a
            >
            on the website. Feel free to extend the invite to colleagues and reshare it on social media.
          </span>
        </p>
        <hr />
        <h3 id="prereview-in-dialogue"><span>PREreview in Dialogue</span></h3>
        <figure>
          <picture>
            <source
              srcset="
                https://images.ctfassets.net/dapbmjoaf8gb/4877UqXNvRBDjGSxVQXuKs/f945023ce74ee09c9521cc257ce528fe/dialogue-newsletter-inside-image-300x300.png?fm=avif
              "
              type="image/avif"
            />
            <source
              srcset="
                https://images.ctfassets.net/dapbmjoaf8gb/4877UqXNvRBDjGSxVQXuKs/f945023ce74ee09c9521cc257ce528fe/dialogue-newsletter-inside-image-300x300.png?fm=webp
              "
              type="image/webp"
            />
            <img
              src="https://images.ctfassets.net/dapbmjoaf8gb/4877UqXNvRBDjGSxVQXuKs/f945023ce74ee09c9521cc257ce528fe/dialogue-newsletter-inside-image-300x300.png"
              width="300"
              height="300"
              alt="Hand-drawn sketch of two male and one female characters chatting with papers in their hands and a cellphone. A hand-written phrase reads “let’s chat” in the bottom-left corner."
              loading="lazy"
            />
          </picture>

          <figcaption>
            <p><span>Credits: by Getillustrations. Canva Pro licensed content.</span></p>
          </figcaption>
        </figure>
        <p>
          <span>
            <b>Pia Tavella at the IV Encuentro de la Red Chilena de Revistas Científicas de Acceso Abierto</b>
          </span>
        </p>
        <p>
          <span>
            The
            <a href="https://redrevistascientificas.uestatales.cl/"
              >Red Chilena de Revistas Científicas de Acceso Abierto</a
            >
            (Chilean Network for Open Access Journals) convenes more than 200 scientific journals managed by 15 public
            universities to strengthen shared capacities and professionalize the editorial teams. On the 10th and 11th
            of August, journal editors, librarians, university administrators, and researchers gathered at the network’s
            fourth annual meeting held in Santiago de Chile to share their reflections and experiences in scholarly
            communications. The event agenda spanned from academic integrity, new technologies applied to editorial
            workflows and data privacy, to trends in open science, scientometrics and open peer review.
          </span>
        </p>
        <p>
          <span>
            <b>Pia Tavella</b>, PREreview’s Communications and Engagement Officer, gave both a
            <a href="https://doi.org/10.5281/zenodo.21777105">talk on Open Peer Review models</a> and a more interactive
            <a href="https://doi.org/10.5281/zenodo.21880647"
              >workshop about pathways for early-career researchers and journal editors to engage with PREreview</a
            >. The meeting was a unique opportunity to exchange knowledge on the challenges and initiatives shaping
            scholarly communications, and to build relationships with the open access ecosystem in Latin America.
          </span>
        </p>
        <div class="media-gallery">
          <figure>
            <picture>
              <source
                srcset="
                  https://images.ctfassets.net/dapbmjoaf8gb/20VibNu1PPqT3olL8qUWk8/09b3acad006611354414f9de323e4bba/WhatsApp-Image-2026-08-11-at-18.46.07.jpeg?fm=avif
                "
                type="image/avif"
              />
              <source
                srcset="
                  https://images.ctfassets.net/dapbmjoaf8gb/20VibNu1PPqT3olL8qUWk8/09b3acad006611354414f9de323e4bba/WhatsApp-Image-2026-08-11-at-18.46.07.jpeg?fm=webp
                "
                type="image/webp"
              />
              <img
                src="https://images.ctfassets.net/dapbmjoaf8gb/20VibNu1PPqT3olL8qUWk8/09b3acad006611354414f9de323e4bba/WhatsApp-Image-2026-08-11-at-18.46.07.jpeg"
                width="1600"
                height="984"
                alt=""
                loading="lazy"
              />
            </picture>
          </figure>
          <figure>
            <picture>
              <source
                srcset="
                  https://images.ctfassets.net/dapbmjoaf8gb/4c0L3R8MZzWNcvp56z14Tk/a2d576bf595a664d19f285a6bafa55d3/WhatsApp-Image-2026-08-11-at-20.47.26.jpeg?fm=avif
                "
                type="image/avif"
              />
              <source
                srcset="
                  https://images.ctfassets.net/dapbmjoaf8gb/4c0L3R8MZzWNcvp56z14Tk/a2d576bf595a664d19f285a6bafa55d3/WhatsApp-Image-2026-08-11-at-20.47.26.jpeg?fm=webp
                "
                type="image/webp"
              />
              <img
                src="https://images.ctfassets.net/dapbmjoaf8gb/4c0L3R8MZzWNcvp56z14Tk/a2d576bf595a664d19f285a6bafa55d3/WhatsApp-Image-2026-08-11-at-20.47.26.jpeg"
                width="930"
                height="595"
                alt=""
                loading="lazy"
              />
            </picture>
          </figure>
          <figure>
            <picture>
              <source
                srcset="
                  https://images.ctfassets.net/dapbmjoaf8gb/4YKkuwMXV392OakeIdSZi1/b206e3026cf82cd8e186cecdfd44cd12/WhatsApp-Image-2026-08-13-at-10.17.20.jpeg?fm=avif
                "
                type="image/avif"
              />
              <source
                srcset="
                  https://images.ctfassets.net/dapbmjoaf8gb/4YKkuwMXV392OakeIdSZi1/b206e3026cf82cd8e186cecdfd44cd12/WhatsApp-Image-2026-08-13-at-10.17.20.jpeg?fm=webp
                "
                type="image/webp"
              />
              <img
                src="https://images.ctfassets.net/dapbmjoaf8gb/4YKkuwMXV392OakeIdSZi1/b206e3026cf82cd8e186cecdfd44cd12/WhatsApp-Image-2026-08-13-at-10.17.20.jpeg"
                width="1600"
                height="1200"
                alt=""
                loading="lazy"
              />
            </picture>
          </figure>
        </div>
        <p>
          <span><b>Daniela Saderi at September 2026 OpenCon Librarian Community Call</b></span>
        </p>
        <p>
          <span>
            <a href="https://www.opencon.community/">OpenCon</a> supports a dynamic, diverse, and growing community that
            works year-round to advance Open Access, Open Education, and Open Data. On September 8, 2026, they’re
            holding a Community Call aimed at folks working at the intersection of libraries and Open.
          </span>
        </p>
        <p>
          <span>
            In this session, PREreview Executive Director and Co-founder<b> Daniela Saderi</b> will explore how open
            review models can expand participation, create new opportunities for learning and dialogue, and strengthen
            trust in research. The talk will also address the role librarians can play as educators, connectors, and
            stewards of open scholarly infrastructure in helping shape a future where knowledge is held in trust by the
            many, rather than controlled by the few.
          </span>
        </p>
        <p>
          <span>
            OpenCon Community Calls are not recorded to support a safer environment for honest discussion. While the
            September 2026 OpenCon Librarian Community Call is only open for library staff to register, the
            <a href="https://docs.google.com/document/d/17Vp0oQIn66aFkq7ZBKUyodWQwLbqIkYzjbTXtTP96Lc/edit?usp=sharing"
              >notes</a
            >
            will be made public.
          </span>
        </p>
        <p>
          <span><b>Rosario Rogel Salazar at open peer review workshop organized by Red de Politólogas</b></span>
        </p>
        <p>
          <span>
            <a href="https://sites.google.com/view/reddepolitologas/inicio?authuser=0">Red de Politólogas</a> is an
            international network that brings together one of the largest communities of female political scientists in
            the world. Their mission is to strengthen the visibility, leadership, and professional development of women
            in political science, an historically male-dominated field. The network has several
            <a href="https://sites.google.com/view/reddepolitologas/liderazgo-editorial?authuser=0"
              >members with leadership roles</a
            >
            in specialized scientific journals who advocate for more gender diversity in editorial boards.
          </span>
        </p>
        <p>
          <span>
            On August 21st, 2026, <b>PREreview Champion Rosario Rogel Salazar </b>is delivering a members-only workshop
            on open peer review for scientific journals. The activity is collaboratively organized by the Red de
            Politólogas together with Revista Argentina de Ciencia Política, Revista Mexicana de Derecho Electoral,
            Revista de Ciencia Política (Santiago), Revista Mexicana de Ciencias Políticas y Sociales, Iconos, Revista
            de Ciencias Sociales, Brazilian Political Sciences Review, Revista SAAP, Revista Electrónica del Instituto
            de Investigaciones Jurídicas y Sociales &quot;Ambrosio Gioja&quot;, and PREreview.
          </span>
        </p>
        <hr />
        <h3 id="prereview-champions-in-action"><span>PREreview Champions in Action!</span></h3>
        <figure>
          <picture>
            <source
              srcset="
                https://images.ctfassets.net/dapbmjoaf8gb/2vUpCR9ERn6OjK2eMRW5cO/3da21438fb28a6b1bc76949d4636c15c/champions-300x300.png?fm=avif
              "
              type="image/avif"
            />
            <source
              srcset="
                https://images.ctfassets.net/dapbmjoaf8gb/2vUpCR9ERn6OjK2eMRW5cO/3da21438fb28a6b1bc76949d4636c15c/champions-300x300.png?fm=webp
              "
              type="image/webp"
            />
            <img
              src="https://images.ctfassets.net/dapbmjoaf8gb/2vUpCR9ERn6OjK2eMRW5cO/3da21438fb28a6b1bc76949d4636c15c/champions-300x300.png"
              width="300"
              height="300"
              alt="A group of eight hands and arms with all different skin tones, accessories, and clothes creating a heart shape around the PREreview logo."
              loading="lazy"
            />
          </picture>

          <figcaption>
            <p><span>Credits: “Diverse Hands Making Heart” by Vectorfair Y. Canva Pro licensed content</span></p>
          </figcaption>
        </figure>
        <p>
          <span>
            For the past couple of months, 2026 PREreview Champions have been spreading out the word about open peer
            review across their local communities and building opportunities for others to engage with the Open Science
            movement.
          </span>
        </p>
        <p>
          <span><b>In June:</b></span>
        </p>
        <ul>
          <li>
            <span>
              2026 PREreview Champions <b>Daniel Adediran</b>, <b>Morlai Sesay</b> and <b>Mabel B. Omoniwa</b> organized
              the &quot;Democratizing Peer Review: Empowering Early-Career Researchers through Open and Collaborative
              Science&quot; webinar, joined by 2024 PREreview Champion <b>Seun Olufemi</b> as an invited speaker.
            </span>
          </li>
        </ul>
        <p>
          <span><b>In July:</b></span>
        </p>
        <ul>
          <li>
            <span>
              <b>Shitondo Yahila</b> organized an Open Research Symposium with support from The University of Zambia
              Medical Students Association. The event was targeted at undergraduate healthcare students and early-career
              researchers. A total of 80+ people participated in three different sessions, including a Live Review!
            </span>
          </li>
          <li>
            <span>
              <b>Daniel Adediran</b>, <b>Morlai Sesay</b> and <b>Deborah Mariama Kamara</b> hosted a webinar on
              &quot;Empowering Undergraduate and Postgraduate Students as Agents of Change in Peer Review Across All
              Communities&quot;.
            </span>
          </li>
          <li>
            <span>
              <b>Alan Colin Arce </b>published an insights report for the Open Scholarship Policy Observatory under the
              title “Perceptions, Impact, and the State of Open Peer Review”. Available in
              <a href="https://ospolicyobservatory.uvic.ca/perceptions-impact-and-the-state-of-open-peer-review/"
                >English</a
              >
              and <a href="https://ospolicyobservatory.uvic.ca/evaluation-ouverte/">French</a>.
            </span>
          </li>
        </ul>
        <hr />
        <h3 id="modular-peer-review-working-group-learnings-and-next-steps">
          <span>Modular Peer Review Working Group: Learnings and Next Steps</span>
        </h3>
        <picture>
          <source
            srcset="
              https://images.ctfassets.net/dapbmjoaf8gb/5nz3Zp7Pb7AlUIbf5ZMTXG/f1ca10f437009b48343d6d79ea1af8cc/Newsletter-images---small--300-x-300-px---5-.jpg?fm=avif
            "
            type="image/avif"
          />
          <source
            srcset="
              https://images.ctfassets.net/dapbmjoaf8gb/5nz3Zp7Pb7AlUIbf5ZMTXG/f1ca10f437009b48343d6d79ea1af8cc/Newsletter-images---small--300-x-300-px---5-.jpg?fm=webp
            "
            type="image/webp"
          />
          <img
            src="https://images.ctfassets.net/dapbmjoaf8gb/5nz3Zp7Pb7AlUIbf5ZMTXG/f1ca10f437009b48343d6d79ea1af8cc/Newsletter-images---small--300-x-300-px---5-.jpg"
            width="300"
            height="300"
            alt="Continuous Science Foundation and PREreview logos joined by a plus sign, representing collaboration."
            loading="lazy"
          />
        </picture>
        <p>
          <span>
            Research is an iterative process: questions evolve, methods change, and analyses get refined. What if peer
            review could arrive at those moments where it has the greatest potential to improve the work, rather than
            centering only on the final output?
          </span>
        </p>
        <p>
          <span>
            That concept was core to the Modular Peer Review Working Group endeavour between January and July, 2026.
            Convened by the <a href="https://continuousfoundation.org/">Continuous Science Foundation</a> &amp;
            PREreview, more than 60 researchers, infrastructure builders, publishers, and community members generated
            practical, testable ideas for integrating useful and timely feedback across the research lifecycle.
          </span>
        </p>
        <p>
          <span>
            PREreview deeply thanks everyone who participated and contributed their thoughts to the Modular Peer Review
            Working Group. The final report captures not only the foundations we built together, but is also an
            <b>open invitation for others in the scholarly communications ecosystem</b> to help shape what comes next.
            Please reach out to share your questions, feedback, and collaboration proposals to expand on this work.
          </span>
        </p>
        <a href="https://articles.continuousfoundation.org/articles/modular-peer-review/report" class="button"
          ><span>READ THE FINAL REPORT</span></a
        >
        <hr />
        <h3 id="events"><span>Events</span></h3>
        <figure>
          <picture>
            <source
              srcset="
                https://images.ctfassets.net/dapbmjoaf8gb/3XQTjVn3FqRhSYqrjy4TlK/d7a6b249a68583b796c3664d0b51b11f/2025-newsletter-images--1-.png?fm=avif
              "
              type="image/avif"
            />
            <source
              srcset="
                https://images.ctfassets.net/dapbmjoaf8gb/3XQTjVn3FqRhSYqrjy4TlK/d7a6b249a68583b796c3664d0b51b11f/2025-newsletter-images--1-.png?fm=webp
              "
              type="image/webp"
            />
            <img
              src="https://images.ctfassets.net/dapbmjoaf8gb/3XQTjVn3FqRhSYqrjy4TlK/d7a6b249a68583b796c3664d0b51b11f/2025-newsletter-images--1-.png"
              width="300"
              height="300"
              alt="A red megaphone icon outlined in black against a white background."
              loading="lazy"
            />
          </picture>

          <figcaption>
            <p><span>Credits: Wena Vega from sketchify</span></p>
          </figcaption>
        </figure>
        <p>
          <span><b>Upcoming events</b></span>
        </p>
        <ul>
          <li>
            <span>
              <b>August 26, 2026 - 13:00 UTC —</b> “Metadata for All with Wikidata” free webinar. Speakers will address
              FAIR open data principles, strategies to mitigate systemic information gaps, and the value of public
              access to reference datasets for elevating marginalized demographics and promoting scholarly
              dissemination.
              <a href="https://force11.org/post/webinar-metadata-for-all-with-wikidata/">More info and registration</a>.
            </span>
          </li>
          <li>
            <span>
              <b>September 8, 2026 - 19:00 UTC —</b> “Are You That White Ally? Recognizing &amp; Interrupting White
              Narcissism in NPs” free-of-charge strategy session by Healing Equity United.
              <a
                href="https://www.eventbrite.com/e/are-you-that-white-ally-recognizing-interrupting-white-narcissism-in-nps-tickets-1992842143497?aff=oddtdtcreator"
                >More info and registration</a
              >.
            </span>
          </li>
          <li>
            <span>
              <b>September 14-18, 2026</b> <b>—</b>
              <a href="https://peerreviewweek.net/events.php">Peer Review Week events &amp; activities</a> from around
              the globe.
            </span>
          </li>
          <li>
            <span>
              <b>September 15, 2026 - 12:00 UTC —</b> <a href="https://www.rcmcooperative.com/#">RCM Cooperative</a> is
              launching a monthly meetup series, open to anyone working in or around research community management.
              <a href="https://www.rcmcooperative.com/blog/introducing-monthly-meetups/">Learn more and register</a>.
            </span>
          </li>
        </ul>
        <p>
          <span><b>Recent events</b></span>
        </p>
        <ul>
          <li>
            <span>
              <b>August 12, 2026 — </b>“Metadata health check: A tour of the Crossref Participation Reports tool”, about
              how to assess your metadata quality, understand why complete metadata matters, and identify ways to
              improve the completeness and quality of your Crossref metadata.
              <a href="https://youtu.be/d9i9Ko1PCiE?si=D-HFj6xTUz-rzfL2">Recording available</a>.
            </span>
          </li>
          <li>
            <span>
              <b>June 2, 2026 — </b>CHORUS Forum: Future of Preprints. Speakers: Katie Corker (ASAPbio), Dawn Melley
              (IEEE), Ben Mudrak (American Chemical Society/ChemRxiv), Kelly Cohen (Optica Publishing Group), and
              Samantha Hindle (bioRxiv &amp; medRxiv).
              <a href="https://youtu.be/Z3egFUvw7q4?si=xtpi3DHQvz87iKBe">Recording available</a>
            </span>
          </li>
          <li>
            <span>
              <b>June 2-4, 2026 — </b>European Association of Science Editors (EASE) Summer Symposium 2026.
              <a href="https://sh1.sendinblue.com/amzp8hmkclpfe.html?t=1782740530901"
                >Recordings of the free sessions</a
              >
              are available.
            </span>
          </li>
        </ul>
        <hr />
        <h3 id="highlights-from-our-slack-community"><span>Highlights from our Slack Community</span></h3>
        <picture>
          <source
            srcset="
              https://images.ctfassets.net/dapbmjoaf8gb/1AqM2SRS9UAP72FPO7JYIO/6268a33fcb9fdb659754572cc295542c/Slack-highlights---300x300.png?fm=avif
            "
            type="image/avif"
          />
          <source
            srcset="
              https://images.ctfassets.net/dapbmjoaf8gb/1AqM2SRS9UAP72FPO7JYIO/6268a33fcb9fdb659754572cc295542c/Slack-highlights---300x300.png?fm=webp
            "
            type="image/webp"
          />
          <img
            src="https://images.ctfassets.net/dapbmjoaf8gb/1AqM2SRS9UAP72FPO7JYIO/6268a33fcb9fdb659754572cc295542c/Slack-highlights---300x300.png"
            width="300"
            height="300"
            alt="The PREreview logo at the top and Slack logo at the bottom with the image of a paper in white on a red background"
            loading="lazy"
          />
        </picture>
        <ul>
          <li>
            <span><b>What we are reading:</b></span>
          </li>
        </ul>
        <p>
          <span>
            -<a href="https://upstream.force11.org/community-peer-review-to-build-resilience/"
              ><i>Community Peer Review for Resistance and Resilience</i></a
            >, by Christopher Steven Marcum &amp; Daniela Saderi (PREreview)-<a
              href="https://sciencepolitics.org/2026/08/17/science-doesnt-need-better-journals-it-needs-better-incentives/"
              ><i>Science Doesn’t Need Better Journals. It Needs Better Incentives</i></a
            >, by JP Flores &amp; Hannah Frank-<a
              href="https://www.inasp.info/publications/support-preprint-sharing-six-levers-equitable-research-access"
              ><i>How to Support Preprint Sharing: Six Levers to Advance Equitable Research Access</i></a
            >, a policy paper published by INASP-<a
              href="https://katinamagazine.org/content/article/open-knowledge/2026/equity-in-open-access-means-thinking-beyond-fees"
              ><i>Equity in Open Access Means Thinking Beyond Fees</i></a
            >, by Johan Rooryck-<a href="https://doi.org/10.6084/m9.figshare.32685351"
              ><i>The Future of Peer Review: A system-wide perspective</i></a
            >, the report of the Research on Research Institute (RoRI) project conducted from 2023-2026-<a
              href="https://reseaucirce.org/en/nouvelles/vers-une-evaluation-ouverte-repenser-levaluation-par-les-pairs-en-contexte-de-science-ouverte/"
              ><i>Towards open assessment: rethinking peer review in the context of open science</i></a
            ><i>,</i> a report by the Circé Network in Canada
          </span>
        </p>
        <ul>
          <li>
            <span>
              The <b>OSPARK Bootcamp</b> (20 September - 12 November, 2026) is a hands-on programme designed to help
              Open Research ambassadors build practical outreach and marketing skills. The bootcamp combines a
              <b>6-week online course with a 2-day in-person workshop </b>in Zurich (Switzerland), giving participants
              the tools, feedback, and community to develop a communication strategy for their own initiative.
              Participation is free, with a limited number of travel stipends available.
              <a href="https://events.digital-research.academy/event/137/">Apply by August 23, 2026</a>.
            </span>
          </li>
          <li>
            <span>
              openRxiv is looking for an <b>Engineering Manager</b> who combines hands-on technical depth with
              people-first management, all while championing openRxiv’s mission of accelerating open, accessible
              science. Remote, full-time position, based in the U.S. or some international countries.
              <a href="https://openrxiv.applytojob.com/apply/ggcbCVGkSQ/Engineering-Manager">Apply here</a>.
            </span>
          </li>
          <li>
            <span>
              <a href="https://translate-science.codeberg.page/prereview.html">Translate Science</a>, una comunidad
              unida en torno a su interés por la ciencia abierta multilingüe, está organizando una
              <b>revisión en vivo en español para participar del Review-a-thon</b>! La sesión está programada para el 16
              de septiembre, de 14:00 a 15:30 UTC. Visita el sitio web para conocer más sobre su Club de PREreview y
              sumarte a su lista de correos.
            </span>
          </li>
        </ul>
        <p>
          <span>
            If you are looking for your next career step, check out the openings in our
            <a href="https://prereviewcommunity.slack.com/archives/C05B18Z33B9">#jobs-and-opportunities</a> channel, and
            share any of your own.
          </span>
        </p>
        <p>
          <span>
            You can also find lots of preprint authors requesting feedback on their work in our
            <a href="https://prereviewcommunity.slack.com/archives/C05B95LEN5C">#request-a-review</a> channel.
          </span>
        </p>
        <a href="https://bit.ly/PREreview-Slack" class="button"><span>JOIN THE CONVERSATION</span></a>
        <hr />
        <h3 id="stay-connected"><span>Stay connected</span></h3>
        <p>
          <span>
            If you have something to share, drop us an email at
            <a href="mailto: community@prereview.org">community@prereview.org</a>.
          </span>
        </p>
        <p>
          <span>
            You can follow PREreview on <a href="https://mas.to/@prereview">Mastodon</a>,
            <a href="https://bsky.app/profile/prereview.bsky.social">BlueSky</a>,
            <a href="https://www.linkedin.com/company/prereview?original_referer=https%3A%2F%2Fwww.google.com%2F"
              >LinkedIn</a
            >, and <a href="https://youtube.com/@prereview7336?si=XJkOWtTou9V5Zg2k">YouTube</a>. You can also keep up
            with all the latest news by
            <a href="https://prereview.civicrm.org/civicrm/mailing/url?u=17&amp;qid=30"
              >subscribing to our newsletter</a
            >
            and<a href="https://bit.ly/PREreview-Slack"> joining our Slack community</a>.
          </span>
        </p>
        <hr />
      `,
      locale: DefaultLocale,
      js: HashSet.empty(),
    }),
  },
])('can parse a record ($response $index)', ({ response, index, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Contentful/GetEntries/Samples/${response}.json`)),
      Effect.map(ResolveEntries),
      Effect.andThen(Schema.decodeUnknown(Entries)),
      Effect.andThen(Struct.get('items')),
      Effect.andThen(Array.get(index)),
      Effect.andThen(_.EntryToContentfulBlogPost),
    )

    expect(Struct.omit(actual, 'html')).toStrictEqual(Struct.omit(expected, 'html'))
    assertEquals(actual.html, expected.html)
  }).pipe(Effect.provide([Layer.succeed(Locale, DefaultLocale), NodeFileSystem.layer])),
)

it.effect.each([
  [
    'banners',
    'blog-posts-listing',
    'pages-assets',
    'pages-cta-dynamic-embed',
    'pages-marks',
    'pages-media-profile-images',
    'pages-unordered-list-table',
  ],
])("can't parse a record (%s)", ([response]) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Contentful/GetEntries/Samples/${response}.json`)),
      Effect.map(ResolveEntries),
      Effect.andThen(Schema.decodeUnknown(Entries)),
      Effect.andThen(Struct.get('items')),
      Effect.andThen(Array.map(item => _.EntryToContentfulBlogPost(item))),
      Effect.andThen(Effect.allWith({ concurrency: 'unbounded', mode: 'either' })),
    )

    actual.forEach(result => {
      expect(result).toMatchObject({ _tag: 'Left' })
    })
  }).pipe(Effect.provide([Layer.succeed(Locale, DefaultLocale), NodeFileSystem.layer])),
)

const ResolveEntries = (response: string) => {
  const body = JSON.parse(response)

  return { ...body, items: resolveResponse(body) }
}
