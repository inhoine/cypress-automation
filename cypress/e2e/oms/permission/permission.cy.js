describe("Check permission redirect", () => {
  let results = [];

  before(function () {
    cy.fixture("urls.json").then((data) => {
      this.urls = data;
    });

    cy.visit("https://oms.nandh.vn/");
    cy.get('input[name="email"]').type("khanh_an08@yahoo.com");
    cy.get('input[name="password"]').type("An123456@");
    cy.get('button[type="submit"]').click();
    cy.wait(2000);
  });

  it("Verify redirect for each URL", function () {
    const noPermissionPath = "/not-permission";

    cy.wrap(this.urls).each((item) => {
      cy.log(`🔍 Visiting: ${item.url}`);
      cy.visit(item.url, { failOnStatusCode: false });

      // Đợi UI xử lý redirect nếu có
      cy.wait(1000);

      cy.location("pathname").then((path) => {
        let result;

        if (path.includes(noPermissionPath)) {
          result = {
            url: item.url,
            status: "🚫 NO PERMISSION",
            note: "Đã redirect sang trang not-permission",
          };
          cy.log(`❌ ${item.url} → Redirected`);
        } else {
          result = {
            url: item.url,
            status: "✅ PASS",
            note: "Truy cập hợp lệ, không bị redirect",
          };
          cy.log(`✅ ${item.url} → No redirect`);
        }

        results.push(result);
      });

      // Nghỉ giữa các URL
      cy.wait(800);
    });

    cy.then(() => {
      const header = "URL,Status,Note";
      const csv = [
        header,
        ...results.map((r) => `"${r.url}","${r.status}","${r.note}"`),
      ].join("\n");

      cy.task("writeResults", {
        relativeDir: "cypress/results",
        filename: "permission_results.csv",
        content: csv,
      });
    });
  });
});
