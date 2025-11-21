describe("Nhập kho", () => {
  let config_oms;
  before(() => {
    cy.fixture("config_inbound.json").then((data) => {
      config_oms = data;
    });
    cy.loginOMS().then(() => {
      cy.visit(`${config_oms.omsUrl}/create-shipment-inbound`);
    });
  });

  function chonKhoNhapHang() {
    cy.get(".css-hlgwow")
      .contains("Chọn địa chỉ lấy hàng")
      .click({ force: true });
    cy.get("#react-select-2-option-0")
      .contains(config_oms.warehouse)
      .click({ force: true });
  }

  function chonNhaCungCap() {
    cy.get(".css-hlgwow").contains("Chọn nhà cung cấp").click({ force: true });

    // Find the dropdown menu that is visible and contains the text 'Bandai'
    cy.get('div[id$="-listbox"]')
      .should("be.visible")
      .within(() => {
        cy.contains(config_oms.omsSupplier).click({ force: true });
      });
  }

  function nhapMaThamChieuInbound() {
    const ma = "MTC" + Date.now();
    cy.get('input[placeholder="Nhập mã tham chiếu"]')
      .type(ma)
      .should("have.value", ma);
    return cy.wrap(ma);
  }

  function nhapKhoiLuongKienHang(length, width, height) {
    cy.get('input[placeholder="Dài"]').type(length);
    cy.get('input[placeholder="Rộng"]').type(width);
    cy.get('input[placeholder="Cao"]').type(height);

    const productsInbound = config_oms.productsInbound;
    cy.contains("Thêm sản phẩm").click({ force: true });

    productsInbound.forEach((product, index) => {
      if (index > 0) {
        cy.contains("Thêm sản phẩm mới").click({ force: true });
      }
      cy.get(".css-hlgwow").contains("Chọn sản phẩm").click({ force: true });
      cy.get('div[id^="react-select-"][id*="-option-"]')
        .contains(product.name)
        .click({ force: true });
      cy.get(`input[name="listProduct.${index}.productQty"]`)
        .clear()
        .type(product.qty.toString())
        .should("have.value", product.qty.toString());
    });
    cy.get('button[type="button"]').contains("Xác nhận").click({ force: true });
  }
  function taoDonNhapKho() {
    // Nhấp nút tạo mới
    cy.get('button[type="button"]').contains("Tạo mới").click({ force: true });
    // Tạp phiếu nhập()
    cy.get('button[type="button"]')
      .contains("Tạo và duyệt phiếu nhập")
      .click({ force: true });
  }

  it("Nhập kho", () => {
    chonKhoNhapHang();
    chonNhaCungCap();
    nhapMaThamChieuInbound().then((maThamChieuIB) => {
      cy.log("Mã tham chiếu đã lưu", maThamChieuIB);
      console.log("Mã tham chiếu đã lưu", maThamChieuIB);
      nhapKhoiLuongKienHang(10, 10, 10);
      // taoDonNhapKho();
      // cy.writeFile("cypress/temp/inBound.json", { maThamChieuIB });
    });
  });
});
