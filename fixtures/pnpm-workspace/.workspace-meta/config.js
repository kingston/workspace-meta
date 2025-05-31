export default {
  plugins: [
    // Add test plugins here
  ],
  generateNewPackage: (ctx) => ({
    name: ctx.packageName,
  }),
};
