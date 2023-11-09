import { Environment } from './model';

export const base: Omit<Environment, 'env' | 'apiBasePath' | 'oneForce'> = {
  buildVersion: '{{ buildVersion }}',
};
