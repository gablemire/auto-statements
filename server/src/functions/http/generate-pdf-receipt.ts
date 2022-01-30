import { Request, Response } from 'express'
import Joi from 'joi'
import { GeneratePdfCommand } from '../../models/commands/GeneratePdfCommand'
import { publishMessage } from '../../pubsub/service'
import {
  allowMethods,
  handleErrors,
  pipeMiddlewares,
  validateBody,
  withAuth,
  withCORS
} from '../../utils/http'

interface BulkQueuePdfGeneration {
  toGenerate: QueuePdfGenerationViewModel[]
}

interface QueuePdfGenerationViewModel {
  donationId: string
  sendEmail: boolean
}

const bulkQueuePdfGenerationSchema = Joi.object<BulkQueuePdfGeneration>({
  toGenerate: Joi.array()
    .min(1)
    .items(
      Joi.object<QueuePdfGenerationViewModel>({
        donationId: Joi.string().required(),
        sendEmail: Joi.boolean().required(),
      })
    )
    .required(),
})

export const generatePdfReceipt = pipeMiddlewares(
  withCORS(),
  handleErrors(),
  withAuth(),
  allowMethods('POST'),
  validateBody(bulkQueuePdfGenerationSchema)
)(
  async (req: Request, res: Response): Promise<void> => {
    const bulk: BulkQueuePdfGeneration = req.body

    const promises = bulk.toGenerate.map(async (toGenerate) => {
      const command: GeneratePdfCommand = {
        donationId: toGenerate.donationId,
        queueEmailTransmission: toGenerate.sendEmail,
      }

      await publishMessage(command, 'pdf')
    })

    await Promise.all(promises)

    res.sendStatus(201)
  }
)
