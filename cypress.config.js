const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // Thêm dòng này để tăng thời gian chờ mặc định lên 10 giây
    defaultCommandTimeout: 10000,
    chromeWebSecurity: false,
  },
});