import { createLogger, format, transports } from 'winston';

export default class Logger {
  private logger;

  constructor() {
    try {
      const { combine, timestamp, printf } = format;
      const loggerFormat = printf(({ level, message, timestamp, ...rest }) => {
        return `${timestamp} ${level}: ${message}` + (Object.keys(rest).length ? `in ${JSON.stringify(rest)})` : '')
      });
      this.logger = createLogger({
        format: combine(
          timestamp(),
          loggerFormat
        ),
        transports: [
          new transports.Console(),
        ]
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[!] Error in Logger constructor: ', e);
      throw e;
    }
  }

  public info(message: any) {
    this.logger.log('info', message.message ? message : JSON.stringify(message));
  }

  public debug(message: any) {
    this.logger.log('debug', message.message ? message : JSON.stringify(message));
  }

  public warn(message: any) {
    this.logger.log('warn', message.message ? message : JSON.stringify(message));
  }

  public error(message: any) {
    this.logger.log('error', message.message ? message : JSON.stringify(message));
  }
}
