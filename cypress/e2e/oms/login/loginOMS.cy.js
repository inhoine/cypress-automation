describe("Login test", () => {
  beforeEach(() => {
    cy.visit("https://stg-oms.nandh.vn/login");
  });

  function userName(inputUsername) {
    if (inputUsername) {
      return cy.get('input[name="email"]').type(inputUsername);
    } else {
      return cy.get('input[name="email"]');
    }
  }

  function passWord(inputPassword) {
    // Nếu dùng để nhập:
    if (inputPassword) {
      return cy.get('input[name="password"]').type(inputPassword);
    }
    // Nếu chỉ dùng để lấy selector:
    return cy.get('input[name="password"]');
  }

  function btnLogin() {
    cy.get('button[type="submit"]').click();
  }

  function login(username, password) {
    userName(username);
    passWord(password);
    btnLogin();
  }

  it("Login success", () => {
    login("thanh.nn@nandh.vn", "Nhl@12345");
    cy.url({ timeout: 10000 }).should("include", "/dashboard");
    cy.url().should("include", "/dashboard");
  });

  it("failed when dont input pwd", () => {
    login("thanh.nn@nandh.vn");
    cy.get('button[type="submit"]').click();
    // Selector chính xác hơn, tìm div lỗi của trường mật khẩu
    passWord()
      .parent()
      .find("div.py-1.text-danger")
      .should("be.visible")
      .and("contain", "Bắt buộc nhập mật khẩu");
    cy.log("Đăng nhập thất bại khi không nhập mật khẩu");
  });

  it("Failed when dont input email", () => {
    login("", "Nhl12345");
    cy.get('button[type="submit"]').click();
    // Selector chính xác hơn, tìm div lỗi của trường email
    userName()
      .parent()
      .find("div.py-1.text-danger")
      .should("be.visible")
      .and("contain", "Bắt buộc nhập Email");
    cy.log("Đăng nhập thất bại khi không nhập email");
  });

  it("Failed when wrong email", () => {
    login("thanh@nandh.vn", "Nhl@12345");
    cy.get(".Toastify__toast-body > :nth-child(2)")
      .should("be.visible")
      .and("contain", "Người dùng này không tồn tại");
  });

  it("Failed when wrong pwd", () => {
    login("thanh.nn@nandh.vn", "Nhl@2025");

    cy.get(".Toastify__toast-body > :nth-child(2)")
      .should("be.visible")
      .and("contain", "No active account found with the given credentials");
  });
});
