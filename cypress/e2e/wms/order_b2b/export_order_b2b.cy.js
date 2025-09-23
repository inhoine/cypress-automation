describe("WMS - Xuất kho từ đơn OMS", () => {
  let config;
  before(() => {
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    cy.loginWMS();
    // cy.chonFC('FC HN');
  });

  function layMaDonHang(maSaved) {
    cy.visit(`${config.wmsUrl}/order-list`);
    return cy
      .contains("p", maSaved)
      .closest("tr")
      .find("a.link-secondary")
      .invoke("text")
      .then((maDonHang) => maDonHang.trim());
  }

  function taoYeuCauXuatKho(maDonHang) {
    cy.visit(`${config.wmsUrl}/pickup-order`);
    cy.get("div.css-hlgwow")
      .contains("Chọn loại chiến lược")
      .click({ force: true });
    cy.contains("div", "Lấy theo sản phẩm").click({ force: true });

    cy.get("div.css-hlgwow")
      .contains("Chọn loại bảng kê")
      .click({ force: true });
    cy.contains("div", "Bảng kê đơn B2B").click({ force: true });

    cy.get("button.btn-success").contains("Tuỳ chỉnh").click();
    cy.get('input[placeholder="Theo mã đơn hàng"]').type(maDonHang);
    cy.get("button.btn-success").contains("Xác nhận").click();
    cy.get("button.btn-success").contains("Tạo bảng kê").click();
  }

  it("Đọc order từ fixtures và xuất kho WMS", () => {
    cy.readFile("cypress/temp/maDonHang.json").then(({ maSaved }) => {
      cy.wait(1000); // Đợi một chút để đảm bảo đăng nhập thành công
      layMaDonHang(maSaved).then((maDonHang) => {
        taoYeuCauXuatKho(maDonHang);
        cy.readFile("cypress/temp/maDonHang.json").then((data) => {
          cy.writeFile("cypress/temp/maDonHang.json", { ...data, maDonHang });
        });
      });
    });
  });
});
