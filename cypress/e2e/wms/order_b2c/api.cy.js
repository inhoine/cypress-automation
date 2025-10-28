/// <reference types="cypress" />

describe("API - Update Trolley Detail", () => {
  it("PUT /v1/trolley/detail/:pickupCode", () => {
    const pickupCode = "217170";

    cy.request({
      method: "PUT",
      url: `https://stg-wms.nandh.vn/v1/trolley/detail/${pickupCode}`,
      headers: {
        Host: "stg-wms.nandh.vn",
        "Content-Type": "application/json",
        "User-Agent": "NHWMS/31 CFNetwork/3826.600.41 Darwin/24.6.0",
        baggage:
          "sentry-environment=production,sentry-public_key=4874625b4fce1cc84a910625bdc01f8f,sentry-release=wms.nandh.vn%4043%2B31,sentry-trace_id=8bf9b3448fa448bea7a6992cde160bb9",
        Accept: "application/json",
        "Accept-Language": "vi",
        Authorization:
          "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoyMTEsInJvbGVfaWQiOjcxLCJyb2xlX2NvZGUiOiJBRE1JTiIsImxhdCI6MTAuODA1OTYyMzAwMDY2OTksImxvbmciOjEwNi42NjUwOTQ1Mjk4MTQ0MywibWF4aW11bV9kaXN0YW5jZSI6NTAwMDAwMDAuMCwid2FyZWhvdXNlX2lkIjoxLCJhcHBfdG9rZW4iOm51bGwsImV4cCI6MTc2MTYzNzE2NCwiZW1haWwiOiJ0aGFuaC5ubkBuYW5kaC52biJ9.vBQK8Olsu_JPBm8WmvfOLMe-FvBAmFXH3xx5BZbwLz8",
        "sentry-trace": "8bf9b3448fa448bea7a6992cde160bb9-cc0c1440e9094b66-0",
      },
      body: {
        bin_code: "FC1-A-30-1-004",
        goods_code: "GaoMuss",
        quantity: 1,
      },
      failOnStatusCode: false,
    }).then((response) => {
      cy.log(JSON.stringify(response.body));
      expect(response.status).to.be.oneOf([200, 201, 400, 404]);
    });
  });
});
