describe("OMS - Tạo đơn & tạo vận đơn", () => {
  let config;
  Cypress.on("uncaught:exception", (err, runnable) => {
    if (err.message.includes("is_parcel_check")) {
      return false;
    }
  });

  beforeEach(() => {
    // Tải config.json một lần cho mỗi test
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    cy.loginOMS().then(() => {
      cy.selectNNTBusiness();
    });
    cy.visit("https://stg-oms.nandh.vn/orders-b2b");
  });

  function taoDonHang() {
    cy.get("button.btn-success")
      .contains(/Create Order|Tạo đơn/)
      .click();
    cy.get('a[title="Tạo đơn bán buôn"]').click();
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

  // Function chọn 1 sản phẩm theo tên
  function chonSanPhamTheoTen(tenSanPham, qty = 20, index = 0) {
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

  // Chọn nhiều sản phẩm liên tiếp
  function chonNhieuSanPham(products) {
    products.forEach((product, index) => {
      if (index > 0) {
        cy.contains("button", "Thêm sản phẩm").click({ force: true });
      }
      chonSanPhamTheoTen(product.name, product.qty, index);
    });
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

    // 👉 Lấy danh sách sản phẩm từ config
    chonNhieuSanPham(config.products);

    nhapMaThamChieu().then(() => {
      nhapTiepTuc();
      nhapBtntaoDonHang().then((maThamChieu) => {
        cy.log("Mã tham chiếu đã lưu:", maThamChieu);
        xacNhanDonHang();
        selectFreeShipping();
        taoVanDon();
        cy.writeFile("cypress/temp/maDonHang.json", { maThamChieu });
      });
    });
  });
});

describe("WMS - Xuất kho từ đơn OMS", () => {
  let config;
  before(() => {
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    cy.loginWMS();
  });

  function layMaDonHang(maThamChieu) {
    cy.visit(`${config.wmsUrl}/order-list`);
    return cy
      .contains("p", maThamChieu)
      .closest("tr")
      .then(($row) => {
        const maDonHang = $row.find("a.link-secondary").text().trim();
        const loaiDon = $row.find('span[class*="badge-soft"]').text().trim();
        return { maDonHang, loaiDon };
      });
  }

  function taoYeuCauXuatKho(maDonHang, loaiDon) {
    cy.visit(`${config.wmsUrl}/pickup-order`);
    cy.get("div.css-hlgwow")
      .contains("Chọn loại chiến lược")
      .click({ force: true });
    cy.contains("div", "Lấy theo sản phẩm").click({ force: true });

    cy.get("div.css-hlgwow")
      .contains("Chọn loại bảng kê")
      .click({ force: true });
    cy.contains("div", new RegExp(loaiDon, "i")).click({ force: true });

    cy.get("button.btn-success").contains("Tuỳ chỉnh").click();
    cy.get('input[placeholder="Theo mã đơn hàng"]').type(maDonHang);
    cy.get("button.btn-success").contains("Xác nhận").click();
    cy.get("button.btn-success").contains("Tạo bảng kê").click();
  }

  it("Đọc order từ fixtures và xuất kho WMS", () => {
    cy.readFile("cypress/temp/maDonHang.json").then(({ maThamChieu }) => {
      cy.wait(1000);
      layMaDonHang(maThamChieu).then(({ maDonHang, loaiDon }) => {
        cy.log("📦 Mã đơn hàng:", maDonHang);
        cy.log("📦 Loại đơn hàng:", loaiDon);
        taoYeuCauXuatKho(maDonHang, loaiDon);
        cy.readFile("cypress/temp/maDonHang.json").then((data) => {
          cy.writeFile("cypress/temp/maDonHang.json", {
            ...data,
            maDonHang,
            loaiDon,
          });
        });
      });
    });
  });
});

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
      // Tạo xe chứa hàng
      // cy.addStorage();
      cy.readFile("cypress/temp/maDonHang.json").then(
        ({ maDonHang, trolleyCode }) => {
          cy.intercept("GET", "**/v1/pickup/list*status_id=600*").as(
            "getPickupList600"
          );

          cy.visit(`${config.wmsUrl}/pickup-list`);
          cy.wait("@getPickupList600").then(({ response }) => {
            const list = response.body.data;
            const found = list.find(
              (x) => x.picking_strategy?.tracking_code === maDonHang
            );

            expect(found).to.not.be.undefined;
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

              function tryMapTrolley(retries = 36) {
                if (retries <= 0) {
                  throw new Error("Map trolley không thành công sau 3 phút");
                }
                return cy
                  .request({
                    method: "PUT",
                    url: `${config.wmsUrl}/v1/trolley/trolley-map-picking/${pickupCode}`,
                    headers: {
                      Authorization: `Bearer ${mobileToken}`,
                      Accept: "application/json",
                      "Content-Type": "application/json",
                    },
                    body: {
                      trolley_code: "NNT1758788225433",
                      skip_trolley_code: false,
                    },
                    failOnStatusCode: false,
                  })
                  .then((resp) => {
                    if (resp.status === 200) {
                      cy.log("Map trolley thành công");
                      return;
                    } else {
                      cy.wait(10000);
                      return tryMapTrolley(retries - 1);
                    }
                  });
              }

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
                    .then(() => {
                      return cy
                        .request({
                          method: "PUT",
                          url: `${config.wmsUrl}/v1/trolley/commit-status/${pickupCode}`,
                          headers: {
                            Authorization: `Bearer ${mobileToken}`,
                            Accept: "application/json",
                            "Content-Type": "application/json",
                          },
                          body: {
                            trolley_code: "NNT1758788225433",
                          },
                          failOnStatusCode: false,
                        })
                        .then((resp) => {
                          expect(resp.status).to.eq(200);
                        });
                    });
                });
            });
          });
        }
      );
    });
  });
});

