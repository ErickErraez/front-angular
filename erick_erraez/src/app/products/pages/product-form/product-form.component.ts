import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  AsyncValidatorFn,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
})
export class ProductFormComponent implements OnInit {
  message: string | null = null; // Mensaje de error o éxito
  isError: boolean = false; // Para decidir si es alert-danger o alert-success
  isSaved: boolean = false; // Para bloquear el boton cuando se guarde

  productForm!: FormGroup;
  isEditMode: boolean = false;
  productId: string = '';

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.createForm();

    // Verificar si es edición
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.isEditMode = true;
        this.productId = params['id'];
        // Campo ID deshabilitado para edición
        this.productForm.get('id')?.disable();

        // Si el producto viene por state, precarga
        const productFromState = history.state?.product;
        if (productFromState) {
          this.patchForm(productFromState);
        }
      }
    });

    // Escucha cambios en date_release para recalcular date_revision (+1 año)
    this.productForm
      .get('date_release')
      ?.valueChanges.subscribe((releaseValue) => {
        if (releaseValue) {
          const releaseDate = new Date(releaseValue);
          const revisionDate = new Date(releaseDate);
          revisionDate.setFullYear(revisionDate.getFullYear() + 1);

          const isoDate = revisionDate.toISOString().split('T')[0];
          this.productForm.patchValue(
            { date_revision: isoDate },
            { emitEvent: false }
          );
        } else {
          this.productForm.patchValue(
            { date_revision: '' },
            { emitEvent: false }
          );
        }
      });
  }

  private patchForm(product: Product) {
    // Aplica los valores al formulario
    this.productForm.patchValue({
      id: product.id,
      name: product.name,
      description: product.description,
      logo: product.logo,
      date_release: product.date_release,
      date_revision: product.date_revision,
    });
  }

  createForm(): void {
    this.productForm = this.fb.group(
      {
        id: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(10),
          ],
          this.isEditMode ? [] : [this.idExistsValidator()],
        ],
        name: [
          '',
          [
            Validators.required,
            Validators.minLength(5),
            Validators.maxLength(100),
          ],
        ],
        description: [
          '',
          [
            Validators.required,
            Validators.minLength(10),
            Validators.maxLength(200),
          ],
        ],
        logo: ['', Validators.required],
        date_release: ['', Validators.required],
        // Deshabilitamos date_revision para que el usuario no lo edite
        date_revision: [{ value: '', disabled: true }, Validators.required],
      },
      { validators: this.dateValidator }
    );
  }

  // Validador asíncrono para verificar que el ID no exista
  idExistsValidator(): AsyncValidatorFn {
    return (
      control: AbstractControl
    ): Observable<{ exists: boolean } | null> => {
      if (!control.value) {
        return of(null);
      }
      return this.productService.verifyProductId(control.value).pipe(
        map((exists) => (exists ? { exists: true } : null)),
        catchError(() => of(null))
      );
    };
  }

  // Validador de fechas: date_release >= hoy y date_revision = date_release + 1 año
  dateValidator(group: AbstractControl): { [key: string]: any } | null {
    const dateReleaseStr = group.get('date_release')?.value;
    const dateRevisionStr = group.get('date_revision')?.value;
    if (dateReleaseStr && dateRevisionStr) {
      const [ry, rm, rd] = dateReleaseStr.split('-').map(Number);
      const release = new Date(ry, rm - 1, rd);

      const [vy, vm, vd] = dateRevisionStr.split('-').map(Number);
      const revision = new Date(vy, vm - 1, vd);

      const now = new Date();
      const todayNoTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      if (release < todayNoTime) {
        return { invalidReleaseDate: true };
      }
      const expectedRevision = new Date(release);
      expectedRevision.setFullYear(expectedRevision.getFullYear() + 1);
      if (revision.toDateString() !== expectedRevision.toDateString()) {
        return { invalidRevisionDate: true };
      }
    }
    return null;
  }

  onSubmit(): void {
    this.isSaved = true;
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    const product: Product = this.productForm.getRawValue();

    if (this.isEditMode) {
      this.update(product);
    } else {
      this.create(product);
    }
  }

  update(product: Product) {
    this.productService.updateProduct(this.productId, product).subscribe({
      next: (res) => {
        this.message = res.message;
        this.isError = false;
        // Redirige tras 500 milisegundos
        setTimeout(() => {
          this.router.navigate(['/products']);
        }, 500);
      },
      error: (err) => {
        this.isError = true;
        this.message = 'Error al actualizar el producto. Inténtelo más tarde.';
        setTimeout(() => {
          this.message = null;
        }, 1000);
      },
    });
  }

  create(product: Product) {
    this.productService.addProduct(product).subscribe({
      next: (res) => {
        this.message = res.message; //'message' del backend
        this.isError = false;
        setTimeout(() => {
          this.router.navigate(['/products']);
        }, 1000);
      },
      error: (err) => {
        this.isError = true;
        this.message =
          'Error al crear el producto. Verifique e intente de nuevo.';
        setTimeout(() => {
          this.message = null;
        }, 1000);
      },
    });
  }

  onReset(): void {
    if (this.isEditMode) {
      // En modo edición, nav a /products/add
      this.router.navigate(['/products/add']);
    }
    this.productForm.reset();
  }
}
