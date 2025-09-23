describe('Login Test', () => {

  beforeEach(() => {cy.session('loginSession', () => {

    cy.visit('https://stg-oms.nandh.vn/login')
    // 1. Nhập username mới vào ô input và kiểm tra
    cy.get('input[name="email"]').type('thanh.nn@nandh.vn').should('have.value', 'thanh.nn@nandh.vn')

    // 2. Nhập pwd và kiểm tra
    cy.get('input[name="password"]').type('Nhl@2025').should('have.value', 'Nhl@2025')

    // 3. Click btn login

    cy.get('button[type="submit"]').click()
    
    // 4. Kiểm tra xem đã đăng nhập thành công chưa 
    cy.url({ timeout: 10000 }).should('include', '/dashboard')
      cy.url().should('include', '/dashboard')
    })
    // Mở trang web một lần trước tất cả test
    cy.visit('https://stg-oms.nandh.vn/login')

  })


  it('Tạo sản phẩm', () => {
    //API create SP
    cy.intercept('POST', '**/api/v1/inventory/create').as('CreateProduct')
    //API danh sách sản phẩm
    cy.intercept('GET', '**/api/v1/inventory/list?page=1&page_size=50&return_type=list_linked_platform&status_group=all').as('GetItemList')

    // Click vào mục sản phẩm
    cy.get('a.menu-link').contains('Sản phẩm').click()
    // Chọn tất cả sản phẩm
    cy.get('a[href="/inventory-product-management"]').click()
    // Click tạo sản phẩm
    cy.get('button.btn-success').contains(/Thêm sản phẩm|Add product/).click()
    // Click thêm sản phẩm tồn kho
    cy.get('a[href="/create-inventory-product"]').click()
    // Nhập SKU
    const sku = 'SKU-' + Date.now();
    cy.get('input[placeholder="Nhập sku"]').type(sku).should('have.value', sku)
    // Nhập tên sp
    const nameProduct = "Product" + Date.now();
    cy.get('input[name="name"]').type(nameProduct).should('have.value', nameProduct)
    // Chọn nhãn hàng
    cy.contains('div', 'Chọn nhãn hàng').click({ force: true })

    // Chờ dropdown render option (React Select append ra body)
    cy.get('#react-select-2-listbox [role="option"]')
      .contains('Belkin')
      .click()
    cy.wait(1000)
    // Click Chọn danh mục và danh mục tương ứng
    cy.get('.col-lg-8 > .border > .css-13cymwt-control').click();

    cy.get('.modal-content').should('be.visible')
    
    cy.get('.contact-name').contains('Khác').click()

    cy.get('.btn-primary').contains(/Xác nhận|Confirm/).click()


    // Chọn hình ảnh
    cy.get('input[type="file"]').selectFile('images/imgauto.jpg', { force: true }); 

    // Nhập giá nhập
    cy.get('input[name="original_price"]', { timeout: 10000 }).type('100000') // Chờ 10 giây
    cy.get('input[name="original_price"]').should(($input) => {
      const val = $input.val();
      expect(val.replace(/,/g, '')).to.equal('100000');
    }); // Chờ 10 giây
    
    // Nhập giá bán
    cy.get('input[name="sale_price"]', { timeout: 10000 }).type('100000') // Chờ 10 giây
    cy.get('input[name="sale_price"]').should(($input) => {
      const val = $input.val();
      expect(val.replace(/,/g, '')).to.equal('100000');
    }); // Chờ 10 giây    

    // Nhập Mô tả
    cy.get('textarea[name="productDesc"]', { timeout: 10000 }).type('Sản phẩm auto')

    // Nhập khối lượng
    cy.get('input[name="weight"]').type('20').should('have.value', '20')
    // Nhập chiều dài
    cy.get('input[name="package_length"]').type('20').should('have.value', '20')
    // Nhập chiều rộng
    cy.get('input[name="package_width"]').type('20').should('have.value', '20')
    // Nhập chiều cao
    cy.get('input[name="package_height"]').type('20').should('have.value', '20')
    // Chọn tính chất hàng hoá
    cy.contains('Hàng dễ vỡ').click()
    // Nhập ghi chú
    cy.get('textarea[placeholder="Nhập ghi chú đóng gói"]', { timeout: 10000 }).type('Đóng cẩn thận vào');
    // Xác nhận
    cy.get('.nexttab.btn-success').click()
    // Lấy sản phẩm đầu tiên và kiểm tra tên của nó
    cy.get('tbody tr').first().find('.text-truncate-two-lines').should('contain', nameProduct);

    // Kiểm tra response API create product
    cy.wait('@CreateProduct').then((interception) => {
    // Kiểm tra mã trạng thái
    expect(interception.response.statusCode).to.equal(200); // Hoặc 200
    })

    // Kiểm tra response API get list item
    cy.wait('@GetItemList').then((interception) => {
    const responseBody = interception.response.body;
  
    // Access the list through the 'data' property first
    const productList = responseBody.data.list_product_inventory;

    // Check if the list is not empty before accessing the first item
    expect(productList).to.not.be.empty; 

    const productName = productList[0].name;
    expect(productName).to.equal(nameProduct);
  })
  })
})
