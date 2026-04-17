import { Effect, flow } from 'effect'
import { Nodemailer } from '../../../ExternalApis/index.ts'
import { CreateEmail } from './CreateEmail.ts'

export const VerifyContactEmailAddress = flow(CreateEmail, Effect.andThen(Nodemailer.sendEmail))
