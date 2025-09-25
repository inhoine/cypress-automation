// cypress/e2e/oms_create_order.cy.js
// describe("OMS - Tạo đơn & tạo vận đơn", () => {
//   Cypress.on("uncaught:exception", (err, runnable) => {
//     if (err.message.includes("is_parcel_check")) {
//       return false;
//     }
//   });

//   let config;
//   beforeEach(() => {
//     cy.fixture("config.json").then((data) => {
//       config = data;
//     });
//     cy.loginOMS().then(() => {
//       cy.selectNNTBusiness();
//     });
//     cy.visit("https://stg-oms.nandh.vn/orders-b2c");
//   });

//   function taoDonHang() {
//     cy.get("button.btn-success")
//       .contains(/Create Order|Tạo đơn/)
//       .click();
//     cy.get('a[title="Tạo đơn bán lẻ"]').click();
//   }

//   function chonKhachHang() {
//     cy.get("div.css-hlgwow").contains("Chọn khách hàng").click({ force: true });
//     cy.get('[id^="react-select-"][id$="-option-0"]').click();
//     cy.log("Chọn khách hàng thành công");
//   }

//   function chonKenhBanHang() {
//     cy.get("div.css-13cymwt-control")
//       .contains("Chọn kênh bán hàng")
//       .click({ force: true });
//     cy.get('[id^="react-select-"][id$="-option-0"]').click();
//     cy.log("Chọn kênh bán thành công");
//   }

//   function chonDiaChiLayHang() {
//     cy.get("div.css-x1kfuk-control")
//       .contains("Chọn địa chỉ lấy hàng")
//       .click({ force: true });
//     cy.contains("p.fs-14.fw-medium.mb-0", "HCM Warehouse").click();
//     cy.log("Chọn địa chỉ lấy hàng thành công");
//   }

//   function chonSanPhamTheoTen(tenSanPham) {
//     cy.get("div.css-hlgwow").contains("Chọn sản phẩm").click({ force: true });
//     cy.get('[id^="react-select-"][id$="-listbox"]')
//       .contains("div", tenSanPham)
//       .click({ force: true });
//     cy.log("Chọn sản phẩm thành công");
//     cy.get('input[placeholder="Nhập số lượng"]').clear().type("1");
//   }

//   function chonLoaiHangHoa(loaiHangHoa) {
//     // Click vào control chính của react-select
//     cy.get(".w-100 .css-13cymwt-control").click({ force: true });

//     // Chọn option theo text
//     cy.get('[id^="react-select-"][id*="-option-"]')
//       .contains("div", loaiHangHoa)
//       .click({ force: true });
//   }

//   function nhapMaThamChieu() {
//     const ma = "MTC" + Date.now();
//     cy.get('input[placeholder="Nhập mã tham chiếu"]')
//       .type(ma)
//       .should("have.value", ma);
//     return cy.wrap(ma);
//   }

//   function nhapTiepTuc() {
//     cy.get("button.btn-success")
//       .contains(/Tiếp theo|Continue/)
//       .click({ force: true });
//   }

//   function nhapBtntaoDonHang() {
//     cy.get("button.btn-success")
//       .contains(/Tạo đơn|Create Order/)
//       .click();
//     cy.get("button.dropdown-item").contains("Tạo đơn hàng").click();

//     return cy
//       .get("span.link-secondary", { timeout: 10000 })
//       .should("be.visible")
//       .invoke("text")
//       .then((ma) => ma.trim());
//   }

//   function xacNhanDonHang() {
//     cy.wait(3000);
//     cy.get("button.btn-success")
//       .contains(/Tạo vận đơn|Create Inbound Shipment/)
//       .click({ force: true });
//     cy.log("Xác nhận đơn hàng");
//   }

//   function selectFreeShipping() {
//     cy.get('input[id="freeShip"]').scrollIntoView().click({ force: true });
//     cy.log("Đã click vào checkbox free shipping");
//   }

//   function taoVanDon() {
//     cy.get(".modal-footer button.btn-success")
//       .contains("Tạo vận đơn")
//       .should("be.visible")
//       .and("not.be.disabled")
//       .click({ force: true });
//     cy.log("Tạo ván đơn thành công");
//   }

//   it("Tạo đơn OMS -> tạo vận đơn -> lưu mã ra fixtures", () => {
//     taoDonHang();
//     chonKhachHang();
//     chonKenhBanHang();
//     chonDiaChiLayHang();
//     chonSanPhamTheoTen(config.skuSanPham);
//     chonLoaiHangHoa(config.loaiHangHoa);

//     nhapMaThamChieu().then(() => {
//       nhapTiepTuc();
//       nhapBtntaoDonHang().then((maThamChieu) => {
//         cy.log("Mã tham chiếu đã lưu:", maThamChieu);
//         xacNhanDonHang();
//         selectFreeShipping();
//         taoVanDon();

//         // Lưu ra file để WMS đọc
//         cy.writeFile("cypress/temp/maDonHang.json", { maThamChieu });
//       });
//     });
//   });
// });

// cypress/e2e/wms_export_order.cy.js
describe("WMS - Xuất kho từ đơn OMS", () => {
  let config;
  before(() => {
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    cy.loginWMS();
    // cy.chonFC('FC HN');
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
      cy.wait(1000); // Đợi một chút để đảm bảo đăng nhập thành công
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
                      goods_code: config.skuSanPham,
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
    cy.get('input[placeholder="Quét mã sản phẩm"]')
      .type(config.skuSanPham)
      .type("{enter}");
    cy.wait("@getTotalSold").then((interception) => {
      const totalSold = interception.response.body.data.total_sold;
      cy.log("totalSold:", totalSold);
      const totalPick = interception.response.body.data.total_pick;
      cy.log("totalPick:", totalPick);
      const remainingTotal = totalSold - totalPick;

      // Lặp lại hành động 'totalSold' lần
      for (let i = 0; i < remainingTotal; i++) {
        // Thực hiện hành động bạn muốn lặp
        // Ví dụ: Nhập lại mã sản phẩm và nhấn Enter
        cy.get('input[placeholder="Quét mã sản phẩm"]')
          .type(config.skuSanPham)
          .type("{enter}");
      }
    });
    cy.wait(2000);
    cy.get('input[placeholder="Quét hoặc nhập mã vật liệu đóng gói"]')
      .type("40x20x20")
      .type("{enter}");
  }
  it("Đóng gói đơn hàng", () => {
    cy.readFile("cypress/temp/maDonHang.json").then(({ pickupCode }) => {
      cy.log("pickupCode:", pickupCode);
      nhapBangKe(pickupCode);
      dongGoiB2c(pickupCode);
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
