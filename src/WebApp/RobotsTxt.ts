import { HttpServerResponse } from '@effect/platform'
import { Effect } from 'effect'
import { AllowSiteCrawlers } from '../Context.ts'

export const RobotsTxt = Effect.map(AllowSiteCrawlers, condition =>
  condition
    ? HttpServerResponse.text(
        `
User-agent: AhrefsBot
User-agent: Amazonbot
User-agent: bingbot
User-agent: SemrushBot
User-agent: SERankingBacklinksBot
Allow: /reviews/*
Disallow: /reviews
Allow: /review-requests/*
Disallow: /review-requests
Allow: /
Crawl-delay: 5

User-agent: *
Allow: /
Crawl-delay: 2
`.trim(),
      )
    : HttpServerResponse.text(
        `
User-agent: AhrefsBot
User-agent: Amazonbot
User-agent: bingbot
User-agent: SemrushBot
User-agent: SERankingBacklinksBot
Disallow: /

User-agent: *
Allow: /
Crawl-delay: 10
`.trim(),
      ),
)
