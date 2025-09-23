describe("Nhập kho", () => {
  let config_oms;
  before(() => {
    cy.fixture("config_oms.json").then((data) => {
      config_oms = data;
    });
    cy.loginOMS();
  });

  function chonKhoNhapHang() {
    cy.visit(`${config_oms.omsUrl}/create-shipment-inbound`);
    cy.get(".css-hlgwow")
      .contains("Chọn địa chỉ lấy hàng")
      .click({ force: true });
    cy.get("#react-select-2-option-0")
      .contains("HCM Warehouse")
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

  // function nhapKhoiLuongKienHang(){
  //   // Nhập khối lượng
  //   cy.get('input[name="listPackage.0.packageWeight"]').type('20').should('have.value', '20');
  //   // Nhập kích thước - độ dài
  //   cy.get('input[name="listPackage.0.packageLength"]').type('10').should('have.value', '10');
  //   // Nhập kích thước - độ rộng
  //   cy.get('input[name="listPackage.0.packageWidth"]').type('10').should('have.value', '10');
  //   // Nhập kích thước - độ cao
  //   cy.get('input[name="listPackage.0.packageHeight"]').type('10').should('have.value', '10');
  //   // Click btn để mở popup thêm sản phẩm
  //   cy.get('p.mb-0.btn').contains('Thêm sản phẩm').click({ force: true });
  //   // Click để hiển thị danh sách sản phẩm
  //   cy.get('.css-hlgwow').contains('Chọn sản phẩm').click({ force: true });
  //   // Chọn sản phẩm theo tên
  //   cy.get('div[id$="-listbox"]').should('be.visible').within(() => {
  //   cy.contains(config_oms.omsItemInbound).click({ force: true });
  //   });
  //   // Nhập số lượng cần nhập
  //   cy.get('input[name="listProduct.0.productQty"]').clear().type('10').should('have.value', '10');
  //   // Click btn xác nhận để xác nhận tt sản phẩm
  //   cy.get('button[type="button"]').contains('Xác nhận').click({ force: true });
  // }

  function nhapKhoiLuongKienHang() {
    // Nhập khối lượng và kích thước của kiện hàng
    cy.get('input[name="listPackage.0.packageWeight"]')
      .type("20")
      .should("have.value", "20");
    cy.get('input[name="listPackage.0.packageLength"]')
      .type("10")
      .should("have.value", "10");
    cy.get('input[name="listPackage.0.packageWidth"]')
      .type("10")
      .should("have.value", "10");
    cy.get('input[name="listPackage.0.packageHeight"]')
      .type("10")
      .should("have.value", "10");

    // Lặp qua từng sản phẩm trong danh sách và thêm vào popup
    // const products = [
    //   { name: 'CGN', qty: 5 },
    //   { name: 'BGN', qty: 5 }
    // ];
    cy.fixture("config_oms.json").then((data) => {
      const products = data.products;
      cy.contains("Thêm sản phẩm").click({ force: true });

      products.forEach((product, index) => {
        if (index > 0) {
          // sau sản phẩm đầu tiên thì click "Thêm sản phẩm mới"
          cy.contains("Thêm sản phẩm mới").click({ force: true });
        }

        // chọn field sản phẩm hiện tại (luôn chỉ có 1)
        cy.get(".css-hlgwow").contains("Chọn sản phẩm").click({ force: true });

        // chọn sản phẩm trong dropdown
        cy.get('div[id^="react-select-"][id*="-option-"]')
          .contains(product.name)
          .click({ force: true });
        // nhập số lượng cho sản phẩm hiện tại
        cy.get(`input[name="listProduct.${index}.productQty"]`)
          .clear()
          .type(product.qty.toString())
          .should("have.value", product.qty.toString());
      });
      // Sau khi thêm tất cả sản phẩm, click nút Xác nhận để đóng popup
      cy.get('button[type="button"]')
        .contains("Xác nhận")
        .click({ force: true });
    });
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
      nhapKhoiLuongKienHang();
      taoDonNhapKho();
      cy.writeFile("cypress/temp/inBound.json", { maThamChieuIB });
    });
  });
});
