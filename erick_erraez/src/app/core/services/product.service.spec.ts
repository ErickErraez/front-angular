import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ProductService } from './product.service';
import { environment } from '../../../environments/environment';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/products`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductService],
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('debería obtener productos con getProducts()', () => {
    const mockResponse = { data: [{ id: '1', name: 'Test' }] };

    service.getProducts().subscribe((res) => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].id).toBe('1');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('debería agregar producto con addProduct()', () => {
    const mockProduct = { id: 'abc' };
    const mockResp = { message: 'Creado' };
    service.addProduct(mockProduct as any).subscribe((res) => {
      expect(res.message).toBe('Creado');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    req.flush(mockResp);
  });

  it('debería actualizar producto con updateProduct()', () => {
    const mockResp = { message: 'Actualizado' };
    service.updateProduct('123', { name: 'Nuevo' }).subscribe((res) => {
      expect(res.message).toBe('Actualizado');
    });

    const req = httpMock.expectOne(`${baseUrl}/123`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockResp);
  });

  it('debería manejar deleteProduct() y devolver OK', () => {
    service.deleteProduct('123').subscribe((res) => {
      expect(res).toEqual({});
    });
    const req = httpMock.expectOne(`${baseUrl}/123`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('debería verificar ID con verifyProductId()', () => {
    service.verifyProductId('abc').subscribe((exists) => {
      expect(exists).toBeTruthy();
    });

    const req = httpMock.expectOne(`${baseUrl}/verification/abc`);
    expect(req.request.method).toBe('GET');
    req.flush(true);
  });

  afterEach(() => {
    httpMock.verify();
  });
});
