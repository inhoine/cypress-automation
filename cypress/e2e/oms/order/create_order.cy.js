// cypress/e2e/oms_create_order.cy.js
describe("OMS - Tạo đơn & tạo vận đơn", () => {
  Cypress.on("uncaught:exception", (err, runnable) => {
    if (err.message.includes("is_parcel_check")) {
      return false;
    }
  });

  let config;

  // Chạy 1 lần duy nhất → clear file
  before(() => {
    const filePath = "cypress/temp/maDonHang.json";
    cy.writeFile(filePath, { maDonHangOMS: [] });
  });

  // Chạy mỗi lần trước mỗi test
  beforeEach(() => {
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    cy.loginOMS();
  });

  // ... (Các function từ taoDonHang đến taoVanDon giữ nguyên, không thay đổi) ...
  function taoDonHang() {
    cy.visit("https://stg-oms.nandh.vn/orders-b2c");

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
    cy.contains("p.fs-14.fw-medium.mb-0", config.warehouse).click();
    cy.log("Chọn địa chỉ lấy hàng thành công");
  }
  function chonSanPhamTheoTen(tenSanPham, qty, index = 0) {
    cy.get("div.css-hlgwow").contains("Chọn sản phẩm").click({ force: true });
    cy.get('[id^="react-select-"][id$="-listbox"]')
      .contains("div", tenSanPham)
      .click({ force: true });
    cy.log(`✅ Chọn sản phẩm ${tenSanPham} thành công`);
    cy.get('input[placeholder="Nhập số lượng"]')
      .eq(index)
      .clear({ force: true })
      .type(`${qty}`, { delay: 200 })
      .should("have.value", `${qty}`);
  }
  function chonNhieuSanPham(products) {
    products.forEach((product, index) => {
      if (index > 0) {
        cy.contains("button", "Thêm sản phẩm").click({ force: true });
      }
      chonSanPhamTheoTen(product.name, product.qty, index);
    });
  }
  function nhapMaDonHang() {
    const ma = "MTC" + Date.now();
    cy.get('input[placeholder="Nhập mã đơn hàng"]')
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

    cy.url({ timeout: 10000 }).should("include", "/detail-order-b2c/");

    // ---- đợi container chính xuất hiện ---

    return cy
      .get("span.link-secondary", { timeout: 10000 })
      .should("be.visible")
      .invoke("text")
      .then((ma) => ma.trim());
  }
  function xacNhanDonHang() {
    cy.get("button.btn-success")
      .contains(/Tạo vận đơn|Create Inbound Shipment/)
      .should("be.visible")
      .and("not.be.disabled")
      .wait(500)
      .click({});

    cy.log("Xác nhận đơn hàng và đợi modal xuất hiện");
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

  // --- PHẦN SỬA ĐỔI CHÍNH Ở DƯỚI ĐÂY ---
  // ... (Giữ nguyên các function khai báo ở trên)

  // SỬ DỤNG HÀM LẶP CỦA CYPRESS (LODASH)
  // Số 3 ở đây là số lần bạn muốn tạo đơn
  Cypress._.times(3, (index) => {
    it(`Tạo đơn lần thứ ${index + 1}`, () => {
      taoDonHang();
      chonKhachHang();
      chonKenhBanHang();
      chonDiaChiLayHang();
      chonNhieuSanPham(config.products);

      nhapMaDonHang().then(() => {
        nhapTiepTuc();
        nhapBtntaoDonHang().then((maDonHangOMS) => {
          cy.log("Mã tham chiếu đã lưu:", maDonHangOMS);
          xacNhanDonHang();
          selectFreeShipping();
          cy.wait(1000);
          taoVanDon();

          // --- ĐOẠN LƯU FILE JSON (Đã sửa ở bước trước) ---
          const filePath = "cypress/temp/maDonHang.json";
          cy.task("readJsonIfExists", filePath).then((data) => {
            const prev = data?.maDonHangOMS || [];
            const updated = [...prev, maDonHangOMS];

            cy.writeFile(filePath, {
              maDonHangOMS: updated,
            });
          });
          // -----------------------------------------------
        });
      });
    });
  });
});
