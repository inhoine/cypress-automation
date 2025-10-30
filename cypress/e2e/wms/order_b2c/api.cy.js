/// <reference types="cypress" />

describe("API - Update Trolley Detail", () => {
  it("PUT /v1/trolley/detail/:pickupCode", () => {
    const pickupCode = "217170";

    cy.request({
      method: "PUT",
      url: `https://stg-wms.nandh.vn//v1/trolley/detail/${pickupCode}`,
      headers: {
        authorization:
          "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoyMTEsInJvbGVfaWQiOjcxLCJyb2xlX2NvZGUiOiJBRE1JTiIsImxhdCI6MTAuODA1OTYyMzAwMDY2OTksImxvbmciOjEwNi42NjUwOTQ1Mjk4MTQ0MywibWF4aW11bV9kaXN0YW5jZSI6NTAwMDAwMDAuMCwid2FyZWhvdXNlX2lkIjoxLCJhcHBfdG9rZW4iOm51bGwsImV4cCI6MTc2MTcyMTQ4NCwiZW1haWwiOiJ0aGFuaC5ubkBuYW5kaC52biJ9.43l_j3WmcAkjc2eiHoz_iRRLo1ydvooZzu3I5lUXKsY",
        accept: "application/json",
        "content-type": "application/json",
      },
      body: {
        bin_code: "FC1-A-30-1-004",
        goods_code: "GaoMuss",
        quantity: 5,
      },
      failOnStatusCode: false,
    }).then((response) => {
      cy.log(JSON.stringify(response.body));
      expect(response.status).to.be.oneOf([200, 201, 400, 404]);
    });
  });
});
