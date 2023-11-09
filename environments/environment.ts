import { environment as environmentDev } from './environment.dev';
import { Environment } from './model';

export const environment: Environment = {
  ...environmentDev,
  env: 'local',
  buildVersion: '🧙‍♂️',
};
