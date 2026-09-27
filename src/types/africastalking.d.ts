declare module 'africastalking' {
  type SMSClient = {
    send: (payload: {
      to: string[]
      message: string
      from?: string
    }) => Promise<unknown>
  }

  type WhatsAppClient = {
    send: (payload: {
      to: string[]
      message: string
    }) => Promise<unknown>
  }

  type AfricasTalkingFactory = (config: {
    apiKey: string
    username: string
  }) => {
    SMS: SMSClient
    WhatsApp?: WhatsAppClient
  }

  const factory: AfricasTalkingFactory
  export default factory
}
