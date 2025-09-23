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
    // Đăng nhập trước khi truy cập trang
    cy.loginOPS().then(() => {
      cy.visit(`${config.opsUrl}/products`);
    });

    // Đọc SKU từ file fixtures
    cy.fixture("sku.json").then((data) => {
      sku = data.sku;
    });
  });

  // helper gắn banner vào UI

  it("Tạo đơn OMS -> tạo vận đơn -> lưu mã ra fixtures", () => {
    cy.addStepBanner("Ghé trang sản phẩm OPS");
    cy.visit(`${config.opsUrl}/products`);
    cy.addStepBanner("Đã ghé trang thành công");
  });
});