describe("Đóng gói đơn hàng bên WMS", () => {
  let config;
  before(() => {
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    cy.loginWMSAPI();
  });

  function nhapBangKe(pickupCode) {
    cy.visit(`${config.wmsUrl}/receive-packing-trolley`);
    cy.get('input[placeholder="Quét mã XE/ bảng kê cần đóng gói"]')
      .type(pickupCode)
      .type("{enter}");
    cy.get("button.btn-warning")
      .contains("Nhận bảng kê")
      .click({ force: true });
  }

  it("Đóng gói đơn hàng", () => {
    cy.readFile("cypress/temp/maDonHang.json").then(({ pickupCode }) => {
      cy.log("pickupCode:", pickupCode);
      nhapBangKe(pickupCode);
    });
  });
});

describe("Đóng gói từng qty", () => {
  let config;

  beforeEach(() => {
    Cypress.on("uncaught:exception", (err, runnable) => {
      return false;
    });
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    cy.loginWMSAPI();
  });

  it("Quét SKU mỗi lần 1 qty rồi đóng gói", () => {
    cy.readFile("cypress/temp/maDonHang.json").then(({ pickupCode }) => {
      cy.log("pickupCode:", pickupCode);
      cy.visit(`${config.wmsUrl}/packing-b2b`);
      cy.wait(500);
      cy.get('input[placeholder="Quét hoặc nhập mã bàn"]')
        .type("BAN-01")
        .type("{enter}");
      cy.wait(1000);

      cy.get('input[placeholder="Quét mã XE/ bảng kê xuất kho (Mã PK)"]')
        .type(pickupCode)
        .type("{enter}");
      cy.wait(1000);

      // 🔁 Sử dụng products từ config
      // 🔁 Sử dụng products từ config
      config.products.forEach((products) => {
        cy.log(`👉 Đang xử lý SKU: ${products.name}`);

        let stopLoop = false; // ✅ thêm cờ để dừng vòng lặp sau khi đủ số lượng

        Cypress._.times(products.qty, (i) => {
          if (stopLoop) return; // nếu đã quét đủ thì bỏ qua các lần còn lại

          cy.get("body").then(($body) => {
            const $input = $body.find('input[placeholder="Quét mã sản phẩm"]');

            if ($input.length > 0) {
              cy.wait(500);
              cy.get('input[placeholder="Quét mã sản phẩm"]')
                .type(products.name)
                .type("{enter}");
              cy.log(`✅ Nhập ${products.name} lần ${i + 1}`);

              cy.wait(650); // chờ trang update xong
              // === START: LOGIC SO SÁNH ===
              if (i < products.qty - 1) {
                // 👈 chỉ so sánh nếu chưa phải lần cuối
                cy.get("h3.mb-0.fw-semibold.blink-soft.text-danger")
                  .invoke("text")
                  .then((text) => {
                    const match = text.match(/\d+/);
                    const soSanPham = match ? parseInt(match[0]) : null;

                    cy.get("span.h5.fw-medium.text-danger.mb-0")
                      .invoke("text")
                      .then((soDaQuetText) => {
                        const match2 = soDaQuetText.match(/\d+/);
                        const soDaQuet = match2 ? parseInt(match2[0]) : null;

                        if (soSanPham !== null && soDaQuet !== null) {
                          if (soSanPham === soDaQuet) {
                            cy.log(
                              `✅ So sánh thành công: ${soSanPham} == ${soDaQuet}`
                            );
                          } else {
                            cy.log(`❌ LỖI: ${soSanPham} != ${soDaQuet}`);
                          }
                        } else {
                          cy.log("🔴 Không thể so sánh do thiếu dữ liệu số.");
                        }
                      });
                  });
              } else {
                cy.log("⏭ Bỏ qua so sánh ở lần cuối (đã đủ số lượng)");
              }
              // === END: LOGIC SO SÁNH ===

              cy.wait(750);
              cy.get("body").then(($body2) => {
                const $btn = $body2.find(
                  'button:contains("Đóng gói và tạo kiện mới")'
                );
                if ($btn.length > 0) {
                  cy.wrap($btn).click({ force: true });
                  cy.get("body").then(($body3) => {
                    const $packInput = $body3.find(
                      'input[placeholder="Quét hoặc nhập mã vật liệu đóng gói"]'
                    );
                    if ($packInput.length > 0) {
                      cy.wrap($packInput).type("20x20x20").type("{enter}");
                      cy.log("📦 Đã nhập vật liệu đóng gói");
                    } else {
                      cy.log("⚠️ Không tìm thấy ô nhập vật liệu, bỏ qua");
                    }
                  });
                } else {
                  cy.log("⚠️ Không thấy nút đóng gói, bỏ qua bước này");
                }
              });
            } else {
              cy.log(
                `⚠️ Không thấy ô nhập SKU (${products.name}), bỏ qua lần ${
                  i + 1
                }`
              );
            }
          });
        });
      });

      cy.get("button.btn-success").contains("Xác nhận đã in hết").click();
    });
  });
});

