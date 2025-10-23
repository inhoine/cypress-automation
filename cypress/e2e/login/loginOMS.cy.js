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

  it("Login success", () => {
    // 1. Nhập username mới vào ô input và kiểm tra
    userName("thanh.nn@nandh.vn");
    // 2. Nhập pwd và kiểm tra
    passWord("Nhl@12345");
    // 3. Click btn login
    btnLogin();

    // 4. Kiểm tra xem đã đăng nhập thành công chưa
    cy.url({ timeout: 10000 }).should("include", "/dashboard");
    cy.url().should("include", "/dashboard");
  });

  it("failed when dont input pwd", () => {
    userName("thanh.nn@nandh.vn");
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
    passWord("Nhl@12345");
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
    // 1. Nhập username mới vào ô input và kiểm tra
    userName("thanh@nandh.vn");
    // 2. Nhập pwd và kiểm tra
    passWord("Nhl@12345");
    // 3. Click btn login
    btnLogin();
    cy.get(".Toastify__toast-body > :nth-child(2)")
      .should("be.visible")
      .and("contain", "Người dùng này không tồn tại");
  });

  it("Failed when wrong pwd", () => {
    // 1. Nhập username mới vào ô input và kiểm tra
    userName("thanh.nn@nandh.vn");

    // 2. Nhập pwd và kiểm tra
    passWord("Nhl34@123456");

    // 3. Click btn login
    btnLogin();

    cy.get(".Toastify__toast-body > :nth-child(2)")
      .should("be.visible")
      .and("contain", "No active account found with the given credentials");
  });
});
