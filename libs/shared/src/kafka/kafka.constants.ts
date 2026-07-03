export const KAFKA_CONFIG = {
  CLIENT_ID: 'workflowhub-client',
  BROKERS: [process.env.KAFKA_BROKERS || 'kafka:9093'], // Uses the Docker internal port 9093 by default
  GROUP_ID: 'notification-group',
};

export const KAFKA_TOPICS = {
  TASK_CREATED: 'task.created',
};
