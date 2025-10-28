describe("WMS - Xuất kho từ đơn OMS", () => {
  let config;
  beforeEach(() => {
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    cy.loginWMS();
    cy.wait(1000);
    // cy.chonFC('FC HN');
  });

  function taoYeuCauXuatKho() {
    cy.visit(`${config.wmsUrl}/pickup-order`);
    cy.get("div.css-1jqq78o-placeholder")
      .contains("Chọn loại chiến lược")
      .click({ force: true });
    cy.contains("div", "Lấy theo sản phẩm").click({ force: true });

    cy.get("div.css-1jqq78o-placeholder")
      .contains("Chọn loại bảng kê")
      .click({ force: true });
    cy.contains("div", "Bảng kê đơn hàng B2C").click({ force: true });
  }
  function customizePickUpCondition() {
    cy.get("button.btn-success").contains("Tuỳ chỉnh").click();
    cy.get("input[id='btnTypeMulti']").click();
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

  const maDonHang = "NHSVC2702374511, NHSVC2702212843";

  it("Đọc order từ fixtures và xuất kho WMS", () => {
    taoYeuCauXuatKho();
    customizePickUpCondition();
    listOrder(maDonHang);

    cy.fixture("config").then((config) => {
      // Tạo trolley và lưu vào file
      // cy.addStorage();

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

        expect(found, "Tìm thấy đơn hàng có tracking_code").to.not.be.undefined;

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
                  trolley_code: "TOT25", // ✅ lấy từ file
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
            // --- Bước 1: Lấy danh sách bin_code ---
            .then(() => {
              return cy.request({
                method: "GET",
                url: `${config.wmsUrl}/v1/trolley/binset/${pickupCode}?is_issue=-1`,
                headers: {
                  authorization: mobileToken,
                  accept: "application/json",
                  "content-type": "application/json",
                },
              });
            })
            // --- Bước 2: Với mỗi bin_code, gọi tiếp API lấy goods_code ---
            .then((response) => {
              const bins = response.body.data;

              // Lặp qua từng bin_code
              return cy.wrap(bins).each((bin) => {
                cy.log(`🧩 Đang xử lý bin_code: ${bin.bin_code}`);

                // Gọi API để lấy goods_code
                return cy
                  .request({
                    method: "GET",
                    url: `${config.wmsUrl}/v1/trolley/picking/${pickupCode}?bin_code=${bin.bin_code}`,
                    headers: {
                      authorization: mobileToken,
                      accept: "application/json",
                      "content-type": "application/json",
                    },
                  })
                  .then((res) => {
                    const goodsCode = res.body.data?.[0]?.barcodes;

                    expect(goodsCode, `Goods code của bin ${bin.bin_code}`).to
                      .exist;
                    cy.log(
                      `PUT detail với bin=${bin.bin_code}, goods=${goodsCode}, qty=${bin.quantity_sold}`
                    );

                    // --- Bước 3: Gọi PUT /trolley/detail ---
                    return cy.request({
                      method: "PUT",
                      url: `${config.wmsUrl}/v1/trolley/detail/${pickupCode}`,
                      headers: {
                        authorization: mobileToken,
                        accept: "application/json",
                        "content-type": "application/json",
                      },
                      body: {
                        bin_code: bin.bin_code,
                        goods_code: goodsCode,
                        quantity: bin.quantity_sold,
                      },
                      failOnStatusCode: false,
                    });
                  })
                  .then((resPut) => {
                    expect(resPut.status).to.eq(200);
                    cy.log(`✅ PUT thành công cho bin_code: ${bin.bin_code}`);
                  });
              });
            })
            .then(() => {
              cy.log("🎯 Hoàn tất xử lý tất cả bin_code trong danh sách!");
            })
            //     // --- Commit status ---
            .then((res) => {
              cy.log("assign bin ->", res.status, JSON.stringify(res.body));
              expect(res.status).to.eq(200);

              return cy.request({
                method: "PUT",
                url: `${config.wmsUrl}/v1/trolley/commit-status/${pickupCode}`,
                headers: {
                  authorization: mobileToken,
                  accept: "application/json",
                  "content-type": "application/json",
                },
                body: {
                  trolley_code: "TOT25", // ✅ lấy từ file
                },
                failOnStatusCode: false,
              });
            });
        });
      });
    });
  });
});
