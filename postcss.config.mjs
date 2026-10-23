/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    // MacBook-версия главной: см. postcss/macbook-scale/index.cjs.
    'postcss-macbook-scale': {},
    autoprefixer: {},
  },
};

export default config;
