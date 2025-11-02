describe("WMS - Xuất kho từ đơn OMS", () => {
  let config;
  beforeEach(() => {
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    cy.writeFile("cypress/temp/itemsList.json", []);
    cy.loginWMS();
    cy.wait(1000);
  });

  function taoYeuCauXuatKho() {
    cy.visit(`${config.wmsUrl}/pickup-order`);

    cy.get("div.css-1jqq78o-placeholder")
      .contains("Chọn loại bảng kê")
      .click({ force: true });
    cy.contains("div", "Bảng kê đơn hàng B2C").click({ force: true });
    cy.wait(500);
    cy.get("div.css-1jqq78o-placeholder")
      .contains("Chọn loại chiến lược")
      .click({ force: true });
    cy.contains("div", "Lấy theo sản phẩm").click({ force: true });
  }
  function customizePickUpCondition() {
    cy.get("button.btn-success").contains("Tuỳ chỉnh").click();
    cy.get(".ri-arrow-down-s-line").click({ force: true });
    cy.get(".input-group > .dropdown-menu > .dropdown-item")
      .contains("DS mã đơn hàng")
      .click();
  }
  function listOrder(orderId) {
    cy.get("button[type='button']").contains("Nhập mã đơn").click();
    cy.get(
      "textarea[placeholder='Nhập danh sách mã đơn hàng, ví dụ: NH1234567, ABC-01, ...']"
    ).type(orderId);
    cy.get("button[type='button']").contains("Xác nhận").click();
    cy.get("button.btn-success").contains("Xác nhận").click();

    cy.get("button.btn-success").contains("Tạo bảng kê").click();
  }

  const maDonHang = "NHSVC2949331283, NHSVC2941129576";

  function layHang() {
  return cy.fixture("config").then((config) => {
    cy.addStorage();

    return cy.readFile("cypress/temp/maDonHang.json").then(({ trolleyCode }) => {
      cy.intercept("GET", "**/v1/pickup/list*status_id=600*").as("getPickupList600");
      cy.visit(`${config.wmsUrl}/pickup-list`);

      return cy.wait("@getPickupList600").then(({ response }) => {
        const list = response.body.data || [];
        const found = list.find((x) =>
          x.picking_strategy?.list_tracking_code?.some((code) => maDonHang.includes(code))
        );
        expect(found, "Tìm thấy đơn hàng có tracking_code").to.not.be.undefined;

        const pickupCode = found.pickup_code;
        cy.log(`📦 Found pickupCode: ${pickupCode}`);

        // Ghi file
        return cy.readFile("cypress/temp/maDonHang.json").then((data) => {
          cy.writeFile("cypress/temp/maDonHang.json", { ...data, pickupCode });

          // Login mobile
          return cy.loginMobileAPI().then(() => {
            const mobileToken = Cypress.env("mobileToken");

            function tryMapTrolley(retries = 36) {
              if (retries <= 0) throw new Error("❌ Map trolley không thành công sau 3 phút");

              cy.log(`🔄 Đang map trolley (còn ${retries} lần thử)...`);
              return cy
                .request({
                  method: "PUT",
                  url: `${config.wmsUrl}/v1/trolley/trolley-map-picking/${pickupCode}`,
                  headers: {
                    Authorization: mobileToken,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                  },
                  body: { trolley_code: trolleyCode, skip_trolley_code: false },
                  failOnStatusCode: false,
                })
                .then((resp) => {
                  if (resp.status === 200) {
                    cy.log("✅ Map trolley thành công");
                    return cy.wrap(true);
                  } else {
                    cy.wait(10000);
                    return tryMapTrolley(retries - 1);
                  }
                });
            }

            // Chain return toàn bộ
            return tryMapTrolley().then(() => {
              cy.log("🗂️ Lấy danh sách bin...");
              return cy
                .request({
                  method: "GET",
                  url: `${config.wmsUrl}/v1/trolley/binset/${pickupCode}?is_issue=-1`,
                  headers: {
                    Authorization: `Bearer ${mobileToken}`,
                  },
                })
                .then((response) => {
                  const binCodes = response.body.data.map((i) => i.bin_code);
                  cy.log(`📦 Có ${binCodes.length} bin cần xử lý`);

                  // Duyệt bin
                  return cy.wrap(binCodes).each((bin) => {
                    cy.log(`🧩 Bin: ${bin}`);
                    return cy
                      .request({
                        method: "GET",
                        url: `${config.wmsUrl}/v1/trolley/picking/${pickupCode}?bin_code=${bin}`,
                        headers: { Authorization: `Bearer ${mobileToken}` },
                      })
                      .then((res) => {
                        const items = res.body.data.flatMap((item) =>
                          item.barcodes.map((barcode) => ({
                            barcode,
                            qty: item.quantity_sold,
                          }))
                        );

                        cy.readFile("cypress/temp/itemsList.json", { log: false, failOnNonExist: false }).then((existing = []) => {
                          cy.writeFile("cypress/temp/itemsList.json", [...existing, ...items]);
                        });

                        // Pick item
                        return cy.wrap(items).each(({ barcode, qty }) => {
                          cy.log(`📦 Pick ${barcode} (${qty})`);
                          return cy
                            .request({
                              method: "PUT",
                              url: `${config.wmsUrl}/v1/trolley/detail/${pickupCode}`,
                              headers: { Authorization: `Bearer ${mobileToken}` },
                              body: { bin_code: bin, goods_code: barcode, quantity: qty },
                            })
                            .then((resp) => {
                              expect(resp.status).to.eq(200);
                            });
                        });
                      });
                  });
                })
                .then(() => {
                  cy.log("🚀 Commit trolley status...");
                  return cy
                    .request({
                      method: "PUT",
                      url: `${config.wmsUrl}/v1/trolley/commit-status/${pickupCode}`,
                      headers: { Authorization: mobileToken },
                      body: { trolley_code: trolleyCode },
                    })
                    .then((resp) => {
                      expect(resp.status).to.eq(200);
                      cy.log("✅ Commit thành công");
                      return cy.wrap(pickupCode); // ✅ Trả lại giá trị đúng kiểu
                    });
                });
            });
          });
        });
      });
    });
  });
}

  function nhapBangKe(pickupCode) {
    return cy.visit(`${config.wmsUrl}/receive-packing-trolley`).then(() => {
      cy.get('input[placeholder="Quét mã XE/ bảng kê cần đóng gói"]')
      .should('be.visible')
      .type(pickupCode)
      .type("{enter}");
    cy.get("button.btn-warning")
      .contains("Nhận bảng kê")
      .click({ force: true });
    })
    
  }
  function dongGoiB2c(pickupCode) {
  cy.intercept("PUT", `${config.wmsUrl}/v1/pickup/commit-item-sold/${pickupCode}`).as("commitItemSold");
  
  // 1. Chuẩn bị: Quét bàn và bảng kê
  cy.visit(`${config.wmsUrl}/packing`);
  cy.wait(1000);
  cy.get('input[placeholder="Quét hoặc nhập mã bàn"]').should("be.visible").type(config.packing_table).type("{enter}");
  cy.wait(1000);
  cy.get('input[placeholder="Quét mã XE/ bảng kê xuất kho (Mã PK)"]').should("be.visible").type(pickupCode).type("{enter}");
  cy.wait(2000);

  return cy.loginWMSAPI().then(() => {
    const token = Cypress.env("token");

    // Lấy detail bảng kê
    return cy.request({
      method: "GET",
      url: `${config.wmsUrl}/v1/pickup/detail/${pickupCode}`,
      headers: { Authorization: `Bearer ${token}` },
    }).then((pickupRes) => {
      const pickupOrders = pickupRes.body?.data?.pickup_orders || [];
      if (!pickupOrders.length) throw new Error(`❌ Không tìm thấy pickup_orders cho ${pickupCode}`);

      cy.log(`📦 Bảng kê ${pickupCode} có ${pickupOrders.length} đơn hàng. Bắt đầu đóng gói TỪNG ĐƠN...`);

      // 2. DUYỆT QUA TỪNG ĐƠN HÀNG (SỬA Ở ĐÂY)
      return cy.wrap(pickupOrders).each((order, index) => {
        const orderCode = order.tracking_code;
        cy.log(`\n\n--- 📦 BẮT ĐẦU XỬ LÝ ĐƠN: **${orderCode}** (${index + 1}/${pickupOrders.length}) ---`);

        // --- BƯỚC A: QUÉT SẢN PHẨM (ITEM SCAN) ---
        const scansForCurrentOrder = [];
        order.list_items.forEach((item) => {
          const barcode = item.goods_id?.barcodes?.[0];
          const qtySold = Number(item.quantity_sold || 0);
          const qtyPick = Number(item.quantity_pick || 0);
          const needToScan = Math.max(0, qtySold - qtyPick);

          if (barcode && needToScan > 0) {
            for (let i = 0; i < needToScan; i++) {
              scansForCurrentOrder.push({ barcode, orderCode });
            }
          }
        });

        cy.log(`🔍 Cần thực hiện **${scansForCurrentOrder.length}** lần quét sản phẩm cho đơn này.`);

        // Thực hiện từng lần quét cho đơn hàng HIỆN TẠI
        return cy.wrap(scansForCurrentOrder).each((scanItem, scanIndex) => {
          cy.log(`\tScan item [${scanIndex + 1}/${scansForCurrentOrder.length}]: **${scanItem.barcode}**`);
          
          cy.wait(500);
          cy.get('input[placeholder="Quét mã sản phẩm"]', { timeout: 10000 })
            .should("be.visible")
            .clear()
            .type(scanItem.barcode)
            .type("{enter}");
          
          return cy.wait("@commitItemSold", { timeout: 15000 }).then(({ response }) => {
            expect(response.statusCode).to.eq(200);
          });
        }).then(() => {
          // --- BƯỚC B: QUÉT VẬT LIỆU ĐÓNG GÓI ---
          cy.log(`\t✅ Hoàn tất quét sản phẩm. Bắt đầu quét vật liệu cho đơn **${orderCode}**`);
          
          // Giả định UI đã tự động chuyển sang trạng thái chờ quét vật liệu cho đơn này
          cy.get('input[placeholder="Quét hoặc nhập mã vật liệu đóng gói"]', { timeout: 10000 })
            .should("be.visible")
            .type("40x20x20") // Mã vật liệu
            .type("{enter}");

          // Chờ cho đơn hàng được hoàn tất (thường sẽ có một API commit/complete sau bước này, nhưng hiện tại dùng wait)
          cy.wait(6000); 
          cy.log(`\t🎉 HOÀN TẤT ĐÓNG GÓI ĐƠN **${orderCode}**`);
        });

      }); // Kết thúc vòng lặp đơn hàng
    });
  });
}


    it("Đọc order từ fixtures và xuất kho WMS", () => {
  taoYeuCauXuatKho();
  customizePickUpCondition();
  listOrder(maDonHang);

  return layHang().then((pickupCode) => {
    cy.log("🚚 PickupCode đã tạo:", pickupCode);
    return nhapBangKe(pickupCode).then(() => dongGoiB2c(pickupCode));
  });
});


});