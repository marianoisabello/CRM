const winston = require('winston');
const { nodeEnv } = require('../config');

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, ...rest }) => {
    return `${timestamp} ${level}: ${JSON.stringify(rest)}`;
  })
);

const logger = winston.createLogger({
  level: nodeEnv === 'production' ? 'info' : 'debug',
  format: nodeEnv === 'development'
    ? devFormat
    : winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
