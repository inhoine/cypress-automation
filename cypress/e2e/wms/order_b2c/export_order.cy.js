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

  function layHang() {
    cy.fixture("config").then((config) => {
      // Tạo trolley và lưu vào file
      cy.addStorage();
      cy.readFile("cypress/temp/maDonHang.json").then(({ trolleyCode }) => {
        cy.intercept("GET", "**/v1/pickup/list*status_id=600*").as(
          "getPickupList600"
        );

        cy.visit(`${config.wmsUrl}/pickup-list`);
        cy.wait("@getPickupList600").then(({ response }) => {
          const list = response.body.data;
          const found = list.find((x) =>
            x.picking_strategy?.list_tracking_code?.some((code) =>
              maDonHang.includes(code)
            )
          );

          expect(found, "Tìm thấy đơn hàng có tracking_code").to.not.be
            .undefined;

          const pickupCode = found.pickup_code;

          // Lưu pickupCode vào file JSON
          cy.readFile("cypress/temp/maDonHang.json").then((data) => {
            cy.writeFile("cypress/temp/maDonHang.json", {
              ...data,
              pickupCode,
            });
          });

          // // --- Gọi API mobile ---
          cy.loginMobileAPI().then(() => {
            const mobileToken = Cypress.env("mobileToken");

            //   // --- Vòng lặp map trolley ---
            function tryMapTrolley(retries = 36) {
              if (retries <= 0) {
                throw new Error("Map trolley không thành công sau 3 phút");
              }

              return cy
                .request({
                  method: "PUT",
                  url: `${config.wmsUrl}/v1/trolley/trolley-map-picking/${pickupCode}`,
                  headers: {
                    authorization: mobileToken,
                    accept: "application/json",
                    "content-type": "application/json",
                  },
                  body: {
                    trolley_code: trolleyCode, // ✅ lấy từ file
                    skip_trolley_code: false,
                  },
                  failOnStatusCode: false,
                })
                .then((resp) => {
                  if (resp.status === 200) {
                    cy.log("✅ Map trolley thành công");
                    return;
                  } else {
                    cy.log(`⚠️ Map trolley fail (${resp.status}), thử lại...`);
                    cy.wait(10000);
                    return tryMapTrolley(retries - 1);
                  }
                });
            }

            // --- Lấy bin_code ---
            tryMapTrolley()
              .then(() => {
                return cy.request({
                  method: "GET",
                  url: `${config.wmsUrl}/v1/trolley/binset/${pickupCode}?is_issue=-1`,
                  headers: {
                    Authorization: `Bearer ${mobileToken}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                  },
                });
              })
              .then((response) => {
                const binCodes = response.body.data.map(
                  (item) => item.bin_code
                );
                cy.wrap(binCodes)
                  .each((bin) => {
                    return cy
                      .request({
                        method: "GET",
                        url: `${config.wmsUrl}/v1/trolley/picking/${pickupCode}?bin_code=${bin}`,
                        headers: {
                          Authorization: `Bearer ${mobileToken}`,
                          Accept: "application/json",
                          "Content-Type": "application/json",
                        },
                      })
                      .then((res) => {
                        // Lấy từng item có barcodes + quantity_sold
                        const items = res.body.data.flatMap((item) =>
                          item.barcodes.map((barcode) => ({
                            barcode,
                            qty: item.quantity_sold,
                          }))
                        );
                        cy.readFile("cypress/temp/itemsList.json", {
                          log: false,
                          timeout: 500,
                          failOnNonExist: false,
                        }).then((existingItems = []) => {
                          const mergedItems = [...existingItems, ...items];
                          cy.writeFile(
                            "cypress/temp/itemsList.json",
                            mergedItems
                          );
                        });

                        // Duyệt từng {barcode, qty}
                        return cy.wrap(items).each(({ barcode, qty }) => {
                          return cy
                            .request({
                              method: "PUT",
                              url: `${config.wmsUrl}/v1/trolley/detail/${pickupCode}`,
                              headers: {
                                Authorization: `Bearer ${mobileToken}`,
                                Accept: "application/json",
                                "Content-Type": "application/json",
                              },
                              body: {
                                bin_code: bin,
                                goods_code: barcode,
                                quantity: qty,
                              },
                              failOnStatusCode: false,
                            })
                            .then((resp) => {
                              expect(resp.status).to.eq(200);
                            });
                        });
                      });
                  })
                  //     // --- Commit status ---
                  .then((res) => {
                    cy.log(
                      "assign bin ->",
                      res.status,
                      JSON.stringify(res.body)
                    );

                    return cy.request({
                      method: "PUT",
                      url: `${config.wmsUrl}/v1/trolley/commit-status/${pickupCode}`,
                      headers: {
                        authorization: mobileToken,
                        accept: "application/json",
                        "content-type": "application/json",
                      },
                      body: {
                        trolley_code: trolleyCode, // ✅ lấy từ file
                      },
                      failOnStatusCode: false,
                    });
                  });
              });
          });
        });
      });
    });
  }

  const maDonHang = "NHSVC2941744318, NHSVC2941591882";

  function nhapBangKe(pickupCode) {
    cy.visit(`${config.wmsUrl}/receive-packing-trolley`);
    cy.get('input[placeholder="Quét mã XE/ bảng kê cần đóng gói"]')
      .type(pickupCode)
      .type("{enter}");
    cy.get("button.btn-warning")
      .contains("Nhận bảng kê")
      .click({ force: true });
  }
  function dongGoiB2c(pickupCode) {
    cy.intercept(
      "PUT",
      `${config.wmsUrl}/v1/pickup/commit-item-sold/${pickupCode}`
    ).as("getTotalSold");

    cy.visit(`${config.wmsUrl}/packing`);
    cy.wait(2000);

    cy.get('input[placeholder="Quét hoặc nhập mã bàn"]')
      .type(config.packing_table)
      .type("{enter}");
    cy.wait(2000);

    cy.get('input[placeholder="Quét mã XE/ bảng kê xuất kho (Mã PK)"]')
      .type(pickupCode)
      .type("{enter}");
    cy.wait(2000);

    cy.readFile("cypress/temp/itemsList.json").then((items) => {
      cy.wrap(items).each(({ barcode }, index, list) => {
        cy.log(`🔸 Bắt đầu scan sản phẩm: ${barcode}`);

        function scanItem() {
          cy.get('input[placeholder="Quét mã sản phẩm"]', { timeout: 10000 })
            .should("be.visible")
            .and("not.be.disabled")
            .clear()
            .type(barcode)
            .type("{enter}");

          // Chờ API phản hồi
          cy.wait("@getTotalSold").then((interception) => {
            const { total_sold, total_pick } = interception.response.body.data;
            const remaining = total_sold - total_pick;

            cy.log(
              `${barcode}: sold=${total_sold}, pick=${total_pick}, remaining=${remaining}`
            );

            if (remaining > 0) {
              cy.wait(400); // cho API ổn định 1 chút
              scanItem(); // 🔁 Gọi lại chính nó đến khi đủ
            } else {
              cy.log(`✅ Đã quét đủ ${barcode}, tiến hành quét vật liệu`);
              cy.wait(3000);
              cy.get(
                'input[placeholder="Quét hoặc nhập mã vật liệu đóng gói"]',
                { timeout: 10000 }
              )
                .should("be.visible")
                .and("not.be.disabled")
                .type("40x20x20")
                .type("{enter}");

              cy.wait(4000);

              if (index === list.length - 1) {
                cy.log("✅ Tất cả sản phẩm đã đóng gói xong");
              }
            }
          });
        }

        // 🔹 Bắt đầu lần scan đầu tiên
        scanItem();
      });
    });
  }

  it("Đọc order từ fixtures và xuất kho WMS", () => {
    taoYeuCauXuatKho();
    customizePickUpCondition();
    listOrder(maDonHang);
    layHang();
    cy.readFile("cypress/temp/maDonHang.json").then(({ pickupCode }) => {
      cy.log("pickupCode:", pickupCode);
      nhapBangKe(pickupCode);
      dongGoiB2c(pickupCode);
    });
  });
});
