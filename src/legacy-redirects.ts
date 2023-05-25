import type { Doi } from 'doi-ts'
import express from 'express'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { preprintReviewsMatch } from './routes'

export const legacyRedirects = express().use(/^\/preprints\/arxiv-([A-z0-9.+-]+?)(?:v[0-9]+)?$/, (req, res) => {
  res.redirect(
    Status.MovedPermanently,
    format(preprintReviewsMatch.formatter, {
      id: { type: 'arxiv', value: `10.48550/arxiv.${req.params['0']}` as Doi<'48550'> },
    }),
  )
})
