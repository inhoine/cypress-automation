Cypress.Commands.add('loginWMSAPI', () => {
  return cy.request('POST', 'https://stg-wms.nandh.vn/v1/users/staff-login', {
    email: 'thanh.nn@nandh.vn',
    password: 'Nhl@12345',
    warehouse_id: 1
  }).then((resp) => {
    const token = resp.body.data.token;
    Cypress.env('token', token);

    cy.log('Website Token: ' + token);
    const staffInfo = resp.body.data.staff_info;

    // Set localStorage
    window.localStorage.setItem('token', token);
    window.localStorage.setItem('authUser', JSON.stringify(staffInfo));
    window.localStorage.setItem('i18nextLng', 'vi');

    // ✅ Cách 1: Bọc return bằng cy.wrap()
    return cy.wrap(token);  

    // hoặc Cách 2: bỏ return luôn, nếu không cần giá trị trả về
  });
});


Cypress.Commands.add('loginMobileAPI', () => {
  return cy.request({
    method: 'POST',
    url: 'https://stg-wms.nandh.vn/v1/users/staff-login',
    headers: {
      accept: 'Application/json',
      'content-type': 'Application/json',
      'accept-language': 'vi',
      'user-agent': 'NHWMS/6 CFNetwork/3826.500.131 Darwin/24.5.0'
    },
    body: {
      email: "thanh.nn@nandh.vn",
      password: "Nhl@12345",
      warehouse_id: 1
    }
  }).then((response) => {
    expect(response.status).to.eq(200);

    const mobileToken = response.body.data.token;
    Cypress.env('mobileToken', mobileToken);
    cy.log('Mobile Token: ' + mobileToken);

    // ✅ Phải wrap để Cypress tiếp tục chain được
    return cy.wrap(mobileToken);
  });
});

