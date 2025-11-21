describe("Inbound WMS", () => {
  let config_wms;
  // Tải file config.json một lần duy nhất trước khi chạy test
  beforeEach(() => {
    cy.fixture("config_inbound.json").then((data) => {
      config_wms = data;
    });
    cy.loginWMS();
    cy.wait(1000);
  });

  function layMaDonNhapHang() {
    cy.readFile("cypress/temp/inBound.json").then(({ maThamChieuIB }) => {
      cy.log("Mã tham chiếu:", maThamChieuIB);
      cy.visit(`${config_wms.wmsUrl}/shipment`);
      cy.contains("span", maThamChieuIB)
        .closest("tr")
        .find("a.link-secondary")
        .invoke("text")
        .then((maDonHangIB) => {
          const trimmedMaDonHang = maDonHangIB.trim();
          cy.log("Mã đơn hàng:", trimmedMaDonHang);
          console.log("Mã đơn hàng:", trimmedMaDonHang);
          cy.get(`a[href^="/shipment/"]`)
            .contains(trimmedMaDonHang)
            .click({ force: true });
          cy.writeFile("cypress/temp/inBound.json", { trimmedMaDonHang });
        });
    });
  }

  function scanQRInbound() {
    cy.readFile("cypress/temp/inBound.json").then(({ trimmedMaDonHang }) => {
      cy.loginMobileAPI().then(() => {
        const mobileToken = Cypress.env("mobileToken");
        cy.request({
          method: "PUT",
          url: `${config_wms.wmsUrl}/v1/po/received-po-at-warehouse/${trimmedMaDonHang}/`,
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

  function kiemHangNhapKho() {
    cy.readFile("cypress/temp/inBound.json").then(({ trimmedMaDonHang }) => {
      cy.visit(`${config_wms.wmsUrl}/inspection`);
      cy.get('input[placeholder="Quét hoặc nhập mã bàn"]').type("BAN01{enter}");
      cy.wait(1000);
      cy.get('input[placeholder="Quét mã PO"]').type(
        `${trimmedMaDonHang}{enter}`
      );
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
                { selector: 'input[name="goods_d"]', value: "10" },
                { selector: 'input[name="goods_w"]', value: "10" },
                { selector: 'input[name="goods_h"]', value: "10" },
                { selector: 'input[name="goods_weight"]', value: "10" },
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
    layMaDonNhapHang();
    scanQRInbound();
    kiemHangNhapKho();
  });
});
