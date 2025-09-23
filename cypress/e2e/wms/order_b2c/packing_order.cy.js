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
      .type("GaoMuss")
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
          .type("GaoMuss")
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
