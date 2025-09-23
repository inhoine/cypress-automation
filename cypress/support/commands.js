// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// file: cypress/support/commands.js

Cypress.Commands.add("loginOMS", () => {
  cy.fixture("config").then((config) => {
    cy.visit(config.omsUrl + "/login");
    cy.get('input[name="email"]').type(config.omsUser);
    cy.get('input[name="password"]').type(config.omsPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should("include", "/dashboard");
  });
});

Cypress.Commands.add("loginWMS", () => {
  cy.fixture("config").then((config) => {
    cy.visit(config.wmsUrl + "/login");
    cy.get('input[name="email"]').type(config.wmsUser);
    cy.get('input[name="password"]').type(config.wmsPassword);
    cy.get('button[type="submit"]').click();
    cy.wait(1000);
    cy.get("div.col-4.col-wh.col")
      .contains(config.tenFC)
      .click({ force: true });
    cy.get('button[type="button"]')
      .contains(config.tenFC)
      .click({ force: true });
  });
});

Cypress.Commands.add("loginOPS", () => {
  cy.fixture("config").then((config) => {
    cy.visit(config.opsUrl + "/login");
    cy.get('input[name="email"]').type(config.opsUser);
    cy.get('input[name="password"]').type(config.opsPassword);
    cy.get('button[type="submit"]').click();
    cy.get("div.modal-content").as("modalContent");

    // Kiểm tra sự xuất hiện của modalContent
    cy.get("@modalContent")
      .should("be.visible")
      .then(($modal) => {
        // Nếu modal hiển thị, thực hiện hành động click
        if ($modal.length) {
          cy.get('button[type="button"]').contains("Để sau").click();
        }
      });
  });
});

Cypress.Commands.add("addStorage", () => {
  cy.fixture("config").then((config) => {
    cy.visit(`${config.wmsUrl}/trolley?page=1&page_size=50`);

    cy.get("button.add-btn")
      .contains("Thêm thiết bị chứa hàng")
      .click({ force: true });

    // Random number
    const randomNumber = Math.floor(Math.random() * 1000); // 0 -> 999
    const trolleyCode = `NNT${randomNumber}`;

    cy.get('input[name="trolley_code"]').type(trolleyCode);

    cy.get("div.css-15tbpg6")
      .contains("Chọn loại yêu cầu")
      .click({ force: true });
    cy.get('div[id^="react-select-"][id*="-option-"]')
      .contains("Không ưu tiên")
      .click({ force: true });

    cy.get('button[type="submit"]')
      .contains("Thêm thiết bị chứa hàng")
      .click({ force: true });

    // ✅ Ghi trolleyCode vào file JSON
    cy.readFile("cypress/temp/maDonHang.json").then((data = {}) => {
      cy.writeFile("cypress/temp/maDonHang.json", {
        ...data,
        trolleyCode,
      });
    });

    cy.log(`🛒 Đã tạo trolleyCode: ${trolleyCode}`);
  });
});

Cypress.Commands.add("addStepBanner", (text) => {
  cy.get("body").then(($body) => {
    // Xóa banner cũ nếu có
    $body.find("#cypress-step-banner").remove();

    // Thêm banner mới
    $body.append(`
      <div id="cypress-step-banner"
        style="
          position: fixed;
          top: 0;
          left: 0;
          z-index: 99999;
          background: red;
          color: #fff;
          font-size: 16px;
          font-weight: bold;
          padding: 6px 12px;
          border-bottom-right-radius: 8px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        ">
        👉 STEP: ${text}
      </div>
    `);
  });
});
