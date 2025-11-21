// describe("Nhập kho", () => {
//   let config_oms;
//   before(() => {
//     cy.fixture("config_inbound.json").then((data) => {
//       config_oms = data;
//     });
//     cy.loginOMS().then(() => {
//       cy.visit(`${config_oms.omsUrl}/create-shipment-inbound`);
//     });
//   });

//   function chonKhoNhapHang() {
//     cy.get(".css-hlgwow")
//       .contains("Chọn địa chỉ lấy hàng")
//       .click({ force: true });
//     cy.get("#react-select-2-option-0")
//       .contains(config_oms.warehouse)
//       .click({ force: true });
//   }

//   function chonNhaCungCap() {
//     cy.get(".css-hlgwow").contains("Chọn nhà cung cấp").click({ force: true });

//     // Find the dropdown menu that is visible and contains the text 'Bandai'
//     cy.get('div[id$="-listbox"]')
//       .should("be.visible")
//       .within(() => {
//         cy.contains(config_oms.omsSupplier).click({ force: true });
//       });
//   }

//   function nhapMaThamChieuInbound() {
//     const ma = "MTC" + Date.now();
//     cy.get('input[placeholder="Nhập mã tham chiếu"]')
//       .type(ma)
//       .should("have.value", ma);
//     return cy.wrap(ma);
//   }

//   function nhapKhoiLuongKienHang() {
//     cy.get('input[placeholder="Dài"]').type(config_oms.length);
//     cy.get('input[placeholder="Rộng"]').type(config_oms.width);
//     cy.get('input[placeholder="Cao"]').type(config_oms.height);

//     const productsInbound = config_oms.productsInbound;
//     cy.contains("Thêm sản phẩm").click({ force: true });

//     productsInbound.forEach((product, index) => {
//       if (index > 0) {
//         cy.contains("Thêm sản phẩm mới").click({ force: true });
//       }
//       cy.get(".css-hlgwow").contains("Chọn sản phẩm").click({ force: true });
//       cy.get('div[id^="react-select-"][id*="-option-"]')
//         .contains(product.name)
//         .click({ force: true });
//       cy.get(`input[name="listProduct.${index}.productQty"]`)
//         .clear()
//         .type(product.qty.toString())
//         .should("have.value", product.qty.toString());
//     });
//     cy.get('button[type="button"]').contains("Xác nhận").click({ force: true });
//   }

//   function taoDonNhapKho() {
//     // Nhấp nút tạo mới
//     cy.get('button[type="button"]').contains("Tạo mới").click({ force: true });
//     // Tạp phiếu nhập()
//     cy.get('button[type="button"]')
//       .contains("Tạo và duyệt phiếu nhập")
//       .click({ force: true });
//   }

//   it("Nhập kho", () => {
//     chonKhoNhapHang();
//     chonNhaCungCap();
//     nhapMaThamChieuInbound().then((maThamChieuIB) => {
//       cy.log("Mã tham chiếu đã lưu", maThamChieuIB);
//       console.log("Mã tham chiếu đã lưu", maThamChieuIB);
//       nhapKhoiLuongKienHang();
//       taoDonNhapKho();
//       cy.writeFile("cypress/temp/inBound.json", { maThamChieuIB });
//     });
//   });
// });

