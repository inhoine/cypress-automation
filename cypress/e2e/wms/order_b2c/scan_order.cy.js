describe("Scan QR", () => {
  let config;
  beforeEach(() => {
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    cy.loginWMSAPI();
  });

  it("Lấy pickup_code -> map trolley -> gán bin", () => {
    cy.fixture("config").then((config) => {
      // Tạo trolley và lưu vào file
      cy.addStorage();

      // Đọc cả maDonHang + trolleyCode từ file JSON
      cy.readFile("cypress/temp/maDonHang.json").then(
        ({ maDonHang, trolleyCode }) => {
          cy.log("📦 Mã đơn hàng từ file:", maDonHang);
          cy.log("🛒 Trolley code từ file:", trolleyCode);

          // --- Intercept pickup list ---
          cy.intercept("GET", "**/v1/pickup/list*status_id=600*").as(
            "getPickupList600"
          );

          cy.visit(`${config.wmsUrl}/pickup-list`);
          cy.wait("@getPickupList600").then(({ response }) => {
            const list = response.body.data;
            const found = list.find(
              (x) => x.picking_strategy?.tracking_code === maDonHang
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

            // --- Gọi API mobile ---
            cy.loginMobileAPI().then(() => {
              const mobileToken = Cypress.env("mobileToken");

              // --- Vòng lặp map trolley ---
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
                      cy.log(
                        `⚠️ Map trolley fail (${resp.status}), thử lại...`
                      );
                      cy.wait(10000);
                      return tryMapTrolley(retries - 1);
                    }
                  });
              }

              tryMapTrolley()
                // --- Lấy bin_code ---
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
                // --- Gán bin ---
                .then((response) => {
                  const binCode = response.body.data[0].bin_code;
                  const quantity_sold = response.body.data[0].quantity_sold;

                  cy.log(`bin_code: ${binCode}`);
                  cy.log(`quantity_sold: ${quantity_sold}`);

                  return cy.request({
                    method: "PUT",
                    url: `${config.wmsUrl}/v1/trolley/detail/${pickupCode}`,
                    headers: {
                      authorization: mobileToken,
                      accept: "application/json",
                      "content-type": "application/json",
                    },
                    body: {
                      bin_code: binCode,
                      goods_code: "GaoMuss",
                      quantity: quantity_sold,
                    },
                    failOnStatusCode: false,
                  });
                })
                // --- Commit status ---
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
                      trolley_code: trolleyCode, // ✅ lấy từ file
                    },
                    failOnStatusCode: false,
                  });
                });
            });
          });
        }
      );
    });
  });
});
