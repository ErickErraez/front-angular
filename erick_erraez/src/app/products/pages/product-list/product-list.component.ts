import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Product } from '../../../core/models/product.model';
import { ProductService } from '../../../core/services/product.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { delay } from 'rxjs/operators';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent implements OnInit {
  message: string | null = null;
  showModal = false;
  products: Product[] = [];
  filteredProducts: Product[] = [];
  isLoading = true;
  searchText = '';
  recordsPerPage = 5;
  isDropdownOpen: boolean[] = [];
  isError = false;
  selectedProduct: Product = {
    id: '',
    name: '',
    description: '',
    logo: '',
    date_release: '',
    date_revision: '',
  };

  constructor(private productService: ProductService, private router: Router) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.productService
      .getProducts()
      .pipe(delay(2000))
      .subscribe({
        next: (res) => {
          this.products = res.data;
          this.filteredProducts = [...this.products];
          this.isLoading = false;
          this.message = null;
        },
        error: (err) => {
          this.isLoading = false;
          this.isError = true;
          this.message =
            'No se pudieron cargar los productos. Intente más tarde.';
          setTimeout(() => {
            this.message = null;
          }, 1000);
        },
      });
  }

  applyFilter(): void {
    const text = this.searchText.toLowerCase().trim();
    if (!text) {
      this.filteredProducts = [...this.products];
      return;
    }
    this.filteredProducts = this.products.filter((p) => {
      return (
        p.name.toLowerCase().includes(text) ||
        p.description.toLowerCase().includes(text)
      );
    });
  }

  onRecordsChange(value: string): void {
    this.recordsPerPage = Number(value);
  }

  goToAddProduct(): void {
    this.router.navigate(['/products/add']);
  }

  editProduct(product: Product) {
    this.router.navigate(['/products/edit', product.id], {
      state: { product },
    });
  }

  deleteProduct(product: Product, index: number) {
    this.selectedProduct = product;
    this.isDropdownOpen[index] = false;
    this.showModal = true;
  }

  onConfirmDelete() {
    this.productService.deleteProduct(this.selectedProduct.id).subscribe({
      next: (res) => {
        this.isError = false;
        this.showModal = false;
        this.products = this.products.filter(
          (p) => p.id !== this.selectedProduct.id
        );
        this.applyFilter();
        this.message = res.message || null;
        setTimeout(() => {
          this.message = null;
        }, 1000);
      },
      error: (err) => {
        this.showModal = false;
        this.isError = true;
        this.message = 'Error al eliminar el producto. Intente más tarde.';
        setTimeout(() => {
          this.message = null;
        }, 1000);
      },
    });
  }

  onCancelDelete() {
    this.showModal = false;
  }

  toggleDropdown(index: number) {
    this.isDropdownOpen[index] = !this.isDropdownOpen[index];
  }
}
