import nextConfig from 'eslint-config-next';

const config = [
  { ignores: ['node_modules/**', '.next*/**', '.open-next/**', '.wrangler/**', 'out/**', 'coverage/**'] },
  ...nextConfig,
];
export default config;
