import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter(),
    csrf: {
      trustedOrigins: ['http://127.0.0.1:3000', 'http://localhost:3000']
    }
  }
};