describe("Inbound WMS", () => {
  let config_wms;
  // Khai báo biến global cho khối WMS
  let maThamChieuIB_fallback;
  let trimmedMaDonHang_fallback;

  // 👉 CẤU HÌNH MẶC ĐỊNH CHO TRƯỜNG HỢP FALLBACK
  const DEFAULT_MA_THAM_CHIEU_IB = "NHIV2941164936"; // Thay bằng mã tham chiếu thực tế
  const DEFAULT_TRIMMED_MA_DON_HANG = "NHIV2941164936"; // Thay bằng Mã đơn hàng thực tế

  beforeEach(() => {
    cy.fixture("config_inbound.json").then((data) => {
      config_wms = data;
    });
    cy.loginWMS();
    cy.wait(1000);

    // Lệnh cy.readFile() được trả về, đảm bảo beforeEach chờ nó hoàn thành
    return cy.readFile("cypress/temp/inBound.json", { log: false }).then(
      (data) => {
        // ✅ THÀNH CÔNG: Gán giá trị
        maThamChieuIB_fallback = data.maThamChieuIB || DEFAULT_MA_THAM_CHIEU_IB;
        trimmedMaDonHang_fallback =
          data.trimmedMaDonHang || DEFAULT_TRIMMED_MA_DON_HANG;
        cy.log(
          `✅ Đã đọc thành công file temp. Mã Tham Chiếu: ${maThamChieuIB_fallback}`
        );
      },
      // ✅ BẮT LỖI: Cypress sẽ tự động tìm kiếm callback thứ hai nếu lệnh thất bại
      (error) => {
        if (
          error.message &&
          error.message.includes("Unexpected end of JSON input")
        ) {
          cy.log(
            "⚠️ File temp tồn tại nhưng **JSON bị hỏng/rỗng**. Sử dụng giá trị mặc định."
          );
        } else {
          cy.log(
            "⚠️ File cypress/temp/inBound.json không tồn tại. Sử dụng giá trị mặc định."
          );
        }

        // Gán giá trị mặc định (Fallback)
        maThamChieuIB_fallback = DEFAULT_MA_THAM_CHIEU_IB;
        trimmedMaDonHang_fallback = DEFAULT_TRIMMED_MA_DON_HANG;
      }
    );
  });

  after(() => {
    cy.writeFile("cypress/temp/inBound.json", {});
    cy.log("Đã clear file temp");
  });

  // ----------------------------------------------------

  function layMaDonNhapHang() {
    // Logic tìm kiếm/fallback không cần thay đổi
    if (maThamChieuIB_fallback === DEFAULT_MA_THAM_CHIEU_IB) {
      cy.log(
        `Bỏ qua bước tìm kiếm Mã Đơn Hàng vì đang sử dụng Mã Tham Chiếu mặc định: ${maThamChieuIB_fallback}`
      );
      cy.log(`Sử dụng Mã Đơn Hàng mặc định: ${trimmedMaDonHang_fallback}`);

      // Lệnh cy.writeFile() vẫn được xếp hàng đợi
      return cy
        .writeFile("cypress/temp/inBound.json", {
          maThamChieuIB: maThamChieuIB_fallback,
          trimmedMaDonHang: trimmedMaDonHang_fallback,
        })
        .then(() => trimmedMaDonHang_fallback); // Trả về giá trị cần dùng
    }

    // Trường hợp đang dùng mã được tạo từ kịch bản Nhập Kho (OMS)
    cy.log("Mã tham chiếu:", maThamChieuIB_fallback);
    cy.visit(`${config_wms.wmsUrl}/shipment`);

    // Toàn bộ khối này là command chain và được trả về
    return cy
      .contains("span", maThamChieuIB_fallback)
      .closest("tr")
      .find("a.link-secondary")
      .invoke("text")
      .then((maDonHangIB) => {
        const trimmedMaDonHang = maDonHangIB.trim();
        cy.log("Mã đơn hàng:", trimmedMaDonHang);

        return cy
          .get(`a[href^="/shipment/"]`)
          .contains(trimmedMaDonHang)
          .click({ force: true })
          .then(() => {
            // Ghi lại cả hai mã
            return cy
              .writeFile("cypress/temp/inBound.json", {
                maThamChieuIB: maThamChieuIB_fallback,
                trimmedMaDonHang: trimmedMaDonHang,
              })
              .then(() => trimmedMaDonHang); // Quan trọng: Trả về giá trị cuối cùng nếu cần
          });
      });
  }
  // ----------------------------------------------------

  function scanQRInbound() {
    cy.readFile("cypress/temp/inBound.json").then(({ trimmedMaDonHang }) => {
      // Logic call API sử dụng trimmedMaDonHang
      cy.log(`Sử dụng Mã Đơn Hàng ${trimmedMaDonHang} để gọi API Scan QR`);
      // ... (Phần còn lại của hàm scanQRInbound giữ nguyên)
      cy.loginMobileAPI().then(() => {
        const mobileToken = Cypress.env("mobileToken");
        cy.request({
          method: "PUT",
          url: `${config_wms.wmsUrl}/v1/po/received-po-at-warehouse/${trimmedMaDonHang}/`,
          // ... (các headers và body khác)
          headers: {
            authorization: mobileToken,
            accept: "application/json",
            "content-type": "application/json",
          },
          body: {
            status_id: 101,
            shipment_images: [
              {
                image_urls:
                  "https://nhl.sgp1.cdn.digitaloceanspaces.com/ts/b4d1499e69ae4c08a5825353252735ef.jpg",
              },
              {
                image_urls:
                  "https://nhl.sgp1.cdn.digitaloceanspaces.com/ts/e56f9d23565241cfaba2e7a137d0a0fe.jpg",
              },
              {
                image_urls:
                  "https://nhl.sgp1.cdn.digitaloceanspaces.com/ts/ab8db22793f64def9a9aaf982645f082.jpg",
              },
            ],
            reason_for_refusal: "",
            delivery_drive_name: "Tran Van A",
            delivery_drive_phone: "0123456789",
            delivery_drive_license_number: "81C-71720",
          },
          failOnStatusCode: false,
        });
      });
    });
  }

  // ----------------------------------------------------

  function kiemHangNhapKho() {
    cy.readFile("cypress/temp/inBound.json").then(({ trimmedMaDonHang }) => {
      // Logic kiểm hàng sử dụng trimmedMaDonHang
      cy.log(`Sử dụng Mã Đơn Hàng ${trimmedMaDonHang} để Kiểm Hàng`);
      // ... (Phần còn lại của hàm kiemHangNhapKho giữ nguyên)
      cy.visit(`${config_wms.wmsUrl}/inspection`);
      cy.get('input[placeholder="Quét hoặc nhập mã bàn"]').type("BAN01{enter}");
      cy.wait(1000);
      cy.get('input[placeholder="Quét mã PO"]').type(
        `${trimmedMaDonHang}{enter}`
      );
      // ... (Phần còn lại giữ nguyên)
      cy.get('input[placeholder="Quét mã kiện"]').type(
        `${config_wms.maKien}{enter}`
      );

      function xuLyRow(index = 0) {
        cy.get("table.table.table-nowrap.mb-0 tbody tr").then(($rows) => {
          if (index >= $rows.length) {
            cy.log("✅ Đã xử lý hết tất cả các dòng");
            cy.get("button.btn-success")
              .contains("Hoàn tất phiên kiểm")
              .click({ force: true });
            return;
          }

          const $row = $rows.eq(index);

          cy.wrap($row).within(() => {
            cy.get("td")
              .eq(0)
              .invoke("text")
              .then((poCode) => {
                cy.log(`🔹 Đang xử lý dòng ${index + 1}: ${poCode.trim()}`);
              });
            cy.get("button.btn-soft-secondary.dropdown").click({
              force: true,
            });
          });

          cy.contains("button.dropdown-item", "Kiểm hàng").click({
            force: true,
          });
          cy.get("div.text-muted.d-flex span")
            .invoke("text")
            .then((text) => {
              const maBarcode = text.trim();
              cy.log("Mã barcode là: " + maBarcode);
              const productsInbound = config_wms.productsInbound;
              const productToFind = maBarcode.split("-")[0].trim();
              const currentProduct = productsInbound.find(
                (p) => p.name === productToFind
              );
              if (currentProduct) {
                cy.get('input[name="quantity_goods_normal"]')
                  .clear()
                  .type(currentProduct.qty.toString());
                cy.log(
                  `✅ Tìm thấy sản phẩm ${currentProduct.name} với số lượng: ${currentProduct.qty}`
                );
              } else {
                cy.log(
                  `⚠️ Không tìm thấy sản phẩm tương ứng trong fixture: ${maBarcode}`
                );
                cy.get('input[name="quantity_goods_normal"]').clear().type("1");
              }
              cy.get('input[placeholder="Chọn mã barcode"]').type(maBarcode);
              cy.wait(1000);
              const goodsFields = [
                { selector: 'input[name="goods_d"]', value: config_wms.length },
                { selector: 'input[name="goods_w"]', value: config_wms.width },
                { selector: 'input[name="goods_h"]', value: config_wms.height },
                {
                  selector: 'input[name="goods_weight"]',
                  value: config_wms.weight,
                },
              ];
              goodsFields.forEach(({ selector, value }) => {
                cy.get("body").then(($body) => {
                  const $el = $body.find(selector);
                  if ($el.length > 0 && !$el.is(":disabled")) {
                    cy.get(selector).clear().type(value);
                    cy.log(`✅ Đã nhập ${value} vào ${selector}`);
                  } else if ($el.length > 0) {
                    cy.log(`⚠️ ${selector} bị disable, bỏ qua`);
                  } else {
                    cy.log(`⚠️ Không tìm thấy ${selector}, bỏ qua`);
                  }
                });
              });
              cy.wait(1000);

              // Serial
              const serialButtonSelector =
                'button[type="button"]:contains("Quét mã serial")';

              // Sử dụng cy.get().then() và kiểm tra tồn tại (tốt hơn so với dùng $body)
              cy.get("body").then(($body) => {
                const timestamp = new Date().getTime();
                if ($body.find(serialButtonSelector).length) {
                  cy.log(
                    "🔑 Phát hiện nút 'Quét mã serial', bắt đầu thao tác."
                  );

                  // 1. Click nút serial
                  cy.contains(serialButtonSelector, "Quét mã serial").click({
                    force: true,
                  });

                  // 2. Nhập serial trong Modal/Popup
                  const soLuongCanNhap = currentProduct
                    ? currentProduct.qty
                    : 1;

                  for (let i = 1; i <= soLuongCanNhap; i++) {
                    const serialNumber = `SERIAL-${maBarcode}-${timestamp}-${i}`;
                    cy.log(`   - Nhập serial: ${serialNumber}`);

                    // 🚨 QUAN TRỌNG: Hãy đảm bảo selector này chỉ nhắm vào INPUT trong modal serial
                    cy.get('input[placeholder="Quét mã serial"]')
                      .type(serialNumber)
                      .type("{enter}")
                      .wait(1000);
                    // Nếu hệ thống cần ENTER để thêm serial: .type(serialNumber + '{enter}')
                  }

                  // 3. Xác nhận serial trong Modal
                  // Cần đảm bảo đây là nút Xác nhận của modal serial, không phải nút Kiểm hàng
                  cy.get("button.btn-success") // Hoặc selector khác bao quanh modal
                    .contains("Xác nhận")
                    .click();

                  cy.wait(1000); // Đợi modal đóng
                }
              });
              // 🌟 KẾT THÚC PHẦN THÊM LOGIC XỬ LÝ SERIAL
              cy.contains('button[type="button"]', "Kiểm hàng").click();
              cy.get("body").then(($body) => {
                if (
                  $body.find('button.btn-light:contains("Bỏ qua")').length > 0
                ) {
                  cy.contains("button.btn-light", "Bỏ qua").click();
                  cy.wait(1000);
                  if (
                    $body.find('button.btn-success:contains("Xác nhận")')
                      .length > 0
                  ) {
                    cy.contains("button.btn-success", "Xác nhận").click({
                      force: true,
                    });
                  }
                }
              });
              cy.get('input[placeholder="Quét mã kiện"]')
                .clear()
                .type(`${config_wms.maKien}{enter}`);
              cy.wait(1000);
              xuLyRow(index + 1);
            });
        });
      }
      xuLyRow(0);
    });
  }

  it("Xác nhận nhập hàng WMS", () => {
    // ✅ GIẢI PHÁP: Sử dụng cy.wrap().then() để bắt đầu chuỗi lệnh
    // và đảm bảo layMaDonNhapHang() được gọi như một phần của chuỗi lệnh
    // SAU KHI beforeEach hoàn thành.

    cy.wrap(null) // Bắt đầu một command chain mới
      .then(() => {
        // Gọi layMaDonNhapHang() và chờ nó hoàn thành
        // vì nó trả về một command chain (hoặc cy.wrap trong fallback)
        return layMaDonNhapHang();
      })
      .then(() => {
        // Sau khi layMaDonNhapHang() (và cy.writeFile bên trong nó) hoàn thành,
        // ta tiếp tục xếp hàng đợi các bước còn lại.
        scanQRInbound();
        kiemHangNhapKho();
      });
  });
});
