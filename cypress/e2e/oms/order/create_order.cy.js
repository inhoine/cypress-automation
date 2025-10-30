describe("OMS - Tạo đơn & tạo vận đơn", () => {
  Cypress.on("uncaught:exception", (err, runnable) => {
    if (err.message.includes("is_parcel_check")) {
      return false;
    }
  });

  beforeEach(() => {
    cy.loginOMS();
    cy.visit("https://stg-oms.nandh.vn/orders-b2c");
  });

  function taoDonHang() {
    cy.get("button.btn-success")
      .contains(/Create Order|Tạo đơn/)
      .click();
    cy.get('a[title="Tạo đơn bán lẻ"]').click();
  }

  function chonKhachHang() {
    cy.get("div.css-hlgwow").contains("Chọn khách hàng").click({ force: true });
    cy.get('[id^="react-select-"][id$="-option-0"]').click();
    cy.log("Chọn khách hàng thành công");
  }

  function chonKenhBanHang() {
    cy.get("div.css-13cymwt-control")
      .contains("Chọn kênh bán hàng")
      .click({ force: true });
    cy.get('[id^="react-select-"][id$="-option-0"]').click();
    cy.log("Chọn kênh bán thành công");
  }

  function chonDiaChiLayHang() {
    cy.get("div.css-x1kfuk-control")
      .contains("Chọn địa chỉ lấy hàng")
      .click({ force: true });
    cy.contains("p.fs-14.fw-medium.mb-0", "HCM Warehouse").click();
    cy.log("Chọn địa chỉ lấy hàng thành công");
  }

  function chonSanPhamTheoTen(tenSanPham) {
    cy.get("div.css-hlgwow").contains("Chọn sản phẩm").click({ force: true });
    cy.get('[id^="react-select-"][id$="-listbox"]')
      .contains("div", tenSanPham)
      .click({ force: true });
    cy.log("Chọn sản phẩm thành công");
    cy.get('input[placeholder="Nhập số lượng"]').clear().type("5");
  }

  function nhapMaThamChieu() {
    const ma = "MTC" + Date.now();
    cy.get('input[placeholder="Nhập mã tham chiếu"]')
      .type(ma)
      .should("have.value", ma);
    return cy.wrap(ma);
  }

  function nhapTiepTuc() {
    cy.get("button.btn-success")
      .contains(/Tiếp theo|Continue/)
      .click({ force: true });
  }

  function nhapBtntaoDonHang() {
    cy.get("button.btn-success")
      .contains(/Tạo đơn|Create Order/)
      .click();
    cy.get("button.dropdown-item").contains("Tạo đơn hàng").click();

    return cy
      .get("span.link-secondary", { timeout: 10000 })
      .should("be.visible")
      .invoke("text")
      .then((ma) => ma.trim());
  }

  function xacNhanDonHang() {
    cy.wait(3000);
    cy.get("button.btn-success")
      .contains(/Tạo vận đơn|Create Inbound Shipment/)
      .click({ force: true });
    cy.log("Xác nhận đơn hàng");
  }

  function selectFreeShipping() {
    cy.get('input[id="freeShip"]').scrollIntoView().click({ force: true });
    cy.log("Đã click vào checkbox free shipping");
  }

  function taoVanDon() {
    cy.get(".modal-footer button.btn-success")
      .contains("Tạo vận đơn")
      .should("be.visible")
      .and("not.be.disabled")
      .click({ force: true });
    cy.log("Tạo ván đơn thành công");
  }

  it("Tạo đơn OMS -> tạo vận đơn -> lưu mã ra fixtures", () => {
    taoDonHang();
    chonKhachHang();
    chonKenhBanHang();
    chonDiaChiLayHang();
    chonSanPhamTheoTen("Gao Muscle");

    nhapMaThamChieu().then(() => {
      nhapTiepTuc();
      nhapBtntaoDonHang().then((maSaved) => {
        cy.log("Mã tham chiếu đã lưu:", maSaved);
        xacNhanDonHang();
        selectFreeShipping();
        taoVanDon();

        // Lưu ra file để WMS đọc
        cy.writeFile("cypress/temp/maDonHang.json", { maSaved });
      });
    });
  });
});
