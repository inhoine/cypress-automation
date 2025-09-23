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