describe("Bàn giao đơn hàng", () => {
  let config;
  before(() => {
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    cy.loginWMS();
  });
  it("Should successfully add a handover entry via API", () => {
    cy.readFile("cypress/temp/maDonHang.json").then(({ maDonHang }) => {
      cy.loginMobileAPI().then(() => {
        const mobileToken = Cypress.env("mobileToken");
        cy.log("maDonHang:", maDonHang);
        const headers = {
          Host: "stg-wms.nandh.vn",
          accept: "Application/json",
          "content-type": "Application/json",
          authorization: mobileToken,
          "sentry-trace": "45b055a4fe3e4e7b817c992c7b44707c-8215bb3f684145b2-0",
          baggage:
            "sentry-environment=production,sentry-public_key=4874625b4fce1cc84a910625bdc01f8f,sentry-release=wms.nandh.vn%4038%2B6,sentry-trace_id=45b055a4fe3e4e7b817c992c7b44707c",
          "user-agent": "NHWMS/6 CFNetwork/3826.500.131 Darwin/24.5.0",
          "accept-language": "vi",
        };
        const body = {
          tracking_code: maDonHang,
          courier_code: "DFX",
          handover_code: null,
        };

        // Gửi yêu cầu POST
        cy.request({
          method: "POST",
          url: "https://stg-wms.nandh.vn/v1/handover/add",
          headers: headers,
          body: body,
          failOnStatusCode: false,
        }).then((response) => {
          // Kiểm tra mã trạng thái
          expect(response.status).to.eq(200);
          cy.log("API Handover/add thành công:", response.body);
          const handover_code = response.body.data.handover_code;
          cy.log(`bin_code đã trích xuất: ${handover_code}`);

          return cy
            .request({
              method: "PUT",
              url: `https://stg-wms.nandh.vn/v1/handover/approved/${handover_code}`,
              headers: {
                Host: "stg-wms.nandh.vn",
                Accept: "Application/json",
                "Content-Type": "Application/json",
                Authorization: mobileToken, // Sử dụng Bearer token
                "sentry-trace":
                  "45b055a4fe3e4e7b817c992c7b44707c-8215bb3f684145b2-0",
                baggage:
                  "sentry-environment=production,sentry-public_key=4874625b4fce1cc84a910625bdc01f8f,sentry-release=wms.nandh.vn%4038%2B6,sentry-trace_id=45b055a4fe3e4e7b817c992c7b44707c",
                "user-agent": "NHWMS/6 CFNetwork/3826.500.131 Darwin/24.5.0",
                "accept-language": "vi",
              },
              body: {
                is_update_document: true,
                list_document: [],
              },
            })
            .then((response) => {
              // Log kết quả để debug
              cy.log("Phản hồi API:", response.status, response.body);
              // Kiểm tra xem yêu cầu có thành công không (mã trạng thái 200)
              expect(response.status).to.eq(200);
              // Bạn có thể thêm các assertions khác ở đây để kiểm tra dữ liệu trả về
              // Ví dụ: expect(response.body.message).to.eq('Success');
              cy.request({
                method: "PUT",
                url: `https://stg-wms.nandh.vn/v1/handover/approved/${handover_code}`,
                headers: {
                  Host: "stg-wms.nandh.vn",
                  Accept: "Application/json",
                  "Content-Type": "Application/json",
                  Authorization: mobileToken, // Sử dụng Bearer token
                  "sentry-trace":
                    "45b055a4fe3e4e7b817c992c7b44707c-8215bb3f684145b2-0",
                  baggage:
                    "sentry-environment=production,sentry-public_key=4874625b4fce1cc84a910625bdc01f8f,sentry-release=wms.nandh.vn%4038%2B6,sentry-trace_id=45b055a4fe3e4e7b817c992c7b44707c",
                  "user-agent": "NHWMS/6 CFNetwork/3826.500.131 Darwin/24.5.0",
                  "accept-language": "vi",
                },
                body: {
                  tracking_code: maDonHang,
                  is_update_drive: false,
                  delivery_drive_name: "hêhhe",
                  delivery_drive_phone: "5555",
                  delivery_drive_license_number: "hhhh",
                },
              }).then((response) => {
                // Log kết quả để debug
                cy.log("Phản hồi API:", response.status, response.body);
                // Kiểm tra xem yêu cầu có thành công không (mã trạng thái 200)
                expect(response.status).to.eq(200);
                // Bạn có thể thêm các assertions khác ở đây để kiểm tra dữ liệu trả về
                // Ví dụ: expect(response.body.message).to.eq('Success');
              });
            });
        });
      });
    });
  });
});
