Cypress.Commands.add('loginWMSAPI', () => {
  cy.request('POST', 'https://stg-wms.nandh.vn/v1/users/staff-login', {
    email: 'thanh.nn@nandh.vn',
    password: 'Nhl@12345',
    warehouse_id: 1
  }).then((resp) => {
    const token = resp.body.data.token;
    Cypress.env('token', token);

    cy.log('Website Token: ' + token);
    const staffInfo = resp.body.data.staff_info; // authUser thực tế

    // Set localStorage
    window.localStorage.setItem('token', token);
    window.localStorage.setItem('authUser', JSON.stringify(staffInfo));
    window.localStorage.setItem('i18nextLng', 'vi');
  });
});



Cypress.Commands.add('loginMobileAPI', () => {
  cy.request({
    method: 'POST',
    url: 'https://stg-wms.nandh.vn/v1/users/staff-login',
    headers: {
      accept: 'Application/json',
      'content-type': 'Application/json',
      'accept-language': 'vi',
      'user-agent': 'NHWMS/6 CFNetwork/3826.500.131 Darwin/24.5.0',
      'sentry-trace': '2856cd01cb7d4294a678d1fdb31af4b6-5547e675652a4d1f-0',
      'baggage': 'sentry-environment=production,sentry-public_key=4874625b4fce1cc84a910625bdc01f8f,sentry-release=wms.nandh.vn%4039%2B6,sentry-trace_id=2856cd01cb7d4294a678d1fdb31af4b6'
    },
    body: {
      email: "thanh.nn@nandh.vn",
      password: "Nhl@12345",
      warehouse_id: 1
    }
  }).then((response) => {
    expect(response.status).to.eq(200);

    // Lưu token vào Cypress.env để dùng cho API khác
    const mobileToken = response.body.data.token;
    Cypress.env('mobileToken', mobileToken);

    // cy.log('Mobile Token: ' + mobileToken);
  });
});




    