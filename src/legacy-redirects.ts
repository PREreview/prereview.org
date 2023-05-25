import express from 'express'
import { Status } from 'hyper-ts'

export const legacyRedirects = express().use(/^\/preprints\/arxiv-([A-z0-9.+-]+?)(?:v[0-9]+)?$/, (req, res) => {
  res.redirect(Status.MovedPermanently, `/preprints/doi-10.48550-arxiv.${req.params['0']}`)
})
