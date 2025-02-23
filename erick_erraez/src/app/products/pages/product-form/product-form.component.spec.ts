import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ProductFormComponent } from './product-form.component';
import { ProductService } from '../../../core/services/product.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError, Observable } from 'rxjs';
import {
  FormBuilder,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';

describe('ProductFormComponent', () => {
  let component: ProductFormComponent;
  let fixture: ComponentFixture<ProductFormComponent>;
  let mockProductService: any;
  let mockRouter: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockProductService = {
      addProduct: jest.fn(),
      updateProduct: jest.fn(),
      verifyProductId: jest.fn().mockReturnValue(of(false)),
    };

    mockRouter = {
      navigate: jest.fn(),
    };

    // Simula ruta sin ID para modo creación
    mockActivatedRoute = { params: of({}) };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, ProductFormComponent],
      providers: [
        FormBuilder,
        { provide: ProductService, useValue: mockProductService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería inicializar el formulario en modo creación (isEditMode = false)', () => {
    expect(component.isEditMode).toBeFalsy();
    expect(component.productForm).toBeDefined();
    // Campo ID habilitado en modo creación
    expect(component.productForm.get('id')?.disabled).toBeFalsy();
  });

  it('submit() con formulario inválido no llama servicio', () => {
    component.productForm.patchValue({
      id: '', // inválido (requerido)
      name: 'abc', // inválido (minLength 5)
      description: '', // inválido (requerido)
      logo: '',
      date_release: '',
    });
    component.onSubmit();
    expect(mockProductService.addProduct).not.toHaveBeenCalled();
    expect(mockProductService.updateProduct).not.toHaveBeenCalled();
  });

  it('submit() en modo creación debe llamar addProduct y navegar', fakeAsync(() => {
    // Usar una fecha futura para que el formulario sea válido
    component.productForm.patchValue({
      id: 'PROD1',
      name: 'Producto largo',
      description: 'Descripción con más de 10 caracteres',
      logo: 'some-logo.jpg',
      date_release: '2099-01-01', // fecha futura
    });
    component.isEditMode = false;
    mockProductService.addProduct.mockReturnValue(of({ message: 'Creado ok' }));

    tick(); // Resuelve validadores asíncronos y valueChanges

    component.onSubmit();

    expect(mockProductService.addProduct).toHaveBeenCalled();
    expect(component.isError).toBeFalsy();
    expect(component.message).toBe('Creado ok');

    tick(1000); // Simula el setTimeout
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/products']);
  }));

  it('submit() en modo edición llama a updateProduct y navega', fakeAsync(() => {
    component.isEditMode = true;
    component.productId = '123';
    // Usar una fecha futura para que el formulario sea válido
    component.productForm.patchValue({
      id: 'NO-EDIT', // Este valor no se usa porque el control está deshabilitado
      name: 'Producto Edit',
      description: 'Descripción con más de 10 caracteres',
      logo: 'some-logo.jpg',
      date_release: '2099-01-01',
    });
    mockProductService.updateProduct.mockReturnValue(
      of({ message: 'Actualizado ok' })
    );

    tick(); // Resuelve validadores asíncronos y valueChanges

    component.onSubmit();

    expect(mockProductService.updateProduct).toHaveBeenCalledWith(
      '123',
      expect.any(Object)
    );
    expect(component.isError).toBeFalsy();
    expect(component.message).toBe('Actualizado ok');

    tick(1000);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/products']);
  }));

  it('debería manejar error en updateProduct', fakeAsync(() => {
    component.isEditMode = true;
    component.productId = '123';
    // Usar una fecha futura para que el formulario sea válido
    component.productForm.patchValue({
      id: 'IGNORED',
      name: 'Producto Edit',
      description: 'Descripción con más de 10 caracteres',
      logo: 'some-logo.jpg',
      date_release: '2099-01-01',
    });
    mockProductService.updateProduct.mockReturnValue(
      throwError('Error simulado')
    );

    tick(); // Resuelve validadores asíncronos y valueChanges

    component.onSubmit();

    expect(component.isError).toBeTruthy();
    expect(component.message).toContain('Error al actualizar');
  }));

  it('onReset() en modo creación debe resetear formulario', () => {
    component.isEditMode = false;
    component.productForm.patchValue({
      id: 'AAA',
      name: 'Nombre',
      description: 'Desc',
      logo: 'logo.jpg',
      date_release: '2099-01-01',
    });
    component.onReset();
    // Por defecto, Angular reset() asigna null a cada control
    expect(component.productForm.value.id).toBeNull();
    expect(component.productForm.value.name).toBeNull();
  });

  it('onReset() en modo edición navega a /products/add', () => {
    component.isEditMode = true;
    component.onReset();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/products/add']);
  });

  it('debería recalcular date_revision cuando cambia date_release', () => {
    const dateReleaseCtrl = component.productForm.get('date_release');
    const dateRevisionCtrl = component.productForm.get('date_revision');
    dateReleaseCtrl?.setValue('2025-02-18');
    fixture.detectChanges();
    expect(dateRevisionCtrl?.value).toBe('2026-02-18');
  });

  it('Validador dateValidator: date_release < hoy => invalidReleaseDate', () => {
    const today = new Date();
    const past = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 1
    );
    const isoPast = past.toISOString().split('T')[0];

    component.productForm.patchValue({
      date_release: isoPast,
      date_revision: isoPast,
    });
    const errors = component.dateValidator(component.productForm);
    expect(errors?.['invalidReleaseDate']).toBeTruthy();
  });

  it('Validador dateValidator: si date_revision no es release + 1 año EXACTAMENTE, retorna invalidRevisionDate', () => {
    // Evitar que la suscripción modifique el valor usando { emitEvent: false }
    component.productForm
      .get('date_release')
      ?.setValue('2099-01-01', { emitEvent: false });
    component.productForm
      .get('date_revision')
      ?.setValue('2100-01-02', { emitEvent: false });
    const errors = component.dateValidator(component.productForm);
    expect(errors?.['invalidRevisionDate']).toBeTruthy();
  });

  // Test directo para idExistsValidator en el caso de no tener valor
  it('idExistsValidator() debería retornar null si no hay valor', fakeAsync(() => {
    const validator = component.idExistsValidator();
    (validator({ value: '' } as AbstractControl) as Observable<any>).subscribe(
      (result) => {
        expect(result).toBeNull();
      }
    );
  }));
});
