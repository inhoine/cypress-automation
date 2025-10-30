describe("Tạo sản phẩm tồn kho", () => {
  Cypress.on("uncaught:exception", (err, runnable) => {
    if (err.message.includes("is_parcel_check")) {
      return false;
    }
  });

  beforeEach(() => {
    cy.loginOMS();
    cy.visit("https://stg-oms.nandh.vn/create-inventory-product");
  });

  function sku(sku) {
    cy.get('input[placeholder="Nhập sku"]').type(sku);
  }
  function barcode() {
    cy.get(".col-lg-8 > div > .mb-0")
      .contains("Thêm barcode")
      .click({ force: true });
  }
  function addBarcode(barcode) {
    cy.get('input[placeholder="Nhập barcode"]').type(barcode);
    cy.get('button[type="button"]').contains("Thêm").click();
  }
  function name(name) {
    cy.get('button[type="button"]').contains("Đóng").click();
    cy.get('input[name="name"]').type(name);
  }
  function brand(brand) {
    cy.get('input[id="react-select-2-input"]').type(brand);
    cy.get("#react-select-2-listbox", { timeout: 10000 }).should(
      "have.length.greaterThan",
      0
    );

    cy.contains("#react-select-2-option-0", brand).click({ force: true });
  }

  function category(category) {
    cy.wait(500);
    cy.get("div[class='css-hlgwow']")
      .contains("Chọn danh mục")
      .click({ force: true });

    cy.get("ul.list.mb-0.list-group.list-group-flush")
      .contains(category)
      .click({ force: true })
      .should("be.visible");
    cy.get(".btn-primary").click();
  }

  function addImage() {
    cy.get('input[type="file"]').selectFile("images/imgauto.jpg", {
      force: true,
    });
  }

  function price(costPrice, salePrice) {
    cy.get(
      'input[placeholder="Nhập giá nhập"], input[placeholder="Enter cost price"]'
    )
      .clear()
      .type(costPrice);
    cy.get(
      'input[placeholder="Nhập giá bán"], input[placeholder="Enter sale price"]'
    )
      .clear()
      .type(salePrice);
  }

  function describe(describe) {
    cy.get('textarea[name="productDesc"]').type(describe);
  }

  function btnVariant() {
    cy.get(".text-primary")
      .contains(/Tạo mẫu mã sản phẩm|Add Product Variant/i)
      .click();
  }

  function inputVariant(variantName, variantTag, skuVariant, priceVariant) {
    cy.get("input[placeholder='Nhập thuộc tính']")
      .type(variantName)
      .type("{enter}");

    cy.get("input[placeholder='Nhập thẻ']").type(variantTag).type("{enter}");

    cy.get("input[name='variantList.0.sku']").type(skuVariant);

    cy.get("input[placeholder='Nhập giá']").type(priceVariant);
  }

  function demension(weight, length, width, height) {
    cy.get("input[placeholder='Nhập khối lượng']").type(weight);
    cy.get("input[placeholder='Nhập chiều dài']").type(length);
    cy.get("input[placeholder='Nhập chiều rộng']").type(width);
    cy.get("input[placeholder='Nhập chiều cao']").type(height);
  }

  /**
   * Hàm tiện ích để chọn checkbox Quản lý Lưu trữ dựa trên input.
   * @param {string} optionName - Tên tùy chọn ('Serial/IMEI', 'Batch/Lot' hoặc các từ khóa liên quan). 👈 Đặt ở đây
   */
  function selectStorageOption(optionName) {
    const normalizedOption = optionName.toLowerCase().trim();
    let checkboxLocator;

    switch (normalizedOption) {
      case "serial/imei":
      case "serial":
      case "imei":
        checkboxLocator =
          "label:contains('Theo Serial/Imei') input[type='checkbox']";
        break;
      case "batch/lot":
      case "batch":
      case "lot":
        checkboxLocator =
          "label:contains('Theo lô (Batch/LOT)') input[type='checkbox']";
        break;
      default:
        throw new Error(`Tùy chọn không hợp lệ: "${optionName}"`);
    }

    // Thực hiện hành động Cypress
    cy.get(checkboxLocator, { timeout: 5000 }).should("be.visible").check();
  }

  function productType(type) {
    cy.get("input[id=react-select-4-input]").type(type).type("{enter}");
  }

  function unit(unit) {
    cy.get("input[id=react-select-5-input]").type(unit).type("{enter}");
  }

  function storerageCondition(condition) {
    cy.get("input[id=react-select-6-input]").type(condition).type("{enter}");
  }

  function stockWarning(stock) {
    cy.get("input[placeholder='Nhập tồn tối thiểu cảnh báo gần hết hàng']")
      .clear()
      .type(stock);
  }

  function handleOutboundStrategy() {
    cy.get(".css-1dimb5e-singleValue")
      .invoke("text")
      .then((selectedText) => {
        // Sử dụng .includes() để kiểm tra nếu chuỗi có chứa "Hết hạn trước"
        if (selectedText.includes("Hết hạn trước")) {
          cy.log('Đã chọn "Hết hạn trước", thực hiện thêm thao tác.');
          cy.get("input[id='react-select-10-input']").type("6").type("{enter}");
        } else {
          cy.log("Chọn loại nhập liệu thông thường.");
        }
      });
  }

  function inOutboundDeadline(
    typeDeadline,
    minimumInboundTime,
    minimumOutboundTime
  ) {
    cy.get(".btn.btn-sm.btn-outline-gray.border-0.m-0.w-100.form-label")
      .contains(typeDeadline)
      .click();

    cy.get("input[placeholder='Hạn sử dụng tối thiểu cho phép nhập kho']").type(
      minimumInboundTime
    );
    cy.get("input[placeholder='Hạn sử dụng tối thiểu cho phép xuất kho']").type(
      minimumOutboundTime
    );
  }

  function outboundStrategy(outboundName) {
    // Bước 1: Nhập tên chiến lược vào trường input và nhấn Enter
    cy.get("input[id=react-select-7-input]").type(outboundName).type("{enter}");

    if (outboundName.toLowerCase() === "hết hạn trước") {
      handleOutboundStrategy();
      inOutboundDeadline("Theo ngày", 180, 30);
    } else {
      cy.log("Khác hết hạn trước nên không cần nhập");
    }
  }

  function buttonConfirm() {
    cy.get("button[type='button']").contains("Xác nhận").click();
  }

  it("Tạo sản phẩm tồn kho", () => {
    sku("SKU-" + Date.now());
    barcode();
    addBarcode(Date.now());
    name("SP-" + Date.now());
    brand("DK");
    category("Khác");
    addImage();
    price(100000, 100000);
    describe("Mô tả có tâm");
    btnVariant();
    inputVariant("Color", "Red", "SKU-" + Date.now(), 100000);
    demension(20, 20, 20, 20);
    selectStorageOption("lot");
    productType("Vật lý");
    unit("Cái");
    storerageCondition("Kho thường");
    stockWarning(20);
    outboundStrategy("Nhập trước");
    buttonConfirm();
  });
});
