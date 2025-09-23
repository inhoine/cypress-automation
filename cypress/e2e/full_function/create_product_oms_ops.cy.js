// Test Case 1: Tạo sản phẩm và kiểm tra
describe("Tạo sản phẩm và kiểm tra", () => {
  // Khai báo biến
  let nameProduct;
  const sku = "SKU-" + Date.now(); // Lấy SKU duy nhất
  Cypress.env("sku", sku); // Lưu SKU vào Cypress environment
  nameProduct = "Product-Auto" + Date.now(); // Lấy tên sản phẩm duy nhất
  let config;

  before(() => {
    // Tải cấu hình từ fixtures
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    // Đăng nhập trước khi truy cập trang
    cy.loginOMS();
  });

  // Các hàm nhập liệu để tạo sản phẩm
  function nhapTen() {
    cy.visit(`${config.omsUrl}/create-inventory-product`);
    cy.get('input[placeholder="Nhập sku"]').type(sku).should("have.value", sku);
    cy.get('input[name="name"]')
      .type(nameProduct)
      .should("have.value", nameProduct);
  }

  function chonNhanHang() {
    cy.contains("div", "Chọn nhãn hàng").click({ force: true });
    cy.get('#react-select-2-listbox [role="option"]')
      .contains("BanDai")
      .click();
    cy.wait(1000);
  }

  function chonDanhMuc() {
    cy.get(".col-lg-8 > .border > .css-13cymwt-control").click();
    cy.get(".modal-content").should("be.visible");
    cy.get(".contact-name").contains("Khác").click();
    cy.get(".btn-primary")
      .contains(/Xác nhận|Confirm/)
      .click();
  }

  function themHinhAnh() {
    cy.get('input[type="file"]').selectFile("images/imgauto.jpg", {
      force: true,
    });
  }

  function nhapGia() {
    // Giá nhập
    cy.get('input[placeholder="Nhập giá nhập"]').type("100000");
    cy.get('input[placeholder="Nhập giá nhập"]').should(($input) => {
      const val = $input.val();
      expect(val.replace(/,/g, "")).to.equal("100000");
    });
    // Giá bán
    cy.get('input[placeholder="Nhập giá bán"]').type("100000");
    cy.get('input[placeholder="Nhập giá bán"]').should(($input) => {
      const val = $input.val();
      expect(val.replace(/,/g, "")).to.equal("100000");
    });
  }

  function nhapMoTaSanPham() {
    cy.get('textarea[name="productDesc"]').type("Sản phẩm auto");
  }

  function nhapKhoiLuong() {
    cy.get('input[name="weight"]').type("20").should("have.value", "20");
    cy.get('input[name="package_length"]')
      .type("20")
      .should("have.value", "20");
    cy.get('input[name="package_width"]').type("20").should("have.value", "20");
    cy.get('input[name="package_height"]')
      .type("20")
      .should("have.value", "20");
  }

  function chonTinhChatHangHoa() {
    cy.contains("Hàng dễ vỡ").click();
    cy.get('textarea[placeholder="Nhập ghi chú đóng gói"]').type(
      "Đóng cẩn thận vào"
    );
  }

  function xacNhanTaoDon() {
    cy.get(".nexttab.btn-success").click();
  }

  it("Tạo sản phẩm thành công và xác nhận qua API và UI", () => {
    // Intercept các API liên quan
    cy.intercept("POST", "**/api/v1/inventory/create").as("CreateProduct");
    cy.intercept(
      "GET",
      "**/api/v1/inventory/list?page=1&page_size=50&return_type=list_linked_platform&status_group=all"
    ).as("GetItemList");
    cy.intercept("GET", "**/v1/inventory/detail/*").as("GetProductDetail");

    // Bước 1: Tạo sản phẩm trên UI
    nhapTen();
    chonNhanHang();
    chonDanhMuc();
    themHinhAnh();
    nhapGia();
    nhapMoTaSanPham();
    nhapKhoiLuong();
    chonTinhChatHangHoa();
    xacNhanTaoDon();

    // Bước 2: Kiểm tra API tạo sản phẩm
    cy.wait("@CreateProduct").then((interception) => {
      expect(interception.response.statusCode).to.equal(200);
    });

    // Bước 3: Kiểm tra danh sách sản phẩm
    cy.url().should("include", "/inventory-product-management");
    cy.wait("@GetItemList").then((interception) => {
      expect(interception.response.statusCode).to.equal(200);

      const responseBody = interception.response.body;
      const productList = responseBody.data.list_product_inventory;

      const createdProduct = productList.find((p) => p.name === nameProduct);
      expect(createdProduct).to.exist;
      expect(createdProduct.name).to.equal(nameProduct);

      // Bước 4: Kiểm tra chi tiết sản phẩm qua UI
      cy.get("tbody tr")
        .first()
        .find(".text-truncate-two-lines")
        .should("contain", nameProduct)
        .click();

      // Kiểm tra chi tiết sản phẩm qua API
      cy.wait("@GetProductDetail").then((detailInterception) => {
        const detailResponse = detailInterception.response.body;
        expect(detailResponse.data.id).to.equal(createdProduct.id);
        expect(detailResponse.data.name).to.equal(nameProduct);
        cy.log("Kiểm tra API chi tiết thành công!");
      });
    });

    // Lưu SKU vào file fixtures cho test case khác sử dụng
    cy.writeFile("cypress/fixtures/sku.json", { sku: sku });
  });
});

// Test Case 2: Duyệt đơn OPS
describe("Duyệt đơn OPS", () => {
  let config;
  let sku;

  Cypress.on("uncaught:exception", (err, runnable) => {
    if (err.message.includes("is_parcel_check")) {
      return false;
    }
  });

  beforeEach(() => {
    cy.fixture("config.json").then((data) => {
      config = data;
    });
    // Đăng nhập trước khi truy cập trang
    cy.loginOPS().then(() => {
      cy.visit(`${config.opsUrl}/products`);
    });

    // Đọc SKU từ file fixtures
    cy.fixture("sku.json").then((data) => {
      sku = data.sku;
    });
  });

  function chonKhachHangOPS() {
    cy.get("div.modal-content").as("modalNotify");
    cy.get("@modalNotify")
      .should("be.visible")
      .then(($modal) => {
        // Nếu modal hiển thị, thực hiện hành động click
        if ($modal.length) {
          cy.get('button[type="button"]').contains("Đóng").click();
        }
      });
    cy.get(":nth-child(2) > .css-1wpaz5r-control > .css-5dflce")
      .type("thanh.nn@nandh.vn")
      .wait(1000)
      .type("{enter}");
  }

  function timSKU() {
    cy.get(".field-search-options > .input-group > .form-control")
      .type(sku)
      .wait(500); // Tìm SKU đã lưu
  }

  function duyetSKU() {
    cy.get("input#product-checked-all").click();
    cy.get('button[type="button"]').contains("Phê duyệt").click();
    cy.get('button[type="button"]').contains("Xác nhận").click();
  }

  it("Tạo đơn OMS -> tạo vận đơn -> lưu mã ra fixtures", () => {
    chonKhachHangOPS();
    timSKU();
    duyetSKU();
  });
});
