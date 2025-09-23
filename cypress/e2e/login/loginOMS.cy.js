describe('Login test', () => {

  beforeEach(() => {
    cy.visit('https://stg-oms.nandh.vn/login')
  })

  it('passes', () => {
    
    // 1. Nhập username mới vào ô input và kiểm tra
    cy.get('input[name="email"]').type('thanh.nn@nandh.vn').should('have.value', 'thanh.nn@nandh.vn')

    // 2. Nhập pwd và kiểm tra
    cy.get('input[name="password"]').type('Nhl@12345').should('have.value', 'Nhl@12345')

    // 3. Click btn login

    cy.get('button[type="submit"]').click()
    
    // 4. Kiểm tra xem đã đăng nhập thành công chưa 
    cy.url({ timeout: 10000 }).should('include', '/dashboard')
      cy.url().should('include', '/dashboard')
  })

  it('failed when dont input pwd', () => {
    cy.get('input[name="email"]').type('thanh.nn@nandh.vn').should('have.value', 'thanh.nn@nandh.vn');
    cy.get('button[type="submit"]').click();
    // Selector chính xác hơn, tìm div lỗi của trường mật khẩu
    cy.get('input[name="password"]').parent().find('div.py-1.text-danger').should('be.visible').and('contain', 'Bắt buộc nhập mật khẩu');
  })

  it('Failed when dont input email', () => {
    cy.get('input[name="password"]').type('Nhl@2025').should('have.value', 'Nhl@2025');
    cy.get('button[type="submit"]').click();
    // Selector chính xác hơn, tìm div lỗi của trường email
    cy.get('input[name="email"]').parent().find('div.py-1.text-danger').should('be.visible').and('contain', 'Bắt buộc nhập Email');
  })

  it('Failed when wrong email',() => {
        // 1. Nhập username mới vào ô input và kiểm tra
    cy.get('input[name="email"]').type('thanh@nandh.vn').should('have.value', 'thanh@nandh.vn')

    // 2. Nhập pwd và kiểm tra
    cy.get('input[name="password"]').type('Nhl@12345').should('have.value', 'Nhl@12345')

    // 3. Click btn login

    cy.get('button[type="submit"]').click()

    cy.get('.Toastify__toast-body > :nth-child(2)').should('be.visible').and('contain', 'Người dùng này không tồn tại');
  })

  it('Failed when wrong pwd',() => {
        // 1. Nhập username mới vào ô input và kiểm tra
    cy.get('input[name="email"]').type('thanh.nn@nandh.vn')

    // 2. Nhập pwd và kiểm tra
    cy.get('input[name="password"]').type('Nhl34@123456')

    // 3. Click btn login

    cy.get('button[type="submit"]').click()

    cy.get('.Toastify__toast-body > :nth-child(2)').should('be.visible').and('contain', 'No active account found with the given credentials');
  })

})