describe("Scan QR", () => {
  let config;
  beforeEach(() => {
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    cy.loginWMSAPI();
    cy.addStorage();
  });

  it("Lấy pickup_code -> map trolley -> gán bin", () => {
    cy.fixture("config").then((config) => {
      cy.readFile("cypress/temp/maDonHang.json").then(({ maDonHang }) => {
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

          cy.wrap(found.pickup_code).as("pickupCode");

          cy.readFile("cypress/temp/maDonHang.json").then((data) => {
            cy.writeFile("cypress/temp/maDonHang.json", {
              ...data,
              pickupCode: found.pickup_code,
            });
          });
        });

        cy.get("@pickupCode").then((pickupCode) => {
          cy.loginMobileAPI().then(() => {
            const mobileToken = Cypress.env("mobileToken");

            // --- Vòng lặp check map trolley ---
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
                    trolley_code: trolleyCode,
                    skip_trolley_code: false,
                  },
                  failOnStatusCode: false,
                })
                .then((resp) => {
                  if (resp.status === 200) {
                    cy.log("Map trolley thành công");
                    return; // thoát vòng lặp -> chạy tiếp
                  } else {
                    cy.log(`Map trolley fail (${resp.status}), thử lại...`);
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
              // --- Gán bin với nhiều goods_code ---
              // --- Gán bin với nhiều goods_code ---
              .then((response) => {
                const binCodes = response.body.data.map(
                  (item) => item.bin_code
                );
                cy.log(`Danh sách bin_code: ${JSON.stringify(binCodes)}`);

                // Gán hết barcode trong tất cả bin
                cy.wrap(binCodes)
                  .each((bin) => {
                    cy.log(`🔎 Đang xử lý bin=${bin}`);

                    return cy
                      .request({
                        method: "GET",
                        url: `${config.wmsUrl}/v1/trolley/picking/${pickupCode}?bin_code=${bin}`,
                        headers: {
                          accept: "Application/json",
                          "content-type": "Application/json",
                          authorization: mobileToken,
                        },
                      })
                      .then((res) => {
                        const barcodes = res.body.data
                          .map((item) => item.barcodes)
                          .flat();
                        cy.log(
                          `📦 Barcodes cho bin=${bin}: ${JSON.stringify(
                            barcodes
                          )}`
                        );

                        const qty = config.quantity_sold || 5;

                        return cy.wrap(barcodes).each((barcode) => {
                          cy.log(
                            `🔄 Assign bin=${bin}, goods_code=${barcode}, qty=${qty}`
                          );

                          return cy
                            .request({
                              method: "PUT",
                              url: `${config.wmsUrl}/v1/trolley/detail/${pickupCode}`,
                              headers: {
                                accept: "Application/json",
                                "content-type": "Application/json",
                                authorization: mobileToken,
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
                  .then(() => {
                    // Sau khi assign xong tất cả bin thì commit 1 lần
                    cy.log("🚀 Commit toàn bộ pickup sau khi xử lý tất cả bin");
                    return cy
                      .request({
                        method: "PUT",
                        url: `${config.wmsUrl}/v1/trolley/commit-status/${pickupCode}`,
                        headers: {
                          authorization: mobileToken,
                          accept: "application/json",
                          "content-type": "application/json",
                        },
                        body: {
                          trolley_code: trolleyCode,
                        },
                        failOnStatusCode: false,
                      })
                      .then((resp) => {
                        cy.log(`✅ Commit cuối cùng, Status=${resp.status}`);
                        expect(resp.status).to.eq(200);
                      });
                  });
              });
          });
        });
      });
    });
  });
});
