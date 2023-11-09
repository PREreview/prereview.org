import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import nodemailer from 'nodemailer'
import * as _ from '../src/nodemailer'
import * as fc from './fc'

describe('sendEmailWithNodemailer', () => {
  test.prop([fc.email()])('when the email can be sent', async email => {
    const transporter = nodemailer.createTransport({ streamTransport: true })
    const sendMail = jest.spyOn(transporter, 'sendMail')

    const actual = await _.sendEmailWithNodemailer(email)({
      nodemailer: transporter,
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(sendMail).toHaveBeenCalledWith({
      from: email.from,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html.toString(),
    })
  })

  test.prop([fc.email(), fc.error()])("when the email can't be sent", async (email, error) => {
    const transporter = nodemailer.createTransport({ streamTransport: true })
    transporter.sendMail = () => Promise.reject(error)

    const actual = await _.sendEmailWithNodemailer(email)({
      nodemailer: transporter,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})
