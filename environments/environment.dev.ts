import { base } from './base';
import { Environment } from './model';

export const environment: Environment = {
  ...base,
  env: 'dev',
  apiBasePath: 'https://<DOMAIN_DEV>/<MICRO_SERVICE>/v1',
};
