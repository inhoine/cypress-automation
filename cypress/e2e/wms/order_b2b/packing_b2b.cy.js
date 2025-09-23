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
    cy.fixture("config").then((config) => {
      cy.visit(`${config.wmsUrl}/packing-b2b`);
      cy.wait(2000);

      // Nhập bàn
      cy.get('input[placeholder="Quét hoặc nhập mã bàn"]')
        .type(config.packing_table)
        .type("{enter}");

      cy.wait(2000);

      // Nhập pickupCode
      cy.get('input[placeholder="Quét mã XE/ bảng kê xuất kho (Mã PK)"]')
        .type(pickupCode)
        .type("{enter}");

      cy.wait(2000);

      // Bước 3: Lặp qua từng sản phẩm trong file config và đóng gói
      cy.fixture("config").then((config) => {
        cy.wrap(config.pickitemB2B)
          .each((item) => {
            const { code } = item;
            cy.log(`📦 Bắt đầu đóng gói sản phẩm: ${code}`);

            // Hàm lặp đệ quy để đóng gói cho đến khi đủ số lượng
            const packItem = () => {
              cy.intercept(
                "PUT",
                `${config.wmsUrl}/v1/pickup/commit-item-sold/${pickupCode}`
              ).as("commitItem");

              cy.get('input[placeholder="Nhập số lượng"]').clear().type("1");
              cy.get('input[placeholder="Quét mã sản phẩm"]')
                .type(code)
                .type("{enter}");

              cy.wait("@commitItem", { timeout: 15000 }).then(
                (interception) => {
                  const status = interception.response.statusCode;
                  const data = interception.response.body?.data;

                  if (status === 200) {
                    const updatedItem = data.list_items.find((x) =>
                      x.goods_id?.barcodes?.includes(code)
                    );

                    if (
                      !updatedItem ||
                      updatedItem.quantity_pick >= updatedItem.quantity_sold
                    ) {
                      cy.log(`✅ ${code} đã đủ.`);
                      return;
                    } else {
                      cy.log(
                        `🔎 ${code}: đã đóng gói ${updatedItem.quantity_pick}/${updatedItem.quantity_sold}. Tiếp tục...`
                      );
                      // Thêm một độ trễ nhỏ để tránh race condition
                      cy.wait(500).then(() => {
                        packItem();
                      });
                    }
                  } else {
                    cy.log(
                      `⚠️ Nhận được phản hồi lỗi ${status}. Thử lại sau 1 giây...`
                    );
                    cy.wait(1000).then(() => {
                      packItem();
                    });
                  }
                }
              );
            };
            packItem();
          })
          .then(() => {
            cy.get("button.btn")
              .contains("Đóng gói và tạo kiện mới")
              .should("not.be.disabled")
              .click({ force: true });
            cy.log(
              "✅ Tất cả sản phẩm đã được đóng gói. Tiến hành tạo kiện mới."
            );
          });
      });
    });
  }

  it("Đóng gói đơn hàng", () => {
    cy.readFile("cypress/temp/maDonHang.json").then(({ pickupCode }) => {
      cy.log("pickupCode:", pickupCode);
      nhapBangKe(pickupCode);
      dongGoiB2c(pickupCode);
    });
  });
});
