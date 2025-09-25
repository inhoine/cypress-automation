describe("Duyệt đơn OPS", () => {
  let config;
  let sku;

  Cypress.on("uncaught:exception", (err, runnable) => {
    if (err.message.includes("is_parcel_check")) {
      return false;
    }
  });

  beforeEach(() => {
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    // Đăng nhập trước khi truy cập tran

    // Đọc SKU từ file fixtures
    cy.fixture("sku.json").then((data) => {
      sku = data.sku;
    });
  });

  // helper gắn banner vào UI

  it("Tạo đơn OMS -> tạo vận đơn -> lưu mã ra fixtures", () => {
    cy.visit(config.wmsUrl + "/login");
    cy.get('input[name="email"]').type(config.wmsUser);
    cy.get('input[name="password"]').type(config.wmsPassword);
    cy.get('button[type="submit"]')
      .contains("Đăng nhập")
      .click({ force: true });
  });
});
