import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Product } from '../../../core/models/product.model';
import { ProductService } from '../../../core/services/product.service';
import { ProductListComponent } from './product-list.component';

describe('ProductListComponent', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;
  let productServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    productServiceMock = {
      getProducts: jest.fn(),
      deleteProduct: jest.fn(),
    };

    routerMock = {
      navigate: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        { provide: ProductService, useValue: productServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
  });

  it('debería crearse', () => {
    expect(component).toBeTruthy();
  });

  it('debería cargar productos en loadProducts() (fakeAsync)', fakeAsync(() => {
    const mockProducts: Product[] = [
      {
        id: '1',
        name: 'Prod1',
        description: 'Desc1',
        logo: '',
        date_release: '2025-01-01',
        date_revision: '2026-01-01',
      },
      {
        id: '2',
        name: 'Prod2',
        description: 'Desc2',
        logo: '',
        date_release: '2025-01-01',
        date_revision: '2026-01-01',
      },
    ];
    productServiceMock.getProducts.mockReturnValue(of({ data: mockProducts }));
    component.loadProducts();
    tick(); // Forzar la ejecución de las tareas asíncronas
    fixture.detectChanges();

    expect(productServiceMock.getProducts).toHaveBeenCalled();
    expect(component.isLoading).toBeTruthy();
    expect(component.products.length).toBe(0);
    expect(component.filteredProducts.length).toBe(0);
    expect(component.message).toBeNull();
    expect(component.isError).toBeFalsy();
  }));

  it('debería cargar productos en loadProducts()', async () => {
    const mockProducts: Product[] = [
      {
        id: '1',
        name: 'Prod1',
        description: 'Desc1',
        logo: '',
        date_release: '2025-01-01',
        date_revision: '2026-01-01',
      },
      {
        id: '2',
        name: 'Prod2',
        description: 'Desc2',
        logo: '',
        date_release: '2025-01-01',
        date_revision: '2026-01-01',
      },
    ];
    productServiceMock.getProducts.mockReturnValue(of({ data: mockProducts }));

    component.loadProducts();
    fixture.detectChanges();
    await fixture.whenStable(); // Espera a que se resuelvan las tareas asíncronas

    expect(productServiceMock.getProducts).toHaveBeenCalled();
    expect(component.isLoading).toBeFalsy();
    expect(component.products.length).toBe(2);
    expect(component.filteredProducts.length).toBe(2);
    expect(component.message).toBeNull();
    expect(component.isError).toBeFalsy();
  });

  it('applyFilter() sin texto debe resetear filteredProducts', () => {
    component.products = [
      {
        id: '1',
        name: 'Prod1',
        description: 'Desc1',
        logo: '',
        date_release: '2025-01-01',
        date_revision: '2026-01-01',
      },
      {
        id: '2',
        name: 'Prod2',
        description: 'Desc2',
        logo: '',
        date_release: '2025-01-01',
        date_revision: '2026-01-01',
      },
    ];
    component.searchText = '';
    component.applyFilter();
    expect(component.filteredProducts.length).toBe(2);
  });

  it('applyFilter() con texto debe filtrar', () => {
    component.products = [
      {
        id: '1',
        name: 'Prod1',
        description: 'Alpha',
        logo: '',
        date_release: '2025-01-01',
        date_revision: '2026-01-01',
      },
      {
        id: '2',
        name: 'Prod2',
        description: 'Beta',
        logo: '',
        date_release: '2025-01-01',
        date_revision: '2026-01-01',
      },
    ];
    component.searchText = 'alpha';
    component.applyFilter();
    expect(component.filteredProducts.length).toBe(1);
    expect(component.filteredProducts[0].id).toBe('1');
  });

  it('onRecordsChange() debe cambiar el recordsPerPage', () => {
    component.onRecordsChange('10');
    expect(component.recordsPerPage).toBe(10);
  });

  it('goToAddProduct() debe navegar a /products/add', () => {
    component.goToAddProduct();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/products/add']);
  });

  it('editProduct() debe navegar a /products/edit/:id con state', () => {
    const product: Product = {
      id: '5',
      name: 'Prod5',
      description: '',
      logo: '',
      date_release: '',
      date_revision: '',
    };
    component.editProduct(product);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/products/edit', '5'], {
      state: { product },
    });
  });

  it('debería eliminar producto en onConfirmDelete() y limpiar mensaje tras timeout', fakeAsync(() => {
    component.selectedProduct = {
      id: '1',
      name: 'Test',
      logo: '',
      description: '',
      date_release: '',
      date_revision: '',
    } as Product;
    component.products = [
      component.selectedProduct,
      {
        id: '2',
        name: 'Prod2',
        logo: '',
        description: '',
        date_release: '',
        date_revision: '',
      } as Product,
    ];
    productServiceMock.deleteProduct.mockReturnValue(
      of({ message: 'Eliminado' })
    );
    component.onConfirmDelete();
    expect(productServiceMock.deleteProduct).toHaveBeenCalledWith('1');
    expect(component.products.length).toBe(1);
    expect(component.message).toBe('Eliminado');
    tick(1000);
    expect(component.message).toBeNull();
  }));

  it('onConfirmDelete() debe manejar error y limpiar mensaje tras timeout', fakeAsync(() => {
    component.selectedProduct = {
      id: '1',
      name: 'Test',
      logo: '',
      description: '',
      date_release: '',
      date_revision: '',
    } as Product;
    component.products = [component.selectedProduct];
    productServiceMock.deleteProduct.mockReturnValue(throwError('Error x'));
    component.onConfirmDelete();
    expect(component.isError).toBeTruthy();
    expect(component.message).toContain('Error al eliminar el producto');
    expect(component.showModal).toBeFalsy();
    tick(1000);
    expect(component.message).toBeNull();
  }));

  it('onCancelDelete() debe cerrar modal sin eliminar', () => {
    component.showModal = true;
    component.onCancelDelete();
    expect(component.showModal).toBeFalsy();
  });

  it('toggleDropdown() debe alternar valor en isDropdownOpen[index]', () => {
    component.isDropdownOpen = [false, false];
    component.toggleDropdown(0);
    expect(component.isDropdownOpen[0]).toBeTruthy();
    component.toggleDropdown(0);
    expect(component.isDropdownOpen[0]).toBeFalsy();
  });
});
