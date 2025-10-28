const { defineConfig } = require("cypress");
const fs = require("fs");
const xlsx = require("xlsx");
const path = require("path");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Ghi file kết quả CSV
      on("task", {
        readXlsx({ file, sheet }) {
          const buf = fs.readFileSync(file);
          const workbook = xlsx.read(buf, { type: "buffer" });
          // Chuyển đổi sheet thành JSON
          const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);
          return rows;
        },
        writeResults({
          relativeDir = "cypress/results",
          filename = "results.csv",
          content,
        }) {
          try {
            const outputDir = path.resolve(relativeDir);
            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir, { recursive: true });
            }

            const filePath = path.join(outputDir, filename);
            fs.writeFileSync(filePath, content, { encoding: "utf8" });
            return { success: true, path: filePath };
          } catch (err) {
            return { success: false, error: err.message };
          }
        },
      });

      return config;
    },

    // 👇 Các cấu hình khác
    defaultCommandTimeout: 10000,
    chromeWebSecurity: false,
  },
});
