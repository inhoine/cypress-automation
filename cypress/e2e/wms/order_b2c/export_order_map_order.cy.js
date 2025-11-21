describe("Xuất kho từ đơn OMS", () => {
  Cypress.on("uncaught:exception", (err, runnable) => {
    if (err.message.includes("is_parcel_check")) {
      return false;
    }
  });
  let config;
  before(() => {
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    cy.loginWMS();
    cy.wait(1000);
  });
  function layVaLuuTatCaDonWMS() {
    return cy.readFile("cypress/temp/maDonHang.json").then((data) => {
      const listOMS = data.maDonHangOMS; // mảng OMS
      const results = []; // nơi lưu kết quả

      cy.visit(`${config.wmsUrl}/order-list`);

      return cy
        .wrap(listOMS)
        .each((maOMS) => {
          cy.log("Đang lấy mã OMS:", maOMS);

          return cy
            .contains("p", maOMS)
            .closest("tr")
            .then(($row) => {
              const maDonHangWMS = $row.find("a.link-secondary").text().trim();
              const loaiDon = $row
                .find('span[class*="badge-soft"]')
                .text()
                .trim();

              cy.log(`=> WMS: ${maDonHangWMS} - ${loaiDon}`);

              // push vào mảng kết quả
              results.push({
                maOMS,
                maWMS: maDonHangWMS,
                loaiDon,
              });
            });
        })
        .then(() => {
          // Lưu file cho use ở bước tiếp theo
          cy.writeFile("cypress/temp/maDonHangWMS.json", {
            danhSach: results,
          });

          cy.log("Đã lưu danh sách WMS:", JSON.stringify(results));
        });
    });
  }

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

  function listOrder() {
    cy.readFile("cypress/temp/maDonHangWMS.json").then((data) => {
      cy.get("button[type='button']").contains("Nhập mã đơn").click();
      cy.wait(1000);

      const orderWMS = data.danhSach.map((item) => item.maWMS);
      const chuoiNhap = orderWMS.join(", ");

      cy.get(
        "textarea[placeholder='Nhập danh sách mã đơn hàng, ví dụ: NH1234567, ABC-01, ...']"
      )
        .clear()
        .type(chuoiNhap, { delay: 0 });

      cy.get("button[type='button']").contains("Xác nhận").click();
      cy.get("button.btn-success").contains("Xác nhận").click();

      cy.get("button.btn-success").contains("Tạo bảng kê").click();
      cy.wait(500);
    });
  }

  function layHang() {
    return cy.fixture("config").then((config) => {
      cy.addStorageWMS();

      return cy
        .readFile("cypress/temp/maDonHangWMS.json")
        .then(({ danhSach, trolleyCode }) => {
          const maWMSList = danhSach.map((x) => x.maWMS); // ✅ Lấy danh sách WMS đúng cách

          cy.log("📦 Danh sách mã WMS:", JSON.stringify(maWMSList));

          cy.intercept("GET", "**/v1/pickup/list*status_id=600*").as(
            "getPickupList600"
          );
          cy.visit(`${config.wmsUrl}/pickup-list`);

          return cy.wait("@getPickupList600").then(({ response }) => {
            const list = response.body.data || [];
            // 👉 TÌM pickup theo mã WMS (tracking code)
            const found = list.find((x) =>
              x.picking_strategy?.list_tracking_code?.some((code) =>
                maWMSList.includes(code)
              )
            );

            expect(found, "Tìm thấy đơn hàng theo WMS").to.not.be.undefined;

            const pickupCode = found.pickup_code;
            cy.log(`📦 Found pickupCode: ${pickupCode}`);

            // Lưu vào file để dùng bước sau
            return cy.readFile("cypress/temp/maDonHang.json").then((data) => {
              cy.writeFile("cypress/temp/maDonHang.json", {
                ...data,
                pickupCode,
              });

              // == Phần xử lý map trolley, lấy bin, pick item... giữ nguyên ==
              return cy.loginMobileAPI().then(() => {
                const mobileToken = Cypress.env("mobileToken");

                function tryMapTrolley(retries = 36) {
                  if (retries <= 0)
                    throw new Error(
                      "❌ Map trolley không thành công sau 3 phút"
                    );

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
                      body: {
                        trolley_code: trolleyCode,
                        skip_trolley_code: false,
                      },
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

                // Chain từ map trolley → lấy bin → pick item
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
                      const binCodes = response.body.data.map(
                        (i) => i.bin_code
                      );
                      cy.log(`📦 Có ${binCodes.length} bin cần xử lý`);

                      return cy.wrap(binCodes).each((bin) => {
                        cy.log(`🧩 Bin: ${bin}`);
                        return cy
                          .request({
                            method: "GET",
                            url: `${config.wmsUrl}/v1/trolley/picking/${pickupCode}?bin_code=${bin}`,
                            headers: {
                              Authorization: `Bearer ${mobileToken}`,
                            },
                          })
                          .then((res) => {
                            const items = res.body.data.flatMap((item) =>
                              item.barcodes.map((barcode) => ({
                                barcode,
                                qty: item.quantity_sold,
                              }))
                            );

                            cy.readFile("cypress/temp/itemsList.json", {
                              log: false,
                              failOnNonExist: false,
                            }).then((existing = []) => {
                              cy.writeFile("cypress/temp/itemsList.json", [
                                ...existing,
                                ...items,
                              ]);
                            });

                            return cy.wrap(items).each(({ barcode, qty }) => {
                              cy.log(`📦 Pick ${barcode} (${qty})`);
                              return cy
                                .request({
                                  method: "PUT",
                                  url: `${config.wmsUrl}/v1/trolley/detail/${pickupCode}`,
                                  headers: {
                                    Authorization: `Bearer ${mobileToken}`,
                                  },
                                  body: {
                                    bin_code: bin,
                                    goods_code: barcode,
                                    quantity: qty,
                                  },
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
                          return cy.wrap(pickupCode);
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
      cy.get('input[class="form-control pe-34"]')
        .should("be.visible")
        .type(pickupCode)
        .type("{enter}");
      cy.get("button.btn-warning")
        .contains("Nhận bảng kê")
        .click({ force: true });
    });
  }
  /**
   * Thực hiện quy trình đóng gói B2C (packing) trên WMS.
   * Xử lý các đơn hàng KHÔNG THEO THỨ TỰ (dựa vào API response).
   * @param {string} pickupCode - Mã bảng kê xuất kho (PK).
   */
  /**
   * Thực hiện quy trình đóng gói B2C (packing) trên WMS.
   * Xử lý các đơn hàng KHÔNG THEO THỨ TỰ (dựa vào API response).
   * @param {string} pickupCode - Mã bảng kê xuất kho (PK).
   */
  /**
   * Thực hiện quy trình đóng gói B2C (packing) trên WMS.
   * Dựa vào tracking_code trả về từ API commitItemSold để xử lý đúng đơn hàng.
   * @param {string} pickupCode - Mã bảng kê xuất kho (PK).
   */
  function dongGoiB2c(pickupCode) {
    cy.intercept(
      "PUT",
      `${config.wmsUrl}/v1/pickup/commit-item-sold/${pickupCode}`
    ).as("commitItemSold");

    // 1. Chuẩn bị: Quét bàn và bảng kê (Giữ nguyên)
    cy.visit(`${config.wmsUrl}/packing`);
    cy.wait(1000);
    cy.get('input[placeholder="Quét hoặc nhập mã bàn"]')
      .should("be.visible")
      .type(config.packing_table)
      .type("{enter}");
    cy.wait(1000);
    cy.get('input[placeholder="Quét mã Xe/ Bảng kê/ Rổ"]')
      .should("be.visible")
      .type(pickupCode)
      .type("{enter}");
    cy.wait(2000);

    return cy.loginWMSAPI().then(() => {
      const token = Cypress.env("token");
      cy.window().then((win) => {
        cy.stub(win, "print").as("printStub");
      });

      // Lấy detail bảng kê (Làm nguồn dữ liệu duy nhất cho Scans)
      return cy
        .request({
          method: "GET",
          url: `${config.wmsUrl}/v1/pickup/detail/${pickupCode}`,
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((pickupRes) => {
          const pickupOrders = pickupRes.body?.data?.pickup_orders || [];
          if (!pickupOrders.length)
            throw new Error(
              `❌ Không tìm thấy pickup_orders cho ${pickupCode}`
            );

          cy.log(
            `📦 Bảng kê ${pickupCode} có ${pickupOrders.length} đơn hàng.`
          );

          // Map lưu trữ TẤT CẢ items cần quét (cần quét = sold - pick ban đầu)
          const allScansMap = {};
          pickupOrders.forEach((order) => {
            const orderCode = order.tracking_code;
            const scans = [];
            order.list_items.forEach((item) => {
              const barcode = item.goods_id?.barcodes?.[0];
              const qtySold = Number(item.quantity_sold || 0);
              const qtyPick = Number(item.quantity_pick || 0);
              const needToScan = Math.max(0, qtySold - qtyPick); // Số lượng cần quét thêm

              if (barcode && needToScan > 0) {
                for (let i = 0; i < needToScan; i++) {
                  scans.push({ barcode });
                }
              }
            });
            if (scans.length > 0) {
              allScansMap[orderCode] = scans;
            } else {
              // Nếu đã quét xong (qty_sold == qty_pick) thì không cần đưa vào map
              cy.log(
                `⚠️ Đơn hàng ${orderCode} đã hoàn tất hoặc không cần quét item.`
              );
            }
          });

          const totalOrdersToPack = Object.keys(allScansMap).length;
          if (totalOrdersToPack === 0) {
            cy.log(
              "✅ Tất cả đơn hàng đã được đóng gói hoặc không cần quét item."
            );
            return;
          }
          cy.log(`📝 Cần đóng gói ${totalOrdersToPack} đơn hàng. Bắt đầu...`);

          // 3. KHỞI TẠO QUÉT BẰNG ITEM ĐẦU TIÊN CÓ SẴN
          let initialScanItem = null;
          const availableOrderCodes = Object.keys(allScansMap);

          if (availableOrderCodes.length > 0) {
            const firstAvailableOrderCode = availableOrderCodes[0];

            // ✅ PEEK (Lấy) item đầu tiên MÀ KHÔNG DÙNG .shift()
            // Việc xóa item này sẽ được thực hiện sau khi API commit-item-sold trả về.
            initialScanItem = allScansMap[firstAvailableOrderCode][0];
          }

          if (!initialScanItem) {
            cy.log(
              "❌ Không tìm thấy item nào để quét trong Map sau khi khởi tạo."
            );
            return;
          }

          // Bắt đầu quá trình đệ quy
          return scanAndCompleteOrder(
            allScansMap,
            initialScanItem,
            totalOrdersToPack
          );
        });
    });
  }

  // --- Hàm scanAndCompleteOrder: Dựa vào API Response và Map ban đầu ---

  // --- Hàm scanAndCompleteOrder: ĐÃ CÓ LỆNH QUÉT ITEM ---

  // --- Hàm scanAndCompleteOrder (Đã tối ưu logic đếm và Thêm Quét Vật liệu) ---

  function scanAndCompleteOrder(
    allScansMap,
    currentScanItem,
    totalOrdersToPack,
    completedOrders = 0
  ) {
    if (!currentScanItem) {
      cy.log("🎉 HOÀN TẤT ĐÓNG GÓI TẤT CẢ ĐƠN HÀNG.");
      return;
    }

    const { barcode } = currentScanItem;

    cy.log(`\n\n--- 📦 BẮT ĐẦU QUÉT ITEM: **${barcode}** ---`);

    cy.wait(1500);
    // LỆNH QUÉT SẢN PHẨM
    cy.get('input[placeholder="Quét mã sản phẩm"]', { timeout: 10000 })
      .should("be.visible")
      .clear()
      .type(barcode)
      .type("{enter}");
    cy.wait(1000);

    return cy
      .wait("@commitItemSold", { timeout: 15000 })
      .then(({ response }) => {
        expect(response.statusCode).to.eq(200);

        const respondedTrackingCode = response.body?.data?.tracking_code;
        const isPickingDone = response.body?.data?.is_picking_done;
        const currentOrderToProcess = respondedTrackingCode;

        cy.log(
          `\t\t✅ Commit item thành công. Đơn hàng xác nhận: **${currentOrderToProcess}**`
        );

        // BƯỚC 1. XÓA ITEM VỪA QUÉT (Đảm bảo logic đếm item chính xác)
        const scansToUpdate = allScansMap[currentOrderToProcess];
        if (scansToUpdate && scansToUpdate.length > 0) {
          const indexToRemove = scansToUpdate.findIndex(
            (item) => item.barcode === barcode
          );
          if (indexToRemove !== -1) {
            scansToUpdate.splice(indexToRemove, 1); // ✅ Dùng SPLICE
          }
        }

        const remainingScans = allScansMap[currentOrderToProcess] || [];
        if (remainingScans.length > 0) {
          cy.log(
            `📝 Sau khi quét, cần quét thêm ${remainingScans.length} item cho đơn **${currentOrderToProcess}**`
          );
        }

        // --- BƯỚC 2. QUYẾT ĐỊNH HÀNH ĐỘNG TIẾP THEO ---

        // A. Đơn hàng ĐÃ HOÀN TẤT (isPickingDone = true)
        if (isPickingDone === true) {
          cy.log(
            `\t\t📦 Đơn **${currentOrderToProcess}** đã hoàn thành quét sản phẩm.`
          );

          // ******** 🚀 PHẦN THÊM MỚI: QUÉT VẬT LIỆU ĐÓNG GÓI ********
          cy.log(
            `\t\t✅ Bắt đầu quét vật liệu cho đơn **${currentOrderToProcess}**`
          );
          cy.get('input[placeholder="Quét hoặc nhập mã vật liệu đóng gói"]', {
            timeout: 10000,
          })
            .should("be.visible")
            .clear() // Đảm bảo trường input sạch
            .type("40x20x20") // Giả định mã vật liệu là 40x20x20
            .type("{enter}");
          cy.wait(10000);
          cy.log(`\t\t🎉 WMS đã xác nhận đóng gói và chuyển đơn hàng.`);
          // **********************************************************

          delete allScansMap[currentOrderToProcess]; // Xóa đơn hàng đã xong

          const nextOrderCode = Object.keys(allScansMap)[0];
          let nextScanItem = null;

          if (nextOrderCode) {
            nextScanItem = allScansMap[nextOrderCode][0]; // PEEK
          }

          return scanAndCompleteOrder(
            allScansMap,
            nextScanItem,
            totalOrdersToPack,
            completedOrders + 1
          );
        }

        // B. Đơn hàng CHƯA HOÀN TẤT VÀ CÒN ITEM CẦN QUÉT
        else if (remainingScans.length > 0) {
          const nextScanItem = remainingScans[0]; // PEEK

          return scanAndCompleteOrder(
            allScansMap,
            nextScanItem,
            totalOrdersToPack,
            completedOrders
          );
        }

        // C. Đã quét HẾT item trong Map nhưng API nói CHƯA XONG
        else {
          cy.log(
            `\t\t⚠️ CẢNH BÁO: Đã quét hết item trong Map nhưng API nói đơn **${currentOrderToProcess}** chưa xong. Buộc chuyển sang đơn tiếp theo.`
          );

          delete allScansMap[currentOrderToProcess];

          const nextOrderCode = Object.keys(allScansMap)[0];
          let nextScanItem = null;

          if (nextOrderCode) {
            nextScanItem = allScansMap[nextOrderCode][0]; // PEEK
          }

          return scanAndCompleteOrder(
            allScansMap,
            nextScanItem,
            totalOrdersToPack,
            completedOrders + 1
          );
        }
      });
  }

  it("Xuất kho WMS", () => {
    layVaLuuTatCaDonWMS();
    taoYeuCauXuatKho();
    customizePickUpCondition();
    listOrder();
    return layHang().then((pickupCode) => {
      return nhapBangKe(pickupCode).then(() => dongGoiB2c(pickupCode));
    });
  });
});
